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
        self.assertEqual(page.locator("#mesa button").count(),12)
        clutter = page.locator("#mesa").evaluate("""root => {const walker = document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const text=[];while(walker.nextNode()){const node=walker.currentNode;if(node.textContent.trim() && !node.parentElement.closest('.scene-header,svg')) text.push(node.textContent.trim());}return text;}""")
        self.assertEqual(clutter,[])
        for width,height in ((1440,1000),(1858,887),(390,844),(320,568)):
            page.set_viewport_size({"width":width,"height":height})
            page.mouse.move(width / 2,height / 2)
            page.evaluate("scrollTo({top:0,behavior:'instant'})")
            page.wait_for_function("() => Number(document.querySelector('#mesa').dataset.progress) === 0")
            page.wait_for_function("() => Math.abs(Number.parseFloat(document.querySelector('#table-stage').style.getPropertyValue('--camera-x')) || 0) < 1 && Math.abs(Number.parseFloat(document.querySelector('#table-stage').style.getPropertyValue('--camera-y')) || 0) < 1")
            initial = page.locator("#map-opener").bounding_box()
            first_card = page.locator('[data-card="first"]').bounding_box()
            pile = page.locator(".lottery-object").bounding_box()
            positions = page.locator(".desk-object").evaluate_all("elements => elements.map(e => [e.offsetLeft,e.offsetTop,getComputedStyle(e).transform])")
            map_offset = page.locator("#table-stage").evaluate("e => e.offsetWidth * .01") if width > 900 else 0
            self.assertAlmostEqual(initial["x"] + initial["width"] / 2,width / 2 + map_offset,delta=1)
            self.assertGreater(initial["y"] + initial["height"] / 2,height * .4)
            self.assertLess(initial["y"] + initial["height"] / 2,height * .7)
            self.assertLess(initial["width"],width * .52)
            self.assertGreater(pile["x"] + pile["width"] / 2,width * .6)
            self.assertGreater(pile["y"] + pile["height"] / 2,height * .62)
            page.evaluate("scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'})")
            page.wait_for_function("() => Number(document.querySelector('#mesa').dataset.progress) > .99")
            page.wait_for_function("() => Math.abs(Number.parseFloat(document.querySelector('#table-stage').style.getPropertyValue('--camera-x')) || 0) < 1 && Math.abs(Number.parseFloat(document.querySelector('#table-stage').style.getPropertyValue('--camera-y')) || 0) < 1")
            final = page.locator("#map-opener").bounding_box()
            self.assertGreater(final["width"],initial["width"] * 1.3)
            self.assertGreater(page.locator('[data-card="first"]').bounding_box()["width"],first_card["width"] * 1.3)
            self.assertAlmostEqual(final["x"] + final["width"] / 2,width / 2 + map_offset * 1.35,delta=1)
            self.assertEqual(positions,page.locator(".desk-object").evaluate_all("elements => elements.map(e => [e.offsetLeft,e.offsetTop,getComputedStyle(e).transform])"))
            final_scroll = page.evaluate("scrollY")
            page.mouse.move(5,120)
            page.mouse.wheel(0,10000)
            page.wait_for_timeout(80)
            self.assertEqual(page.evaluate("scrollY"),final_scroll)
            self.assertEqual(page.locator("#table-stage").evaluate("e => Number(e.style.getPropertyValue('--desk-scale'))"),1.35)
            if width > 900:
                page.mouse.move(width - 5,height - 5)
                page.wait_for_timeout(380)
                bottom_pan = page.locator("#table-stage").evaluate("e => Number.parseFloat(e.style.getPropertyValue('--camera-y'))")
                page.mouse.move(width - 5,5)
                page.wait_for_timeout(380)
                top_pan = page.locator("#table-stage").evaluate("e => Number.parseFloat(e.style.getPropertyValue('--camera-y'))")
                self.assertGreater(top_pan,bottom_pan,(width,height))
            page.mouse.wheel(0,-10000)
            page.wait_for_function("() => Number(document.querySelector('#mesa').dataset.progress) === 0")

    def test_02_map_focus_keeps_all_states_and_side_controls(self):
        page = self.page
        page.locator("#map-opener").click()
        self.assertTrue(page.locator("#object-dialog").evaluate("element => element.open"))
        self.assertEqual(page.locator("#mexico-map .state").count(), 32)
        self.assertIn("98,330,348", page.locator("#simple-comparison-body").inner_text())
        panel = page.locator(".simple-info").bounding_box()
        map_box = page.locator(".simple-main").bounding_box()
        rail = page.locator(".simple-filters").bounding_box()
        self.assertLess(rail["x"] + rail["width"], map_box["x"])
        self.assertLess(map_box["x"] + map_box["width"], panel["x"])
        self.assertEqual(page.locator(".simple-origin details").count(), 1)
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
            "election": ["Presidencial:", "Intermedia:"]
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
        for key, story in [("first","age"),("election","election"),("women","inclusion"),("inclusion","inclusion")]:
            self.page.locator(f'[data-card="{key}"]').click()
            self.page.locator("#card-to-map").click()
            self.assertEqual(self.page.locator("#object-dialog").get_attribute("data-object"),"map")
            self.assertEqual(self.page.locator(f'[data-story="{story}"]').get_attribute("aria-selected"),"true")
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
                box = page.locator(".simple-main").bounding_box()
                self.assertLess(box["y"],350)
                page.locator('input[name="simple-year"][value="2009"]').check()
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
        self.assertGreaterEqual(len(sources),18)
        self.assertEqual(self.page.locator('.loteria-desk-board[data-preview-size="4"] img').count(),32)
        for board in self.page.locator('.loteria-desk-board').all():
            preview = board.locator('img').evaluate_all('images => images.map(image => image.getAttribute("src"))')
            self.assertEqual(len(preview),len(set(preview)))
            self.assertTrue(all(source.startswith('assets/imgs/loteria/preview/') for source in preview))
        for source in sources:
            self.assertTrue(source.startswith("assets/imgs/"))
            self.assertTrue((BASE / source).is_file())
        self.assertTrue(self.page.locator(".table-background").evaluate("e=>e.complete && e.naturalWidth === 1678"))
        self.assertEqual(self.page.evaluate("[...document.images].filter(e => e.currentSrc && (!e.complete || !e.naturalWidth)).length"),0)
        self.assertNotIn("@@",(BASE / "index.html").read_text(encoding="utf-8"))

    def test_08_atlas_notebook_and_loteria_layout(self):
        page = self.page
        self.assertEqual(page.title(), "La mesa cívica · Hackea la participación")
        page.locator("#atlas-opener").click()
        self.assertEqual(page.locator("#atlas-title").inner_text(), "32 estados, seis elecciones")
        self.assertIn("55.83 %", page.locator("#atlas-graphic").inner_text())
        year_2012 = self.national.loc[self.national["AELEC"].eq(2012)]
        page.locator("#atlas-year").select_option("2012")
        self.assertIn(f"{year_2012['SV'].sum() / year_2012['LN'].sum() * 100:.2f} %",page.locator("#atlas-graphic").inner_text())
        atlas_size = page.locator("#focus-surface").evaluate("e => [e.clientWidth,e.clientHeight]")
        figure_size = page.locator("#atlas-illustration").evaluate("e => [e.clientWidth,e.clientHeight]")
        spread = page.locator("#atlas-spread").bounding_box()
        self.assertGreaterEqual(page.locator("#atlas-next").bounding_box()["x"],spread["x"] + spread["width"] - 60)
        self.assertTrue(page.locator("#atlas-previous").is_hidden())
        self.assertEqual(page.locator("#atlas-next").evaluate("node => getComputedStyle(node,'::after').content"), '"›"')
        page.locator("#atlas-next").click()
        first_age = year_2012.loc[year_2012["GRUPO_EDAD"].eq(AGES[0])]
        self.assertIn(f"{first_age['SV'].sum() / first_age['LN'].sum() * 100:.2f} %",page.locator("#atlas-graphic").inner_text())
        page.locator("#atlas-next").click()
        page.locator("#atlas-next").click()
        rural_women = year_2012.loc[year_2012["TIPOSEC"].eq("Rural") & year_2012["SEXO"].eq("Mujeres")]
        self.assertIn(f"{rural_women['SV'].sum() / rural_women['LN'].sum() * 100:.2f} %",page.locator("#atlas-graphic").inner_text())
        page.locator("#atlas-next").click()
        self.assertEqual(page.locator("#atlas-left-number").inner_text(), "09")
        self.assertEqual(page.locator("#atlas-right-number").inner_text(), "10")
        self.assertIn("26,563", page.locator("#atlas-graphic").inner_text())
        self.assertTrue(page.locator("#atlas-year").is_disabled())
        page.locator("#atlas-next").click()
        self.assertIn("192 archivos estatales",page.locator("#atlas-graphic").inner_text())
        page.locator("#atlas-next").click()
        self.assertIn("Nunca se promedian porcentajes",page.locator("#atlas-graphic").inner_text())
        self.assertEqual(page.locator("#focus-surface").evaluate("e => [e.clientWidth,e.clientHeight]"),atlas_size)
        self.assertEqual(page.locator("#atlas-illustration").evaluate("e => [e.clientWidth,e.clientHeight]"),figure_size)
        self.assertTrue(all(page.locator(".atlas-page").evaluate_all("pages => pages.map(sheet => sheet.scrollHeight <= sheet.clientHeight + 1)")))
        self.close_object()
        page.locator("#notebook-opener").click()
        self.assertEqual(page.locator("#notebook-focus button").count(), 2)
        self.assertTrue(page.locator("#notebook-previous").is_hidden())
        self.assertTrue(page.locator("#notebook-next").is_visible())
        self.assertIn("No especificado", page.locator("#notebook-focus").inner_text())
        notebook_size = page.locator("#focus-surface").evaluate("e => [e.clientWidth,e.clientHeight]")
        self.assertAlmostEqual(notebook_size[0] / notebook_size[1],2.6,delta=.02)
        self.assertTrue(all(page.locator(".notebook-paper").evaluate_all("papers => papers.map(paper => paper.clientWidth > paper.clientHeight)")))
        self.assertTrue(all(page.locator(".notebook-paper").evaluate_all("papers => papers.map(paper => paper.scrollHeight <= paper.clientHeight + 1)")))
        self.close_object()
        page.locator("#loteria-opener").click()
        page.locator('input[name="loteria-opponent"][value="machine"]').check()
        page.locator("#loteria-start").click()
        self.assertEqual(page.locator(".loteria-board-panel").evaluate_all("elements => elements.map(element => element.dataset.side)"), ["machine", "player"])
        self.assertEqual(page.locator(".loteria-board").evaluate_all("elements => elements.map(element => getComputedStyle(element).borderTopColor)"), ["rgb(110, 37, 48)", "rgb(32, 90, 67)"])

    def test_09_atlas_pages_fit_laptop_and_mobile_navigation(self):
        page = self.page
        for width,height in ((901,650),(1366,768),(390,844)):
            page.set_viewport_size({"width":width,"height":height})
            page.locator("#atlas-opener").click()
            leaves = 14 if width < 651 else 7
            for index in range(leaves):
                sheets = page.locator(".atlas-page:visible").evaluate_all("elements => elements.map(sheet => [sheet.clientWidth,sheet.scrollWidth,sheet.clientHeight,sheet.scrollHeight])")
                self.assertTrue(all(scroll_width <= client_width + 1 and scroll_height <= client_height + 1 for client_width,scroll_width,client_height,scroll_height in sheets),(width,height,index,sheets))
                self.assertTrue(page.locator(".atlas-illustration").evaluate("figure => figure.getBoundingClientRect().top >= figure.closest('.atlas-page').querySelector('.atlas-page-head').getBoundingClientRect().bottom - 1"),(width,height,index))
                if index < leaves - 1:
                    page.locator("#atlas-next").click()
            self.assertTrue(page.locator("#atlas-next").is_disabled())
            self.close_object()

    def test_10_notebook_folds_achievements_method_and_team(self):
        page = self.page
        page.locator("#notebook-opener").click()
        self.assertTrue(page.locator("#notebook-previous").is_hidden())
        self.assertEqual(page.evaluate("CivicAchievements.progress().earned.includes('guide')"), True)
        page.locator("#notebook-next").click()
        self.assertIn("Logros de exploración", page.locator("#notebook-focus").inner_text())
        self.assertIn("¡Lotería cívica!", page.locator("#notebook-focus").inner_text())
        self.assertEqual(page.locator(".notebook-achievement").count(), 8)
        self.assertTrue(page.locator("#notebook-previous").is_visible())
        page.locator("#notebook-next").click()
        self.assertEqual(page.locator(".notebook-achievement").count(), 8)
        page.locator("#notebook-next").click()
        self.assertIn("No se promedian porcentajes", page.locator("#notebook-focus").inner_text())
        page.locator("#notebook-next").click()
        self.assertIn("Sandra Erika Sánchez Fragozo", page.locator("#notebook-focus").inner_text().replace("\n", " "))
        self.assertIn("Saraí Sánchez Fragozo", page.locator("#notebook-focus").inner_text().replace("\n", " "))
        self.assertTrue(page.locator("#notebook-next").is_hidden())
        page.locator("#notebook-previous").click()
        self.assertIn("Cómo se calcula", page.locator("#notebook-focus").inner_text())

    def test_11_credential_example_stays_local_and_downloads(self):
        page = self.page
        page.locator("#credential-opener").click()
        page.locator("#credential-name").fill("Ana López")
        page.locator("#credential-birth").fill("2001-03-15")
        page.locator("#credential-state").select_option("14")
        page.locator("#credential-curp").fill("LOPA010315MJCPRN09")
        page.locator("#credential-photo").set_input_files(str(BASE / "assets/imgs/loteria/frijol.png"))
        page.locator("#credential-photo-preview").wait_for(state="visible")
        self.assertIn("Ana López", page.locator("#credential-preview").inner_text())
        self.assertIn("Jalisco", page.locator("#credential-preview").inner_text())
        self.assertIn("NO ES IDENTIFICACIÓN OFICIAL", page.locator("#credential-preview").inner_text())
        with page.expect_download() as event:
            page.locator("#credential-download").click()
        self.assertEqual(event.value.suggested_filename, "mi-credencial-civica-ejemplo.png")
        self.assertTrue(page.evaluate("CivicAchievements.progress().earned.includes('credential_download')"))
        page.locator("#credential-clear").click()
        self.assertIn("Tu nombre", page.locator("#credential-preview").inner_text())
        self.assertTrue(page.locator("#credential-photo-preview").is_hidden())
        page.set_viewport_size({"width":390,"height":844})
        self.assertTrue(page.locator("#credential-focus").evaluate("node => node.scrollWidth <= node.clientWidth + 1"))
        self.assertTrue(page.locator("#credential-preview").evaluate("node => node.getBoundingClientRect().width <= node.closest('.credential-focus').getBoundingClientRect().width"))

    def test_12_credential_mobile_views_fit_without_nested_scrolling(self):
        page = self.page
        for width, height in ((390, 844), (500, 800), (900, 600)):
            page.set_viewport_size({"width": width, "height": height})
            if page.locator("#credential-focus").is_hidden():
                page.locator("#credential-opener").click()
            for view in ("preview", "form", "context"):
                tab = page.locator(f'[data-credential-tab="{view}"]')
                tab.click()
                self.assertEqual(tab.get_attribute("aria-pressed"), "true")
                self.assertEqual(page.locator(".credential-layout").get_attribute("data-view"), view)
                self.assertTrue(page.locator("#credential-focus").evaluate("node => node.scrollHeight <= node.clientHeight + 1"), (width, height, view))
                self.assertTrue(page.locator("#object-dialog").evaluate("node => node.scrollHeight <= node.clientHeight + 1"), (width, height, view))
            page.locator('[data-credential-tab="preview"]').click()

    def test_12b_notebook_mobile_shows_one_complete_page_at_a_time(self):
        page = self.page
        for width,height in ((320,568),(390,844)):
            page.set_viewport_size({"width":width,"height":height})
            if page.locator("#notebook-focus").is_hidden():
                page.locator("#notebook-opener").click()
            for index in range(20):
                visible = page.locator(".notebook-paper:visible")
                self.assertEqual(visible.count(),1,(width,height,index))
                self.assertTrue(visible.evaluate("node => node.scrollHeight <= node.clientHeight + 1"),(width,height,index))
                self.assertIn(f"Página {index + 1} de 20",page.locator("#notebook-page-status").inner_text())
                if index < 19: page.locator("#notebook-next").click()
            self.assertTrue(page.locator("#notebook-next").is_hidden())
            page.locator("#close-object").click()

    def test_12c_credential_curp_is_visible_on_mobile(self):
        page = self.page
        for width,height in ((320,568),(390,844)):
            page.set_viewport_size({"width":width,"height":height})
            if page.locator("#credential-focus").is_hidden():
                page.locator("#credential-opener").click()
            page.locator('[data-credential-tab="form"]').click()
            page.locator("#credential-curp").fill("LOPA010315MJCPRN09")
            page.locator('[data-credential-tab="preview"]').click()
            placement = page.evaluate("""() => {const value=document.getElementById('credential-curp-preview').getBoundingClientRect();const foot=document.querySelector('.credential-preview-foot').getBoundingClientRect();const card=document.getElementById('credential-preview').getBoundingClientRect();return {valueBottom:value.bottom,footTop:foot.top,cardWidth:card.width,cardHeight:card.height}}""")
            self.assertLessEqual(placement["valueBottom"],placement["footTop"] - 2,(width,height,placement))
            page.locator("#close-object").click()

    def test_13_atlas_title_and_year_menu_fit_on_a_narrow_screen(self):
        page = self.page
        page.set_viewport_size({"width": 650, "height": 600})
        page.locator("#atlas-opener").click()
        title = page.locator("#atlas-title")
        self.assertGreater(title.bounding_box()["height"], 50)
        lead = page.locator("#atlas-lead").bounding_box()
        figure = page.locator("#atlas-illustration").bounding_box()
        self.assertGreaterEqual(figure["y"], lead["y"] + lead["height"] + 10)
        page.locator("#atlas-next").click()
        page.locator(".atlas-year-trigger").click()
        self.assertEqual(page.locator(".atlas-year-choice:visible").count(), 6)
        page.locator(".atlas-year-choice", has_text="2012").click()
        self.assertEqual(page.locator("#atlas-year").input_value(), "2012")
        self.assertFalse(page.locator(".atlas-year-menu").is_visible())


if __name__ == "__main__":
    unittest.main()
