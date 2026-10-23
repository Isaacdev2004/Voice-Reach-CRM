/* Browser-only fixtures; requires installed playwright, esbuild and Chromium. Never contacts a live backend. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const os=require('node:os');
const {chromium}=require('playwright');
const esbuild=require('esbuild');
const root=path.resolve(__dirname,'..');

(async()=>{
 const fixture=path.join(__dirname,'property-finder-browser');
 const adapters=path.join(__dirname,'contacts-browser');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'myari-property-finder-'));
 const result=await esbuild.build({entryPoints:[path.join(fixture,'entry.jsx')],bundle:true,write:false,jsx:'automatic',tsconfig:path.join(root,'tsconfig.json'),define:{'process.env.NODE_ENV':'"development"'},alias:{'next/server':path.join(adapters,'server.jsx'),'next/link':path.join(adapters,'link.jsx'),'next/image':path.join(adapters,'image.jsx'),'next/navigation':path.join(adapters,'stubs.jsx'),'@clerk/nextjs':path.join(adapters,'stubs.jsx')}});
 const cssRoot=path.join(root,'.next/static/css');
 const iconFont=process.env.CONTACTS_ICON_FONT;
 const css=(iconFont?`@font-face{font-family:'Material Symbols Outlined';font-style:normal;font-weight:400;src:url(/review-icons.ttf) format('truetype')}.material-symbols-outlined{font-family:'Material Symbols Outlined'}`:'')+fs.readdirSync(cssRoot).filter(file=>file.endsWith('.css')).map(file=>fs.readFileSync(path.join(cssRoot,file),'utf8').replaceAll('../media/','/review-fonts/').replaceAll('/_next/static/media/','/review-fonts/')).join('\n');
 const fontClasses=[...css.matchAll(/\.([\w-]+)\{--font-(?:serif|inter|hand):[^}]+\}/g)].map(match=>match[1]).join(' ');
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');const pathname=url.pathname;
  if(pathname==='/review-icons.ttf'&&iconFont){res.setHeader('content-type','font/ttf');return res.end(fs.readFileSync(iconFont));}
  if(pathname==='/bundle.js'){res.setHeader('content-type','application/javascript');return res.end(result.outputFiles[0].text);}
  if(pathname==='/style.css'){res.setHeader('content-type','text/css');return res.end(css);}
  if(pathname.startsWith('/dashboard')){res.setHeader('content-type','text/html');return res.end('<!doctype html><html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="' + fontClasses + '"><div id="root"></div><script src="/bundle.js"></script></body></html>');}
  const file=pathname.startsWith('/review-fonts/')?path.join(root,'.next/static/media',path.basename(pathname)):path.resolve(root,'public','.'+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  try{res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const results=[];
 try{
 for(const width of [1440,1536,1920,768,390]){
  console.log('Checking Property Finder at',width);
  const page=await browser.newPage({viewport:{width,height:1086},reducedMotion:"reduce"});page.setDefaultTimeout(7000);const errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error(error.message);});
  await page.goto(base+'/dashboard/properties');await page.getByRole('heading',{name:'The right property changes everything.',exact:true}).waitFor();await page.getByRole('button',{name:'Open saved search for Client 01 QA',exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.pf-eyebrow').first().innerText(),'PROPERTY FINDER');assert.equal(await page.locator('.pf-hero-copy > p').last().innerText(),"Discover homes that match your clients' goals and move their search forward.");
  assert.ok((await page.locator('.pf-hero-photo img').getAttribute('src')).includes('property-dining-room.png'));
  assert.equal(await page.locator('.pf-suggestions img').count(),0);
  assert.equal(await page.locator('.pf-search-controls').getByRole('button',{name:/Beds|Baths|Property Type|More Filters/}).count(),0);
  assert.equal(await page.locator('.pf-saved-card').count(),4);
  assert.equal(await page.locator('.pf-action-photo').count(),4);assert.equal(await page.locator('.pf-saved-photo').count(),4);
  const compositions=await page.locator('.pf-action-card').evaluateAll(nodes=>nodes.map(node=>{const photo=node.querySelector('.pf-action-photo').getBoundingClientRect(),copy=node.querySelector('.pf-action-copy').getBoundingClientRect();return {photoBottom:photo.bottom,textTop:copy.top};}));if(!process.env.PROPERTY_REVIEW_SCREENSHOTS_ONLY)assert.ok(compositions.every(card=>card.textTop>=card.photoBottom),'text is below photography');
  const backgrounds=await page.locator('.pf-action-photo').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).backgroundPosition));assert.equal(new Set(backgrounds).size,4);
  await page.getByRole('link',{name:/Search Listings Run a tailored search/}).click();await page.waitForFunction(()=>document.activeElement.id==='property-location');assert.equal(await page.evaluate(()=>document.activeElement.id),'property-location');assert.equal(await page.getByRole('tab',{name:'Find Properties',exact:true}).getAttribute('aria-selected'),'true');

  assert.deepEqual(await page.locator('.pf-action-card').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('href'))),['#client-workspace','#saved-searches','/dashboard/activity','/dashboard/campaigns#campaign-builder']);
  await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});await page.screenshot({path:path.join(tmp,`properties-${width}.png`),fullPage:false});await page.screenshot({path:path.join(tmp,`properties-full-${width}.png`),fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(process.env.PROPERTY_REVIEW_SCREENSHOTS_ONLY){await page.close();continue;}
  await page.getByRole('button',{name:'View all (5)',exact:true}).click();assert.equal(await page.locator('.pf-saved-card').count(),5);await page.getByRole('button',{name:'Show fewer',exact:true}).click();
  await page.getByRole('tab',{name:'Search by Client',exact:true}).click();
  const clientSearch=page.getByRole('combobox',{name:'Search clients by name, email or phone',exact:true});
  await clientSearch.fill('Client 01');assert.equal(await page.getByRole('option').count(),1);await page.keyboard.press('Escape');assert.equal(await page.getByRole('listbox').count(),0);
  await clientSearch.fill('5555550102');assert.equal(await page.getByRole('option').count(),1);
  await clientSearch.fill('client2@example.test');await page.keyboard.press('Enter');await page.locator('.pf-client-share h2').filter({hasText:'Client 02 QA'}).waitFor();
  assert.equal(await page.getByRole('searchbox',{name:'Location, address or ZIP',exact:true}).inputValue(),'Orlando, FL');assert.equal(await page.locator('.pf-client-hero-art').count(),1);
  await page.locator('.pf-price-filter summary').click();assert.equal(await page.getByLabel('Maximum price',{exact:true}).inputValue(),'650000');
  await page.getByLabel('Maximum price',{exact:true}).fill('900,000');await page.getByRole('button',{name:'Done',exact:true}).click();
  await page.getByRole('searchbox',{name:'Location, address or ZIP',exact:true}).fill('Winter Garden, FL');await page.getByRole('button',{name:'Search Properties',exact:true}).click();assert.equal(await page.evaluate(()=>window.__openedSearch),'https://www.zillow.com/homes/for_sale/winter-garden-fl/0-900000_price/');
  await page.locator('.pf-preferences-editor > summary').click();
  for(const [label,value] of [['Desired square footage (sq ft)','2200'],['Bedrooms','4'],['Bathrooms','3.5'],['Garage spaces','0'],['Lot size (sq ft)','8000'],['Property type','Townhome']])await page.getByLabel(label,{exact:true}).fill(value);
  await page.getByLabel('Bedrooms',{exact:true}).fill('-1');assert.equal(await page.getByRole('button',{name:'Save Search',exact:true}).isDisabled(),true);await page.getByLabel('Bedrooms',{exact:true}).fill('4');
  await page.evaluate(()=>window.__failSave=true);await page.getByRole('button',{name:'Save Search',exact:true}).click();await page.getByRole('alert').filter({hasText:'could not be saved'}).waitFor();assert.ok(!(await page.locator('body').innerText()).includes('private database detail'));
  await page.evaluate(()=>{window.__failSave=false;window.__missingPrefs=true;});await page.getByRole('button',{name:'Save Search',exact:true}).click();await page.getByRole('alert').filter({hasText:'Additional preferences are not available'}).waitFor();
  await page.evaluate(()=>window.__missingPrefs=false);await page.getByRole('button',{name:'Save Search',exact:true}).click();await page.getByRole('status').filter({hasText:'Search criteria saved'}).waitFor();
  assert.equal(await page.evaluate(()=>window.__records[1].preferred_sqft),2200);assert.equal(await page.evaluate(()=>window.__records[1].preferred_baths),3.5);assert.equal(await page.evaluate(()=>window.__records[1].preferred_garage_spaces),0);assert.equal(await page.evaluate(()=>window.__records.filter(record=>record.owner_id==='owner_a').length),5);
  await page.locator('.pf-share-actions button').click();assert.equal(await page.evaluate(()=>window.__copiedLink),'https://www.zillow.com/homes/for_sale/winter-garden-fl/0-900000_price/');
  assert.ok(decodeURIComponent(await page.getByRole('link',{name:'Email client',exact:true}).getAttribute('href')).includes('winter-garden-fl/0-900000_price/'));assert.ok((await page.getByRole('link',{name:'Text client',exact:true}).getAttribute('href')).startsWith('sms:+15555550102'));
  await page.evaluate(()=>window.__failClipboard=true);await page.locator('.pf-share-actions button').click();await page.getByRole('alert').filter({hasText:"Copy isn't available"}).waitFor();
  await page.locator('.pf-search-history > summary').click();await page.locator('.pf-search-history').getByText('Zillow search requested',{exact:true}).waitFor();assert.equal(await page.locator('.pf-search-history').getByText('Search link copied',{exact:true}).count(),1);
  assert.ok((await page.locator('.pf-search-history').innerText()).includes('does not confirm sending'));
  assert.equal(await page.getByRole('link',{name:'Schedule showing',exact:true}).getAttribute('href'),'/dashboard/calendar?new=event&contactId=00000000-0000-4000-8000-000000000002');
  assert.equal(await page.getByRole('link',{name:'Create follow-up task',exact:true}).getAttribute('href'),'/dashboard/tasks?new=task&contactId=00000000-0000-4000-8000-000000000002');
  assert.equal(await page.getByRole('link',{name:'Prepare mortgage estimate',exact:true}).getAttribute('href'),'/dashboard/mortgage?contactId=00000000-0000-4000-8000-000000000002');
  await page.evaluate(()=>window.__delaySave=true);await page.getByRole('searchbox',{name:'Location, address or ZIP',exact:true}).fill('Tampa, FL');await page.getByRole('button',{name:'Save Search',exact:true}).click();await page.waitForFunction(()=>Boolean(window.__finishSave));
  await page.getByRole('button',{name:'Open saved search for Client 01 QA',exact:true}).click();await page.evaluate(()=>{window.__delaySave=false;window.__finishSave();});await page.waitForFunction(()=>window.__records[1].preferred_area==='Tampa, FL');assert.equal(await page.getByText('Search criteria saved to this client.',{exact:true}).count(),0,'old save must not confirm a new client draft');
  await page.getByRole('button',{name:'Open saved search for Client 01 QA',exact:true}).click();assert.equal(await page.getByLabel('Desired square footage (sq ft)',{exact:true}).inputValue(),'1800');assert.equal(await page.getByLabel('Bedrooms',{exact:true}).inputValue(),'3');
  await page.getByRole('button',{name:'Assign to campaign',exact:true}).click();await page.getByRole('dialog',{name:'Assign to campaign',exact:true}).getByText(/No campaigns yet/).waitFor();await page.keyboard.press('Escape');
  await page.locator('details > summary').filter({hasText:'Follow-ups for Client 01'}).click();await page.getByRole('button',{name:'+ New task',exact:true}).click();await page.getByRole('dialog').getByPlaceholder('Follow up on home search criteria').fill('Review property preferences');await page.getByRole('dialog').getByRole('button',{name:'Add task',exact:true}).click();await page.getByRole('button',{name:'Review property preferences',exact:true}).waitFor();
  await page.getByRole('link',{name:'Open client profile',exact:false}).click();await page.getByRole('heading',{name:/Client 01 QA/}).waitFor();await page.goto(base+'/dashboard/properties');await page.locator('.pf-client-share h2').filter({hasText:'Client 01 QA'}).waitFor();
  await page.getByRole('button',{name:'Open saved search for Client 02 QA',exact:true}).click();await page.locator('.pf-preferences-editor > summary').click();assert.equal(await page.getByLabel('Desired square footage (sq ft)',{exact:true}).inputValue(),'2200');assert.equal(await page.getByLabel('Garage spaces',{exact:true}).inputValue(),'0');
  await page.getByRole('button',{name:'Ask MyARI about next steps',exact:true}).click();const ai=page.getByRole('dialog',{name:'MyARI AI',exact:true});await ai.getByRole('button',{name:'Generate',exact:true}).click();await ai.getByText('Confirm preferred neighborhoods before refining the Zillow search.',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>window.__aiRequest.context.contactId),'00000000-0000-4000-8000-000000000002');assert.ok((await page.evaluate(()=>window.__aiRequest.context.contactNotes)).includes('2200'));await ai.getByRole('button',{name:'Close',exact:true}).last().click();assert.equal(await page.getByLabel('Desired square footage (sq ft)',{exact:true}).inputValue(),'2200');
  await page.screenshot({path:path.join(tmp,`properties-client-${width}.png`),fullPage:true});
  await page.getByRole('button',{name:'View all (5)',exact:true}).click();await page.getByRole('button',{name:'Open saved search for Client 05 QA',exact:true}).click();assert.equal(await page.locator('.pf-preferences-editor').getAttribute('open'),'');assert.equal(await page.getByRole('searchbox',{name:'Location, address or ZIP',exact:true}).inputValue(),'');assert.equal(await page.getByLabel('Bedrooms',{exact:true}).inputValue(),'0');
  await page.evaluate(()=>window.__failHistory=true);await page.getByRole('button',{name:'Search Properties',exact:true}).click();await page.getByRole('alert').filter({hasText:'its history could not be saved'}).waitFor();await page.evaluate(()=>window.__failHistory=false);

  await page.evaluate(()=>window.__setOwner('owner_b'));await page.getByText('A place for your clients’ next chapter.',{exact:true}).waitFor().catch(()=>page.getByText("A place for your clients' next chapter.",{exact:true}).waitFor());assert.equal(await page.locator('.pf-client-share').count(),0);assert.ok(!(await page.locator('.property-finder-page').innerText()).includes('Client 01 QA'));
  await page.evaluate(()=>{window.__failContacts=true;window.dispatchEvent(new Event('myari:contacts-changed'));});await page.getByRole('button',{name:'Retry clients',exact:true}).waitFor();await page.evaluate(()=>window.__failContacts=false);await page.getByRole('button',{name:'Retry clients',exact:true}).click();await page.getByRole('tab',{name:'Search by Client',exact:true}).click();await clientSearch.fill('Separate');await page.keyboard.press('Enter');await page.locator('.pf-client-share h2').filter({hasText:'Separate Subscriber'}).waitFor();await page.locator('.pf-preferences-editor > summary').click();assert.equal(await page.getByLabel('Bedrooms',{exact:true}).inputValue(),'');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
  results.push({width,exactHeader:true,newHero:true,noFabricatedListings:true,supportedFiltersOnly:true,clientSearchByNameEmailPhone:true,actualSavedPreferences:true,optionalPreferencesPersist:true,missingSchemaHandled:true,saveFailureRetry:true,shareLinks:true,clipboardErrorHandled:true,profileNavigationAndReturn:true,followUpUsesExistingTaskRoute:true,campaignAssignmentUsesExistingModal:true,tenantIsolation:true,loadingErrorAndEmpty:true,photoAboveText:true,searchHistory:true,historyFailureDoesNotBlockSearch:true,completePreferences:true,aiGuidanceMocked:true,crmHandoffs:true,saveClientSwitchRace:true,noOverflow:true,pageErrors:errors});await page.close();
 }
 fs.writeFileSync(path.join(tmp,'browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({results,artifacts:tmp},null,2));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
