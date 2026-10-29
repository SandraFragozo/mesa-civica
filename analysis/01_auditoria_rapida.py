import json

import pandas as pd

from ccpc import arguments, csv_files, csv_format, folders, markdown_table, read_csv


def main():
    args = arguments("Auditoría de un CSV y sus primeras cinco filas por carpeta", data=True)
    report = ["# Auditoría rápida CCPC 2009-2024", "Se inspecciona el primer CSV en orden alfabético de cada carpeta. Los tipos y valores únicos describen únicamente las primeras cinco filas; no representan el dominio completo del archivo. La codificación se valida por bloques sobre todo el archivo para evitar fallos tardíos."]
    for folder, year in folders(args.datos):
        paths = csv_files(folder)
        path = paths[0]
        fmt = csv_format(path)
        frame = read_csv(path, nrows=5, fmt=fmt)
        exact = pd.read_csv(path, encoding=fmt[0], sep=fmt[1], nrows=0).columns.tolist()
        report.extend([
            f"## {folder.name}",
            f"Archivo: `{path.name}`. CSV en carpeta: {len(paths)}. Año esperado: {year}. Codificación: `{fmt[0]}`. Separador: `{repr(fmt[1])}`.",
            "Columnas encontradas antes de homologar: `" + json.dumps(exact, ensure_ascii=False) + "`.",
            markdown_table(pd.DataFrame({"Columna homologada": frame.columns, "Tipo inferido (5 filas)": [str(t) for t in frame.dtypes]})),
        ])
        for column in ("SEXO", "TIPOSEC"):
            values = json.dumps(frame[column].drop_duplicates().astype(str).tolist(), ensure_ascii=False) if column in frame else "Columna ausente"
            report.append(f"Valores únicos de `{column}` en la muestra: {values}.")
        report.extend(["### Primeras cinco filas", markdown_table(frame)])
        if "ESTADO" in frame and "EDOCVE" not in frame:
            report.append("Se detectó `ESTADO` como clave de entidad. El procesamiento aplicará el alias `ESTADO → EDOCVE` y validará el intervalo 1-32.")
        if not {"LN", "SV"}.issubset(frame.columns):
            report.append("Sin numerador y denominador documentados de participación. Se contarán registros, sin inferir votos ni porcentajes a partir de identificadores numéricos.")
        print(f"Auditado: {path.name}", flush=True)
    path = args.output / "reporte_auditoria.md"
    path.write_text("\n\n".join(report) + "\n", encoding="utf-8")
    print(path)


if __name__ == "__main__":
    main()
