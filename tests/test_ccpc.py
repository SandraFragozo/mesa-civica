import importlib.util
from pathlib import Path
import tempfile
import unittest

import pandas as pd

from ccpc import AGES, BASE, COUNTS, PREFIX, SPECIAL, aggregate, normalize, read_csv, with_rates


def load_script(name):
    spec = importlib.util.spec_from_file_location(name, BASE / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class HomologationTests(unittest.TestCase):
    def setUp(self):
        local = BASE / ".local"
        local.mkdir(exist_ok=True)
        self.directory = tempfile.TemporaryDirectory(dir=local)
        self.root = Path(self.directory.name)
        self.addCleanup(self.directory.cleanup)

    def special_frame(self, **extra):
        return pd.DataFrame({"AELEC": [2024], "EDOCVE": [9], "SEXO": [0], **extra})

    def test_reader_encodings_delimiters_and_bom(self):
        for index, (encoding, delimiter) in enumerate((("utf-8", ","), ("utf-8-sig", ";"), ("latin-1", "\t"), ("utf-8", "|"))):
            path = self.root / f"sample{index}.csv"
            path.write_text(f" aelec {delimiter} edonom\n2024{delimiter}México\n", encoding=encoding)
            frame = read_csv(path)
            self.assertEqual(list(frame), ["AELEC", "EDONOM"])
            self.assertEqual(frame.iloc[0]["EDONOM"], "México")

    def test_latin1_error_after_first_megabyte(self):
        path = self.root / "late.csv"
        path.write_bytes(b"ID;NOMBRE\n" + b"1;Estado\n" * 140000 + "2;México\n".encode("latin-1"))
        chunks = list(read_csv(path, chunksize=50000))
        self.assertEqual(chunks[-1].iloc[-1]["NOMBRE"], "México")
        self.assertEqual(sum(map(len, chunks)), 140001)

    def test_duplicate_headers_and_bad_arity_fail(self):
        for text in (" a ;A\n1;2\n", "A,B\n1,2,3\n"):
            path = self.root / "bad.csv"
            path.write_text(text, encoding="utf-8")
            with self.assertRaises(ValueError):
                read_csv(path)

    def test_weighted_rates_and_zero_denominator(self):
        raw = pd.DataFrame({"GROUP": [1, 1, 2], "LN": [10, 90, 0], "SV": [10, 0, 0], "NV": [0, 80, 0], "NS": [0, 10, 0]})
        result = with_rates(aggregate(raw, ["GROUP"])).set_index("GROUP")
        self.assertEqual(result.loc[1, "TASA_PARTICIPACION"], 10)
        self.assertEqual(result.loc[1, "TASA_ABSTENCION"], 80)
        self.assertEqual(result.loc[1, "TASA_NS"], 10)
        self.assertTrue(pd.isna(result.loc[2, "TASA_PARTICIPACION"]))

    def test_age_boundaries_and_unknown_values_preserve_records(self):
        ages = [18, 19, 20, 24, 25, 29, 30, 39, 40, 49, 50, 59, 60, 69, 70, 120, 17, None, "mal", 20.5]
        frame = pd.DataFrame({"AELEC": [2024] * len(ages), "EDOCVE": [9] * len(ages), "SEXO": [2] * len(ages), "EDAD": ages})
        result = normalize(frame, 2024, ordinary=False)
        self.assertEqual(result["GRUPO_EDAD"].tolist(), [group for group in AGES for _ in range(2)] + ["No especificado"] * 4)
        self.assertEqual(len(result), len(frame))

    def test_catalog_sex_section_and_state_alias(self):
        frame = pd.DataFrame({"AELEC": [2024] * 7, "ESTADO": [9] * 7, "EDONOM": ["DISTRITO FEDERAL"] * 7, "SEXO": [0, 1, 2, 3, None, "?", "1"], "TIPOSEC": ["U", " urbana ", "M", "Mixta", "R", "RURAL", "?"]})
        result = normalize(frame, 2024, ordinary=False)
        self.assertEqual(set(result["EDONOM_OFICIAL"]), {"Ciudad de México"})
        self.assertEqual(result["SEXO"].tolist(), ["Hombres", "Mujeres", "No binario", "No especificado", "No especificado", "No especificado", "Mujeres"])
        self.assertEqual(result["TIPOSEC"].tolist(), ["Urbana", "Urbana", "Mixta", "Mixta", "Rural", "Rural", "No especificado"])

    def test_invalid_state_year_and_count_identity_fail(self):
        for extra in ({"EDOCVE": [33]}, {"AELEC": [2021]}, {"LN": [5], "SV": [3], "NV": [1], "NS": [0]}, {"LN": [-1]}, {"SV": [0.5]}, {"LN": [1], "SV": [2]}):
            with self.assertRaises(ValueError):
                normalize(self.special_frame(**extra), 2024, ordinary=False)

    def test_incremental_aggregation_equals_full_aggregation(self):
        path = self.root / "counts.csv"
        pd.DataFrame({"GROUP": [1, 2, 1, 2, 1], "LN": [8, 9, 10, 4, 1], "SV": [4, 2, 5, 0, 1], "NV": [4, 6, 4, 3, 0], "NS": [0, 1, 1, 1, 0]}).to_csv(path, index=False)
        parts = [aggregate(chunk, ["GROUP"]) for chunk in read_csv(path, chunksize=2)]
        full = with_rates(aggregate(read_csv(path), ["GROUP"]))
        incremental = with_rates(aggregate(pd.concat(parts), ["GROUP"]))
        pd.testing.assert_frame_equal(full, incremental)

    def test_special_ids_not_summed_and_unknown_numeric_columns_separate(self):
        script = load_script("02_generar_cubos")
        for suffix in SPECIAL:
            folder = self.root / f"{PREFIX}{suffix}"
            folder.mkdir()
            frame = pd.DataFrame({"AELEC": [2024, 2024], "ESTADO": [9, 9], "DEF": [3, 4], "SEXO": [0, 0], "EDAD": [18, 19], "CONTEO_EXTRA": [5, 7]})
            frame.to_csv(folder / "datos.csv", index=False)
        result = script.special_summary(self.root)
        self.assertEqual(result["REGISTROS"].tolist(), [2, 2])
        self.assertEqual(result["SUMA_CONTEO_EXTRA"].tolist(), [12, 12])
        self.assertEqual(result["GRUPO_EDAD"].tolist(), [AGES[0], AGES[0]])
        self.assertNotIn("SUMA_DEF", result)
        self.assertNotIn("TASA_PARTICIPACION", result)

    def test_election_gap_uses_counts_and_unrounded_rates(self):
        script = load_script("03_hallazgos_storytelling")
        frame = pd.DataFrame({"GROUP": ["A"] * 4, "TIPO_ELECCION": ["Presidencial", "Presidencial", "Intermedia", "Intermedia"], "LN": [3, 97, 9, 91], "SV": [3, 47, 0, 25], "NV": [0, 50, 9, 66], "NS": [0] * 4})
        result = script.election_gap(frame, ["GROUP"])
        self.assertEqual(result.iloc[0]["BRECHA_PP"], 25)
        self.assertEqual(result.iloc[0]["LN_PRESIDENCIAL"], 100)


if __name__ == "__main__":
    unittest.main()
