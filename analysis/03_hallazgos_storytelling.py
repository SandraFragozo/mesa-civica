from html import escape

import pandas as pd
import plotly.express as px

from ccpc import AGES, COUNTS, YEARS, aggregate, arguments, markdown_table, read_csv, with_rates


PALETTE = {"Hombres": "#0072B2", "Mujeres": "#D55E00", "No binario": "#7B3294", "No especificado": "#666666"}
LABELS = {"PARTICIPACION": "Participación (%)", "GRUPO_EDAD": "Grupo de edad", "AELEC": "Elección", "SEXO": "Sexo registrado", "TIPOSEC": "Tipo de sección", "EDONOM_OFICIAL": "Entidad federativa", "BRECHA_PP": "Presidencial − intermedia (puntos porcentuales)", "REGISTROS": "Registros en el archivo", "MODALIDAD": "Modalidad", "SV": "Con marca de voto (SV)", "LN": "Lista nominal (LN)", "NS": "Sin información (NS)"}


def rates(frame, keys):
    result = with_rates(aggregate(frame, keys))
    result["PARTICIPACION"] = result["SV"].div(result["LN"].where(result["LN"].gt(0))).mul(100)
    return result


def export_figure(fig, path, title, explanation, table):
    fig.update_layout(template="plotly_white", font=dict(family="Arial, sans-serif", size=14), margin=dict(l=75, r=30, t=30, b=100), legend=dict(title_text="", orientation="h", yanchor="bottom", y=1.03, xanchor="left", x=0), separators=",.")
    chart = fig.to_html(full_html=False, include_plotlyjs="directory", div_id=path.stem, config={"responsive": True, "displaylogo": False}, default_height="650px")
    from plotly.offline import get_plotlyjs
    library = path.parent / "plotly.min.js"
    if not library.exists():
        library.write_text(get_plotlyjs(), encoding="utf-8")
    page = f'''<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="{escape(explanation, quote=True)}"><link rel="icon" href="data:,"><title>{escape(title)} · CCPC</title>
<style>body{{font-family:Arial,sans-serif;max-width:1440px;margin:0 auto;padding:24px;color:#202124;line-height:1.5}}h1{{font-size:clamp(1.5rem,3vw,2.2rem)}}.chart{{min-height:650px}}table{{border-collapse:collapse;width:100%}}td,th{{padding:8px;border-bottom:1px solid #ddd;text-align:left}}.table{{overflow:auto}}summary{{cursor:pointer}}a{{color:#005a9c}}@media(max-width:600px){{body{{padding:12px}}}}</style></head>
<body><main><header><h1>{escape(title)}</h1><p>{escape(explanation)}</p></header><section aria-label="Gráfica interactiva"><div class="chart">{chart}</div></section><section aria-label="Datos de la gráfica"><details><summary>Consultar datos en tabla</summary><div class="table">{table.to_html(index=False, border=0, na_rep="Sin dato", float_format=lambda value: f"{value:.2f}")}</div></details></section><footer><p>Fuente: INE, Conteos Censales de Participación Ciudadana 2009–2024. Tasas calculadas como suma de SV / suma de LN × 100. NS conserva su categoría de información no especificada.</p><p><a href="../hallazgos_clave_reto3.md">Ver reporte y metodología</a></p></footer></main></body></html>'''
    path.write_text(page, encoding="utf-8")


