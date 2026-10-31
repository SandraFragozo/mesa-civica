import importlib.util
import json
import unittest

import pandas as pd

from ccpc import AGES, BASE
from test_micrositio import browser_path


@unittest.skipUnless(importlib.util.find_spec("playwright") and browser_path(), "Requiere Playwright y un navegador local")
class CivicTableTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from playwright.sync_api import sync_playwright
        cls.runtime = sync_playwright().start()
        cls.browser = cls.runtime.chromium.launch(executable_path=browser_path(), headless=True)
        cls.national = pd.read_csv(BASE / "output/cubo_nacional_demografico.csv")

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.runtime.stop()

    def setUp(self):
        self.context = self.browser.new_context(viewport={"width":1440,"height":1000}, offline=True, reduced_motion="reduce")
        self.page = self.context.new_page()
        self.errors = []
        self.requests = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))
        self.page.on("request", lambda request: self.requests.append(request.url) if request.url.startswith(("https:","http:")) else None)
        self.page.goto((BASE / "index.html").as_uri(), wait_until="load")

    def tearDown(self):
        self.assertEqual(self.errors, [])
        self.assertEqual(self.requests, [])
        self.context.close()

    def close_object(self):
        self.page.locator("#close-object").click()
        self.page.wait_for_function("() => !document.querySelector('#object-dialog').open")

    def test_01_scroll_zoom_keeps_objects_on_the_table(self):
        page = self.page
        page.emulate_media(reduced_motion="no-preference")
        self.assertEqual(page.locator("#mesa button").count(),9)
        clutter = page.locator("#mesa").evaluate("""root => {const walker = document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const text=[];while(walker.nextNode()){const node=walker.currentNode;if(node.textContent.trim() && !node.parentElement.closest('.scene-header,svg')) text.push(node.textContent.trim());}return text;}""")
        self.assertEqual(clutter,[])
        for width,height in ((1440,1000),(1858,887),(390,844),(320,568)):
            page.set_viewport_size({"width":width,"height":height})
            page.evaluate("scrollTo({top:0,behavior:'instant'})")
            page.wait_for_function("() => Number(document.querySelector('#mesa').dataset.progress) === 0")
            initial = page.locator("#map-opener").bounding_box()
            first_card = page.locator('[data-card="first"]').bounding_box()
            pile = page.locator(".lottery-object").bounding_box()
            positions = page.locator(".desk-object").evaluate_all("elements => elements.map(e => [e.offsetLeft,e.offsetTop,getComputedStyle(e).transform])")
            self.assertAlmostEqual(initial["x"] + initial["width"] / 2,width / 2,delta=1)
            self.assertGreater(initial["y"] + initial["height"] / 2,height * .4)
            self.assertLess(initial["y"] + initial["height"] / 2,height * .7)
            self.assertLess(initial["width"],width * .52)
            self.assertGreater(pile["x"] + pile["width"] / 2,width * .6)
            self.assertGreater(pile["y"] + pile["height"] / 2,height * .65)
            page.evaluate("scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'})")
            page.wait_for_function("() => Number(document.querySelector('#mesa').dataset.progress) > .99")
            final = page.locator("#map-opener").bounding_box()
            self.assertGreater(final["width"],initial["width"] * 1.3)
            self.assertGreater(page.locator('[data-card="first"]').bounding_box()["width"],first_card["width"] * 1.3)
            self.assertAlmostEqual(final["x"] + final["width"] / 2,width / 2,delta=1)
            self.assertEqual(positions,page.locator(".desk-object").evaluate_all("elements => elements.map(e => [e.offsetLeft,e.offsetTop,getComputedStyle(e).transform])"))
            final_scroll = page.evaluate("scrollY")
            page.mouse.move(5,120)
            page.mouse.wheel(0,10000)
            page.wait_for_timeout(80)
            self.assertEqual(page.evaluate("scrollY"),final_scroll)
            self.assertEqual(page.locator("#table-stage").evaluate("e => Number(e.style.getPropertyValue('--desk-scale'))"),1.35)
            for selector in ["#map-opener", *[f'[data-card="{key}"]' for key in ("first","election","women","inclusion")]]:
                box = page.locator(selector).bounding_box()
                self.assertGreater(box["x"],0)
                self.assertLess(box["x"] + box["width"],width)
                self.assertGreater(box["y"],0)
                self.assertLess(box["y"] + box["height"],height)
            page.mouse.wheel(0,-10000)
            page.wait_for_function("() => Number(document.querySelector('#mesa').dataset.progress) === 0")

    def test_02_map_focus_keeps_all_states_and_side_controls(self):
        page = self.page
        page.locator("#map-opener").click()
        self.assertTrue(page.locator("#object-dialog").evaluate("element => element.open"))
        self.assertEqual(page.locator("#mexico-map .state").count(), 32)
        self.assertEqual(page.locator("#stat-ln").inner_text(), "98,330,348")
        rail = page.locator(".explorer-filters").bounding_box()
        map_box = page.locator(".map-region").bounding_box()
        panel = page.locator("#radiografia").bounding_box()
        self.assertLess(rail["x"] + rail["width"], map_box["x"])
        self.assertLess(map_box["x"] + map_box["width"], panel["x"])
        for _ in range(6):
            page.keyboard.press("Tab")
            self.assertTrue(page.evaluate("document.querySelector('#object-dialog').contains(document.activeElement)"))
        self.close_object()
        self.assertTrue(page.locator("#map-opener").is_visible())
        self.assertEqual(page.evaluate("document.activeElement.id"), "map-opener")

    def test_03_card_reverses_match_independent_csv_counts(self):
        page = self.page
        frame = self.national.loc[self.national["AELEC"].eq(2024)]
        ratio = lambda selected: f"{selected['SV'].sum() / selected['LN'].sum() * 100:.2f}%"
        expected = {
            "first": [ratio(frame.loc[frame["GRUPO_EDAD"].eq(AGES[0])]),ratio(frame.loc[frame["GRUPO_EDAD"].isin(AGES[1:3])])],
            "women": [ratio(frame.loc[frame["SEXO"].eq("Mujeres")]),ratio(frame.loc[frame["SEXO"].eq("Hombres")])],
            "inclusion": ["3,449","26,563"],
            "election": ["12.56 pp","2009–2024"]
        }
        for key, values in expected.items():
            page.locator(f'[data-card="{key}"]').click()
            page.locator("#flip-card-control").click()
            self.assertEqual(page.locator("#flip-card").get_attribute("aria-pressed"), "true")
            for value in values:
                self.assertIn(value,page.locator("#card-fact").inner_text())
            self.assertFalse(page.locator(".card-back").get_attribute("aria-hidden") == "true")
            fits = page.locator(".card-back-copy").evaluate("e => ({height:e.clientHeight,content:e.scrollHeight})")
            self.assertLessEqual(fits["content"], fits["height"] + 1)
            page.locator("#flip-card").click()
            self.assertEqual(page.locator("#flip-card").get_attribute("aria-pressed"), "false")
            self.close_object()

    def test_04_cards_open_the_corresponding_map_story(self):
        for key, mode, panel in [("first","age","age"),("election","election","history"),("women","gender","territory"),("inclusion","gender","inclusion")]:
            self.page.locator(f'[data-card="{key}"]').click()
            self.page.locator("#card-to-map").click()
            self.assertEqual(self.page.locator("#object-dialog").get_attribute("data-object"),"map")
            self.assertEqual(self.page.locator("body").get_attribute("data-theme"),mode)
            self.assertEqual(self.page.locator(f"#tab-{panel}").get_attribute("aria-selected"),"true")
            self.close_object()

    def test_05_escape_interrupts_the_approach_and_restores_the_source(self):
        page = self.page
        page.emulate_media(reduced_motion="no-preference")
        page.locator('[data-card="first"]').click()
        page.keyboard.press("Escape")
        page.wait_for_function("() => !document.querySelector('#object-dialog').open")
        self.assertTrue(page.locator('[data-card="first"]').is_visible())
        self.assertEqual(page.locator("#focus-surface").evaluate("e => getComputedStyle(e).transform"),"none")
        page.locator("#map-opener").click()
        page.wait_for_timeout(380)
        page.locator("#close-object").click()
        page.wait_for_function("() => !document.querySelector('#object-dialog').open")
        self.assertTrue(page.locator("#map-opener").is_visible())
        page.locator('[data-card="women"]').click()
        page.wait_for_timeout(380)
        self.assertEqual(page.locator("#card-title").inner_text(),"La votante")

    def test_06_mobile_objects_map_and_reverses_remain_usable(self):
        for width, height in ((320,844),(390,844),(768,844),(320,568)):
            page = self.page
            page.set_viewport_size({"width":width,"height":height})
            page.evaluate("scrollTo({top:0,behavior:'instant'})")
            page.wait_for_timeout(50)
            self.assertEqual(page.evaluate("document.documentElement.scrollWidth"),width)
            page.locator("#map-opener").click()
            if width < 651:
                self.assertFalse(page.locator("#map-controls").evaluate("e=>e.open"))
                box = page.locator(".map-region").bounding_box()
                self.assertLess(box["y"],350)
                page.locator("#map-controls > summary").click()
                page.locator("#filter-year").select_option("2009")
            self.close_object()
            page.locator('[data-card="inclusion"]').click()
            page.locator("#flip-card-control").click()
            self.assertIn("26,563",page.locator("#card-fact").inner_text())
            self.assertTrue(page.locator("#close-object").is_visible())
            self.assertIn("26,563",page.locator("#card-reading").inner_text())
            fit = page.locator(".card-back-copy").evaluate("e => ({content:e.scrollHeight,available:e.clientHeight})")
            self.assertLessEqual(fit["content"],fit["available"] + 1,(width,height,fit))
            self.close_object()

    def test_07_local_images_and_vercel_static_output(self):
        config = json.loads((BASE / "vercel.json").read_text(encoding="utf-8"))
        self.assertEqual(config["outputDirectory"],"public")
        self.assertEqual(config["buildCommand"],"npm run build")
        sources = self.page.evaluate("[...new Set([...document.images].map(image => image.getAttribute('src')).filter(Boolean))]")
        self.assertEqual(len(sources),6)
        for source in sources:
            self.assertTrue(source.startswith("assets/imgs/"))
            self.assertTrue((BASE / source).is_file())
        self.assertTrue(self.page.locator(".table-background").evaluate("e=>e.complete && e.naturalWidth === 1678"))
        self.assertEqual(self.page.evaluate("[...document.images].filter(e => e.currentSrc && (!e.complete || !e.naturalWidth)).length"),0)
        self.assertNotIn("@@",(BASE / "index.html").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
