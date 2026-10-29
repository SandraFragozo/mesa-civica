import base64
import hashlib
import json

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


def main():
    args = arguments("Construye un mapa autocontenido y offline a partir de los cuatro cubos CCPC")
    _, paths, entities, mapping = verified_mapping()
    data, municipal = build_payload(args.output)
    template = (BASE / "web" / "index.template.html").read_text(encoding="utf-8")
    substitutions = {
        "@@CSS@@": (BASE / "web" / "styles.css").read_text(encoding="utf-8"),
        "@@ENGINE@@": (BASE / "web" / "data-engine.js").read_text(encoding="utf-8"),
        "@@APP@@": (BASE / "web" / "app.js").read_text(encoding="utf-8"),
        "@@MAP@@": interactive_svg(),
        "@@DATA@@": json_script(data),
        "@@MUNICIPAL@@": json_script(municipal),
        "@@FONT@@": base64.b64encode((BASE / "assets" / "fonts" / "Manrope.ttf").read_bytes()).decode("ascii"),
        "@@MAP_SOURCE@@": mapping["source_sha256"],
    }
    for token, value in substitutions.items():
        template = template.replace(token, value)
    destination = args.output / "mapa_interactivo" / "index.html"
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(".html.tmp")
    temporary.write_text(template, encoding="utf-8")
    temporary.replace(destination)
    print(f"Mapa: {destination}\nVinculación: {len(entities)} entidades, {len(paths)} piezas SVG\nDatos: {len(data['rows']):,} grupos demográficos; {len(municipal):,} grupos municipales\nTamaño autocontenido: {destination.stat().st_size / 1024 / 1024:.2f} MB")


if __name__ == "__main__":
    main()
