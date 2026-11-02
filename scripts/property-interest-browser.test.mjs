import assert from "node:assert/strict";
import {mkdirSync,writeFileSync} from "node:fs";
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||"playwright");
const browser=await chromium.launch({channel:"chrome",headless:true,args:["--no-sandbox"]});
let checks=0;const check=(x,m)=>{assert.ok(x,m);checks++;};
try{
 for(const [name,width,height] of [["desktop",1440,900],["tablet",820,1180],["mobile",390,844]]){
 const context=await browser.newContext({viewport:{width,height}});
 const page=await context.newPage();const errors=[];const requests=[];
 page.on("pageerror",e=>errors.push(e.message));page.on("request",r=>requests.push(r.url()));
 let consent=0,qualify=0,stop=0;
 await page.route("**/api/property-interest/public",async route=>{
 const j=route.request().postDataJSON();
 if(j.action==="consent")consent++;
 if(j.action==="qualify")qualify++;
 if(j.action==="stop")stop++;
 await route.fulfill({json:j.action==="resolve"?{label:"A coastal place to call home",url:"https://www.zillow.com/homedetails/123_zpid/",disclosure:"myari-property-interest-v1"}:j.action==="qualify"?{result:{qualified:true}}:{readyAfterSeconds:15,stopped:true}});
 });
 const res=await page.goto("http://127.0.0.1:3030/property-interest#"+"a".repeat(43));
 await page.getByRole("heading",{name:"A coastal place to call home"}).waitFor();
 check(res.status()===200,"page renders");
 check((await page.locator("body").innerText()).includes("not the person opening"),"identity caveat");
 check(await page.getByRole("link",{name:/without tracking/}).isVisible(),"untracked option");
 check(consent===0&&qualify===0,"no event before consent");
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"no horizontal overflow");
 check(requests.every(u=>new URL(u).origin==="http://127.0.0.1:3030"),"no third-party analytics/auth/fonts requests");
 check(res.headers()["referrer-policy"]==="no-referrer","no-referrer header");
 check(res.headers()["content-security-policy"].includes("connect-src 'self'"),"private page CSP");
 await page.getByRole("button",{name:"Allow tracking on this MyARI page"}).click();
 check(consent===1,"explicit choice");
 check(await page.getByRole("button",{name:/Review this page/}).isDisabled(),"dwell protected");
 if(name==="desktop"){
 await page.waitForTimeout(15600);
 await page.getByRole("button",{name:"Record this visit",exact:true}).click();
 check(qualify===1,"explicit qualifying interaction");
 await page.getByRole("button",{name:/Stop tracking/}).click();check(stop===1,"privacy stop");
 }
 mkdirSync("docs/property-interest/screenshots",{recursive:true});
 await page.screenshot({path:"docs/property-interest/screenshots/property-introduction-"+name+".jpg",fullPage:true,type:"jpeg",quality:82});
 check(errors.length===0,"no browser exceptions");
 await context.close();
 }
 writeFileSync("/tmp/property-browser-results.json",JSON.stringify({passed:checks,scope:"actual local Next page; synthetic API responses; not hosted authenticated acceptance"}));
 console.log(JSON.stringify({passed:checks,scope:"actual local Next page; synthetic API responses; not hosted authenticated acceptance"}));
}finally{await browser.close();}
