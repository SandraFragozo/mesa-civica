import argparse
import codecs
import csv
from pathlib import Path

import pandas as pd


BASE = Path(__file__).resolve().parents[2]
YEARS = (2009, 2012, 2015, 2018, 2021, 2024)
PREFIX = "DatosAbiertos_DECEyEC_ConteosCensales"
SPECIAL = {"_VotoAnticipado2024": "Voto Anticipado", "_PrisionPreventiva2024": "Prisión Preventiva"}
STATES = dict(enumerate((
    "Aguascalientes", "Baja California", "Baja California Sur", "Campeche",
    "Coahuila", "Colima", "Chiapas", "Chihuahua", "Ciudad de México", "Durango",
    "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Estado de México", "Michoacán",
    "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro",
    "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas",
    "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas",
), 1))
AGES = ["18-19 (Primovotantes)", "20-24", "25-29", "30-39", "40-49", "50-59", "60-69", "70+"]
COUNTS = ["LN", "SV", "NV", "NS"]
RATES = {"SV": "TASA_PARTICIPACION", "NV": "TASA_ABSTENCION", "NS": "TASA_NS"}
DEMOGRAPHIC = ["AELEC", "TIPO_ELECCION", "TIPOSEC", "SEXO", "GRUPO_EDAD"]
STATE_DEMOGRAPHIC = ["AELEC", "TIPO_ELECCION", "EDOCVE", "EDONOM_OFICIAL", "TIPOSEC", "SEXO", "GRUPO_EDAD"]
MUNICIPAL = ["AELEC", "TIPO_ELECCION", "EDOCVE", "EDONOM_OFICIAL", "MPIOCVE", "MPIONOM", "TIPOSEC"]
REQUIRED = {"AELEC", "FELECCION", "EDOCVE", "EDONOM", "MPIOCVE", "MPIONOM", "SECCION", "TIPOSEC", "DEF", "DEL", "SEXO", "EDAD", *COUNTS}


def arguments(description, data=False, chunks=False):
    parser = argparse.ArgumentParser(description=description)
    if data:
        parser.add_argument("--datos", type=Path, default=BASE.parent / "Datos")
    parser.add_argument("--output", type=Path, default=BASE / "output")
    if chunks:
        parser.add_argument("--chunksize", type=int, default=150_000)
    args = parser.parse_args()
    args.output = args.output.resolve()
    if not args.output.is_relative_to(BASE):
        parser.error("--output debe estar dentro de Proyecto INE")
    if chunks and args.chunksize < 1:
        parser.error("--chunksize debe ser positivo")
    args.output.mkdir(parents=True, exist_ok=True)
    return args


def folders(data):
    return [(data / f"{PREFIX}{year}", year) for year in YEARS] + [(data / f"{PREFIX}{suffix}", 2024) for suffix in SPECIAL]


def csv_files(folder):
    paths = sorted(p for p in folder.iterdir() if p.is_file() and p.suffix.lower() == ".csv")
    if not paths:
        raise ValueError(f"Sin archivos CSV: {folder}")
    return paths


def csv_format(path):
    for encoding in ("utf-8", "utf-8-sig", "latin-1"):
        try:
            decoder = codecs.getincrementaldecoder(encoding)(errors="strict")
            with path.open("rb") as stream:
                while block := stream.read(1024 * 1024):
                    decoder.decode(block)
                decoder.decode(b"", final=True)
            with path.open(encoding=encoding, newline="") as stream:
                sample = stream.read(16_384).lstrip("\ufeff")
            try:
                separator = csv.Sniffer().sniff(sample, delimiters=",;\t|").delimiter
            except csv.Error:
                header = sample.splitlines()[0]
                separator = max(",;\t|", key=header.count)
                if separator not in header:
                    raise ValueError(f"No se reconoce el separador de {path}")
            return encoding, separator
        except UnicodeDecodeError:
            continue
    raise ValueError(f"No se pudo decodificar {path}")


def clean_columns(frame):
    names = [str(col).lstrip("\ufeff").strip().upper() for col in frame.columns]
    if len(names) != len(set(names)):
        raise ValueError("Encabezados duplicados después de homologar")
    frame.columns = names
    return frame


def read_csv(path, nrows=None, chunksize=None, fmt=None):
    encoding, separator = fmt or csv_format(path)
    with path.open(encoding=encoding, newline="") as stream:
        names = next(csv.reader(stream, delimiter=separator))
    header = clean_columns(pd.DataFrame(columns=names))
    options = dict(sep=separator, encoding=encoding, on_bad_lines="error", low_memory=False)
    raw = pd.read_csv(path, nrows=nrows, chunksize=chunksize, **options)
    if chunksize:
        def blocks():
            with raw as reader:
                for block in reader:
                    if len(block.columns) != len(header.columns) or not isinstance(block.index, pd.RangeIndex):
                        raise ValueError(f"Número de columnas inconsistente: {path}")
                    yield clean_columns(block)
        return blocks()
    if not isinstance(raw.index, pd.RangeIndex):
        raise ValueError(f"Filas con más valores que encabezados: {path}")
    return clean_columns(raw)


