"use client";
import { useEffect,useState } from "react";
export function AuthorizedVoicePreference({value,onChange}:{value:string|null;onChange:(id:string|null)=>void}) {
 const [profiles,setProfiles]=useState<{id:string;label:string}[]>([]),[error,setError]=useState("");
 useEffect(()=>{let active=true;fetch('/api/voice-assets/profiles').then(async r=>{const data=await r.json();if(!r.ok)throw Error();if(active)setProfiles(data.profiles??[]);}).catch(()=>{if(active)setError('Authorized voices could not be loaded. Your saved preference has not changed.');});return()=>{active=false;};},[]);
 return <div><label>Preferred AI Voice<select value={value??""} onChange={e=>onChange(e.target.value||null)} disabled={!!error}><option value="">Choose per recording (no saved preference)</option>{value&&!profiles.some(p=>p.id===value)&&<option value={value}>Saved voice awaiting verification</option>}{profiles.map(p=><option value={p.id} key={p.id}>{p.label}</option>)}</select></label><p>{error||"Sapphire must be available and authorized in your provider account before linking. An unavailable saved preference blocks generation; another voice is never silently substituted."}</p><a href="/dashboard/voice-scripts">Preview or link an authorized voice in Voice Studio →</a></div>;
}
