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
 const fixture=path.join(__dirname,'contacts-browser');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'myari-contacts-audit-'));
 const result=await esbuild.build({entryPoints:[path.join(fixture,'entry.jsx')],bundle:true,write:false,jsx:'automatic',tsconfig:path.join(root,'tsconfig.json'),define:{'process.env.NODE_ENV':'"development"'},alias:{'next/server':path.join(fixture,'server.jsx'),'next/link':path.join(fixture,'link.jsx'),'next/image':path.join(fixture,'image.jsx'),'next/navigation':path.join(fixture,'stubs.jsx'),'@clerk/nextjs':path.join(fixture,'stubs.jsx')}});
 const cssRoot=path.join(root,'.next/static/css');
 const iconFont=process.env.CONTACTS_ICON_FONT;
 const css=(iconFont?`@font-face{font-family:'Material Symbols Outlined';font-style:normal;font-weight:400;src:url(/review-icons.ttf) format('truetype')}.material-symbols-outlined{font-family:'Material Symbols Outlined'}`:'')+fs.readdirSync(cssRoot).filter(file=>file.endsWith('.css')).map(file=>fs.readFileSync(path.join(cssRoot,file),'utf8').replaceAll('../media/','/review-fonts/').replaceAll('/_next/static/media/','/review-fonts/')).join('\n');
 const fontClasses=[...css.matchAll(/\.([\w-]+)\{--font-(?:serif|inter|hand):[^}]+\}/g)].map(match=>match[1]).join(' ');
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');const pathname=url.pathname;
  if(pathname==='/review-icons.ttf'&&iconFont){res.setHeader('content-type','font/ttf');return res.end(fs.readFileSync(iconFont));}
  if(pathname==='/bundle.js'){res.setHeader('content-type','application/javascript');return res.end(result.outputFiles[0].text);}
  if(pathname==='/style.css'){res.setHeader('content-type','text/css');return res.end(css);}
  if(pathname.startsWith('/dashboard')){res.setHeader('content-type','text/html');return res.end('<!doctype html><html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body class="contacts-luxury ' + fontClasses + '"><div id="root"></div><script src="/bundle.js"></script></body></html>');}
  const file=pathname.startsWith('/review-fonts/')?path.join(root,'.next/static/media',path.basename(pathname)):path.resolve(root,'public','.'+pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
  try{res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const results=[];
 try{
 for(const width of [1440,1920,768,390]){
  console.log('Checking Contacts at',width);
  const page=await browser.newPage({viewport:{width,height:1086}});page.setDefaultTimeout(7000);
  const errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error('Browser error:',error.message);});page.on('dialog',dialog=>dialog.accept());
  await page.goto(base+'/dashboard/contacts');await page.getByRole('button',{name:/Total Contacts: 32/}).waitFor().catch(async error=>{console.error((await page.locator('body').innerText()).slice(0,1800));throw error;});
  const count=()=>page.locator(width>=1100?'.contacts-table tbody tr':'.contacts-mobile-rows li').count();
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('.contacts-hero-quote').innerText(),'Every connection holds potential.');
  await page.screenshot({path:path.join(tmp,`contacts-initial-${width}.png`),fullPage:false});
  await page.locator('.contact-preview').screenshot({path:path.join(tmp,`contacts-panel-${width}.png`)});
  assert.equal(await count(),25);
  const toggle=page.getByRole('button',{name:'Filters',exact:true});if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
  // Native dropdown keyboard open/select/close and URL-backed state.
  const category=page.getByRole('combobox',{name:'Category',exact:true});
  await category.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await page.keyboard.press('Escape');
  await category.selectOption('Luxury');await page.getByRole('combobox',{name:'Type',exact:true}).selectOption('Custom Buyer');
  await page.getByRole('combobox',{name:'Source',exact:true}).selectOption('Referral');
  await page.getByRole('combobox',{name:'Compliance',exact:true}).selectOption('valid');
  await page.getByRole('combobox',{name:/Last Activity/}).selectOption('7');
  await page.getByRole('textbox',{name:'Search in this view'}).fill('Investor');
  assert.equal(await count(),1);assert.equal(await page.getByRole('button',{name:'Remove Category filter'}).count(),1);
  await page.getByRole('combobox',{name:'Stage',exact:true}).selectOption('active-lead');assert.equal(await count(),0);await page.getByText('No contacts in this view',{exact:true}).waitFor();
  await page.goBack();await page.getByRole('combobox',{name:'Stage',exact:true}).waitFor();assert.equal(await page.getByRole('combobox',{name:'Stage',exact:true}).inputValue(),'all');assert.equal(await count(),1);
  await page.goForward();assert.equal(await count(),0);
  await page.getByRole('button',{name:'Clear all',exact:true}).click();assert.equal(await count(),25);assert.equal(new URL(page.url()).search,'');
  await page.getByRole('combobox',{name:'Source',exact:true}).selectOption('Referral');
  await page.getByRole('combobox',{name:'Sort',exact:true}).selectOption('name-desc');assert.equal(await count(),16);
  await page.getByRole('button',{name:'Remove Source filter'}).click();await page.getByRole('combobox',{name:'Type',exact:true}).selectOption('Cold Lead');
  await page.getByRole('button',{name:'Next',exact:true}).click();assert.equal(await count(),4);assert.ok(page.url().includes('sort=name-desc'));assert.ok(page.url().includes('page=2'));assert.ok(new URL(page.url()).searchParams.get('type')==='Cold Lead');
  await page.reload();await page.getByRole('button',{name:/Total Contacts: 32/}).waitFor();assert.equal(await count(),4);if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();assert.equal(await page.getByRole('combobox',{name:'Sort',exact:true}).inputValue(),'name-desc');
  await page.getByRole('button',{name:'Clear all',exact:true}).click();
  // Editing an actual selection updates lifecycle cards and details after refresh.
  const select=page.getByRole(width>=1100?'checkbox':'button',{name:'Select Contact 01',exact:true});if(width>=1100)await select.check();else await select.click();
  await page.getByRole('button',{name:/Change type/}).click();await page.getByRole('dialog').locator('select').selectOption('Active Lead');await page.getByRole('button',{name:'Update type',exact:true}).click();await page.getByRole('button',{name:/Active Leads: 2/}).waitFor();
  if(width>=1100)await page.getByRole('button',{name:'Preview Contact 01 Fixture',exact:true}).click();
  await page.getByRole('tab',{name:'Notes',exact:true}).click();await page.getByRole('button',{name:'+ Add note',exact:true}).click();await page.locator('.contact-preview textarea').fill('Persistent relationship context');
  await page.evaluate(()=>window.__failNotes=true);await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByRole('alert').filter({hasText:'could not be saved'}).waitFor();assert.equal(await page.locator('.contact-preview textarea').inputValue(),'Persistent relationship context');
  await page.evaluate(()=>window.__failNotes=false);await page.getByRole('button',{name:'Save',exact:true}).click();await page.getByRole('button',{name:/Total Contacts: 32/}).waitFor();
  await page.getByRole('tab',{name:'Notes',exact:true}).click();await page.getByText('Persistent relationship context',{exact:true}).waitFor();
  await page.getByRole('tab',{name:'Activity',exact:true}).click();await page.getByText('Activity will appear here as engagement is recorded.',{exact:true}).waitFor();
  await page.getByRole('tab',{name:'Details',exact:true}).click();assert.ok((await page.locator('.contact-preview').innerText()).includes('Active Lead'));
  assert.equal(await page.locator('.contact-preview a[href*="/dashboard/contacts/"]').count(),2);
  await page.getByRole('tab',{name:'AI Insights',exact:true}).click();await page.getByRole('button',{name:'Generate AI draft',exact:true}).click();await page.getByRole('dialog',{name:'MyARI AI',exact:true}).getByText('Contact 01 Fixture',{exact:true}).waitFor();await page.keyboard.press('Escape');
  // All contact action dialogs use the actual UI; fixture mutations are in memory only.
  await page.getByRole('button',{name:'Manage categories',exact:true}).click();
  await page.getByRole('dialog').getByPlaceholder('e.g. Investors').fill('Partners');await page.getByRole('dialog').getByRole('button',{name:/Add$/}).click();
  await page.getByRole('dialog').getByText('Partners',{exact:true}).waitFor();await page.getByRole('dialog').getByRole('button',{name:'Done',exact:true}).click();
  const chooseContact=async()=>{const control=page.getByRole(width>=1100?'checkbox':'button',{name:'Select Contact 01',exact:true});if(width>=1100)await control.check();else await control.click();};
  await chooseContact();await page.getByRole('button',{name:/Set category/}).click();await page.getByRole('dialog').locator('select').selectOption('Partners');await page.getByRole('dialog').getByRole('button',{name:'Set category',exact:true}).click();await page.getByRole('button',{name:/Total Contacts: 32/}).waitFor();
  assert.equal(await page.evaluate(()=>window.__records[0].category),'Partners');
  await chooseContact();await page.getByRole('button',{name:/Mark consent valid/}).click();await page.getByRole('dialog').locator('input').nth(1).fill('Documented website opt-in');await page.getByRole('dialog').locator('input').nth(2).fill('Recorded form submission');await page.getByRole('dialog').getByRole('button',{name:'Save consent',exact:true}).click();await page.getByRole('button',{name:/Total Contacts: 32/}).waitFor();
  assert.equal(await page.evaluate(()=>window.__records[0].consent_records.at(-1).status),'Yes');
  await page.getByRole('button',{name:'Manage categories',exact:true}).click();
  const partners=page.getByRole('dialog').locator('li').filter({has:page.getByText('Partners',{exact:true})});await partners.getByRole('button',{name:'Rename',exact:true}).click();await page.getByRole('dialog').locator('li input').fill('Trusted Partners');await page.getByRole('dialog').locator('li').filter({has:page.getByRole('button',{name:'Save',exact:true})}).getByRole('button',{name:'Save',exact:true}).click();await page.getByRole('dialog').getByText('Trusted Partners',{exact:true}).waitFor();
  await page.getByRole('dialog').locator('li').filter({hasText:'Trusted Partners'}).getByRole('button',{name:'Remove',exact:true}).click();await page.waitForFunction(()=>!window.__categories.includes('Trusted Partners'));await page.getByRole('dialog').getByRole('button',{name:'Done',exact:true}).click();
  await page.getByRole('button',{name:/Add contact/}).click();await page.getByRole('dialog').getByPlaceholder('Elena').fill('Added Fixture');await page.getByRole('dialog').getByPlaceholder('+1 (555) 000-0000').fill('+15555550109');await page.getByRole('dialog').getByRole('button',{name:'Save contact',exact:true}).click();await page.getByRole('button',{name:/Total Contacts: 33/}).waitFor();
  await page.getByRole('button',{name:/Import CSV/}).click();await page.getByRole('dialog').locator('input[type=file]').setInputFiles({name:'contacts.csv',mimeType:'text/csv',buffer:Buffer.from('firstName,phone\nCSV Fixture,+15555550101')});await page.getByRole('dialog').getByRole('button',{name:'Import CSV',exact:true}).click();await page.getByRole('button',{name:/Total Contacts: 34/}).waitFor();await page.getByRole('dialog').getByRole('button',{name:'Done',exact:true}).click();
  await page.getByRole('textbox',{name:'Search in this view'}).fill('Contact 01');await chooseContact();await page.getByRole('button',{name:/Delete selected/}).click();await page.getByRole('dialog').getByRole('button',{name:'Delete',exact:true}).click();await page.getByRole('button',{name:/Total Contacts: 33/}).waitFor();assert.equal(await count(),0);
  await page.getByRole('button',{name:'Clear all',exact:true}).click();
  await page.evaluate(()=>{history.pushState({},'', '/dashboard/contacts?q=Contact+02&source=Website');window.dispatchEvent(new Event('review:navigation'));});assert.equal(await count(),1);await page.getByRole('button',{name:'Clear all',exact:true}).click();assert.equal(new URL(page.url()).search,'');
  await toggle.click();assert.equal(await page.getByRole('combobox',{name:'Category',exact:true}).isVisible(),false);await toggle.click();
  // Cross-account switch during a delayed request cannot retain old contact details.
  await page.evaluate(()=>{window.__delay=true;window.dispatchEvent(new Event('myari:contacts-changed'));window.__setOwner('owner_b');});
  await page.getByRole('button',{name:/Total Contacts: 1/}).waitFor();await page.getByRole('heading',{name:'Private B',exact:true}).waitFor();assert.ok(!(await page.locator('#root').innerText()).includes('Persistent relationship context'));
  assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:path.join(tmp,`contacts-${width}.png`),fullPage:true});
  results.push({width,combinedFilters:true,empty:true,nativeDropdownKeyboard:true,backForward:true,clearAll:true,sortFilteredPaginationReload:true,bulkStageRefresh:true,notesErrorAndPersistence:true,actualDetailsAndActivity:true,addContact:true,csvImport:true,categoryAddRenameRemove:true,bulkCategoryConsentDelete:true,topBarSearchReset:true,filterToggle:true,aiContextLauncher:true,exactHeroQuote:true,crossAccountStaleResponse:true,noOverflow:true,pageErrors:errors});await page.close();
 }
 // Verify the actual Open Profile link and existing editor, including a tenant switch.
 const profilePage=await browser.newPage({viewport:{width:1440,height:1086}});profilePage.setDefaultTimeout(7000);
 await profilePage.goto(base+'/dashboard/contacts');await profilePage.getByRole('button',{name:/Total Contacts: 32/}).waitFor();
 await profilePage.getByRole('button',{name:'Preview Contact 02 Fixture',exact:true}).click();await profilePage.locator('.contact-preview-open').click();await profilePage.getByRole('heading',{name:/Contact 02 Fixture/}).waitFor();
 await profilePage.getByRole('button',{name:'Edit contact',exact:true}).last().click();await profilePage.getByRole('dialog').locator('input').first().fill('Updated relationship');await profilePage.getByRole('dialog').getByRole('button',{name:'Save changes',exact:true}).click();
 await profilePage.getByRole('heading',{name:/Updated relationship Fixture/}).waitFor();
 await profilePage.evaluate(()=>window.dispatchEvent(new Event('myari:contacts-changed')));await profilePage.getByRole('heading',{name:/Updated relationship Fixture/}).waitFor();
 await profilePage.evaluate(()=>window.__setOwner('owner_b'));await profilePage.getByRole('button',{name:'Retry contact',exact:true}).waitFor();assert.equal(await profilePage.getByRole('heading',{name:/Updated relationship/}).count(),0);
 results.push({actualProfileNavigation:true,profileEditPersistedAcrossRead:true,profileTenantSwitch:true});await profilePage.close();
 fs.writeFileSync(path.join(tmp,'browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({results,artifacts:tmp},null,2));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
