const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const AxeBuilder = require("@axe-core/playwright").default;
(async () => {
  const base = process.env.PUBLIC_REVIEW_URL || "http://127.0.0.1:3000";
  const forbidden = ["CLERK_SECRET_KEY","SUPABASE_SERVICE_ROLE_KEY","OPENAI_API_KEY","STRIPE_SECRET_KEY","TWILIO_AUTH_TOKEN","RESEND_API_KEY"];
  assert.ok(forbidden.every(k => !process.env[k]), "Public UI fixture runner must not receive provider credentials");
  const browser = await chromium.launch({ headless:true, args:["--no-sandbox"] });
  const out="docs/public-feature-workflow"; fs.mkdirSync(out,{recursive:true});
  const results=[];
  try {
    for(const width of [1440,1366,1280,768,390]) {
      const height = width === 1366 ? 768 : width === 1280 ? 800 : 900;
      const context=await browser.newContext({viewport:{width,height},reducedMotion:"reduce"});
      const page=await context.newPage(); const errors=[];
      page.on("pageerror",e=>errors.push(e.message));
      await page.route("**/api/**",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({success:true})}));
      await page.goto(base+"/",{waitUntil:"networkidle"});
      await page.evaluate(()=>document.fonts.ready);
      const cards=page.locator(".home-feature-grid .features-capability");
      assert.equal(await cards.count(),9);
      const hrefs=await cards.evaluateAll(nodes=>nodes.map(n=>n.getAttribute("href")));
      assert.equal(new Set(hrefs).size,9);
      for(const card of await cards.all()){assert.ok(await card.locator("p").innerText());assert.ok(await card.getByText("Learn more",{exact:false}).isVisible())}
      assert.deepEqual(await page.locator(".campaign-flow-path h4").allTextContents(),["Capture","Organize","Nurture","Convert"]);
      assert.equal(await page.locator(".campaign-flow").count(),1);
      assert.equal(await page.locator(".features-contact-capture").count(),0);
      assert.ok(await page.getByText("Campaign sending requires your review",{exact:false}).isVisible());
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,"horizontal overflow");
      const oldHrefs=await page.locator(".public-header a").evaluateAll(nodes=>nodes.map(n=>n.getAttribute("href")));
      assert.ok(oldHrefs.includes("/pricing"));assert.ok(oldHrefs.some(h=>h?.includes("sign-in")));
      await cards.first().focus();
      assert.equal(await cards.first().evaluate(el=>document.activeElement===el),true);
      await page.keyboard.press("Enter");await page.waitForURL("**/features/lead-management");
      await page.goBack({waitUntil:"networkidle"});
      if(width===1440){for(const href of hrefs){const r=await context.request.get(base+href);assert.equal(r.status(),200,href)}}
      const featureBox=await page.locator("#capabilities").boundingBox();
      if(width>=1280){assert.ok(featureBox.height<=height-100,"complete feature section must fit desktop viewport");const boxes=await page.locator(".campaign-flow-path>li").evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return{x:b.x,y:b.y}}));assert.ok(boxes.every(b=>Math.abs(b.y-boxes[0].y)<2),"horizontal desktop workflow");assert.ok(boxes.every((b,i)=>i===0||b.x>boxes[i-1].x));}
      assert.equal(await page.locator("#core-title").innerText(),"A complete real estate workspace.");
      const axe=await new AxeBuilder({page}).include("#capabilities").include("#outreach").withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa"]).analyze();
      assert.deepEqual(axe.violations.map(v=>v.id),[],"new sections accessibility");
      assert.equal(await page.locator(".campaign-flow-connector").first().evaluate(el=>getComputedStyle(el).animationName),"none");
      await page.locator("#capabilities").screenshot({path:out+"/features-"+width+".jpg",type:"jpeg",quality:85});
      await page.locator("#outreach").screenshot({path:out+"/workflow-"+width+".jpg",type:"jpeg",quality:85});
      await page.goto(base+"/features",{waitUntil:"networkidle"});
      assert.equal(await page.locator(".features-core-grid .features-capability").count(),6);
      assert.equal(await page.locator(".features-tools-grid .features-tool-card").count(),3);
      assert.equal(await page.locator(".campaign-flow").count(),0);
      assert.equal(await page.locator(".features-contact-capture img").count(),1);
      assert.deepEqual(errors,[]);
      results.push({width,height,featureCards:9,allLinksFunctional:true,featureSectionHeight:Math.round(featureBox.height),horizontalOverflow:false,accessibilityViolations:0,keyboardNavigation:"PASS",reducedMotion:"PASS",featuresPagePreserved:true});
      await context.close();
    }
    fs.writeFileSync(out+"/browser-results.json",JSON.stringify(results,null,2));
    console.log(JSON.stringify(results,null,2));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