def age_story(national, charts):
    age = rates(national, ["AELEC", "TIPO_ELECCION", "GRUPO_EDAD"])
    fig = px.line(age, x="GRUPO_EDAD", y="PARTICIPACION", color=age["AELEC"].astype(str), markers=True, category_orders={"GRUPO_EDAD": AGES + ["No especificado"]}, labels={**LABELS, "color": "Elección"}, hover_data=["LN", "SV", "NS"])
    fig.update_xaxes(tickmode="array", tickvals=AGES + ["No especificado"], ticktext=["18-19", *AGES[1:], "Sin dato"], tickangle=-45)
    fig.update_yaxes(range=[0, 100])
    export_figure(fig, charts / "01_curva_edad.html", "La curva de la edad, 2009–2024", "Cada punto reúne los conteos de todos los sexos y tipos de sección. Las edades son grupos observados en cada elección; no se sigue a las mismas personas.", age)
    rows = []
    for year in YEARS:
        subset = age.loc[age["AELEC"].eq(year)].set_index("GRUPO_EDAD")
        value = lambda group: subset.loc[group, "PARTICIPACION"] if group in subset.index else float("nan")
        baseline = value(AGES[0])
        recovery = next((group for group in AGES[3:] if pd.notna(value(group)) and value(group) >= baseline), "Sin recuperación observada")
        rows.append({"Elección": year, "18-19 (%)": baseline, "20-24 (%)": value("20-24"), "25-29 (%)": value("25-29"), "Δ 20-24 vs 18-19 (pp)": value("20-24") - baseline, "Δ 25-29 vs 18-19 (pp)": value("25-29") - baseline, "Primer grupo ≥30 que alcanza 18-19": recovery})
    table = pd.DataFrame(rows)
    latest = table.loc[table["Elección"].eq(2024)].iloc[0]
    text = f"En 2024, la participación de 18-19 años fue {latest['18-19 (%)']:.2f}%; en 20-24, {latest['20-24 (%)']:.2f}%, y en 25-29, {latest['25-29 (%)']:.2f}%. Las diferencias respecto a 18-19 fueron {latest['Δ 20-24 vs 18-19 (pp)']:+.2f} y {latest['Δ 25-29 vs 18-19 (pp)']:+.2f} puntos porcentuales. Recuperación al nivel de 18-19: {latest['Primer grupo ≥30 que alcanza 18-19']}."
    return ["## 1. La curva de la edad", text, markdown_table(table), "La recuperación se define como el primer grupo de 30 años o más cuya tasa iguala o supera la de 18-19 en la misma elección. La etiqueta ‘primovotantes’ aproxima una edad; estos datos no acreditan que sea el primer voto de cada persona.", "[Explorar curva de edad](graficas/01_curva_edad.html)"]


def gender_story(national, charts):
    frame = rates(national.loc[national["AELEC"].eq(2024)], ["TIPOSEC", "SEXO"])
    frame["BASE_PEQUENA"] = frame["LN"].lt(100).map({True: "LN < 100: base pequeña", False: "LN ≥ 100"})
    fig = px.bar(frame, x="TIPOSEC", y="PARTICIPACION", color="SEXO", barmode="group", color_discrete_map=PALETTE, labels=LABELS, category_orders={"TIPOSEC": ["Urbana", "Mixta", "Rural", "No especificado"], "SEXO": list(PALETTE)}, hover_data=["LN", "SV", "NS", "BASE_PEQUENA"])
    fig.update_yaxes(range=[0, 100])
    export_figure(fig, charts / "02_genero_territorio.html", "Sexo registrado y territorio en 2024", "Se comparan tasas con sus denominadores visibles. Las bases menores de 100 registros se señalan para contextualizar sus oscilaciones; las categorías ausentes no equivalen a participación cero.", frame)
    rows = []
    for section, subset in frame.groupby("TIPOSEC", sort=True):
        indexed = subset.set_index("SEXO")
        if {"Mujeres", "Hombres"}.issubset(indexed.index):
            gap = indexed.loc["Mujeres", "PARTICIPACION"] - indexed.loc["Hombres", "PARTICIPACION"]
            rows.append({"Tipo de sección": section, "Mujeres − hombres (pp)": gap})
    return ["## 2. Brecha de género y territorio", "La variable original es SEXO registrado en los cuadernillos. La categoría ‘No binario’ se conserva tal como está codificada y no permite inferir identidades no registradas.", markdown_table(frame[["TIPOSEC", "SEXO", *COUNTS, "TASA_PARTICIPACION", "TASA_NS", "BASE_PEQUENA"]]), markdown_table(pd.DataFrame(rows)), "[Explorar brecha por territorio](graficas/02_genero_territorio.html)"]


def election_gap(frame, keys):
    grouped = rates(frame, keys + ["TIPO_ELECCION"])
    presidential = grouped.loc[grouped["TIPO_ELECCION"].eq("Presidencial"), keys + ["PARTICIPACION", "LN", "NS"]]
    intermediate = grouped.loc[grouped["TIPO_ELECCION"].eq("Intermedia"), keys + ["PARTICIPACION", "LN", "NS"]]
    merged = presidential.merge(intermediate, on=keys, how="outer", suffixes=("_PRESIDENCIAL", "_INTERMEDIA"), validate="one_to_one")
    merged["BRECHA_PP"] = merged["PARTICIPACION_PRESIDENCIAL"] - merged["PARTICIPACION_INTERMEDIA"]
    return merged.sort_values("BRECHA_PP", ascending=False)


