import importlib.util
import json
import os
from pathlib import Path
import shutil
import unittest

import pandas as pd

from ccpc import AGES, BASE, COUNTS


def browser_path():
    candidates = [shutil.which(name) for name in ("chromium", "chromium-browser", "google-chrome", "msedge")]
    for folder in (os.environ.get("PROGRAMFILES", ""), os.environ.get("PROGRAMFILES(X86)", "")):
        if folder:
            candidates.extend([str(Path(folder) / "Google/Chrome/Application/chrome.exe"), str(Path(folder) / "Microsoft/Edge/Application/msedge.exe")])
    return next((candidate for candidate in candidates if candidate and Path(candidate).is_file()), None)


@unittest.skipUnless(importlib.util.find_spec("playwright") and browser_path(), "Requiere Playwright y Chrome/Chromium/Edge locales")
class OfflineDashboardTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from playwright.sync_api import sync_playwright
        cls.runtime = sync_playwright().start()
        cls.browser = cls.runtime.chromium.launch(executable_path=browser_path(), headless=True)
        cls.context = cls.browser.new_context(viewport={"width": 1440, "height": 1100}, offline=True, reduced_motion="reduce")
        cls.page = cls.context.new_page()
        cls.errors, cls.network = [], []
        cls.page.on("pageerror", lambda error: cls.errors.append(str(error)))
        cls.page.on("request", lambda request: cls.network.append(request.url) if request.url.startswith(("http:", "https:")) else None)
        cls.page.goto((BASE / "index.html").as_uri(), wait_until="load")
        cls.page.wait_for_function("document.querySelector('#stat-ln').textContent === '98,330,348'")
        cls.page.locator("#map-opener").click()
        cls.state = pd.read_csv(BASE / "output/cubo_estatal_demografico.csv")
        cls.national = pd.read_csv(BASE / "output/cubo_nacional_demografico.csv")

    @classmethod
    def tearDownClass(cls):
        cls.context.close()
        cls.browser.close()
        cls.runtime.stop()

    def configure(self, mode="participation", state=0, year=2024, sex="all", section="all", age="all"):
        page = self.page
        page.locator("#map-controls").evaluate("element => element.open = true")
        page.locator('[data-mode="participation"]').click()
        page.locator("#filter-year").select_option(str(year))
        page.locator("#filter-sex").select_option(str(sex))
        page.locator("#filter-section").select_option(str(section))
        page.locator("#filter-age").select_option(str(age))
        page.locator("#select-state").select_option(str(state))
        if mode != "participation":
            page.locator(f'[data-mode="{mode}"]').click()
        page.locator("#tab-summary").click()
        if mode == "gender":
            year, sex = 2024, "all"
        if mode == "age":
            age = "all"
        frame = self.national if state == 0 else self.state.loc[self.state["EDOCVE"].eq(state)]
        years = [2009, 2012, 2015, 2018, 2021, 2024] if mode == "election" else [year]
        frame = frame.loc[frame["AELEC"].isin(years)]
        if sex != "all":
            frame = frame.loc[frame["SEXO"].eq(["Hombres", "Mujeres", "No binario"][int(sex)])]
        if section != "all":
            frame = frame.loc[frame["TIPOSEC"].eq(["Urbana", "Mixta", "Rural"][int(section)])]
        if age != "all":
            frame = frame.loc[frame["GRUPO_EDAD"].eq(AGES[int(age)])]
        expected = {field.lower(): int(frame[field].sum()) for field in COUNTS}
        page.wait_for_function("expected => document.querySelector('#stat-ln').textContent === expected", arg=f"{expected['ln']:,}")
        for field, value in expected.items():
            self.assertEqual(page.locator(f"#stat-{field}").inner_text(), f"{value:,}")
        return frame, expected

    def test_01_all_32_geographic_click_targets_and_keyboard(self):
        self.configure()
        mapping = json.loads((BASE / "assets/mapas/vinculacion_edocve.json").read_text(encoding="utf-8"))
        self.page.locator("#mexico-map").scroll_into_view_if_needed()
        for entity in mapping["entities"]:
            point = self.page.evaluate("""point => { const svg = document.querySelector('#mexico-map'); const p = new DOMPoint(...point).matrixTransform(svg.getScreenCTM()); return {x:p.x,y:p.y,hit:document.elementFromPoint(p.x,p.y)?.closest('.state')?.dataset.edocve}; }""", entity["official_reference_svg"])
            self.assertEqual(point["hit"], str(entity["edocve"]))
            self.page.mouse.click(point["x"], point["y"])
            self.assertEqual(self.page.locator("#panel-title").inner_text(), entity["name"])
            self.assertEqual(self.page.locator("#select-state").input_value(), str(entity["edocve"]))
        self.page.locator("#mx-09").focus()
        self.page.keyboard.press("Enter")
        self.assertEqual(self.page.locator("#panel-title").inner_text(), "Ciudad de México")
        self.page.locator("#national-button").click()
        self.assertEqual(self.page.locator("#panel-title").inner_text(), "Total Nacional")

    def test_02_all_modes_and_filters_match_independent_csv_sums(self):
        cases = [
            {},
            dict(state=9, sex=1, section=0, age=2),
            dict(state=1, year=2009, sex=0, section=2, age=7),
            dict(state=15, year=2012, section=1, age=0),
            dict(state=23, year=2018, sex=0, section=0, age=5),
            dict(state=7, year=2015, sex=1),
            dict(state=32, year=2021, section=2, age=4),
            dict(state=9, sex=2, section=0),
            dict(state=2, sex=2, section=2, age=0),
            dict(mode="age"),
            dict(mode="age", state=9, sex=1, section=0, age=6),
            dict(mode="age", state=30, year=2015, sex=0, section=2),
            dict(mode="age", sex=2),
            dict(mode="election", state=9),
            dict(mode="election", state=23, sex=1, section=0, age=2),
            dict(mode="election", sex=2),
            dict(mode="gender"),
            dict(mode="gender", state=7, section=2, age=0),
            dict(mode="gender", state=1, year=2009, sex=0),
        ]
        def ratio(frame):
            return frame["SV"].sum() / frame["LN"].sum() * 100 if frame["LN"].sum() else None
        for case in cases:
            with self.subTest(case=case):
                frame, counts = self.configure(**case)
                mode = case.get("mode", "participation")
                if mode == "age":
                    a, b = ratio(frame.loc[frame["GRUPO_EDAD"].eq(AGES[0])]), ratio(frame.loc[frame["GRUPO_EDAD"].isin(AGES[1:3])])
                elif mode == "election":
                    a, b = ratio(frame.loc[frame["AELEC"].isin([2012, 2018, 2024])]), ratio(frame.loc[frame["AELEC"].isin([2009, 2015, 2021])])
                elif mode == "gender":
                    a, b = ratio(frame.loc[frame["SEXO"].eq("Mujeres")]), ratio(frame.loc[frame["SEXO"].eq("Hombres")])
                else:
                    a, b = ratio(frame), 0
                value = None if a is None or b is None else a - b
                title = self.page.locator("#story-title").inner_text()
                if value is None:
                    self.assertEqual(title, "La ausencia de datos también cuenta")
                else:
                    self.assertIn(f"{abs(value):,.2f}", title)
                self.assertEqual(self.page.locator("#filter-age").is_disabled(), mode == "age")
                self.assertEqual(self.page.locator("#filter-sex").is_disabled(), mode == "gender")
                self.assertEqual(self.page.locator("#filter-year").is_disabled(), mode in ("gender", "election"))

    def test_03_curves_render_and_points_match_csv(self):
        self.configure(state=9, sex=1, section=0)
        self.page.locator("#tab-age").click()
        self.page.locator('[data-chart="age"]').scroll_into_view_if_needed()
        self.page.locator("#age-chart svg").wait_for()
        points = self.page.locator("#age-chart [data-point]").evaluate_all("elements => elements.map(e => JSON.parse(e.dataset.point))")
        self.assertEqual(len(points), 16)
        for item in points:
            national = item["title"].startswith("Total Nacional")
            frame = self.national if national else self.state.loc[self.state["EDOCVE"].eq(9)]
            age = item["title"].split(" · ")[-1].replace("18–19", AGES[0])
            selected = frame.loc[frame["AELEC"].eq(2024) & frame["SEXO"].eq("Mujeres") & frame["TIPOSEC"].eq("Urbana") & frame["GRUPO_EDAD"].eq(age)]
            self.assertEqual(item["counts"]["ln"], int(selected["LN"].sum()))
            self.assertEqual(item["counts"]["sv"], int(selected["SV"].sum()))
        first = self.page.locator("#age-chart [data-point]").first
        first.focus()
        self.assertTrue(self.page.locator("#tooltip").is_visible())
        self.assertIn("LN", self.page.locator("#tooltip").inner_text())
        self.page.keyboard.press("Escape")
        self.assertTrue(self.page.locator("#tooltip").is_hidden())
        self.page.locator("#tab-history").click()
        self.page.locator('[data-chart="history"]').scroll_into_view_if_needed()
        self.page.locator("#history-chart svg").wait_for()
        self.assertEqual(self.page.locator("#history-chart [data-point]").count(), 12)
        self.assertEqual(self.page.locator("#history-chart rect[data-point]").count(), 3)

    def test_04_municipal_and_inclusion_data(self):
        self.configure(state=1)
        self.page.locator("#municipal-detail").evaluate("element => element.open = true")
        self.page.locator("#municipal-search").fill("jesus maria")
        self.assertIn("Jesús María", self.page.locator("#municipal-body").inner_text())
        raw = pd.read_csv(BASE / "output/cubo_municipal_historico.csv")
        selected = raw.loc[raw["AELEC"].eq(2024) & raw["EDOCVE"].eq(1) & raw["MPIONOM"].eq("Jesús María")]
        self.assertEqual(self.page.locator("#municipal-body tr td").nth(1).inner_text(), f"{int(selected['LN'].sum()):,}")
        self.configure(state=9)
        self.page.locator("#tab-inclusion").click()
        special = pd.read_csv(BASE / "output/resumen_modalidades_especiales_2024.csv")
        for row in self.page.locator("#special-counts div").all():
            modality = row.locator("dt").inner_text()
            count = int(special.loc[special["EDOCVE"].eq(9) & special["MODALIDAD"].eq(modality), "REGISTROS"].sum())
            self.assertEqual(row.locator("dd").inner_text(), f"{count:,}")
        self.configure(state=9, sex=2)
        self.assertTrue(self.page.locator("#small-base").is_visible())

    def test_05_responsive_offline_and_no_browser_errors(self):
        for width in (320, 390, 768, 1440):
            self.page.set_viewport_size({"width": width, "height": 900})
            self.configure(mode="election")
            widths = self.page.evaluate("({viewport: innerWidth, document: document.documentElement.scrollWidth, stats: [...document.querySelectorAll('.stat dd')].map(e => ({client:e.clientWidth,scroll:e.scrollWidth}))})")
            self.assertLessEqual(widths["document"], width)
            for stat in widths["stats"]:
                self.assertLessEqual(stat["scroll"], stat["client"] + 1, (width, stat))
        self.assertTrue(self.page.url.startswith("file:"))
        self.assertEqual(self.network, [])
        self.assertEqual(self.errors, [])

    def test_06_story_themes_and_rankings_match_csv(self):
        self.page.set_viewport_size({"width": 1440, "height": 1100})
        colors = set()
        def ratio(frame):
            return float(frame["SV"].sum() / frame["LN"].sum() * 100) if frame["LN"].sum() else None
        for mode in ("participation", "age", "election", "gender"):
            self.configure(mode=mode)
            self.assertEqual(self.page.locator("body").get_attribute("data-theme"), mode)
            colors.add(self.page.locator("#mx-09").evaluate("element => getComputedStyle(element).fill"))
            expected = []
            for state, frame in self.state.groupby("EDOCVE"):
                if mode != "election":
                    frame = frame.loc[frame["AELEC"].eq(2024)]
                if mode == "participation":
                    value = ratio(frame)
                elif mode == "age":
                    value = ratio(frame.loc[frame["GRUPO_EDAD"].eq(AGES[0])]) - ratio(frame.loc[frame["GRUPO_EDAD"].isin(AGES[1:3])])
                elif mode == "election":
                    value = ratio(frame.loc[frame["AELEC"].isin([2012, 2018, 2024])]) - ratio(frame.loc[frame["AELEC"].isin([2009, 2015, 2021])])
                else:
                    value = ratio(frame.loc[frame["SEXO"].eq("Mujeres")]) - ratio(frame.loc[frame["SEXO"].eq("Hombres")])
                expected.append((int(state), value))
            top = [state for state, value in sorted(expected, key=lambda item: (-item[1], item[0]))[:3]]
            bottom = [state for state, value in sorted(expected, key=lambda item: (item[1], item[0]))[:3]]
            actual = lambda selector: self.page.locator(selector + " [data-rank-state]").evaluate_all("elements => elements.map(element => Number(element.dataset.rankState))")
            self.assertEqual(actual("#ranking-top"), top)
            self.assertEqual(actual("#ranking-bottom"), bottom)
            self.page.locator("#ranking-top [data-rank-state]").first.click()
            self.assertEqual(self.page.locator("#select-state").input_value(), str(top[0]))
        self.assertEqual(len(colors), 4)
        self.configure(sex=2)
        self.assertEqual(self.page.locator("[data-rank-state]").count(), 0)

    def test_07_map_keeps_analytic_tools_and_delegates_games(self):
        self.configure(state=19)
        self.assertEqual(self.page.locator(".myth-game,#quiz-answers,[data-quiz]").count(),0)
        self.assertEqual(self.page.locator("[data-mode]").count(),4)
        self.assertEqual(self.page.locator("#municipal-detail,#metodologia").count(),2)
        self.assertEqual(self.page.locator("#balero-opener,#pirinola-opener,#dados-opener").count(),3)

    def test_08_tabs_stacked_bar_tooltip_and_paired_bars(self):
        frame, counts = self.configure(state=9, sex=0, age=2)
        widths = self.page.locator("#participation-stack > span").evaluate_all("elements => elements.map(element => parseFloat(element.style.width))")
        self.assertAlmostEqual(sum(widths), 100, delta=1e-4)
        for value, field in zip(widths, ("sv", "nv", "ns")):
            self.assertAlmostEqual(value, counts[field] / counts["ln"] * 100, delta=1e-4)
        self.page.locator("#mx-09").focus()
        self.assertEqual(self.page.locator("#tooltip .tip-row").count(), 2)
        self.assertIn("Total Nacional", self.page.locator("#tooltip").inner_text())
        self.page.locator("#tab-summary").focus()
        self.page.keyboard.press("ArrowRight")
        self.assertEqual(self.page.locator("#tab-age").get_attribute("aria-selected"), "true")
        self.assertTrue(self.page.locator("#panel-age").is_visible())
        self.page.locator("#tab-territory").click()
        records = self.page.locator(".section-bars[data-section='0'] [data-bar-counts]").evaluate_all("elements => elements.map(element => JSON.parse(element.dataset.barCounts))")
        for actual, sex in zip(records, ("Mujeres", "Hombres")):
            selected = self.state.loc[self.state["EDOCVE"].eq(9) & self.state["AELEC"].eq(2024) & self.state["GRUPO_EDAD"].eq(AGES[2]) & self.state["TIPOSEC"].eq("Urbana") & self.state["SEXO"].eq(sex)]
            self.assertEqual(actual["ln"], int(selected["LN"].sum()))
            self.assertEqual(actual["sv"], int(selected["SV"].sum()))


if __name__ == "__main__":
    unittest.main()
