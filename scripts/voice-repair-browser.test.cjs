/* Actual components with isolated fixtures; never contacts live services. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const { handle: tasksHandle } = require("./tasks-browser/fixtures.cjs")();
const { chromium } = require("playwright"),
  esbuild = require("esbuild"), postcss=require("postcss"),tailwind=require("@tailwindcss/postcss"),{execFileSync}=require("node:child_process");
(async () => {
  const root = path.resolve(__dirname, ".."),
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "myari-notes-"));
  const phase=process.env.STUDIO_REVIEW_PHASE||"after";
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
    plugins:phase==="before"?[{name:"baseline",setup(build){build.onLoad({filter:/\/(voice-studio-workspace|VoiceScriptsStudioPage|voice-cloning-strip)\.tsx$/},args=>({contents:execFileSync("git",["show",`HEAD:${path.relative(root,args.path)}`],{cwd:root,encoding:"utf8"}),loader:"tsx"}));}}]:[],
    alias: {
      "next/server": path.join(adapters, "server.jsx"),
      "next/link": path.join(adapters, "link.jsx"),
      "next/image": path.join(adapters, "image.jsx"),
      "next/navigation": path.join(adapters, "stubs.jsx"),
      "@clerk/nextjs": path.join(adapters, "stubs.jsx"),
    },
  });
  const iconFont=process.env.CONTACTS_ICON_FONT||'/workspace/work/contacts-metrics/ui-review/material-icons.ttf';
  const reviewFonts=process.env.REVIEW_FONTS_DIR||'/tmp/myari-review-fonts';
  const compiled=await postcss([tailwind()]).process(fs.readFileSync(path.join(root,'app/globals.css'),'utf8'),{from:path.join(root,'app/globals.css')});
  const fontClasses='';
  const extraCss=['components/voice-studio/voice-studio.css','components/layout/editorial-workspace-hero.css'];
  const combinedCss=compiled.css+(fs.existsSync(path.join(reviewFonts,'faces.css'))?fs.readFileSync(path.join(reviewFonts,'faces.css'),'utf8'):'')+"@font-face{font-family:'Material Symbols Outlined';src:url(/review-icons.ttf)}.material-symbols-outlined{font-family:'Material Symbols Outlined'}:root{--font-serif:'Cormorant Garamond',Georgia,serif;--font-inter:Inter,Arial,sans-serif}"+extraCss.map(p=>phase==='before'&&p.includes('voice-studio.css')?execFileSync('git',['show',`HEAD:${p}`],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(root,p),'utf8')).join('\n');
  let drafts=[],writes=[],revision=0,saveMode="ok",releaseSave,transcriptReviews={},assigned=false;
  const {fixture}=require('./campaign-audit/harness.cjs');
  let account=structuredClone(fixture().load('lib/settings/defaults.ts').DEFAULT_SETTINGS);account.profile={...account.profile,fullName:'Alex Morgan',phone:'+15555550123',jobTitle:'Real estate agent'};account.team=[{id:'owner_a',name:'Alex Morgan',email:'review@example.test',role:'owner',status:'active'}];

  const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  const asset={id:id(1),title:'Review recording',script_id:'studio-default',approved:true,storage_path:'owner_a/review.wav',created_at:new Date().toISOString(),playbackUrl:'/review.wav',studio_metadata:{script:'Hello [FirstName], this is [Agent] in [City].',source:'human'}};
  const events=[{id:'audit-'+id(10),title:'Buyer appointment confirmed',body:'Confirmed consultation recorded.',category:'automation',entityType:'calendar_event',entityId:id(12),icon:'event',tone:'default',source:'audit',createdAt:new Date().toISOString(),href:'/dashboard/calendar'},{id:'engagement-'+id(11),title:'Client reply received',body:'Can we schedule a tour?',category:'engagement',action:'replied',entityType:'contact',entityId:id(20),icon:'chat',tone:'default',source:'audit',createdAt:new Date().toISOString(),metadata:{contactId:id(20),channel:'sms',direction:'Inbound'}},{id:'evidence-'+id(13),title:'Delivery requires review',body:'Provider rejected the submission.',category:'engagement',alert:true,source:'delivery',icon:'warning',tone:'error',createdAt:new Date().toISOString(),metadata:{status:'rejected'}}];
  async function handle(req,res,url){
    const auth=(req.headers.cookie||"").includes("qa_owner=owner_b")?"owner_b":"owner_a";
    const json=(obj,status=200)=>{if(obj && typeof obj==="object"&&!Array.isArray(obj)&&obj.success===undefined)obj={success:status<400,...obj};res.statusCode=status;res.setHeader('content-type','application/json');res.end(JSON.stringify(obj));return true};
    if(url.pathname==='/api/settings'){if(req.method==='POST'){let b='';for await(const c of req)b+=c;const body=JSON.parse(b);account={...body.settings,updatedAt:new Date().toISOString()};writes.push({path:url.pathname,body:account});return json({settings:account,email:'review@example.test',billingVerification:{verified:true,status:'none'}})}return json({settings:account,email:'review@example.test',billingVerification:{verified:true,status:'none'}});}
    if(url.pathname==='/api/settings/brand-kit')return json({kit:account.brandKit||{},headshotUrl:'',logoUrl:''});
    if(url.pathname==='/api/settings/onboarding')return json({steps:[{id:'profile',title:'Complete profile',done:true,href:'/dashboard/settings?tab=profile'},{id:'twilio',title:'Verify Twilio business number',done:false,href:'/dashboard/settings?tab=integrations'}]});
    if(url.pathname==='/api/settings/brand-kit/assets'){for await(const c of req){};return json({path:'owner_a/branding/synthetic.png',url:'/brand/heroes/settings-office.png'});}
    if(url.pathname==='/api/financing/partners')return json({success:true,data:{partners:[]}});
    if(url.pathname==='/api/integrations/status')return json({claude:{configured:false},dotloop:{connected:false}});
    if(url.pathname==='/api/integrations/google/status')return json({connected:false});
    if(url.pathname==='/api/voice-assets/signed-upload')return json({error:'Synthetic failed upload'},503);
    if(url.pathname==='/api/voice-assets')return json({voiceAssets:auth==='owner_a'?[asset]:[]});
    if(url.pathname==='/api/voice-assets/profiles')return json({success:true,profiles:[],envVoice:null,configured:false,defaultProfileId:null});
    if(url.pathname==='/api/campaigns')return json({campaigns:[{id:id(30),name:'Owned draft campaign',status:'draft'}]});
    if(url.pathname==='/api/campaigns/'+id(30)){if(req.method==='PATCH'){let b='';for await(const c of req)b+=c;const body=JSON.parse(b);writes.push({path:url.pathname,body});assigned=true;return json({link:{message:'Recording assigned.'}});}return json({steps:[{id:id(31),type:'voicemail',step_order:0,voice_asset_id:assigned?id(1):undefined}]});}
    if(url.pathname==='/api/voice-studio/drafts'){
      if(req.method==='PUT'){let b='';for await(const c of req)b+=c;const d=JSON.parse(b);writes.push({path:url.pathname,body:d});if(saveMode==='delay')await new Promise(resolve=>{releaseSave=resolve;});if(saveMode==='fail')return json({error:'Synthetic service unavailable'},503);if(saveMode==='malformed')return json({draft:{id:d.id}});
        const current=drafts.find(row=>row.id===d.id&&row.owner_id===auth);
        if(current && current.expectedRevision!==undefined)delete current.expectedRevision;
        if(current && current.title===d.title && current.script===d.script)return json({draft:current});
        if((current?.revision??null)!==(d.expectedRevision??null))return json({code:'draft_conflict',error:'Changed elsewhere'},409);
        const saved={...d,owner_id:auth,category:d.category||'General',archived:false,revision:`revision-${++revision}`,updated_at:new Date().toISOString()};delete saved.expectedRevision;drafts=[saved,...drafts.filter(row=>row.id!==d.id||row.owner_id!==auth)];return json({draft:saved});
      }return json({drafts:drafts.filter(row=>row.owner_id===auth)});
    }
    if(url.pathname==='/api/voice-studio/capabilities')return json({writingConfigured:true,transcriptionConfigured:true});
    if(url.pathname==='/api/voice-studio/transcribe'){for await(const c of req){};return json({transcript:'Hello Alex, this is your actual synthetic recording transcript.'});}
    if(url.pathname==='/api/voice-studio/transcripts'){if(req.method==='POST'){let b='';for await(const c of req)b+=c;const body=JSON.parse(b);const review={id:id(91),text:body.transcript,reviewedAt:new Date().toISOString()};transcriptReviews[auth+body.voiceAssetId]=review;return json({review});}return json({review:transcriptReviews[auth+url.searchParams.get('assetId')]||null});}
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

  const results=[],output=path.join(root,'docs/voice-studio-repair-review',phase);fs.mkdirSync(output,{recursive:true});
  try{const origin=`http://127.0.0.1:${server.address().port}`;
   for(const width of process.env.VOICE_REPAIR_WIDTHS?process.env.VOICE_REPAIR_WIDTHS.split(",").map(Number):[1440,1536,1920,1280,1100,768,390]){
    drafts=[];writes=[];saveMode="ok";assigned=false;transcriptReviews={};
    const context=await browser.newContext({viewport:{width,height:1024},reducedMotion:"reduce"});let page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/dashboard/voice-scripts');await page.getByRole('heading',{name:'Voice Scripts Library'}).waitFor();
    await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,`voice-library-${width}.png`),fullPage:true});
    await page.getByRole('button',{name:/Create script$/}).first().click();await page.getByRole('heading',{name:'Create voice script',exact:true}).waitFor();
    if(phase==='before'){await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(output,`voice-create-${width}.png`),fullPage:true});await context.close();continue;}
    assert.equal(await page.locator('.vs-create-page .editorial-workspace-hero').count(),0);
    await page.getByLabel('Script title',{exact:true}).fill('Synthetic reviewed draft');await page.getByLabel('Script text',{exact:true}).fill('Hello, this is my synthetic real estate script.');await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('status').filter({hasText:'Script draft saved'}).waitFor();assert.equal(drafts[0].title,'Synthetic reviewed draft');
    await page.reload();await page.getByRole('heading',{name:'Create voice script',exact:true}).waitFor();await page.getByRole('status').filter({hasText:'Script draft saved'}).waitFor();assert.equal(await page.getByLabel('Script text',{exact:true}).inputValue(),'Hello, this is my synthetic real estate script.');
    if(width===1440){
      await page.getByRole('checkbox',{name:/I have permission to record/}).check();
      await page.evaluate(()=>{Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{throw new DOMException('denied','NotAllowedError')}}})});
      await page.getByRole('button',{name:'Start recording',exact:true}).click();await page.getByRole('status').filter({hasText:'Microphone access denied'}).waitFor();
      await page.evaluate(()=>{const track={stop(){window.__trackStopped=true}};Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>({getTracks:()=>[track]})}});window.MediaRecorder=class {static isTypeSupported(){return true}constructor(){this.state='inactive'}start(){this.state='recording'}pause(){this.state='paused'}resume(){this.state='recording'}stop(){this.state='inactive';this.ondataavailable?.({data:new Blob([new Uint8Array([26,69,223,163,0,0,0,0,0,0,0,0])],{type:'audio/webm'})});this.onstop?.()}};});
      await page.getByRole('button',{name:'Start recording',exact:true}).click();await page.getByRole('button',{name:'Pause',exact:true}).click();await page.getByRole('button',{name:'Resume',exact:true}).click();await page.getByRole('button',{name:'Stop recording',exact:true}).click();await page.getByRole('dialog',{name:'Save recording',exact:true}).waitFor();await page.getByRole('dialog',{name:'Save recording',exact:true}).getByRole('button',{name:'Save recording',exact:true}).click();await page.getByRole('status').filter({hasText:'Upload failed. Your recording is retained'}).waitFor();assert.ok(await page.getByRole('dialog',{name:'Save recording',exact:true}).isVisible());assert.equal(await page.evaluate(()=>window.__trackStopped),true);await page.getByRole('dialog',{name:'Save recording',exact:true}).getByRole('button',{name:'Cancel',exact:true}).click();await page.getByText('Your unsaved recording is retained on this page.',{exact:true}).waitFor();page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Discard recording',exact:true}).click();
    }
    await page.getByRole('button',{name:'Show library',exact:true}).click();await page.getByRole('button',{name:/Review recording Approved recording/}).click();
    await page.getByLabel('Campaign',{exact:true}).selectOption(id(30));await page.getByLabel('Voicemail step',{exact:true}).selectOption(id(31));assert.equal(writes.filter(w=>w.path.includes('campaigns')).length,0);
    await page.getByRole('button',{name:'Test Voice Script',exact:true}).first().click();await page.getByRole('dialog').waitFor();await page.getByText('Synthetic text preview',{exact:true}).waitFor();assert.equal(writes.filter(w=>w.path.includes('campaigns')).length,0);await page.keyboard.press('Escape');
    await page.getByRole('button',{name:'Hide library',exact:true}).click();await page.getByRole('status').filter({hasText:'Script draft saved to cloud.'}).waitFor();await page.getByRole('status').filter({hasText:'Upload failed. Your recording is retained'}).waitFor({state:'hidden'});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(output,`voice-create-${width}.png`),fullPage:true});console.log('layout',width,await page.evaluate(()=>({inner:innerWidth,html:document.documentElement.scrollWidth,body:document.body.scrollWidth,layout:document.querySelector('.vs-layout')?.getBoundingClientRect().width,overflow:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+2&&getComputedStyle(e).display!=='none').slice(0,12).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right,width:e.getBoundingClientRect().width}))})));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.body.scrollWidth<=innerWidth+1));
    // Manual save acknowledgement, autosave, failure recovery, and cross-session collision.
    await page.getByLabel('Script text',{exact:true}).fill('Autosave persistence checked with synthetic records.');await page.getByRole('status').filter({hasText:'Script draft saved to cloud.'}).waitFor();assert.equal(drafts[0].script,'Autosave persistence checked with synthetic records.');
    if(width===1440){
      saveMode='delay';releaseSave=null;await page.getByLabel('Script text',{exact:true}).fill('Snapshot sent before newer typing.');await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.vs-save-state')?.textContent.includes('Saving draft'));await page.getByLabel('Script text',{exact:true}).fill('Newer typing must survive the in-flight response.');saveMode='ok';releaseSave();await page.getByRole('status').filter({hasText:'Script draft saved to cloud.'}).waitFor();assert.equal(await page.getByLabel('Script text',{exact:true}).inputValue(),'Newer typing must survive the in-flight response.');assert.equal(drafts[0].script,'Newer typing must survive the in-flight response.');
      saveMode='malformed';await page.getByLabel('Script text',{exact:true}).fill('Malformed acknowledgement is not a saved draft.');await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('status').filter({hasText:'Cloud save failed'}).first().waitFor();assert.equal(await page.getByText('Script draft saved to cloud.',{exact:true}).count(),0);
    }
    if(width===1440){await page.getByLabel('Script title',{exact:true}).fill('');await page.getByLabel('Script text',{exact:true}).fill('An unfinished title must not lose this script.');page.once('dialog',dialog=>dialog.accept());await page.reload();await page.getByLabel('Script title',{exact:true}).waitFor();assert.equal(await page.getByLabel('Script title',{exact:true}).inputValue(),'');assert.equal(await page.getByLabel('Script text',{exact:true}).inputValue(),'An unfinished title must not lose this script.');await page.getByLabel('Script title',{exact:true}).fill('Recovered unfinished title');}
    saveMode='fail';await page.getByLabel('Script text',{exact:true}).fill('Keep this unsaved recovery after refresh.');await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('status').filter({hasText:'Cloud save failed'}).first().waitFor();page.once('dialog',dialog=>dialog.accept());await page.reload();await page.getByLabel('Script text',{exact:true}).waitFor();assert.equal(await page.getByLabel('Script text',{exact:true}).inputValue(),'Keep this unsaved recovery after refresh.');
    saveMode='ok';await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('status').filter({hasText:'Script draft saved to cloud.'}).waitFor();
    const savedId=drafts[0].id;drafts[0]={...drafts[0],title:'Changed by another device',revision:`revision-${++revision}`};await page.getByLabel('Script text',{exact:true}).fill('My conflicting edits remain recoverable.');await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('status').filter({hasText:'Draft conflict'}).waitFor();assert.equal(await page.getByLabel('Script text',{exact:true}).inputValue(),'My conflicting edits remain recoverable.');assert.equal(drafts.find(d=>d.id===savedId).title,'Changed by another device');
    await page.getByRole('button',{name:'Save as new draft',exact:true}).click();await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('status').filter({hasText:'Script draft saved to cloud.'}).waitFor();assert.notEqual(drafts[0].id,savedId);
    const prompt=page.locator('#vs-ai');await prompt.fill('Write a warm follow-up without inventing client facts.');await page.getByRole('button',{name:'Generate script',exact:true}).click();await page.getByLabel('AI proposed script',{exact:true}).waitFor();assert.equal(await page.getByLabel('Script text',{exact:true}).inputValue(),'My conflicting edits remain recoverable.');await page.getByRole('button',{name:'Apply to draft',exact:true}).click();assert.equal(await page.getByLabel('Script text',{exact:true}).inputValue(),'Hello, this is a reviewed draft for your real estate follow-up.');
    for(const action of ['Improve tone','Shorten','Optimize duration','Spoken-friendly wording']){await page.getByRole('button',{name:action,exact:true}).click();assert.equal(await prompt.inputValue(),action);}
    await page.getByRole('button',{name:'Translate',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Generate script',exact:true}).isDisabled(),true);await prompt.fill('Translate the draft into Spanish, preserving facts.');assert.equal(await page.getByRole('button',{name:'Generate script',exact:true}).isEnabled(),true);
    if(await page.getByRole('button',{name:'Show library',exact:true}).count())await page.getByRole('button',{name:'Show library',exact:true}).click();await page.getByRole('button',{name:/Review recording Approved recording/}).click();
    await page.locator('.vs-transcription-details > summary').click();page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Transcribe Recording',exact:true}).click();await page.getByRole('status').filter({hasText:'AI-generated draft transcript — not agent reviewed.'}).waitFor();await page.getByLabel('Transcript draft',{exact:true}).fill('Corrected and reviewed synthetic transcript.');await page.getByRole('checkbox',{name:/I listened to this exact recording/}).check();await page.getByRole('button',{name:'Save reviewed transcript',exact:true}).click();await page.getByRole('status').filter({hasText:'Agent-reviewed transcript saved. Approved audio is unchanged.'}).waitFor();assert.equal(asset.approved,true);
    await page.getByLabel('Campaign',{exact:true}).selectOption(id(30));await page.getByLabel('Voicemail step',{exact:true}).selectOption(id(31));page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Assign to campaign',exact:true}).click();await page.getByRole('status').filter({hasText:'Recording assigned.'}).waitFor();const assignment=writes.find(w=>w.path==='/api/campaigns/'+id(30));assert.equal(assignment.body.stepId,id(31));assert.equal(assignment.body.assignmentConfirmed,true);assert.equal(assignment.body.voiceAssetId,id(1));
    await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('status').filter({hasText:'Script draft saved to cloud.'}).waitFor();const reopenedText=await page.getByLabel('Script text',{exact:true}).inputValue();await page.close();page=await context.newPage();await page.goto(origin+'/dashboard/voice-scripts');await page.getByRole('heading',{name:'Create voice script',exact:true}).waitFor();await page.getByRole('status').filter({hasText:'Script draft saved to cloud.'}).waitFor();assert.equal(await page.getByLabel('Script text',{exact:true}).inputValue(),reopenedText);await page.getByRole('button',{name:'Show library',exact:true}).click();await page.getByRole('button',{name:/Review recording Approved recording/}).click();await page.locator('.vs-transcription-details > summary').click();await page.getByRole('status').filter({hasText:'Agent-reviewed transcript saved.'}).waitFor();assert.equal(await page.getByLabel('Transcript draft',{exact:true}).inputValue(),'Corrected and reviewed synthetic transcript.');
    if(width===1440){await page.getByRole('button',{name:'Save draft',exact:true}).click();await page.getByRole('status').filter({hasText:'Script draft saved to cloud.'}).waitFor();const stored=structuredClone(drafts);drafts=[];await page.reload();await page.getByRole('status').filter({hasText:'Draft conflict'}).waitFor();assert.equal(await page.getByText('Script draft saved to cloud.',{exact:true}).count(),0);drafts=stored;await page.getByRole('button',{name:'Retry cloud library',exact:true}).click();await page.getByRole('status').filter({hasText:'Script draft saved to cloud.'}).waitFor();}
    await context.addCookies([{name:'qa_owner',value:'owner_b',url:origin}]);await page.evaluate(()=>{window.__owner='owner_b';window.dispatchEvent(new Event('review:auth'));});await page.getByRole('heading',{name:'Voice Scripts Library'}).waitFor();await page.getByRole('button',{name:/Create script$/}).first().click();assert.equal(await page.locator('.vs-library').getByText('Synthetic reviewed draft',{exact:true}).count(),0);assert.ok(!(await page.getByLabel('Script text',{exact:true}).inputValue()).includes('My conflicting edits'));
    assert.deepEqual(errors,[]);results.push({width,overflow:false,pageErrors:errors,checks:['cloud draft save and server acknowledgement','autosave','refresh and reopening persistence','failed-save recovery','concurrent editing conflict and save as copy','AI review before applying and action requirements','authorized transcript review','exact-step confirmed assignment','subscriber isolation','compact create mode and collapsible library','mocked microphone permission/record/pause/resume/stop and failed-save retention at 1440px']});await context.close();
   }fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
  }finally{await browser.close();server.close();fs.rmSync(tmp,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