def integers(series, label, minimum=0):
    result = pd.to_numeric(series, errors="raise")
    invalid = result.isna() | result.lt(minimum) | result.mod(1).ne(0)
    if invalid.any():
        raise ValueError(f"{label}: valores nulos, negativos o no enteros: {series[invalid].head().tolist()}")
    return result.astype("int64")


def normalize(frame, year, ordinary=True):
    if ordinary and (missing := REQUIRED - set(frame.columns)):
        raise ValueError(f"Faltan columnas obligatorias: {sorted(missing)}")
    frame = frame.copy()
    if "EDOCVE" not in frame and "ESTADO" in frame:
        frame = frame.rename(columns={"ESTADO": "EDOCVE"})
    for column in ("AELEC", "EDOCVE", "SEXO"):
        if column not in frame:
            raise ValueError(f"Falta {column}")
    frame["AELEC"] = integers(frame["AELEC"], "AELEC")
    if not frame["AELEC"].eq(year).all():
        raise ValueError(f"AELEC no coincide con la carpeta {year}")
    frame["EDOCVE"] = integers(frame["EDOCVE"], "EDOCVE", 1)
    if not frame["EDOCVE"].isin(STATES).all():
        raise ValueError("EDOCVE fuera del catálogo INE 1-32")
    frame["EDONOM_OFICIAL"] = frame["EDOCVE"].map(STATES)
    frame["SEXO"] = pd.to_numeric(frame["SEXO"], errors="coerce").map({0: "Hombres", 1: "Mujeres", 2: "No binario"}).fillna("No especificado")
    frame["TIPO_ELECCION"] = "Presidencial" if year in (2012, 2018, 2024) else "Intermedia"
    if "TIPOSEC" in frame:
        frame["TIPOSEC"] = frame["TIPOSEC"].astype("string").str.strip().str.upper().map({
            "U": "Urbana", "URBANA": "Urbana", "M": "Mixta", "MIXTA": "Mixta", "R": "Rural", "RURAL": "Rural",
        }).fillna("No especificado")
    if "EDAD" in frame:
        age = pd.to_numeric(frame["EDAD"], errors="coerce")
        age = age.where(age.mod(1).eq(0) & age.ne(float("inf")))
        frame["GRUPO_EDAD"] = pd.cut(age, bins=[18, 20, 25, 30, 40, 50, 60, 70, float("inf")], labels=AGES, right=False).astype("string").fillna("No especificado")
    if ordinary:
        frame["MPIOCVE"] = integers(frame["MPIOCVE"], "MPIOCVE")
        frame["MPIONOM"] = frame["MPIONOM"].astype("string").str.strip().fillna("No especificado").replace("", "No especificado")
    for count in COUNTS:
        if count in frame:
            frame[count] = integers(frame[count], count)
    if "LN" in frame:
        for count in ("SV", "NV", "NS"):
            if count in frame and frame[count].gt(frame["LN"]).any():
                raise ValueError(f"{count} supera LN")
    if set(COUNTS).issubset(frame.columns):
        invalid = frame["LN"].ne(frame[["SV", "NV", "NS"]].sum(axis=1))
        if invalid.any():
            raise ValueError(f"LN != SV + NV + NS en {int(invalid.sum())} filas")
    return frame


def aggregate(frame, keys, metrics=COUNTS):
    return frame.groupby(keys, as_index=False, observed=True, dropna=False, sort=True)[metrics].sum()


def with_rates(frame):
    frame = frame.copy()
    if "LN" in frame:
        denominator = frame["LN"].where(frame["LN"].gt(0))
        for count, rate in RATES.items():
            if count in frame:
                frame[rate] = frame[count].div(denominator).mul(100).round(2)
    return frame


def save_csv(frame, path):
    temporary = path.with_suffix(".csv.tmp")
    frame.to_csv(temporary, index=False, encoding="utf-8-sig")
    temporary.replace(path)


def markdown_table(frame):
    def cell(value):
        if pd.isna(value):
            return "Sin dato"
        if isinstance(value, float):
            return f"{value:,.2f}"
        return str(value).replace("|", "\\|").replace("\n", " ")
    rows = ["| " + " | ".join(map(str, frame.columns)) + " |", "| " + " | ".join("---" for _ in frame.columns) + " |"]
    rows.extend("| " + " | ".join(cell(value) for value in row) + " |" for row in frame.itertuples(index=False, name=None))
    return "\n".join(rows)
