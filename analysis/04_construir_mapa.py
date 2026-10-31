import base64
import hashlib
import json
import xml.etree.ElementTree as ET

import pandas as pd

from ccpc import AGES, BASE, COUNTS, STATES, YEARS, aggregate, arguments, read_csv
from ccpc.mapa import interactive_svg, verified_mapping


SECTIONS = ["Urbana", "Mixta", "Rural", "No especificado"]
SEXES = ["Hombres", "Mujeres", "No binario", "No especificado"]
MODALITIES = ["Voto Anticipado", "Prisión Preventiva"]


def encode_demographic(frame, national=False):
    rows = []
    for row in frame.to_dict("records"):
        rows.append([int(row["AELEC"]), 0 if national else int(row["EDOCVE"]), SECTIONS.index(row["TIPOSEC"]), SEXES.index(row["SEXO"]), (AGES + ["No especificado"]).index(row["GRUPO_EDAD"]), *[int(row[count]) for count in COUNTS]])
    return rows


def build_payload(output):
    names = ["cubo_nacional_demografico.csv", "cubo_estatal_demografico.csv", "cubo_municipal_historico.csv", "resumen_modalidades_especiales_2024.csv"]
    national, state, municipal, special = [read_csv(output / name) for name in names]
    reference = aggregate(national, ["AELEC"]).set_index("AELEC")
    if set(reference.index) != set(YEARS):
        raise ValueError("Faltan elecciones en el cubo nacional")
    for name, frame in (("estatal", state), ("municipal", municipal)):
        if not reference.equals(aggregate(frame, ["AELEC"]).set_index("AELEC")):
            raise ValueError(f"Totales del cubo {name} inconsistentes con el nacional")
        if set(frame["EDOCVE"].unique()) != set(STATES):
            raise ValueError(f"Faltan entidades en el cubo {name}")
    for frame in (national, state, municipal):
        if frame[COUNTS].isna().any().any() or frame[COUNTS].lt(0).any().any():
            raise ValueError("Conteos nulos o negativos en los cubos")
        if frame["LN"].ne(frame[["SV", "NV", "NS"]].sum(axis=1)).any():
            raise ValueError("No se cumple LN=SV+NV+NS")
    data = {
        "years": list(YEARS), "states": STATES, "ages": AGES, "sections": SECTIONS,
        "sexes": SEXES, "modalities": MODALITIES,
        "rows": encode_demographic(national, national=True) + encode_demographic(state),
        "special": [[int(row["EDOCVE"]), SEXES.index(row["SEXO"]), MODALITIES.index(row["MODALIDAD"]), int(row["REGISTROS"])] for row in special.to_dict("records")],
        "sources": [{"file": name, "sha256": hashlib.sha256((output / name).read_bytes()).hexdigest()} for name in names],
    }
    municipal_rows = [[int(row["AELEC"]), int(row["EDOCVE"]), int(row["MPIOCVE"]), str(row["MPIONOM"]), SECTIONS.index(row["TIPOSEC"]), *[int(row[count]) for count in COUNTS]] for row in municipal.to_dict("records")]
    return data, municipal_rows


def json_script(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False).replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")


def school_preview():
    svg = ET.fromstring(interactive_svg())
    svg.attrib = {"viewBox": svg.get("viewBox"), "aria-hidden": "true", "focusable": "false"}
    palette = ["#f4c750", "#ec7983", "#74bda0", "#a68bc5", "#ee9b58", "#78bddd"]
    _, _, entities, _ = verified_mapping()
    for index, group in enumerate(svg):
        group.attrib = {"fill": palette[(index * 7 + index // 6) % len(palette)], "stroke": "#fdf6dc", "stroke-width": "8"}
        for path in group:
            path.attrib.pop("data-source-path", None)
    for entity in entities:
        if entity["edocve"] in [1, 6, 9, 17, 29]:
            continue
        x, y = entity["official_reference_svg"]
        label = ET.SubElement(svg, "{http://www.w3.org/2000/svg}text", {"x": str(x), "y": str(y), "text-anchor": "middle", "font-size": "62", "font-family": "Jakarta, sans-serif", "fill": "#233f51", "stroke": "none"})
        label.text = entity["name"].split()[0][:7]
    return ET.tostring(svg, encoding="unicode")


def main():
    args = arguments("Construye un mapa autocontenido y offline a partir de los cuatro cubos CCPC")
    _, paths, entities, mapping = verified_mapping()
    data, municipal = build_payload(args.output)
    template = (BASE / "web" / "index.template.html").read_text(encoding="utf-8")
    substitutions = {
        "@@CSS@@": (BASE / "web" / "styles.css").read_text(encoding="utf-8"),
        "@@SCENE_CSS@@": (BASE / "web" / "scene.css").read_text(encoding="utf-8"),
        "@@SCENE_APP@@": (BASE / "web" / "scene.js").read_text(encoding="utf-8"),
        "@@PREVIEW_MAP@@": school_preview(),
        "@@ENGINE@@": (BASE / "web" / "data-engine.js").read_text(encoding="utf-8"),
        "@@GAME_CONTENT@@": (BASE / "web" / "game-content.js").read_text(encoding="utf-8"),
        "@@APP@@": (BASE / "web" / "app.js").read_text(encoding="utf-8"),
        "@@MAP@@": interactive_svg(),
        "@@DATA@@": json_script(data),
        "@@MUNICIPAL@@": json_script(municipal),
        "@@FONT@@": base64.b64encode((BASE / "assets" / "fonts" / "PlusJakartaSans.ttf").read_bytes()).decode("ascii"),
        "@@MONO_FONT@@": base64.b64encode((BASE / "assets" / "fonts" / "JetBrainsMono.ttf").read_bytes()).decode("ascii"),
        "@@MAP_SOURCE@@": mapping["source_sha256"],
    }
    for token, value in substitutions.items():
        template = template.replace(token, value)
    destination = BASE / "index.html"
    destination.parent.mkdir(parents=True, exist_ok=True)
    images = [BASE / "assets/imgs/backgrounds/bg-mesa-dibujo.png", *[BASE / "assets/imgs/loteria" / filename for filename in ["18-el-primer-voto.jpg", "22-la-intermedia.jpg", "61-la-votante.jpg", "24-la-inclusion.jpg", "reverso.jpg"]]]
    if any(not source.is_file() for source in images):
        raise ValueError("Faltan imágenes necesarias en assets/imgs")
    temporary = destination.with_suffix(".html.tmp")
    temporary.write_text(template, encoding="utf-8")
    temporary.replace(destination)
    print(f"Mapa: {destination}\nVinculación: {len(entities)} entidades, {len(paths)} piezas SVG\nDatos: {len(data['rows']):,} grupos demográficos; {len(municipal):,} grupos municipales\nHTML: {destination.stat().st_size / 1024 / 1024:.2f} MB; imágenes locales: {len(images)}")


if __name__ == "__main__":
    main()