def intermediate_story(national, state, charts):
    states = election_gap(state, ["EDOCVE", "EDONOM_OFICIAL"])
    ages = election_gap(national, ["GRUPO_EDAD"])
    hover = ["PARTICIPACION_PRESIDENCIAL", "PARTICIPACION_INTERMEDIA", "LN_PRESIDENCIAL", "LN_INTERMEDIA", "NS_PRESIDENCIAL", "NS_INTERMEDIA"]
    for frame, dimension, filename, title in (
        (states, "EDONOM_OFICIAL", "03_intermedias_estados.html", "La brecha entre tipos de elección por entidad"),
        (ages, "GRUPO_EDAD", "04_intermedias_edades.html", "La brecha entre tipos de elección por edad"),
    ):
        fig = px.bar(frame.sort_values("BRECHA_PP"), y=dimension, x="BRECHA_PP", orientation="h", labels=LABELS, hover_data=hover)
        fig.add_vline(x=0, line_color="#555555")
        fig.update_layout(height=1000 if dimension == "EDONOM_OFICIAL" else 650)
        export_figure(fig, charts / filename, title, "Brecha positiva: mayor participación en presidenciales. Cada tipo reúne SV y LN de sus tres elecciones antes de dividir. Es una diferencia descriptiva entre años y composiciones poblacionales distintos.", frame)
    yearly = rates(national, ["AELEC"])
    lookup = yearly.set_index("AELEC")["PARTICIPACION"]
    paired = pd.DataFrame([{"Intermedia": intermediate, "Presidencial posterior": presidential, "Participación intermedia (%)": lookup.loc[intermediate], "Participación presidencial (%)": lookup.loc[presidential], "Presidencial − intermedia (pp)": lookup.loc[presidential] - lookup.loc[intermediate]} for intermediate, presidential in ((2009, 2012), (2015, 2018), (2021, 2024))])
    top_states = states.dropna(subset=["BRECHA_PP"]).head(5)
    top_ages = ages.dropna(subset=["BRECHA_PP"]).head(3)
    statement = "Las mayores brechas positivas indican dónde la participación intermedia fue menor que la presidencial en el conjunto del periodo. Si una brecha es negativa, la relación se invierte."
    if len(top_states) and len(top_ages):
        first_state, first_age = top_states.iloc[0], top_ages.iloc[0]
        statement += f" Encabezan la diferencia {first_state['EDONOM_OFICIAL']} ({first_state['BRECHA_PP']:+.2f} pp) y el grupo {first_age['GRUPO_EDAD']} ({first_age['BRECHA_PP']:+.2f} pp)."
    return ["## 3. Elecciones intermedias y presidenciales", statement, "Se suman los conteos de 2009, 2015 y 2021 para intermedias; y de 2012, 2018 y 2024 para presidenciales. La ponderación resulta de LN, sin promediar porcentajes ni redondear antes de calcular diferencias. Una persona puede aparecer en varias elecciones; LN acumulada representa registros persona-elección.", "### Entidades con mayor diferencia presidencial − intermedia", markdown_table(top_states), "### Grupos de edad con mayor diferencia", markdown_table(ages), "### Contraste nacional de elecciones consecutivas", markdown_table(paired), "La comparación no estima un efecto causal del tipo de elección. Cambian los años, los electorados, el registro, el contexto y la distribución demográfica. Las tres parejas muestran si el patrón agregado oculta diferencias entre periodos.", "[Explorar entidades](graficas/03_intermedias_estados.html) · [Explorar edades](graficas/04_intermedias_edades.html)"]


