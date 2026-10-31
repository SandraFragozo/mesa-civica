import importlib.util
import os
import re
import subprocess
import unittest

from ccpc import BASE
from test_micrositio import browser_path


@unittest.skipUnless(importlib.util.find_spec("playwright") and browser_path(), "Requiere Playwright y un navegador local")
class CivicGamesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from playwright.sync_api import sync_playwright
        cls.server = subprocess.Popen(["node", "scripts/serve.mjs"], cwd=BASE, env={**os.environ,"PORT":"0","HOST":"127.0.0.1"}, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8")
        cls.url = re.search(r"http://127\.0\.0\.1:\d+/",cls.server.stdout.readline())[0]
        cls.runtime = sync_playwright().start()
        cls.browser = cls.runtime.chromium.launch(executable_path=browser_path(),headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.runtime.stop()
        cls.server.terminate()
        cls.server.wait(timeout=5)
        cls.server.stdout.close()
        cls.server.stderr.close()

    def setUp(self):
        self.context = self.browser.new_context(viewport={"width":1440,"height":1000},reduced_motion="reduce")
        self.page = self.context.new_page()
        self.errors = []
        self.page.on("pageerror",lambda error:self.errors.append(str(error)))
        self.page.route("**/assets/modelos-3d/balero/balero-3d.js",lambda route:route.fulfill(content_type="text/javascript",body="""window.__tricks=[];window.Balero3D={createViewer(canvas,options){return {setPose(){},setPaused(){},setResting(){},destroy(){},playCapirucho(){window.__tricks.push(true);options.onTrickComplete(true)},playMiss(){window.__tricks.push(false);options.onTrickComplete(false)}}}};"""))
        self.page.route("**/assets/modelos-3d/pirinola/pirinola-3d.js",lambda route:route.fulfill(content_type="text/javascript",body="""window.Pirinola3D={createViewer(canvas,options){return {setPaused(){},setResting(){},rotateBy(){},destroy(){},spin(){options.onSettle({word:window.__face||'PREGUNTA'})}}}};"""))
        self.page.goto(self.url,wait_until="load")

    def tearDown(self):
        self.assertEqual(self.errors,[])
        self.context.close()

    def test_balero_eight_questions_route_correct_and_wrong_answers_to_existing_animations(self):
        page = self.page
        page.locator("#balero-opener").click()
        page.wait_for_function("() => !document.querySelector('#balero-question').disabled")
        seen = set()
        for index in range(8):
            item = page.locator("#balero-question").get_attribute("data-item")
            self.assertNotIn(item,seen)
            seen.add(item)
            success = index % 2 == 0
            page.locator(f'[data-balero-answer="{0 if success else 1}"]').click()
            page.locator("#balero-result").wait_for(state="visible")
            self.assertEqual(page.locator("#balero-result").get_attribute("data-success"),str(success).lower())
            self.assertEqual(page.evaluate("window.__tricks.at(-1)"),success)
            self.assertNotIn("2 + 2",page.locator("#balero-result").inner_text())
            self.assertIn("Fuente: INE",page.locator("#balero-scope").inner_text())
            self.assertTrue(page.locator("#balero-question").evaluate("e=>e.disabled"))
            self.assertEqual(page.evaluate("window.__tricks.length"),index + 1)
            page.locator("#balero-retry").click()
        self.assertEqual(len(seen),8)

    def test_pirinola_all_categories_have_eight_distinct_items_and_answer_feedback(self):
        page = self.page
        page.locator("#pirinola-opener").click()
        page.wait_for_function("() => typeof window.Pirinola3D !== 'undefined'")
        for kind in ("MITO","REALIDAD","PREGUNTA"):
            seen = set()
            page.evaluate("kind => window.__face=kind",kind)
            for index in range(8):
                page.locator("#pirinola-spin").click()
                page.locator("#pirinola-result").wait_for(state="visible")
                item = page.locator("#pirinola-result").get_attribute("data-item")
                self.assertNotIn(item,seen)
                seen.add(item)
                self.assertEqual(page.locator("#pirinola-result-type").inner_text(),kind)
                self.assertIn("Fuente: INE",page.locator("#pirinola-scope").inner_text())
                if kind == "PREGUNTA":
                    success = index % 2 == 0
                    page.locator(f'[data-pirinola-answer="{0 if success else 1}"]').click()
                    self.assertTrue(page.locator("#pirinola-feedback").is_visible())
                    self.assertEqual(page.locator("#pirinola-feedback").get_attribute("data-success"),str(success).lower())
                    self.assertTrue(page.locator("#pirinola-question").evaluate("e=>e.disabled"))
                else:
                    self.assertTrue(page.locator("#pirinola-question").is_hidden())
                    self.assertNotIn("aparecerá",page.locator("#pirinola-result-text").inner_text())
            self.assertEqual(len(seen),8)

    def test_mobile_options_remain_readable_without_horizontal_overflow(self):
        page = self.page
        page.set_viewport_size({"width":320,"height":740})
        for kind in ("balero","pirinola"):
            page.locator(f"#{kind}-opener").click()
            if kind == "pirinola":
                page.evaluate("window.__face='PREGUNTA'")
                page.wait_for_function("() => typeof window.Pirinola3D !== 'undefined'")
                page.locator("#pirinola-spin").click()
                answers = page.locator("[data-pirinola-answer]")
            else:
                page.wait_for_function("() => !document.querySelector('#balero-question').disabled")
                answers = page.locator("[data-balero-answer]")
            for geometry in answers.evaluate_all("elements=>elements.map(e=>({width:e.clientWidth,scroll:e.scrollWidth,height:e.getBoundingClientRect().height}))"):
                self.assertLessEqual(geometry["scroll"],geometry["width"])
                self.assertGreaterEqual(geometry["height"],44)
            self.assertEqual(page.evaluate("document.documentElement.scrollWidth"),320)
            page.locator("#close-object").click()
