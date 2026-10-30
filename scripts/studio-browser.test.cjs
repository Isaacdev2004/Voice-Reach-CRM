/* Actual components with isolated fixtures; never contacts live services. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const { handle: tasksHandle } = require("./tasks-browser/fixtures.cjs")();
const { chromium } = require("playwright"),
  esbuild = require("esbuild");
(async () => {
  const root = path.resolve(__dirname, ".."),
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "myari-notes-"));
  const adapters = path.join(__dirname, "contacts-browser");
  const bundle = await esbuild.build({
    entryPoints: [
      path.join(__dirname, "studio-browser-entry.jsx"),
    ],
    bundle: true,
    write: false,
    jsx: "automatic",
    tsconfig: path.join(root, "tsconfig.json"),
    loader: { ".css": "empty" },
    define: { "process.env.NODE_ENV": '"development"', "process.env": "{}" },
    nodePaths: [path.join(root, "node_modules")],
    alias: {
      "next/server": path.join(adapters, "server.jsx"),
      "next/link": path.join(adapters, "link.jsx"),
      "next/image": path.join(adapters, "image.jsx"),
      "next/navigation": path.join(adapters, "stubs.jsx"),
      "@clerk/nextjs": path.join(adapters, "stubs.jsx"),
    },
  });
  const cssRoot = path.join(root, ".next/static/css");
  const iconFont = process.env.CONTACTS_ICON_FONT;
  const reviewFonts = process.env.REVIEW_FONTS_DIR;
  const css =
    (iconFont
      ? "@font-face{font-family:'Material Symbols Outlined';src:url(/review-icons.ttf)}.material-symbols-outlined{font-family:'Material Symbols Outlined'}"
      : "") +
    (reviewFonts
      ? fs.readFileSync(path.join(reviewFonts, "faces.css"), "utf8")
      : "") +
    fs
      .readdirSync(cssRoot)
      .filter((x) => x.endsWith(".css"))
      .map((x) =>
        fs
          .readFileSync(path.join(cssRoot, x), "utf8")
          .replaceAll("../media/", "/review-fonts/")
          .replaceAll("/_next/static/media/", "/review-fonts/"),
      )
      .join("\n") +
    fs.readFileSync(
      path.join(root, "components/tasks/tasks-workspace.css"),
      "utf8",
    );
  const fontClasses = [
    ...css.matchAll(/\.([\w-]+)\{--font-(?:serif|inter|hand):[^}]+\}/g),
  ]
    .map((m) => m[1])
    .join(" ");

  const extraCss=['components/voice-studio/voice-studio.css','components/activity/activity-center.css','components/layout/editorial-workspace-hero.css','components/settings/settings-premium.css'];
  const combinedCss=css+extraCss.map(p=>fs.readFileSync(path.join(root,p),'utf8')).join('\n');
  let drafts=[],writes=[];
  const {fixture}=require('./campaign-audit/harness.cjs');
  let account=structuredClone(fixture().load('lib/settings/defaults.ts').DEFAULT_SETTINGS);account.profile={...account.profile,fullName:'Alex Morgan',phone:'+15555550123',jobTitle:'Real estate agent'};account.team=[{id:'owner_a',name:'Alex Morgan',email:'review@example.test',role:'owner',status:'active'}];

  const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  const asset={id:id(1),title:'Review recording',script_id:'studio-default',approved:true,storage_path:'owner_a/review.wav',created_at:new Date().toISOString(),playbackUrl:'/review.wav',studio_metadata:{script:'Hello [FirstName], this is [Agent] in [City].',source:'human'}};
  const events=[{id:'audit-'+id(10),title:'Buyer appointment confirmed',body:'Confirmed consultation recorded.',category:'automation',entityType:'calendar_event',entityId:id(12),icon:'event',tone:'default',source:'audit',createdAt:new Date().toISOString(),href:'/dashboard/calendar'},{id:'engagement-'+id(11),title:'Client reply received',body:'Can we schedule a tour?',category:'engagement',action:'replied',entityType:'contact',entityId:id(20),icon:'chat',tone:'default',source:'audit',createdAt:new Date().toISOString(),metadata:{contactId:id(20),channel:'sms',direction:'Inbound'}},{id:'evidence-'+id(13),title:'Delivery requires review',body:'Provider rejected the submission.',category:'engagement',alert:true,source:'delivery',icon:'warning',tone:'error',createdAt:new Date().toISOString(),metadata:{status:'rejected'}}];
  async function handle(req,res,url){
    const json=(obj,status=200)=>{if(obj&&typeof obj==="object"&&obj.success===undefined)obj={success:status<400,...obj};res.statusCode=status;res.setHeader('content-type','application/json');res.end(JSON.stringify(obj));return true};
    if(url.pathname==='/api/settings'){if(req.method==='POST'){let b='';for await(const c of req)b+=c;const body=JSON.parse(b);account={...body.settings,updatedAt:new Date().toISOString()};writes.push({path:url.pathname,body:account});return json({settings:account,email:'review@example.test',billingVerification:{verified:true,status:'none'}})}return json({settings:account,email:'review@example.test',billingVerification:{verified:true,status:'none'}});}
    if(url.pathname==='/api/settings/brand-kit')return json({kit:account.brandKit||{},headshotUrl:'',logoUrl:''});
    if(url.pathname==='/api/settings/onboarding')return json({steps:[{id:'profile',title:'Complete profile',done:true,href:'/dashboard/settings?tab=profile'},{id:'twilio',title:'Verify Twilio business number',done:false,href:'/dashboard/settings?tab=integrations'}]});
    if(url.pathname==='/api/settings/brand-kit/assets'){for await(const c of req){};return json({path:'owner_a/branding/synthetic.png',url:'/brand/heroes/settings-office.png'});}
    if(url.pathname==='/api/financing/partners')return json({success:true,data:{partners:[]}});
    if(url.pathname==='/api/integrations/status')return json({claude:{configured:false},dotloop:{connected:false}});
    if(url.pathname==='/api/integrations/google/status')return json({connected:false});
    if(url.pathname==='/api/voice-assets/signed-upload')return json({error:'Synthetic failed upload'},503);
    if(url.pathname==='/api/voice-assets/'+asset.id && req.method==='PATCH'){let b='';for await(const c of req)b+=c;const body=JSON.parse(b);asset.studio_metadata={...asset.studio_metadata,...body.studioMetadata};return json({voiceAsset:asset});}
    if(url.pathname==='/api/voice-assets')return json({voiceAssets:[asset]});
    if(url.pathname==='/api/voice-assets/profiles')return json({success:true,profiles:[],envVoice:null,configured:false,defaultProfileId:null});
    if(url.pathname==='/api/campaigns')return json({campaigns:[{id:id(30),name:'Owned draft campaign',status:'draft'}]});
    if(url.pathname==='/api/campaigns/'+id(30))return json({steps:[{id:id(31),type:'voicemail',step_order:0}]});
    if(url.pathname==='/api/voice-studio/drafts'){if(req.method==='PUT'){let b='';for await(const c of req)b+=c;const d={...JSON.parse(b),category:"General",archived:false,revision:crypto.randomUUID(),updated_at:new Date().toISOString()};drafts=drafts.filter(x=>x.id!==d.id);drafts.push(d);writes.push({path:url.pathname,body:d});return json({draft:d})}return json({drafts});}
    if(url.pathname==='/api/voice-studio/capabilities')return json({writingConfigured:true,transcriptionConfigured:false});
    if(url.pathname==='/api/voice-studio/transcripts')return json({review:null});
    if(url.pathname==='/api/voice-studio/write')return json({script:'Hello, this is a reviewed draft for your real estate follow-up.'});
    if(url.pathname==='/api/activity'){if(req.method==='POST'){let b='';for await(const c of req)b+=c;writes.push({path:url.pathname,body:JSON.parse(b)});return json({ok:true})}return json({entries:events,state:[],stateAvailable:true});}
    if(url.pathname==='/api/activity/priorities')return json({items:[{title:'Review actual follow-up',href:'/dashboard/tasks'}]});
    if(url.pathname==='/api/communications')return json({messages:[{id:id(50),provider_id:'SMsynthetic',kind:'sms',contact_id:id(20),from_number:'+15555550123',to_number:'+15555550999',body:'Can we schedule a tour?',status:'received',classification:'Appointment request',duration:null,received_at:new Date().toISOString()}]});
    if(url.pathname==='/review.wav'){const buffer=Buffer.alloc(44+16000);buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(1,22);buffer.writeUInt32LE(8000,24);buffer.writeUInt32LE(16000,28);buffer.writeUInt16LE(2,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(16000,40);res.setHeader('content-type','audio/wav');res.end(buffer);return true;}
    if(url.pathname.startsWith('/api/'))return tasksHandle(req,res,url);
    return false;
  }
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (await handle(req, res, url)) return;
    let file = url.pathname;
    if (file === "/review-icons.ttf" && iconFont) {
      res.setHeader("content-type", "font/ttf");
      return res.end(fs.readFileSync(iconFont));
    }
    if (file === "/bundle.js") {
      res.setHeader("content-type", "application/javascript");
      return res.end(bundle.outputFiles[0].text);
    }
    if (file === "/style.css") {
      res.setHeader("content-type", "text/css");
      return res.end(combinedCss);
    }
    if (file.startsWith("/dashboard")) {
      res.setHeader("content-type", "text/html");
      return res.end(
        `<html><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="${fontClasses}"><div id="root"></div><script src="/bundle.js"></script></body></html>`,
      );
    }
    if (file === "/favicon.ico") {
      res.statusCode = 204;
      return res.end();
    }
    const local = file.startsWith("/review-fonts/")
      ? path.join(
          reviewFonts || path.join(root, ".next/static/media"),
          path.basename(file),
        )
      : path.resolve(root, "public", "." + file);
    if (
      !local.startsWith(root + path.sep) &&
      !(reviewFonts && local.startsWith(path.resolve(reviewFonts) + path.sep))
    ) {
      res.statusCode = 403;
      return res.end();
    }
    try {
      res.end(fs.readFileSync(local));
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });

  const results=[],output=path.join(root,'docs/studio-activity-review');fs.mkdirSync(output,{recursive:true});
  try{const origin=`http://127.0.0.1:${server.address().port}`;
   for(const width of [1440,1536,1920,768,390]){
    drafts=[];writes=[];
    const page=await browser.newPage({viewport:{width,height:1024}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/dashboard/voice-scripts');await page.getByRole('heading',{name:'Voice Scripts Library'}).waitFor();
    await page.getByRole('button',{name:'+ Add category',exact:true}).click();
    await page.getByRole('textbox',{name:'Category name',exact:true}).fill('Luxury buyers');
    await page.getByRole('button',{name:'Add category',exact:true}).click();
    await page.getByRole('combobox',{name:'Script category',exact:true}).selectOption('Luxury buyers');
    await page.getByText('Script category saved. Audio and campaign assignments are unchanged.',{exact:true}).waitFor();
    assert.equal(asset.studio_metadata.category,'Luxury buyers');
    await page.reload();
    await page.getByRole('combobox',{name:'Script category',exact:true}).waitFor();
    assert.equal(await page.getByRole('combobox',{name:'Script category',exact:true}).inputValue(),'Luxury buyers');

    await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,`voice-library-${width}.png`),fullPage:true});
    await page.getByRole('button',{name:/Create script$/}).first().click();await page.getByRole('heading',{name:'Create voice script',exact:true}).waitFor();
    await page.getByLabel('Script title',{exact:true}).fill('Synthetic reviewed draft');await page.getByLabel('Script text',{exact:true}).fill('Hello, this is my synthetic real estate script.');await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('status').filter({hasText:'Script draft saved'}).waitFor();assert.equal(drafts.at(-1).title,'Synthetic reviewed draft');await page.waitForFunction(id=>window.__readAssistantRecord().voiceDraftId===id,drafts.at(-1).id);
    if(width===1440){
      await page.getByRole('checkbox',{name:/I have permission to record/}).check();
      await page.evaluate(()=>{Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{throw new DOMException('denied','NotAllowedError')}}})});
      await page.getByRole('button',{name:'Start recording',exact:true}).click();await page.getByRole('status').filter({hasText:'Microphone access denied'}).waitFor();
      await page.evaluate(()=>{const track={stop(){window.__trackStopped=true}};Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[track]})}});window.MediaRecorder=class {static isTypeSupported(){return true}constructor(){this.state='inactive'}start(){this.state='recording'}pause(){this.state='paused'}resume(){this.state='recording'}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob([new Uint8Array([26,69,223,163,0,0,0,0,0,0,0,0])],{type:'audio/webm'})});this.onstop?.()}};});
      await page.getByRole('button',{name:'Start recording',exact:true}).click();await page.getByRole('button',{name:'Pause',exact:true}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();await page.getByRole('button',{name:'Stop recording',exact:true}).click();await page.getByRole('dialog',{name:'Save recording',exact:true}).waitFor();await page.getByRole('dialog',{name:'Save recording',exact:true}).getByRole('button',{name:'Save recording',exact:true}).click();await page.getByRole('status').filter({hasText:'Upload failed. Your recording is retained'}).waitFor();assert.ok(await page.getByRole('dialog',{name:'Save recording',exact:true}).isVisible());assert.equal(await page.evaluate(()=>window.__trackStopped),true);await page.getByRole('dialog',{name:'Save recording',exact:true}).getByRole('button',{name:'Cancel',exact:true}).click();page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Discard recording',exact:true}).click();
    }
    await page.getByRole('button',{name:'Show library',exact:true}).click();await page.getByRole('button',{name:/Review recording Approved recording/}).click();
    await page.getByLabel('Campaign',{exact:true}).selectOption(id(30));await page.getByLabel('Voicemail step',{exact:true}).selectOption(id(31));assert.equal(writes.filter(w=>w.path.includes('campaigns')).length,0);
    await page.getByRole('button',{name:'Test Voice Script',exact:true}).first().click();await page.getByRole('dialog').waitFor();await page.getByText('Synthetic text preview',{exact:true}).waitFor();assert.equal(writes.filter(w=>w.path.includes('campaigns')).length,0);await page.keyboard.press('Escape');
    await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,`voice-create-${width}.png`),fullPage:true});console.log('layout',width,await page.evaluate(()=>({inner:innerWidth,html:document.documentElement.scrollWidth,body:document.body.scrollWidth,layout:document.querySelector('.vs-layout')?.getBoundingClientRect().width,overflow:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+2&&getComputedStyle(e).display!=='none').slice(0,12).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width}))})));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.body.scrollWidth<=innerWidth+1));
    await page.goto(origin+'/dashboard/activity');await page.getByRole('heading',{name:'Every interaction tells a story.'}).waitFor();await page.getByText('3 matching events',{exact:true}).waitFor();if(width===390)assert.ok(await page.locator('.ac-toolbar select').evaluateAll(es=>es.every(e=>e.getBoundingClientRect().width>=130)));
    await page.getByRole('button',{name:/Client Replies/}).click();await page.getByText('1 matching events',{exact:true}).waitFor();await page.getByRole('button',{name:/Client reply received/}).click();await page.getByRole('complementary',{name:'Activity details'}).waitFor();await page.getByRole('button',{name:'Close event details'}).click();
    await page.getByRole('button',{name:/All Activity/}).click();await page.getByRole('searchbox',{name:'Search activity logs'}).fill('unmatched');await page.getByText('No activity matches these filters.',{exact:false}).waitFor();await page.getByRole('searchbox',{name:'Search activity logs'}).fill('');
    await page.getByRole('button',{name:/Delivery requires review/}).click();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,`activity-${width}.png`),fullPage:true});console.log('layout',width,await page.evaluate(()=>({inner:innerWidth,html:document.documentElement.scrollWidth,body:document.body.scrollWidth,layout:document.querySelector('.vs-layout')?.getBoundingClientRect().width,overflow:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+2&&getComputedStyle(e).display!=='none').slice(0,12).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width}))})));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.body.scrollWidth<=innerWidth+1));
    await page.getByRole('button',{name:'Open conversation inbox',exact:true}).click();await page.getByRole('button',{name:/15555550123/}).click();await page.getByText('Classifications are keyword suggestions',{exact:false}).waitFor();
    await page.goto(origin+'/dashboard/settings');await page.getByRole('heading',{name:'Make MyARI yours.'}).waitFor();await page.getByRole('button',{name:'Edit profile',exact:true}).click();await page.getByLabel('Full name',{exact:true}).fill('Alex Reviewed');await page.getByRole('button',{name:'Save changes',exact:true}).first().click();await page.getByRole('status').filter({hasText:'All changes saved'}).waitFor();assert.equal(account.profile.fullName,'Alex Reviewed');
    await page.getByRole('button',{name:/Workspace$/}).first().click();await page.getByRole('heading',{name:'Workspace',exact:true}).waitFor();await page.getByRole('button',{name:/Integrations$/}).first().click();await page.getByRole('heading',{name:'API integrations',exact:true}).waitFor();await page.locator('.settings-premium').getByRole('button',{name:/Notifications$/}).first().click();await page.getByRole('heading',{name:'Notifications',exact:true}).waitFor();await page.getByRole('button',{name:/API Keys$/}).first().click();await page.getByText('Key issuance unavailable',{exact:false}).waitFor();await page.getByRole('button',{name:/Profile$/}).first().click();
    await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,`settings-${width}.png`),fullPage:true});assert.ok(await page.evaluate(()=>document.body.scrollWidth<=innerWidth+1));
    await page.getByRole('button',{name:/Brand Kit$/}).first().click();await page.getByRole('heading',{name:'Your professional identity.'}).waitFor();await page.getByLabel('Agent name',{exact:true}).fill(`Alex Brand ${width}`);await page.getByLabel('Business / brokerage name',{exact:true}).fill('Synthetic Realty');await page.getByLabel('Primary brand color',{exact:true}).fill('#996633');await page.getByRole('button',{name:'Email signature',exact:true}).click();await page.getByRole('heading',{name:'Email signature',exact:true}).waitFor();await page.getByRole('checkbox',{name:/I reviewed these details/}).check();await page.getByRole('button',{name:'Save all changes',exact:true}).last().click();await page.getByRole('status').filter({hasText:'All changes saved'}).waitFor();assert.equal(account.brandKit.agentName,`Alex Brand ${width}`);assert.equal(account.brandKit.approved,true);await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,`brand-kit-${width}.png`),fullPage:true});assert.ok(await page.evaluate(()=>document.body.scrollWidth<=innerWidth+1));
    assert.deepEqual(errors,[]);results.push({width,overflow:false,pageErrors:errors,checks:['draft save','exact step selection does not assign','safe preview','KPI filtering','search empty results','event details','conversation inbox','Settings profile and tabs','Brand Kit approval and cross-session persistence','mocked microphone permission/record/pause/resume/stop and failed-save retention at 1440px']});await page.close();
   }fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
  }finally{await browser.close();server.close();fs.rmSync(tmp,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
