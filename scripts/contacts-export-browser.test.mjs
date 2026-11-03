import assert from "node:assert/strict";
import {mkdirSync,readFileSync,writeFileSync} from "node:fs";
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||"playwright");
const browser=await chromium.launch({channel:"chrome",headless:true,args:["--no-sandbox"]});
let passed=0;const check=(v,m)=>{assert.ok(v,m);passed++;};
mkdirSync("docs/contacts-export/screenshots",{recursive:true});
try{
 for(const [name,width,height] of [["desktop",1440,900],["tablet",820,1180],["mobile",390,844]]){
  const context=await browser.newContext({viewport:{width,height},acceptDownloads:true});
  const page=await context.newPage();const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("http://127.0.0.1:3333");await page.getByRole("button",{name:"Export CSV",exact:true}).click();
  await page.getByText("3 contacts ready to export.",{exact:true}).waitFor();
  check(await page.getByRole("dialog").isVisible(),"export dialog");
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"no horizontal overflow");
  let download=page.waitForEvent("download");await page.getByRole("button",{name:"Download CSV",exact:true}).click();let file=await download;
  check(file.suggestedFilename()==="myari-contacts-2026-11-02.csv","filename");
  const path=await file.path();let contents=readFileSync(path);
  check(contents[0]===239&&contents[1]===187&&contents[2]===191,"UTF-8 BOM");
  check(contents.toString("utf8").includes("Zoë")&&contents.toString("utf8").includes("李"),"international names");
  check(contents.toString("utf8").includes("'00123456789"),"leading zeros");
  if(name==="desktop")writeFileSync("docs/contacts-export/sample-synthetic.csv",contents);
  await page.getByRole("radio",{name:/Export Selected Contacts/}).check();await page.getByText("1 contact ready to export.",{exact:true}).waitFor();
  download=page.waitForEvent("download");await page.getByRole("button",{name:"Download CSV",exact:true}).click();file=await download;
  contents=readFileSync(await file.path());check(contents.toString().includes("Zoë")&&!contents.toString().includes("Amira"),"selected download");
  await page.getByRole("radio",{name:/Export Current Filtered Results/}).check();await page.getByText("1 contact ready to export.",{exact:true}).waitFor();
  download=page.waitForEvent("download");await page.getByRole("button",{name:"Download CSV",exact:true}).click();file=await download;
  contents=readFileSync(await file.path());check(contents.toString().includes("Zoë")&&!contents.toString().includes("Amira"),"filtered download");
  await page.getByRole("radio",{name:/Export All Contacts/}).check();await page.getByText("3 contacts ready to export.",{exact:true}).waitFor();
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:"docs/contacts-export/screenshots/export-"+name+".jpg",fullPage:true,type:"jpeg",quality:25});
  await page.keyboard.press("Escape");check(!(await page.getByRole("dialog").count()),"escape close");
  check(errors.length===0,"no runtime errors");
  await context.close();
 }
 console.log(JSON.stringify({passed,scope:"Actual export UI and handler, synthetic local owner/contact dependency; not hosted Clerk acceptance"}));
 writeFileSync("/tmp/csv-browser-result.json",JSON.stringify({passed}));
}finally{await browser.close();}
