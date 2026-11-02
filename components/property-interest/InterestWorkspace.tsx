"use client";
import { useEffect,useState } from "react";
type Share={id:string;contact_id:string;property_key:string;label:string;window_days:number;revoked_at:string|null};
type Event={id:string;share_id:string;qualified:boolean;reason:string;created_at:string};
type Trigger={contact_id:string;property_key:string;campaign_id:string};
export default function InterestWorkspace({contacts}:{contacts:{id:string;first_name:string;last_name:string|null}[]}){
 const [shares,setShares]=useState<Share[]>([]),[events,setEvents]=useState<Event[]>([]),[triggers,setTriggers]=useState<Trigger[]>([]);
 const [contact,setContact]=useState(""),[url,setUrl]=useState(""),[label,setLabel]=useState(""),[days,setDays]=useState(7),[link,setLink]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 async function refresh(){const r=await fetch("/api/property-interest/shares");const j=await r.json();if(!r.ok)throw Error(j.error);setShares(j.shares);setEvents(j.events);setTriggers(j.triggers);}
 useEffect(()=>{setContact(new URLSearchParams(location.search).get("contactId")??"");refresh().catch(e=>setMessage(e.message));},[]);
 async function create(e:React.FormEvent){e.preventDefault();setBusy(true);try{const r=await fetch("/api/property-interest/shares",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contactId:contact,url,label,windowDays:days})});const j=await r.json();if(!r.ok)throw Error(j.error);setLink(j.shareUrl);setMessage("Link created. Copy it now; the private capability is not stored in retrievable form. No message was sent.");await refresh();}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 async function revoke(id:string){if(!confirm("Revoke this property link? Existing activity and drafts are retained."))return;const r=await fetch("/api/property-interest/shares",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});if(!r.ok)setMessage("Unable to revoke. Please retry.");else await refresh();}
 const input={width:"100%",padding:12,border:"1px solid #dfd1c0",borderRadius:10};
 return <section style={{padding:24,background:"#faf7f1",borderRadius:20,color:"#40382e"}}>
 <h1 style={{fontFamily:"Georgia,serif",fontSize:34}}>Property interest</h1><p>Create recipient-specific property introductions. Activity belongs to the assigned link; buyer identity is not verified. MyARI cannot track visits inside Zillow.</p>
 <form onSubmit={create} style={{display:"grid",gap:12,maxWidth:760}}>
 <label>Contact<select required value={contact} onChange={e=>setContact(e.target.value)} style={input}><option value="">Choose an owned contact</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}</select></label>
 <label>Property label<input required maxLength={140} value={label} onChange={e=>setLabel(e.target.value)} style={input}/></label>
 <label>Zillow individual-property URL<input required type="url" value={url} onChange={e=>setUrl(e.target.value)} style={input}/></label>
 <label>Rolling window (days, 1–30)<input required type="number" min={1} max={30} value={days} onChange={e=>setDays(Number(e.target.value))} style={input}/></label>
 <button disabled={busy} style={{padding:14,background:"#91613c",color:"white",borderRadius:12}}>Create review-only sharing link</button>
 </form>
 {link&&<label>Private recipient link<input readOnly value={link} onFocus={e=>e.target.select()} style={input}/><button onClick={()=>navigator.clipboard.writeText(link).then(()=>setMessage("Link copied. No communication was sent."))}>Copy link</button></label>}
 <p role="status">{message}</p><h2>Link activity &amp; draft review</h2>
 <p>Three qualified visits, separated by at least 30 minutes, create one internal alert and one editable draft. No enrollment, sending, scheduling or billing.</p>
 {shares.map(s=><article key={s.id} style={{padding:18,marginTop:12,border:"1px solid #dfd1c0",borderRadius:14,overflowWrap:"anywhere"}}>
 <h3>{s.label}</h3><p>Contact: {s.contact_id} · {s.window_days}-day window · {s.revoked_at?"Revoked":"Active"} · recipient-link activity only</p>
 <button onClick={()=>void revoke(s.id)} disabled={Boolean(s.revoked_at)}>Revoke link</button>
 {triggers.filter(t=>t.contact_id===s.contact_id&&t.property_key===s.property_key).map(t=><p key={t.campaign_id}><a href={"/dashboard/campaigns?edit="+t.campaign_id}>Review campaign draft →</a></p>)}
 <ul>{events.filter(e=>e.share_id===s.id).map(e=><li key={e.id}>{new Date(e.created_at).toLocaleString()} · {e.qualified?"Qualifying visit":e.reason}</li>)}</ul>
 </article>)}<button onClick={()=>refresh().catch(e=>setMessage(e.message))}>Refresh activity</button>
 </section>;
}
