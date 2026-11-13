// Real Contacts workspace, real server page/export handlers, synthetic server-owned data.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os');
const esbuild=require('esbuild'),{chromium}=require('playwright'),{fixture}=require('../campaign-audit/harness.cjs');
(async()=>{
 const root=path.resolve(__dirname,'../..'),stubs=path.join(root,'scripts/contacts-browser'),f=fixture(),owner='owner_a';
 const rows=Array.from({length:30000},(_,i)=>({id:f.id(i+1),owner_id:owner,first_name:'Synthetic '+String(i+1).padStart(5,'0'),last_name:'Fixture',phone:'+15555550100',email:`synthetic${i+1}@example.test`,type:i%2?'Cold Lead':'Active Lead',category:i%2?'Commercial':'Residential',source:'Synthetic',dnc:false,consent_records:[],created_at:new Date(1700000000000+i*1000).toISOString()}));
 const pageHandler=f.load('lib/contacts/page-handler.ts').createContactPageHandler({requireOwnerId:async()=>owner,readContacts:async()=>rows,loadCategories:async()=>['Residential','Commercial'],loadAllowance:async()=>30000});
 const exportHandler=f.load('lib/contacts/export-handler.ts').createContactExportHandler({requireOwnerId:async()=>owner,readContacts:async()=>rows});
 let entry=fs.readFileSync(path.join(stubs,'entry.jsx'),'utf8').replace('const w=window;','const realFetch=window.fetch.bind(window);const w=window;');
 entry=entry.replace(" if(url.pathname==='/api/contacts/page'&&method==='GET'){", " if(url.pathname==='/api/contacts/export'||url.pathname==='/api/contacts/page')return realFetch(input,init);\n if(url.pathname==='/api/contacts/page'&&method==='GET'){");
 const bundle=await esbuild.build({stdin:{contents:entry,resolveDir:stubs,loader:'jsx'},bundle:true,write:false,jsx:'automatic',tsconfig:path.join(root,'tsconfig.json'),define:{'process.env.NODE_ENV':'"development"'},alias:{'next/server':path.join(stubs,'server.jsx'),'next/link':path.join(stubs,'link.jsx'),'next/image':path.join(stubs,'image.jsx'),'next/navigation':path.join(stubs,'stubs.jsx'),'@clerk/nextjs':path.join(stubs,'stubs.jsx')}});
 const iconFont=process.env.CONTACTS_ICON_FONT;
 const fontCss=iconFont?"@font-face{font-family:\"Material Symbols Outlined\";font-style:normal;font-weight:100 700;src:url(/review-icons.ttf) format(\"truetype\")}.material-symbols-outlined{font-family:\"Material Symbols Outlined\"}":"";
 const css=fontCss+(process.env.MYARI_CONTACT_BROWSER_CSS?fs.readFileSync(process.env.MYARI_CONTACT_BROWSER_CSS,'utf8'):fs.readdirSync(path.join(root,'.next/static/css')).filter(p=>p.endsWith('.css')).map(p=>fs.readFileSync(path.join(root,'.next/static/css',p),'utf8')).join('\n'));
 let origin,maxReturned=0,pageRequests=0;const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,origin||'http://localhost');
   if(url.pathname==='/api/contacts/page'||url.pathname==='/api/contacts/export'){
    let body='';for await(const part of req)body+=part;
    const request=new Request(url.href,{method:req.method,headers:req.headers,...(req.method==='POST'?{body}:{})});
    const response=await(url.pathname==='/api/contacts/page'?pageHandler(request):exportHandler(request));
    const buffer=Buffer.from(await response.arrayBuffer());if(url.pathname==='/api/contacts/page'){const data=JSON.parse(buffer);maxReturned=Math.max(maxReturned,data.contacts?.length||0);pageRequests++;}
    res.writeHead(response.status,Object.fromEntries(response.headers));return res.end(buffer);
   }
   if(url.pathname==='/review-icons.ttf'&&iconFont){res.setHeader('content-type','font/ttf');return res.end(fs.readFileSync(iconFont));}
   if(url.pathname==='/bundle.js'){res.setHeader('content-type','text/javascript');return res.end(bundle.outputFiles[0].text);}
   if(url.pathname==='/style.css'){res.setHeader('content-type','text/css');return res.end(css);}
   if(url.pathname.startsWith('/dashboard')){res.setHeader('content-type','text/html');return res.end('<html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="contacts-luxury"><div id="root"></div><script src="/bundle.js"></script></body></html>');}
   const local=path.resolve(root,'public','.'+url.pathname);if(local.startsWith(root+'/public/')&&fs.existsSync(local)&&fs.statSync(local).isFile())return res.end(fs.readFileSync(local));res.writeHead(404);res.end();
  }catch(error){res.writeHead(500);res.end(error.message);}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const artifact=path.join(root,'docs/contact-allowance/screenshots');fs.mkdirSync(artifact,{recursive:true});let checks=0;const ok=v=>{assert(v);checks++};
 try{
  for(const width of [1440,768,390]){
   const page=await browser.newPage({viewport:{width,height:950},acceptDownloads:true});page.setDefaultTimeout(20000);
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/dashboard/contacts');await page.getByRole('button',{name:/Total Contacts: 30000/}).waitFor().catch(async error=>{console.error(JSON.stringify({pageRequests,maxReturned,errors,body:(await page.locator('body').innerText()).slice(0,1800)}));throw error;});
   const selector=width>=1100?'.contacts-table tbody tr':'.contacts-mobile-rows li';await page.waitForFunction(s=>document.querySelectorAll(s).length===25,selector);
   ok(await page.locator(selector).count()===25);ok((await page.locator('.contacts-metric-scope').innerText()).includes('30,000'));
   const toggle=page.getByRole('button',{name:'Filters',exact:true});if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
   const choose=async(name)=>{const c=page.getByRole(width>=1100?'checkbox':'button',{name:'Select '+name,exact:true});if(width>=1100)await c.check();else await c.click();};
   await choose('Synthetic 00001');await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByText('Page 2 of 1200',{exact:false}).waitFor();await choose('Synthetic 00026');
   await page.getByText(/Selected:\s*2/).first().waitFor();ok(true);
   await page.getByRole('textbox',{name:'Search in this view'}).fill('Synthetic 30000');await page.waitForFunction(s=>document.querySelectorAll(s).length===1&&!document.querySelector('.contacts-view-count')?.textContent?.includes('Loading'),selector);
   ok((await page.locator(selector).innerText()).includes('Synthetic 30000'));
   await page.getByRole('button',{name:'Clear all',exact:true}).click();await page.getByText('Page 1 of 1200',{exact:false}).waitFor();
   ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));ok(errors.length===0);
   await page.evaluate(()=>window.scrollTo(0,0));await page.evaluate(()=>document.fonts.ready);
   await page.screenshot({path:path.join(artifact,'contacts-30000-'+width+'.png'),fullPage:true});await page.close();
  }
  ok(maxReturned===25);ok(pageRequests>=9);
  const report={result:'PASS',checks,totalRecords:30000,maxPagePayload:maxReturned,pageRequests,viewports:[1440,768,390],scope:'Actual workspace and server handlers; synthetic server data/authentication; not hosted Clerk acceptance'};
  fs.writeFileSync(path.join(artifact,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
