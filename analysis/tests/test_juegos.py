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
        cls.server = subprocess.Popen(
            ["node", "scripts/serve.mjs"],
            cwd=BASE,
            env={**os.environ, "PORT": "0", "HOST": "127.0.0.1"},
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
        )
        cls.url = re.search(r"http://127\.0\.0\.1:\d+/", cls.server.stdout.readline())[0]
        cls.runtime = sync_playwright().start()
        cls.browser = cls.runtime.chromium.launch(executable_path=browser_path(), headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.runtime.stop()
        cls.server.terminate()
        cls.server.wait(timeout=5)
        cls.server.stdout.close()
        cls.server.stderr.close()

    def setUp(self):
        self.context = self.browser.new_context(viewport={"width": 1440, "height": 1000}, reduced_motion="reduce")
        self.page = self.context.new_page()
        self.errors = []
        self.requests = []
        self.page.on("pageerror", lambda error: self.errors.append(str(error)))
        self.page.on("request", lambda req: self.requests.append(req.url))

    def tearDown(self):
        self.assertEqual(self.errors, [])
        self.context.close()

    def test_balero_eight_questions_route_correct_and_wrong_answers_to_existing_animations(self):
        page = self.page
        page.route(
            "**/assets/modelos-3d/balero/balero-3d.js",
            lambda route: route.fulfill(
                content_type="text/javascript",
                body="""window.__tricks=[];window.Balero3D={createViewer(canvas,options){return {setPose(){},setPaused(){},setResting(){},destroy(){},playCapirucho(){window.__tricks.push(true);options.onTrickComplete(true)},playMiss(){window.__tricks.push(false);options.onTrickComplete(false)}}}};""",
            ),
        )
        page.goto(self.url, wait_until="load")
        page.locator("#balero-opener").click()
        page.wait_for_function("() => !document.querySelector('#balero-question').disabled")
        seen = set()
        for index in range(8):
            item = page.locator("#balero-question").get_attribute("data-item")
            self.assertNotIn(item, seen)
            seen.add(item)
            success = index % 2 == 0
            page.locator(f'[data-balero-answer="{0 if success else 1}"]').click()
            self.assertEqual(page.locator('#balero-answers [data-result="correct"]').count(), 1)
            self.assertEqual(page.locator('#balero-answers [data-result="incorrect"]').count(), 2)
            self.assertEqual(page.locator('#balero-answers [data-result="correct"]').evaluate("e => getComputedStyle(e).backgroundColor"), "rgb(220, 239, 220)")
            self.assertEqual(page.locator('#balero-answers [data-result="incorrect"]').first.evaluate("e => getComputedStyle(e).backgroundColor"), "rgb(249, 224, 223)")
            page.locator("#balero-result").wait_for(state="visible")
            self.assertEqual(page.locator("#balero-result").get_attribute("data-success"), str(success).lower())
            self.assertEqual(page.evaluate("window.__tricks.at(-1)"), success)
            self.assertNotIn("2 + 2", page.locator("#balero-result").inner_text())
            self.assertIn("Fuente: INE", page.locator("#balero-scope").inner_text())
            self.assertTrue(page.locator("#balero-question").evaluate("e => e.disabled"))
            self.assertEqual(page.evaluate("window.__tricks.length"), index + 1)
            page.locator("#balero-retry").click()
        self.assertEqual(len(seen), 8)

    def test_dados_four_combinations_two_stories_and_visible_3d_faces_match_result(self):
        page = self.page
        page.add_init_script(
            """
            let dadosRef = null;
            Object.defineProperty(window, "Dados3D", {
              configurable: true,
              get() { return dadosRef; },
              set(api) {
                const origCreate = api.createViewer;
                api.createViewer = function(canvas, opts) {
                  const viewer = origCreate(canvas, opts);
                  const origRoll = viewer.rollDice;
                  viewer.rollDice = function(a, b, instant) {
                    const forced = window.__forceDados;
                    return forced ? origRoll(forced[0], forced[1], instant) : origRoll(a, b, instant);
                  };
                  window.__liveDadosViewer = viewer;
                  return viewer;
                };
                dadosRef = api;
              }
            });
            """
        )
        page.goto(self.url, wait_until="load")
        page.locator("#dados-opener").click()
        page.wait_for_function("() => !document.querySelector('#dados-roll').disabled && Boolean(window.__liveDadosViewer)")

        faces_meta = page.evaluate("() => window.Dados3D.FACES.map(f => f.word)")
        self.assertEqual(faces_meta.count("MITO"), 3)
        self.assertEqual(faces_meta.count("VERDAD"), 3)

        for word_a, word_b in (("MITO", "MITO"), ("MITO", "VERDAD"), ("VERDAD", "MITO"), ("VERDAD", "VERDAD")):
            page.evaluate("pair => { window.__forceDados = pair; }", [word_a, word_b])
            page.locator("#dados-roll").click()
            page.locator("#dados-result").wait_for(state="visible")
            visible_faces = page.evaluate("() => window.__liveDadosViewer.getCurrentFaces()")
            self.assertEqual(visible_faces["topA"], word_a)
            self.assertEqual(visible_faces["topB"], word_b)
            self.assertEqual(visible_faces["frontA"], word_a)
            self.assertEqual(visible_faces["frontB"], word_b)
            summary = page.locator("#dados-summary").inner_text()
            self.assertEqual(summary, f"Dado 1: {word_a} · Dado 2: {word_b}")
            self.assertNotIn("Total", page.locator("#dados-result").inner_text())

            cards = page.locator("#dados-stories .dados-story")
            self.assertEqual(cards.count(), 2)
            item_1 = cards.nth(0).get_attribute("data-item")
            item_2 = cards.nth(1).get_attribute("data-item")
            self.assertNotEqual(item_1, item_2)
            self.assertEqual(cards.nth(0).get_attribute("data-type"), word_a)
            self.assertEqual(cards.nth(1).get_attribute("data-type"), word_b)
            for idx in range(2):
                self.assertTrue(cards.nth(idx).locator(".dados-story-title").inner_text().strip())
                self.assertTrue(cards.nth(idx).locator(".dados-story-text").inner_text().strip())
                self.assertIn("Fuente: INE", cards.nth(idx).locator(".dados-story-meta").inner_text())

    def test_pirinola_six_faces_eight_questions_per_difficulty_right_wrong_and_respin(self):
        page = self.page
        page.add_init_script(
            """
            let pirinolaRef = null;
            Object.defineProperty(window, "Pirinola3D", {
              configurable: true,
              get() { return pirinolaRef; },
              set(api) {
                const origCreate = api.createViewer;
                api.createViewer = function(canvas, opts) {
                  const viewer = origCreate(canvas, opts);
                  const origSpin = viewer.spin;
                  viewer.spin = function(target, instant) {
                    const forced = window.__forcePirinola !== undefined ? window.__forcePirinola : target;
                    return origSpin(forced, instant);
                  };
                  window.__livePirinolaViewer = viewer;
                  return viewer;
                };
                pirinolaRef = api;
              }
            });
            """
        )
        page.goto(self.url, wait_until="load")
        page.locator("#pirinola-opener").click()
        page.wait_for_function("() => Boolean(window.__livePirinolaViewer)")

        face_words = page.evaluate("() => window.Pirinola3D.FACES.map(f => f.word)")
        self.assertEqual(len(face_words), 6)
        self.assertEqual(face_words.count("FÁCIL"), 2)
        self.assertEqual(face_words.count("MEDIO"), 2)
        self.assertEqual(face_words.count("DIFÍCIL"), 2)

        balero_ids = set(page.evaluate("() => window.CivicGames.createContent(JSON.parse(document.getElementById('ccpc-data').textContent)).balero.map(q => q.id)"))
        all_seen = set()
        for difficulty in ("FÁCIL", "MEDIO", "DIFÍCIL"):
            seen = set()
            page.evaluate("diff => { window.__forcePirinola = diff; }", difficulty)
            for index in range(8):
                previous = page.locator("#pirinola-result").get_attribute("data-item")
                page.locator("#pirinola-spin").click()
                page.locator("#pirinola-result").wait_for(state="visible")
                page.wait_for_function("previous => document.querySelector('#pirinola-result').dataset.item !== previous", arg=previous)
                settled_word = page.evaluate("() => window.__livePirinolaViewer.getCurrentFace().word")
                self.assertEqual(settled_word, difficulty)
                self.assertEqual(page.locator("#pirinola-result-type").inner_text(), difficulty)
                item = page.locator("#pirinola-result").get_attribute("data-item")
                self.assertNotIn(item, seen)
                self.assertNotIn(item, balero_ids)
                seen.add(item)
                all_seen.add(item)
                self.assertFalse(page.locator("#pirinola-question").is_hidden())
                self.assertEqual(page.locator("[data-pirinola-answer]").count(), 3)
                self.assertIn("Fuente: INE", page.locator("#pirinola-scope").inner_text())
                success = index % 2 == 0
                page.locator(f'[data-pirinola-answer="{0 if success else 1}"]').click()
                self.assertTrue(page.locator("#pirinola-feedback").is_visible())
                self.assertEqual(page.locator("#pirinola-feedback").get_attribute("data-success"), str(success).lower())
                self.assertTrue(page.locator("#pirinola-question").evaluate("e => e.disabled"))
                self.assertFalse(page.locator("#pirinola-spin").evaluate("e => e.disabled"))
            self.assertEqual(len(seen), 8)
        self.assertEqual(len(all_seen), 24)

        for face_idx in range(6):
            page.evaluate("idx => { window.__forcePirinola = idx; }", face_idx)
            page.locator("#pirinola-spin").click()
            page.locator("#pirinola-result").wait_for(state="visible")
            settled_word = page.evaluate("() => window.__livePirinolaViewer.getCurrentFace().word")
            self.assertEqual(settled_word, face_words[face_idx])
            self.assertEqual(page.locator("#pirinola-result-type").inner_text(), settled_word)

    def test_offline_gameplay_makes_zero_network_requests(self):
        page = self.page
        page.goto(self.url, wait_until="load")
        page.wait_for_function("() => Boolean(window.Dados3D && window.Pirinola3D && window.Balero3D)")
        for req_url in self.requests:
            self.assertTrue(req_url.startswith(self.url), req_url)

        self.requests.clear()
        self.context.set_offline(True)

        page.locator("#dados-opener").click()
        page.locator("#dados-roll").click()
        page.locator("#dados-result").wait_for(state="visible")
        self.assertEqual(page.locator("#dados-stories .dados-story").count(), 2)
        page.locator("#close-object").click()

        page.locator("#pirinola-opener").click()
        page.locator("#pirinola-spin").click()
        page.locator("#pirinola-result").wait_for(state="visible")
        page.locator('[data-pirinola-answer="0"]').click()
        self.assertTrue(page.locator("#pirinola-feedback").is_visible())
        page.locator("#close-object").click()

        self.assertEqual(self.requests, [])

    def test_mobile_options_remain_readable_without_horizontal_overflow(self):
        page = self.page
        page.goto(self.url, wait_until="load")
        page.set_viewport_size({"width": 320, "height": 740})
        for kind in ("balero", "pirinola", "dados"):
            page.locator(f"#{kind}-opener").click()
            if kind == "pirinola":
                page.wait_for_function("() => typeof window.Pirinola3D !== 'undefined'")
                page.locator("#pirinola-spin").click()
                page.locator("#pirinola-result").wait_for(state="visible")
                answers = page.locator("[data-pirinola-answer]")
            elif kind == "balero":
                page.wait_for_function("() => !document.querySelector('#balero-question').disabled")
                answers = page.locator("[data-balero-answer]")
            else:
                page.wait_for_function("() => !document.querySelector('#dados-roll').disabled")
                page.locator("#dados-roll").click()
                page.locator("#dados-result").wait_for(state="visible")
                answers = None

            if answers is not None:
                for geometry in answers.evaluate_all("elements => elements.map(e => ({width: e.clientWidth, scroll: e.scrollWidth, height: e.getBoundingClientRect().height}))"):
                    self.assertLessEqual(geometry["scroll"], geometry["width"])
                    self.assertGreaterEqual(geometry["height"], 44)
            self.assertEqual(page.evaluate("document.documentElement.scrollWidth"), 320)
            page.locator("#close-object").click()


if __name__ == "__main__":
    unittest.main()
