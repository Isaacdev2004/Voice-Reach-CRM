/* Real Next optimizer regression. Local optimized build only; no auth or customer requests. */
const assert=require('node:assert/strict');
const sharp=require('sharp');
const origin=process.env.MYARI_IMAGE_TEST_ORIGIN||'http://127.0.0.1:3186';
assert.match(origin,/^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
const assets=['/brand/marketing/public-architectural-hero.webp','/brand/marketing/financing-desk.webp','/brand/marketing/pricing-olive-office.webp',...['campaign-library-interior.png','property-dining-room.png','dashboard-interior.jpg','notes-botanical-office.png','calendar-coastal-office.png','tasks-home-office.png','calendar-home-office.png','tasks-coastal-office.png','activity-workspace.png'].map(x=>'/brand/heroes/'+x)];
(async()=>{
 const results=[];
 for(const asset of assets){const r=await fetch(origin+'/_next/image?'+new URLSearchParams({url:asset,w:'1080',q:'75'}),{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,asset);assert.match(r.headers.get('content-type'),/^image\//);const meta=await sharp(Buffer.from(await r.arrayBuffer())).metadata();assert.ok(meta.width>=1000&&meta.height>0);results.push({asset,status:r.status,width:meta.width,height:meta.height});}
 const invalid=await fetch(origin+'/_next/image?'+new URLSearchParams({url:assets[0],w:'1080',q:'85'}));assert.equal(invalid.status,400,'invalid quality must remain rejected; do not broaden global image configuration');
 console.log(JSON.stringify({success:true,images:results,invalidQualityRejected:true},null,2));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
