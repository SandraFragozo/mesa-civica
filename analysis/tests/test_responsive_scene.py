import base64
import importlib.util
import unittest

from ccpc import BASE
from test_micrositio import browser_path


@unittest.skipUnless(importlib.util.find_spec("playwright") and browser_path(), "Requiere Playwright y navegador local")
class SceneRenderingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from playwright.sync_api import sync_playwright
        cls.runtime = sync_playwright().start()
        cls.browser = cls.runtime.chromium.launch(executable_path=browser_path(),headless=True,args=["--enable-unsafe-swiftshader"])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.runtime.stop()

    def setUp(self):
        self.context = self.browser.new_context(viewport={"width":1440,"height":1100},reduced_motion="reduce")
        self.page = self.context.new_page()
        self.page.goto((BASE / "index.html").as_uri(),wait_until="load")

    def tearDown(self):
        self.context.close()

    def test_object_proportions_and_visible_3d_size_remain_consistent(self):
        page = self.page
        page.emulate_media(reduced_motion="no-preference")
        page.wait_for_function("() => window.Balero3D && window.Pirinola3D && window.Dados3D")
        measure = """async id => new Promise(resolve=>requestAnimationFrame(()=>{
          const c=document.getElementById(id),gl=c.getContext('webgl2')||c.getContext('webgl'),p=new Uint8Array(c.width*c.height*4);
          gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,p);
          let left=c.width,right=-1,top=c.height,bottom=-1;
          for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(p[(y*c.width+x)*4+3]>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
          const css=getComputedStyle(c);resolve(Math.max((right-left+1)*parseFloat(css.width)/c.width,(bottom-top+1)*parseFloat(css.height)/c.height));
        }))"""
        baseline = None
        for width,height in [(1920,1080),(1440,1000),(1024,768),(768,1024),(650,900),(390,844),(320,568),(844,390),(2560,1080)]:
            page.set_viewport_size({"width":width,"height":height})
            page.mouse.move(5,10)
            page.evaluate("scrollTo({top:0,behavior:'instant'})")
            page.wait_for_function("() => Number(document.querySelector('#mesa').dataset.progress) === 0")
            ratios = page.evaluate("""() => {const width=selector=>parseFloat(getComputedStyle(document.querySelector(selector)).width);return ['.pirinola-object','.balero-object','.dados-object','.notebook-object','.lottery-object'].map(selector=>width(selector)/width('.map-object'))}""")
            if baseline is None:
                baseline = ratios
            for current,expected in zip(ratios,baseline):
                self.assertAlmostEqual(current,expected,delta=.01,msg=(width,height))
            balero = page.evaluate(measure,"balero-canvas")
            pirinola = page.evaluate(measure,"pirinola-canvas")
            self.assertGreater(balero,0)
            self.assertGreater(pirinola,0)
            self.assertAlmostEqual(balero/pirinola,1,delta=.10,msg=(width,height,balero,pirinola))
            positions=page.locator(".desk-object").evaluate_all("elements=>elements.map(e=>[e.offsetLeft,e.offsetTop,e.offsetWidth])")
            page.evaluate("scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'})")
            page.wait_for_function("() => Number(document.querySelector('#mesa').dataset.progress) > .99")
            self.assertEqual(positions,page.locator(".desk-object").evaluate_all("elements=>elements.map(e=>[e.offsetLeft,e.offsetTop,e.offsetWidth])"))
            for box in page.locator("#mesa button").evaluate_all("elements=>elements.map(e=>{const r=e.getBoundingClientRect();return {id:e.id||e.dataset.card,left:r.left,right:r.right,top:r.top,bottom:r.bottom}})"):
                self.assertGreaterEqual(box["left"],-1,(width,height,box))
                self.assertLessEqual(box["right"],width+1,(width,height,box))
                self.assertGreaterEqual(box["top"],-1,(width,height,box))
                self.assertLessEqual(box["bottom"],height+1,(width,height,box))

    def test_desk_objects_do_not_overlap_at_small_and_wide_resolutions(self):
        page = self.page
        for width,height in [(320,480),(320,568),(375,667),(390,844),(430,932),(568,320),(650,390),(650,900),(768,1024),(844,390),(900,600),(901,650),(1024,768),(1280,650),(1281,650),(1366,768),(1440,900),(1920,1080)]:
            page.set_viewport_size({"width":width,"height":height})
            page.evaluate("scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'})")
            page.wait_for_function("() => Number(document.querySelector('#mesa').dataset.progress) > .99")
            boxes = page.locator(".desk-object").evaluate_all("elements=>elements.map(e=>{const r=e.getBoundingClientRect();return {name:e.classList[0],left:r.left,right:r.right,top:r.top,bottom:r.bottom}})")
            for index,first in enumerate(boxes):
                self.assertGreaterEqual(first["left"],-1,(width,height,first))
                self.assertGreaterEqual(first["top"],-1,(width,height,first))
                self.assertLessEqual(first["right"],width+1,(width,height,first))
                self.assertLessEqual(first["bottom"],height+1,(width,height,first))
                for second in boxes[index+1:]:
                    overlap_width = min(first["right"],second["right"]) - max(first["left"],second["left"])
                    overlap_height = min(first["bottom"],second["bottom"]) - max(first["top"],second["top"])
                    self.assertLessEqual(min(overlap_width,overlap_height),1,(width,height,first["name"],second["name"]))

    def test_selection_preserves_all_32_geometries_and_renders_shared_borders(self):
        page = self.page
        page.locator("#map-opener").click()
        for code in range(1,33):
            page.locator("#select-state").select_option(str(code))
            geometry=page.evaluate("""code=>{const svg=document.getElementById('mexico-map'),state=svg.querySelector(`.state[data-edocve="${code}"]`),outline=document.getElementById('map-outline-selection');return {source:[...state.querySelectorAll('path')].map(p=>p.getAttribute('d')),outline:[...outline.querySelectorAll('path')].map(p=>p.getAttribute('d')),last:svg.lastElementChild.id,interactive:svg.querySelectorAll('.state[role="button"]').length,pointer:getComputedStyle(outline).pointerEvents}}""",code)
            self.assertEqual(geometry["source"],geometry["outline"],code)
            self.assertEqual(geometry["last"],"map-outlines")
            self.assertEqual(geometry["interactive"],32)
            self.assertEqual(geometry["pointer"],"none")
        for code in (8,19):
            page.locator("#select-state").select_option(str(code))
            page.mouse.move(5,20)
            page.locator("#mexico-map").scroll_into_view_if_needed()
            points=page.evaluate("""code=>{const svg=document.getElementById('mexico-map'),r=svg.getBoundingClientRect(),p=svg.querySelector(`.state[data-edocve="${code}"] path`),length=p.getTotalLength();return Array.from({length:40},(_,i)=>{const q=p.getPointAtLength(length*(i+.5)/40),s=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return [s.x-r.left,s.y-r.top]})}""",code)
            png=base64.b64encode(page.locator("#mexico-map").screenshot()).decode("ascii")
            borders=page.evaluate("""async ({png,points})=>{const image=new Image();image.src='data:image/png;base64,'+png;await image.decode();const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);return points.map(([x,y])=>{let best=Infinity;for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){const px=Math.max(0,Math.min(c.width-1,Math.round(x)+dx)),py=Math.max(0,Math.min(c.height-1,Math.round(y)+dy)),p=ctx.getImageData(px,py,1,1).data;best=Math.min(best,(p[0]-35)**2+(p[1]-62)**2+(p[2]-76)**2)}return best<55**2})}""",{"png":png,"points":points})
            self.assertTrue(all(borders),(code,borders))
        page.locator("#national-button").click()
        self.assertEqual(page.locator("#map-outline-selection path").count(),0)
