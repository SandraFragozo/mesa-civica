import pandas as pd

from ccpc import COUNTS, DEMOGRAPHIC, MUNICIPAL, PREFIX, SPECIAL, STATE_DEMOGRAPHIC, YEARS, aggregate, arguments, csv_files, normalize, read_csv, save_csv, with_rates


def special_summary(data):
    summaries = []
    identifiers = {"AELEC", "EDOCVE", "ESTADO", "EDONOM", "EDONOM_OFICIAL", "MPIOCVE", "MPIONOM", "SECCION", "TIPOSEC", "DEF", "DEL", "SEXO", "EDAD", "TIPO_ELECCION", "GRUPO_EDAD"}
    for suffix, modality in SPECIAL.items():
        paths = csv_files(data / f"{PREFIX}{suffix}")
        if len(paths) != 1:
            raise ValueError(f"Se esperaba un CSV nacional en {suffix}")
        raw = read_csv(paths[0])
        frame = normalize(raw, 2024, ordinary=False)
        frame["MODALIDAD"] = modality
        frame["REGISTROS"] = 1
        keys = ["AELEC", "MODALIDAD", "EDOCVE", "EDONOM_OFICIAL", "SEXO"]
        if "GRUPO_EDAD" in frame:
            keys.append("GRUPO_EDAD")
        metrics = ["REGISTROS"] + [column for column in COUNTS if column in frame]
        extras = []
        for column in raw.columns:
            if column in identifiers or column in COUNTS or column.endswith(("CVE", "ID")):
                continue
            values = pd.to_numeric(raw[column], errors="coerce")
            if values.notna().all() and len(values) and values.ge(0).all():
                name = f"SUMA_{column}"
                frame[name] = values
                metrics.append(name)
                extras.append(column)
        summary = with_rates(aggregate(frame, keys, metrics))
        summary["BASE_MEDICION"] = "Conteos LN/SV disponibles" if {"LN", "SV"}.issubset(frame.columns) else "Registros; sin denominador de participación"
        summary["COLUMNAS_NUMERICAS_SIN_DEFINICION"] = ", ".join(extras)
        summaries.append(summary)
        print(f"{modality}: {len(frame):,} registros; métricas: {', '.join(metrics)}", flush=True)
    return pd.concat(summaries, ignore_index=True, sort=False)


def main():
    args = arguments("Homologación y agregación incremental de CCPC", data=True, chunks=True)
    state_parts, municipal_parts = [], []
    totals = pd.Series(0, index=COUNTS, dtype="int64")
    for year in YEARS:
        paths = csv_files(args.datos / f"{PREFIX}{year}")
        if len(paths) != 32:
            raise ValueError(f"{year}: se esperaban 32 CSV; encontrados {len(paths)}")
        year_states = set()
        year_rows = 0
        for path in paths:
            states, municipalities = [], []
            file_states = set()
            for chunk in read_csv(path, chunksize=args.chunksize):
                frame = normalize(chunk, year)
                if frame.empty:
                    continue
                file_states.update(frame["EDOCVE"].unique().tolist())
                year_rows += len(frame)
                totals = totals.add(frame[COUNTS].sum(), fill_value=0)
                states.append(aggregate(frame, STATE_DEMOGRAPHIC))
                municipalities.append(aggregate(frame, MUNICIPAL))
            if len(file_states) != 1 or year_states.intersection(file_states):
                raise ValueError(f"Archivo vacío, multiestatal o entidad repetida: {path}")
            year_states.update(file_states)
            state_parts.append(aggregate(pd.concat(states, ignore_index=True), STATE_DEMOGRAPHIC))
            municipal_parts.append(aggregate(pd.concat(municipalities, ignore_index=True), MUNICIPAL))
        if year_states != set(range(1, 33)):
            raise ValueError(f"Cobertura estatal incompleta: {year}")
        print(f"{year}: {len(paths)} CSV, {year_rows:,} filas y 32 entidades procesadas", flush=True)
    state = aggregate(pd.concat(state_parts, ignore_index=True), STATE_DEMOGRAPHIC)
    municipal = aggregate(pd.concat(municipal_parts, ignore_index=True), MUNICIPAL)
    national = aggregate(state, DEMOGRAPHIC)
    for name, frame in (("nacional_demografico", national), ("estatal_demografico", state), ("municipal_historico", municipal)):
        if not frame[COUNTS].sum().eq(totals).all():
            raise ValueError(f"Se perdieron conteos al agregar el cubo {name}")
        unknown = frame[[col for col in frame if col not in COUNTS]].eq("No especificado").any(axis=1)
        print(f"cubo_{name}: {len(frame):,} grupos; {int(unknown.sum())} con categorías no especificadas", flush=True)
    special = special_summary(args.datos)
    for name, frame in (("cubo_nacional_demografico.csv", national), ("cubo_estatal_demografico.csv", state), ("cubo_municipal_historico.csv", municipal)):
        save_csv(with_rates(frame), args.output / name)
    save_csv(special, args.output / "resumen_modalidades_especiales_2024.csv")
    print("Cuatro datasets guardados. Totales reconciliados con las filas originales:", totals.to_dict(), flush=True)


if __name__ == "__main__":
    main()
