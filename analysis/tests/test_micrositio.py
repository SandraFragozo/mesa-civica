import importlib.util
import os
from pathlib import Path
import shutil
import unittest

import pandas as pd

from ccpc import AGES, BASE


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
        cls.state = pd.read_csv(BASE / "output/cubo_estatal_demografico.csv")
        cls.national = pd.read_csv(BASE / "output/cubo_nacional_demografico.csv")

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.runtime.stop()

    def setUp(self):
        self.context = self.browser.new_context(viewport={"width": 1440, "height": 900}, offline=True, reduced_motion="reduce")
        self.page = self.context.new_page()
        self.errors = []
        self.network = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))
        self.page.on("request", lambda request: self.network.append(request.url) if request.url.startswith(("http:", "https:")) else None)
        self.page.goto((BASE / "index.html").as_uri(), wait_until="load")
        self.page.locator("#map-opener").click()

    def tearDown(self):
        self.assertEqual(self.errors, [])
        self.assertEqual(self.network, [])
        self.context.close()

    def test_01_no_initial_selection_and_all_32_states(self):
        self.assertEqual(self.page.locator("#mexico-map .state").count(), 32)
        self.assertEqual(self.page.locator('.state[aria-pressed="true"]').count(), 0)
        self.assertTrue(self.page.locator("#simple-map-hint").is_visible())
        self.assertEqual(self.page.locator("#simple-comparison-body tr").count(), 1)
        self.assertIn("98,330,348", self.page.locator("#simple-comparison-body").inner_text())
        self.assertEqual(self.page.locator("#municipal-detail").count(), 0)

    def test_02_multiple_states_and_complete_outline(self):
        self.page.locator('.state[data-edocve="1"]').click()
        self.page.locator('.state[data-edocve="2"]').click()
        self.assertEqual(self.page.locator('.state[aria-pressed="true"]').count(), 2)
        self.assertEqual(self.page.locator("#simple-comparison-body tr").count(), 2)
        self.assertEqual(self.page.locator(".simple-selection-outline path").count(), 14)
        self.assertEqual(self.page.locator("#simple-selection-count").inner_text(), "2 estados elegidos")
        self.page.locator("#simple-select-all").click()
        self.assertEqual(self.page.locator('.state[aria-pressed="true"]').count(), 32)
        self.page.locator("#simple-clear").click()
        self.assertEqual(self.page.locator('.state[aria-pressed="true"]').count(), 0)
        self.assertEqual(self.page.locator(".simple-selection-outline path").count(), 0)

    def test_03_filters_reconcile_with_state_csv(self):
        self.page.locator('.state[data-edocve="1"]').click()
        self.page.locator('input[name="simple-sex"][value="0"]').uncheck()
        self.page.locator('input[name="simple-sex"][value="2"]').uncheck()
        self.page.locator('input[name="simple-zone"][value="1"]').uncheck()
        self.page.locator('input[name="simple-zone"][value="2"]').uncheck()
        self.page.locator("#simple-age-min").fill("1")
        self.page.locator("#simple-age-max").fill("2")
        selected = self.state.loc[self.state["EDOCVE"].eq(1) & self.state["AELEC"].eq(2024) & self.state["SEXO"].eq("Mujeres") & self.state["TIPOSEC"].eq("Urbana") & self.state["GRUPO_EDAD"].isin(AGES[1:3])]
        ln, sv = int(selected["LN"].sum()), int(selected["SV"].sum())
        row = self.page.locator("#simple-comparison-body tr").first.inner_text()
        self.assertIn(f"{ln:,}", row)
        self.assertIn(f"{sv:,}", row)
        self.assertIn(f"{sv / ln * 100:.2f}%", row)
        self.page.locator('[data-story="age"]').click()
        self.assertIn("18–19", self.page.locator("#simple-story-dynamic").inner_text())

    def test_04_tooltip_and_keyboard_selection(self):
        state = self.page.locator('.state[data-edocve="9"]')
        state.focus()
        self.assertTrue(self.page.locator("#tooltip").is_visible())
        self.assertIn("Sí votó", self.page.locator("#tooltip").inner_text())
        self.page.keyboard.press("Enter")
        self.assertEqual(state.get_attribute("aria-pressed"), "true")
        self.page.keyboard.press("Enter")
        self.assertEqual(state.get_attribute("aria-pressed"), "false")
        self.page.locator('[data-story="participation"]').focus()
        self.page.keyboard.press("ArrowRight")
        self.assertEqual(self.page.locator('[data-story="age"]').get_attribute("aria-selected"), "true")

    def test_05_mobile_dialog_stays_inside_viewport_with_comparisons(self):
        self.page.set_viewport_size({"width": 390, "height": 844})
        self.page.locator('.state[data-edocve="1"]').click()
        self.page.locator('.state[data-edocve="2"]').click()
        self.page.locator('input[name="simple-sex"][value="0"]').uncheck()
        self.page.locator('input[name="simple-zone"][value="2"]').uncheck()
        bounds = self.page.locator("#map-focus").evaluate("e => ({right:e.getBoundingClientRect().right,scroll:e.scrollWidth,client:e.clientWidth})")
        self.assertLessEqual(bounds["right"], 390)
        self.assertLessEqual(bounds["scroll"], bounds["client"])
        self.assertEqual(self.page.locator("#simple-comparison-body tr").count(), 8)

    def test_06_reset_filters_restores_defaults_without_clearing_states(self):
        page = self.page
        page.locator('.state[data-edocve="1"]').click()
        page.locator("#simple-age-min").fill("2")
        page.locator("#simple-age-max").fill("4")
        page.locator('input[name="simple-sex"][value="0"]').uncheck()
        page.locator('input[name="simple-zone"][value="2"]').uncheck()
        page.locator('input[name="simple-year"][value="2012"]').check()
        page.locator('input[name="simple-year"][value="2024"]').uncheck()
        page.locator("#simple-reset-filters").click()
        self.assertEqual(page.locator("#simple-age-min").input_value(), "0")
        self.assertEqual(page.locator("#simple-age-max").input_value(), "7")
        self.assertEqual(page.locator('input[name="simple-sex"]:checked').count(), 3)
        self.assertEqual(page.locator('input[name="simple-zone"]:checked').count(), 3)
        self.assertEqual(page.locator('input[name="simple-year"]:checked').evaluate_all("nodes => nodes.map(node => node.value)"), ["2024"])
        self.assertEqual(page.locator('.state[aria-pressed="true"]').count(), 1)


if __name__ == "__main__":
    unittest.main()
