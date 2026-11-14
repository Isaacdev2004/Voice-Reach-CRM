const assert=require('node:assert/strict');
(async()=>{
 const {verifyLiveContactOwner,target}=await import('./verify-live-identity.mjs');
 let calls=[];
 const request=async(url,init)=>{calls.push({url,method:init.method});return {ok:true,json:async()=>url.includes('organization_memberships')?{data:[]}:{id:target,primary_email_address_id:'email',email_addresses:[{id:'email',email_address:'hello@myari.io',verification:{status:'verified'}}],banned:false,locked:false}};};
 assert.equal((await verifyLiveContactOwner({CLERK_SECRET_KEY:'sk_test_fixture'},request)).requests,0);assert.equal(calls.length,0);
 const result=await verifyLiveContactOwner({CLERK_SECRET_KEY:'sk_live_fixture',NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'pk_live_fixture'},request);
 assert.equal(result.result,'PASS');assert.equal(result.activationPerformed,false);assert(calls.every(row=>row.method==='GET'));
 assert(!JSON.stringify(result).includes('sk_live_fixture'));assert.equal(result.organizationCount,0);
 console.log(JSON.stringify({result:'PASS',checks:7,scope:'Synthetic identity responses; no Live Clerk calls'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