def inclusion_story(special, state, charts):
    counts = special.groupby(["MODALIDAD", "EDOCVE", "EDONOM_OFICIAL"], as_index=False, dropna=False)["REGISTROS"].sum()
    fig = px.bar(counts, y="EDONOM_OFICIAL", x="REGISTROS", color="MODALIDAD", barmode="group", orientation="h", labels=LABELS)
    fig.update_layout(height=1050)
    export_figure(fig, charts / "05_inclusion_modalidades.html", "Modalidades especiales de 2024: registros por entidad", "Se muestra el volumen de filas de los archivos especiales, sin equipararlo automáticamente a votos emitidos. Si hay numerador y denominador documentados, las tasas se presentan por separado en el reporte. Una entidad ausente significa que no hay registros en el archivo.", counts)
    nonbinary = rates(state.loc[state["AELEC"].eq(2024) & state["SEXO"].eq("No binario")], ["EDOCVE", "EDONOM_OFICIAL"])
    nonbinary["BASE_PEQUENA"] = nonbinary["LN"].lt(100).map({True: "LN < 100: base pequeña", False: "LN ≥ 100"})
    fig = px.scatter(nonbinary, x="PARTICIPACION", y="EDONOM_OFICIAL", size="LN", size_max=20, color="BASE_PEQUENA", labels=LABELS, hover_data=["LN", "SV", "NV", "NS"], category_orders={"EDONOM_OFICIAL": nonbinary["EDONOM_OFICIAL"].tolist()})
    fig.update_xaxes(range=[-5, 105])
    fig.update_layout(height=850)
    export_figure(fig, charts / "06_inclusion_no_binario.html", "Registros no binarios en el conteo ordinario de 2024", "Las entidades siguen el orden de su clave INE. Cada punto muestra participación; su tamaño refleja LN y el detalle incluye los conteos. Se señalan bases menores de 100, sin ordenar las entidades por su porcentaje.", nonbinary)
    totals = special.groupby("MODALIDAD", as_index=False)["REGISTROS"].sum()
    detected = [column for column in ["GRUPO_EDAD", *COUNTS] if column in special]
    availability = "Columnas adicionales disponibles: " + ", ".join(detected) + "." if detected else "Los archivos recibidos no contienen EDAD ni LN, SV, NV o NS: no permiten calcular participación o abstención."
    result = ["## 4. Radiografía de inclusión 2024", "### Modalidades especiales", markdown_table(totals), markdown_table(counts), f"Los conteos describen filas de los archivos nacionales. {availability} Estas filas se mantienen separadas del universo ordinario. En Prisión Preventiva, ESTADO se homologa a EDOCVE; DEF y DEL son identificadores, nunca magnitudes sumables."]
    if "LN" in special and "SV" in special:
        eligible = special.loc[special["LN"].notna() & special["SV"].notna()]
        if not eligible.empty:
            available = [column for column in COUNTS if column in eligible and eligible[column].notna().all()]
            measured = with_rates(aggregate(eligible, ["MODALIDAD", "EDOCVE", "EDONOM_OFICIAL"], available))
            result.extend(["### Tasas para modalidades con conteos disponibles en esta ejecución", markdown_table(measured)])
    extras = [column for column in special if column.startswith("SUMA_")]
    if extras:
        result.extend(["### Columnas numéricas sin definición documentada", "Se muestran sumas exploratorias sin interpretarlas como personas o votos.", markdown_table(special.groupby("MODALIDAD", as_index=False)[extras].sum(min_count=1))])
    nb_totals = nonbinary[COUNTS].sum()
    nb_message = f"El conteo ordinario reúne LN={int(nb_totals['LN']):,}, SV={int(nb_totals['SV']):,}, NV={int(nb_totals['NV']):,} y NS={int(nb_totals['NS']):,} para la categoría No binario en {len(nonbinary)} entidades con registros. Estas bases pequeñas requieren acompañar cada porcentaje de sus conteos."
    result.extend(["### Registros no binarios: universo ordinario", nb_message, markdown_table(nonbinary.drop(columns="PARTICIPACION")), "La ausencia de una entidad o categoría no se convierte automáticamente en cero. ‘No binario’ en SEXO y voto mediante una modalidad especial son dimensiones distintas; no se consideran grupos excluyentes ni se suman entre sí.", "[Explorar modalidades](graficas/05_inclusion_modalidades.html) · [Explorar registros no binarios](graficas/06_inclusion_no_binario.html)"])
    return result


