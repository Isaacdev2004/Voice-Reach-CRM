"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { VoiceDraftSchema, VoiceDraftRecoverySchema, sameVoiceDraft, type VoiceDraft } from "./drafts";
import { DEFAULT_VOICE_SCRIPT } from "./storage";

type Recovery = VoiceDraft & { confirmed: boolean };
const prefix=(owner:string)=>`myari:voice-drafts:v3:${owner}:`;
export function useVoiceDrafts(owner:string | undefined, initial?:{title:string;script?:string;scriptId?:string}) {
  const [draft,setDraft]=useState<Recovery>(()=>({id:crypto.randomUUID(),title:initial?.title ?? "Untitled voice script",script:initial?.script ?? DEFAULT_VOICE_SCRIPT,category:"General",archived:false,revision:null,updated_at:new Date().toISOString(),confirmed:false}));
  const tabId=useRef(crypto.randomUUID());
  const current=useRef(draft);const ownerRef=useRef(owner);ownerRef.current=owner;
  const [drafts,setDrafts]=useState<(VoiceDraft & {recovery?:boolean})[]>([]);
  const [saveSettled,setSaveSettled]=useState(0);
  const [phase,setPhase]=useState<"loading"|"local"|"saving"|"saved"|"failed"|"conflict">("loading");
  const [cloudError,setCloudError]=useState("");const [localError,setLocalError]=useState("");
  const ready=useRef(false),request=useRef<Promise<void>|null>(null),serial=useRef(0);
  const persist=useCallback((value:Recovery,active=true)=>{
    if(!owner)return false;
    try{localStorage.setItem(prefix(owner)+value.id,JSON.stringify(value));localStorage.setItem(prefix(owner)+value.id+"~"+tabId.current,JSON.stringify(value));if(active)localStorage.setItem(prefix(owner)+"active",value.id);setLocalError("");return true;}
    catch{setLocalError("Device recovery is unavailable. Keep this page open until cloud saving succeeds, or download your script.");return false;}
  },[owner]);
  const commit=useCallback((value:Recovery)=>{current.current=value;setDraft(value);persist(value);},[persist]);
  const loadDrafts=useCallback(async()=>{
    if(!owner)return;
    const n=++serial.current;
    try{
      const res=await fetch("/api/voice-studio/drafts",{cache:"no-store",headers:{"X-MyARI-Owner":owner},signal:AbortSignal.timeout(15000)});const json=await res.json();
      if(!res.ok || json.success!==true || !Array.isArray(json.drafts))throw Error();
      const rows=json.drafts.map((d:unknown)=>VoiceDraftSchema.parse(d)) as VoiceDraft[];
      if(n!==serial.current || ownerRef.current!==owner)return;
      const recovery:(VoiceDraft & {recovery?:boolean})[]=[];
      try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key?.startsWith(prefix(owner)) && !key.endsWith(":active")){const value=JSON.parse(localStorage.getItem(key)||"null");const parsed=VoiceDraftRecoverySchema.safeParse(value);if(parsed.success && !rows.some(row=>row.id===parsed.data.id) && !recovery.some(row=>row.id===parsed.data.id))recovery.push({...parsed.data,recovery:true});}}}catch{/* Current recovery still remains in the editor. */}
      setDrafts([...rows,...recovery]);setCloudError("");
      const value=current.current,remote=rows.find(row=>row.id===value.id);
      if(remote && sameVoiceDraft(remote,value)){commit({...remote,confirmed:true});setPhase("saved");}
      else if(remote && value.revision!==remote.revision){setPhase("conflict");setCloudError("This draft changed in another session. Your edits are preserved. Reload its cloud version or save a new copy.");}
      else if(phase === "loading")setPhase("local");
      return rows;
    }catch{if(n===serial.current && ownerRef.current===owner){setCloudError("Cloud drafts are unavailable. Your work is kept in device recovery when available; retry loading or saving.");setPhase("failed");}}
  // The phase at request start is deliberately not a reload trigger.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[owner,commit]);
  const cancelLoads=useCallback(()=>{serial.current++;ready.current=false;},[]);
  useEffect(()=>{
    if(!owner)return;
    ready.current=false;
    try{const key=prefix(owner)+"tab";tabId.current=sessionStorage.getItem(key)||tabId.current;sessionStorage.setItem(key,tabId.current);}catch{/* Device recovery still works without tab storage. */}
    let recovered:Recovery|null=null;
    try{
      const id=initial?.scriptId || (!initial?localStorage.getItem(prefix(owner)+"active"):null);
      const value=id?JSON.parse(localStorage.getItem(prefix(owner)+id+"~"+tabId.current)||localStorage.getItem(prefix(owner)+id)||"null"):null;
      const parsed=VoiceDraftRecoverySchema.safeParse(value);
      if(parsed.success)recovered={...parsed.data,confirmed:false};
    }catch{/* A malformed recovery never replaces the current script. */}
    if(recovered)commit(recovered);else persist(current.current);
    ready.current=true;void loadDrafts();
    return cancelLoads;
  // A parent owner/asset key remounts this hook; never reset ongoing edits on renders.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[owner]);
  const edit=useCallback((change:Partial<Pick<VoiceDraft,"title"|"script">>)=>{
    const value={...current.current,...change,confirmed:false};commit(value);setPhase(p=>p==="conflict"?p:"local");
  },[commit]);
  const save=useCallback(async()=>{
    if(!owner || !ready.current || !current.current.title.trim() || request.current)return request.current;
    const snapshot={...current.current,title:current.current.title.trim()};setPhase("saving");setCloudError("");
    const operation=(async()=>{
      try{
        const response=await fetch("/api/voice-studio/drafts",{method:"PUT",headers:{"Content-Type":"application/json","X-MyARI-Owner":owner},signal:AbortSignal.timeout(15000),body:JSON.stringify({id:snapshot.id,title:snapshot.title,script:snapshot.script,category:snapshot.category,archived:snapshot.archived,expectedRevision:snapshot.revision})});
        const data=await response.json();
        if(!ready.current || ownerRef.current!==owner)return;
        if(response.status===409){if(current.current.id===snapshot.id){setPhase("conflict");setCloudError("This draft changed in another session. Your edits are preserved; reload the cloud version or save a new copy.");}return;}
        const checked=VoiceDraftSchema.safeParse(data.draft);
        if(!response.ok || data.success!==true || !checked.success || checked.data.id!==snapshot.id || !checked.data.revision || !sameVoiceDraft(checked.data,snapshot))throw Error();
        const saved=checked.data;
        setDrafts(rows=>[saved,...rows.filter(row=>row.id!==saved.id)]);
        const active=current.current;
        if(active.id===snapshot.id){const unchanged=sameVoiceDraft({...active,title:active.title.trim()},snapshot);commit({...active,title:unchanged?saved.title:active.title,revision:saved.revision,updated_at:saved.updated_at,confirmed:unchanged});setPhase(unchanged?"saved":"local");}
        else {
          let background:Recovery={...saved,confirmed:true};
          try{const value=JSON.parse(localStorage.getItem(prefix(owner)+snapshot.id+"~"+tabId.current)||"null");if(VoiceDraftRecoverySchema.safeParse(value).success && !sameVoiceDraft(value,snapshot))background={...value,revision:saved.revision,updated_at:saved.updated_at,confirmed:false};}catch{/* The confirmed server snapshot remains recoverable. */}
          persist(background,false);
        }
      }catch{if(ready.current && ownerRef.current===owner && current.current.id===snapshot.id){setPhase("failed");setCloudError("Cloud save failed. Your script is not confirmed saved. Retry, or download a copy before leaving.");}}
    })();request.current=operation;
    try{await operation;}finally{request.current=null;if(ready.current)setSaveSettled(value=>value+1);}
  },[owner,commit,persist]);
  useEffect(()=>{
    if(!ready.current || phase!=="local" || !draft.title.trim())return;
    const timer=setTimeout(()=>void save(),1200);return()=>clearTimeout(timer);
  },[draft,phase,save,saveSettled]);
  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{if(!current.current.confirmed){event.preventDefault();event.returnValue="";}};
    window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);
  },[]);
  const select=(value:VoiceDraft & {recovery?:boolean})=>{
    if(!persist(current.current,false) && !current.current.confirmed)return;
    let next:Recovery={...value,confirmed:false};
    try{const cached=JSON.parse(localStorage.getItem(prefix(owner??"")+value.id+"~"+tabId.current)||localStorage.getItem(prefix(owner??"")+value.id)||"null");if(VoiceDraftRecoverySchema.safeParse(cached).success && !cached.confirmed)next=cached;}catch{/* Open verified server data. */}
    const confirmed=Boolean(!value.recovery && value.revision && sameVoiceDraft(next,value));commit({...next,confirmed});setPhase(confirmed?"saved":next.revision!==value.revision?"conflict":"local");setCloudError("");
  };
  const newDraft=(copy=false)=>{if(!persist(current.current,false) && !current.current.confirmed)return;commit({id:crypto.randomUUID(),title:copy?`${current.current.title.slice(0,113)} (copy)`:"Untitled voice script",script:copy?current.current.script:"",category:"General",archived:false,revision:null,updated_at:new Date().toISOString(),confirmed:false});setPhase("local");setCloudError("");};
  const reloadCloud=async()=>{
    const old=current.current;const rows=await loadDrafts();const remote=rows?.find(d=>d.id===old.id);
    if(!remote || current.current.id!==old.id)return;
    const copy={...current.current,id:crypto.randomUUID(),title:`${current.current.title.slice(0,105)} (recovery)`,revision:null,confirmed:false};
    if(!persist(copy,false))return;setDrafts(all=>[{...copy,recovery:true},...all]);commit({...remote,confirmed:true});setPhase("saved");setCloudError("");
  };
  return {draft,drafts,phase,cloudError,localError,edit,save,loadDrafts,select,newDraft,reloadCloud};
}
