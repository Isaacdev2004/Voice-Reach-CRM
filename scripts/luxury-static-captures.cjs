/* Static captures from existing real UI fixtures. No live services. */
const fs=require("node:fs"),path=require("node:path"),{execFileSync}=require("node:child_process"),sharp=require("sharp");
(async()=>{
const root=path.resolve(__dirname,"..");
for(const name of ["CLERK_SECRET_KEY","SUPABASE_SERVICE_ROLE_KEY","OPENAI_API_KEY","STRIPE_SECRET_KEY"])if(process.env[name])throw Error("Capture runner must not receive provider credentials");
const fontCss=await fetch("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined").then(r=>{if(!r.ok)throw Error("Icon font unavailable");return r.text()});
const fontUrl=fontCss.match(/url\(([^)]+)\)/)?.[1];if(!fontUrl?.startsWith("https://fonts.gstatic.com/"))throw Error("Unexpected font source");
const fontPath="/tmp/myari-material-symbols.ttf";fs.writeFileSync(fontPath,Buffer.from(await fetch(fontUrl).then(r=>r.arrayBuffer())));
const families=[
{key:"campaigns",script:"campaign-library-browser.test.cjs",url:"/dashboard/campaigns",ready:".cl-card",selector:"#root",setup:""},
{key:"calendar",script:"calendar-browser.test.cjs",url:"/dashboard/calendar?date=2026-10-22",ready:".calendar-columns",selector:".calendar-columns",setup:'await page.getByText("Buyer consultation",{exact:true}).first().waitFor();'},
{key:"notes",script:"notes-browser.test.cjs",url:"/dashboard/notes",ready:".notes-note-preview",selector:".notes-columns",setup:'await page.locator(".notes-note-preview").first().click();await page.getByRole("button",{name:"Formatted preview",exact:true}).click();'},
{key:"financing",script:"financing-browser.test.cjs",url:"/dashboard/mortgage",ready:".fc-workflow",selector:"#root",setup:'await page.getByLabel("Selected client",{exact:true}).selectOption("00000000-0000-4000-8000-000000000002");'},
{key:"properties",script:"property-finder-browser.test.cjs",url:"/dashboard/properties",ready:".pf-saved-card",selector:".property-finder-page",setup:""},
{key:"tasks",script:"tasks-browser.test.cjs",url:"/dashboard/tasks",ready:".tw-task-row",selector:"#root",setup:""}
];
const manifest=[];
for(const family of families){
const original=fs.readFileSync(path.join(__dirname,family.script),"utf8");
const marker=original.match(/\n\s*const results\s*=\s*\[\][;,]/);if(!marker)throw Error("Fixture boundary not found: "+family.script);
let prefix=original.slice(0,marker.index).replace(/executablePath:\s*process\.env\.CHROMIUM_PATH\s*\|\|\s*["']\/usr\/bin\/chromium["'],?/g,"").replace(/executablePath:\s*["']\/usr\/bin\/chromium["'],?/g,"");
const asset=path.join(root,"public/brand/product-captures",family.key+".webp");
const end=[
'try{const context=await browser.newContext({viewport:{width:1440,height:1500},deviceScaleFactor:2,reducedMotion:"reduce"});const page=await context.newPage();page.setDefaultTimeout(12000);const errors=[];page.on("pageerror",e=>errors.push(e.message));await page.route("**/*",r=>new URL(r.request().url()).hostname==="127.0.0.1"?r.continue():r.abort());',
'await page.goto("http://127.0.0.1:"+server.address().port+'+JSON.stringify(family.url)+');await page.locator('+JSON.stringify(family.ready)+').first().waitFor();'+family.setup,
'await page.evaluate(()=>document.fonts.ready);const frame=page.locator('+JSON.stringify(family.selector)+').first();const box=await frame.boundingBox();if(!box||box.width<900)throw Error("Capture frame is too small");await page.evaluate(()=>scrollTo(0,0));',
'const shot=await page.screenshot({clip:{x:box.x,y:box.y,width:box.width,height:Math.min(box.height,box.width*'+({calendar:1,notes:690/1155,financing:700/1240,properties:690/1240,tasks:600/1240,campaigns:1086/1440}[family.key]||.6)+')}});await require("sharp")(shot).webp({quality:96}).toFile('+JSON.stringify(asset)+');',
'if(errors.length)throw Error(errors.join(";"));console.log("CAPTURE PASS '+family.key+'");await context.close();',
'}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);process.exitCode=1});'
].join("\n");
const temp=path.join(__dirname,".luxury-capture-"+family.key+".cjs");fs.writeFileSync(temp,prefix+end);
try{execFileSync(process.execPath,[temp],{cwd:root,stdio:"inherit",env:{...process.env,CONTACTS_ICON_FONT:fontPath}});}finally{fs.unlinkSync(temp);}
const m=await sharp(asset).metadata();manifest.push({key:family.key,src:"/brand/product-captures/"+family.key+".webp",width:m.width,height:m.height,bytes:fs.statSync(asset).size,fixture:family.script,dpr:2,quality:96});
}
let registry=fs.readFileSync(path.join(root,"lib/marketing/product-captures.ts"),"utf8");
for(const m of manifest)registry=registry.replace(new RegExp("(\\b"+m.key+": \\{[^}]*?width: )\\d+(,[^}]*?height: )\\d+"),"$1"+m.width+"$2"+m.height);
fs.writeFileSync(path.join(root,"lib/marketing/product-captures.ts"),registry);
fs.mkdirSync(path.join(root,"docs/public-feature-workflow/luxury-correction"),{recursive:true});
fs.writeFileSync(path.join(root,"docs/public-feature-workflow/luxury-correction/capture-provenance.json"),JSON.stringify(manifest,null,2));console.log(JSON.stringify(manifest));
})().catch(e=>{console.error(e);process.exitCode=1});