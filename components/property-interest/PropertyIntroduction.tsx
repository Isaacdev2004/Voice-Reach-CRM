"use client";
import { useEffect, useRef, useState } from "react";
type Property={label:string;url:string;disclosure:string};
export default function PropertyIntroduction(){
 const token=useRef("");
 const [property,setProperty]=useState<Property|null>(null);
 const [message,setMessage]=useState("");
 const [consented,setConsented]=useState(false);
 const [ready,setReady]=useState(false);
 const [busy,setBusy]=useState(false);
 const visibleSince=useRef(0);
 async function call(action:string,extra:Record<string,unknown>={}){
  const r=await fetch("/api/property-interest/public",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,token:token.current,...extra})});
  const j=await r.json(); if(!r.ok)throw new Error(j.error||"Please try again.");return j;
 }
 useEffect(()=>{token.current=location.hash.slice(1);call("resolve").then(setProperty).catch(e=>setMessage(e.message));},[]);
 useEffect(()=>{
  if(!consented)return;
  const reset=()=>{visibleSince.current=document.visibilityState==="visible"?Date.now():0;setReady(false);};
  reset();document.addEventListener("visibilitychange",reset);
  const t=setInterval(()=>setReady(visibleSince.current>0&&Date.now()-visibleSince.current>=15000),500);
  return()=>{clearInterval(t);document.removeEventListener("visibilitychange",reset);};
 },[consented]);
 async function consent(){setBusy(true);try{await call("consent",{agree:true,disclosure:property?.disclosure});setConsented(true);setMessage("Tracking is on for this visit. After 15 seconds, you may record your interest below.");}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 async function record(){setBusy(true);try{const j=await call("qualify",{interacted:true,visible:document.visibilityState==="visible"});setMessage(j.result.qualified?"Your interest on this MyARI page was recorded. Nothing was sent.":"This visit was not counted: "+j.result.reason);setConsented(false);}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 async function stop(){setBusy(true);try{await call("stop");setConsented(false);setMessage("Tracking is off for this browser. You can view the property without tracking.");}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 return <main style={{minHeight:"100dvh",background:"#faf7f1",color:"#433a31",padding:"clamp(20px,5vw,72px)",display:"grid",placeItems:"center"}}>
 <article style={{width:"100%",maxWidth:720,padding:"clamp(24px,5vw,56px)",border:"1px solid #e8ded0",borderRadius:24,background:"#fffdf9",boxShadow:"0 16px 50px #7654300c"}}>
 <p style={{letterSpacing:3,color:"#93623d"}}>MYARI · PROPERTY INTRODUCTION</p>
 <h1 style={{fontFamily:"Georgia,serif",fontSize:"clamp(30px,5vw,46px)",lineHeight:1.15}}>{property?.label||"A place worth exploring."}</h1>
 <p>This is a MyARI introduction to an external Zillow property page. MyARI does not observe your activity inside Zillow.</p>
 <p>Your choice: allow this MyARI page to record separated visits on the recipient-specific link, or view without tracking. Three qualifying visits may prompt the agent to review a follow-up draft. This choice does not grant marketing consent or send a message.</p>
 <p><strong>A shared link identifies its intended recipient, not the person opening it.</strong> Forwarded-link activity is never verified buyer identity.</p>
 {property&&<div style={{display:"grid",gap:14,marginTop:24}}>
 <a href={property.url} target="_blank" rel="noopener noreferrer" onClick={()=>void stop()} style={{padding:14,border:"1px solid #d3c0ab",borderRadius:12,textAlign:"center"}}>View property without tracking ↗</a>
 {!consented?<button disabled={busy} onClick={consent} style={{padding:14,borderRadius:12,background:"#91613c",color:"white"}}>Allow tracking on this MyARI page</button>:<button disabled={busy||!ready} onClick={record} style={{padding:14,borderRadius:12,background:"#91613c",color:"white"}}>{ready?"Record this visit":"Review this page for 15 seconds…"}</button>}
 <button disabled={busy} onClick={stop} style={{padding:12}}>Stop tracking / privacy choice</button>
 <a href={property.url} target="_blank" rel="noopener noreferrer">Open Zillow separately ↗</a>
 </div>}
 <p role="status" aria-live="polite" style={{marginTop:20}}>{message||(!property?"Loading property introduction…":"No visit has been counted.")}</p>
 </article></main>;
}
