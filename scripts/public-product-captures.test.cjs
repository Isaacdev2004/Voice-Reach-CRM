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
      path.join(__dirname, "marketing-captures/entry.jsx"),
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
    if(url.pathname==='/api/ai/generate')return json({output:{subject:'Your next step toward home',body:'Hi Morgan,\n\nThank you for sharing what matters most in your home search. Which neighborhoods would you like to explore next? I would be happy to help you refine your preferences and plan a convenient time to connect.\n\nWarmly,\nAvery'},provider:'synthetic-demo'});
    if(url.pathname==='/api/analytics'){
      const f=fixture(),m=f.load('lib/delivery/metrics.ts').messageRecord,compute=f.load('lib/analytics/compute.ts').buildAnalyticsSnapshot;
      const time=new Date(Date.now()-3600000).toISOString();
      const records=Array.from({length:12},(_,i)=>{const message={id:id(100+i),owner_id:'owner_a',logical_key:'demo-'+i,provider:i%2?'resend':'twilio',channel:i%2?'email':'sms',campaign_id:id(30),contact_id:id(20),recipient_id:null,step_id:null,provider_message_id:'synthetic-'+i,created_at:time,subject:null,body:'Synthetic demonstration message',submission_status:'accepted',error_code:null};return m(message,[{id:id(200+i),owner_id:'owner_a',message_id:message.id,provider:message.provider,event_key:'demo-'+i,event_type:'delivered',occurred_at:time,received_at:time,source:'webhook',error_code:null}],{contact:'Morgan Reed',campaign:'Buyer follow-up'});});
      return json(compute({range:'30d',contacts:[{id:id(20)}],campaigns:[{id:id(30),name:'Buyer follow-up',status:'active'}],records}));
    }
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

  const output=path.join(root,'public/brand/product-captures');fs.mkdirSync(output,{recursive:true});
  const sharp=require('sharp');
  try{
    const context=await browser.newContext({viewport:{width:1536,height:1350},deviceScaleFactor:2,reducedMotion:'reduce'});
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/dashboard/voice-scripts`);
    await page.getByRole('heading',{name:'Voice Scripts Library'}).waitFor();
    await page.getByRole('button',{name:/Create script$/}).first().click();
    await page.getByRole('button',{name:'Show library',exact:true}).click();
    await page.getByRole('button',{name:/Review recording Approved recording/}).click();
    await page.getByLabel('Script title',{exact:true}).fill('Buyer consultation follow-up');
    await page.getByLabel('Script text',{exact:true}).fill('Hi Morgan, it is Avery from Cedar & Stone Realty. Thank you for taking the time to discuss your home search. Which neighborhoods would you like to explore next? Call or text me when it is convenient. I would be happy to help.');
    await page.getByRole('button',{name:'Save draft',exact:true}).click();
    await page.getByRole('status').filter({hasText:'Script draft saved to cloud.'}).waitFor();
    await page.getByRole('button',{name:'Hide library',exact:true}).click();
    await page.evaluate(()=>document.fonts.ready);
    const editor=page.locator('.vs-layout > main');
    const text=await editor.innerText();assert.ok(!/failed|unavailable/i.test(text));assert.ok(!/\[(FirstName|Agent|City)\]/.test(await page.getByLabel('Script text',{exact:true}).inputValue()));
    await sharp(await editor.screenshot()).resize({width:1500,withoutEnlargement:true}).webp({quality:92}).toFile(path.join(output,'voice.webp'));
    await page.goto(`http://127.0.0.1:${server.address().port}/dashboard/assistant`);
    const ai=page.getByRole('dialog',{name:'MyARI AI',exact:true});await ai.waitFor();await ai.getByRole('button',{name:'Generate',exact:true}).click();await ai.getByText('Your next step toward home',{exact:true}).waitFor();
    await sharp(await ai.screenshot()).webp({quality:92}).toFile(path.join(output,'assistant.webp'));
    await page.goto(`http://127.0.0.1:${server.address().port}/dashboard/analytics`);
    await page.getByText('Campaign performance',{exact:true}).waitFor();
    await page.locator('.animate-spin').waitFor({state:'hidden'});await page.evaluate(()=>document.fonts.ready);
    const main=page.locator('main').first();await sharp(await main.screenshot()).extract({left:0,top:0,width:2592,height:1600}).webp({quality:92}).toFile(path.join(output,'analytics.webp'));
    assert.deepEqual(errors,[]);console.log('Actual Voice Studio, Ask MyARI email drafting and Analytics captured with synthetic records and mocked providers; no page errors.');
    await context.close();
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