def main():
    args = arguments("Hallazgos verificables y gráficas interactivas para el Reto 3")
    national = read_csv(args.output / "cubo_nacional_demografico.csv")
    state = read_csv(args.output / "cubo_estatal_demografico.csv")
    municipal = read_csv(args.output / "cubo_municipal_historico.csv")
    special = read_csv(args.output / "resumen_modalidades_especiales_2024.csv")
    reference = aggregate(national, ["AELEC"]).set_index("AELEC")
    if set(reference.index) != set(YEARS):
        raise ValueError("El cubo nacional no contiene exactamente las seis elecciones")
    for name, frame in (("estatal", state), ("municipal", municipal)):
        actual = aggregate(frame, ["AELEC"]).set_index("AELEC")
        if not reference.equals(actual):
            raise ValueError(f"Los conteos del cubo {name} no coinciden por año con el nacional")
    charts = args.output / "graficas"
    charts.mkdir(parents=True, exist_ok=True)
    quality = rates(national, ["AELEC", "TIPO_ELECCION"])
    quality["LIMITE_SV_MAS_NS_PCT"] = quality["SV"].add(quality["NS"]).div(quality["LN"].where(quality["LN"].gt(0))).mul(100).round(2)
    report = ["# Participar después del primer llamado: hallazgos para el Reto 3", "## Mensaje central y público", "Público propuesto: jóvenes de 18 a 29 años y equipos de educación cívica. Mensaje a contrastar con la evidencia: acompañar la participación más allá de los 18-19 años y durante las elecciones intermedias. Las cuatro secciones siguientes muestran resultados observados, denominadores y límites de interpretación.", "## Cobertura y calidad de la información", markdown_table(quality.drop(columns="PARTICIPACION")), "SV son registros con marca de voto; NV, sin marca; NS, registros con información no especificada. Las tres tasas usan LN como denominador. NS no se reclasifica como abstención. El límite SV+NS es un máximo aritmético si todos los casos NS hubieran participado; no es una estimación ni un intervalo de confianza. Con LN=0, las tasas quedan vacías."]
    report.extend(age_story(national, charts))
    report.extend(gender_story(national, charts))
    report.extend(intermediate_story(national, state, charts))
    report.extend(inclusion_story(special, state, charts))
    report.extend([
        "## Uso público y difusión propuesta",
        "Propuesta: convertir la curva de edad en un carrusel para jóvenes de 18-29 años, con una pregunta inicial, tres comparaciones y una invitación a consultar los datos. Difundir mediante redes institucionales, universidades y materiales de educación cívica. Las gráficas por entidad permiten adaptar conversaciones locales. Publicar siempre año, denominador y tratamiento de NS; evaluar comprensión mediante preguntas breves antes y después de mostrar la pieza. Estas acciones son propuestas a evaluar, sin evidencia causal de impacto en estos datos.",
        "## Fuentes, método y reproducción",
        "Fuente primaria: CSV y diccionarios de campos locales de INE/DECEyEC, CCPC 2009–2024. La convocatoria y la rúbrica adjuntas se utilizaron como contexto de claridad, pertinencia y reproducibilidad; no sustituyen la solicitud de generar estos scripts.",
        "Se validan 32 archivos y 32 entidades distintas por elección, años, claves, conteos enteros no negativos y LN=SV+NV+NS en cada fila. Se procesan bloques de tamaño configurable y se comprueba la conservación de los cuatro conteos en los tres cubos, además de su coincidencia por año al crear este reporte. Los valores desconocidos de edad, sexo o tipo de sección se conservan como ‘No especificado’ para evitar pérdida de totales. Las edades fraccionarias o menores de 18 no se asignan a grupos válidos.",
        "EDONOM_OFICIAL usa un catálogo único de las 32 claves INE y nombres de uso institucional. Las claves municipales son locales a cada entidad y se conservan con EDOCVE y año; no se suponen límites ni nombres municipales constantes entre elecciones. Los cambios de secciones o municipios impiden asumir paneles territoriales sin cartografía adicional.",
        "Según el diccionario de campos recibido, los datos ordinarios proceden de cuadernillos de lista nominal: no incluyen participación en casillas especiales ni voto desde el extranjero. No deben equipararse automáticamente a los porcentajes obtenidos de cómputos distritales. Las diferencias por edad son cortes transversales, no trayectorias individuales.",
        "Desde Proyecto INE, instalar las dependencias con `python -m pip install -r analysis/requirements.txt` y ejecutar, en orden: `python analysis/01_auditoria_rapida.py`, `python analysis/02_generar_cubos.py`, `python analysis/03_hallazgos_storytelling.py`. Se pueden indicar `--datos` y `--output`; esta última ruta debe permanecer dentro del proyecto. El segundo script acepta `--chunksize`. Cada HTML comparte plotly.min.js en la misma carpeta para funcionar sin conexión; conservar juntos esos archivos al trasladarlos.",
        "Referencias técnicas: [lectura por bloques de pandas](https://pandas.pydata.org/docs/reference/api/pandas.read_csv.html) y [exportación HTML de Plotly](https://plotly.com/python/interactive-html-export/).",
    ])
    destination = args.output / "hallazgos_clave_reto3.md"
    destination.write_text("\n\n".join(report) + "\n", encoding="utf-8")
    print(f"Reporte: {destination}\nGráficas: {charts} (6 HTML y biblioteca local)")


if __name__ == "__main__":
    main()
