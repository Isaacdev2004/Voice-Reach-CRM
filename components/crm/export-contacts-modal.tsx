"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {Modal} from "./modal";
import type {readWorkspaceState} from "@/lib/contacts/workspace";
export type ContactExportContext={filters:Omit<ReturnType<typeof readWorkspaceState>,"page">;selectedIds:string[];viewIds?:string[]};
export function ExportContactsModal({open,onClose,context}:{open:boolean;onClose:()=>void;context?:ContactExportContext}){
 const [scope,setScope]=useState<"all"|"selected"|"filtered">("all");
 const [preview,setPreview]=useState<{count:number;fingerprint:string}|null>(null);
 const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[refresh,setRefresh]=useState(0);
 const running=useRef<AbortController|null>(null);
 const content=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement|null;const timer=setTimeout(()=>content.current?.querySelector<HTMLInputElement>('input:checked')?.focus(),0);
 const trap=(e:KeyboardEvent)=>{if(e.key!=="Tab")return;const dialog=content.current?.closest('[role="dialog"]');const items=dialog?Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[href],[tabindex="0"]')).filter(x=>x.getClientRects().length):[];if(!items.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}};
 document.addEventListener("keydown",trap);return()=>{clearTimeout(timer);document.removeEventListener("keydown",trap);previous?.focus();};},[open]);
 const selection=useMemo(()=>scope==="selected"?{scope,ids:context?.selectedIds??[]}:scope==="filtered"&&context?{scope,filters:context.filters,...(context?.viewIds?{viewIds:context.viewIds}:{})}:{scope:"all"},[scope,context]);
 const key=JSON.stringify(selection);
 useEffect(()=>{
  if(!open)return;
  const controller=new AbortController();let active=true;
  setPreview(null);setLoading(true);setError("");setNotice("");
  fetch("/api/contacts/export",{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",signal:controller.signal,body:JSON.stringify({action:"preview",selection})})
   .then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error||"Unable to count contacts.");if(active)setPreview({count:j.count,fingerprint:j.fingerprint});})
   .catch(e=>{if(active&&e.name!=="AbortError")setError(e.message);})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;controller.abort();};
 // The serialized selection avoids recounts caused only by parent object identity.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[open,key,refresh]);
 useEffect(()=>()=>running.current?.abort(),[]);
 async function download(){
  if(!preview||!preview.count||busy)return;
  const controller=new AbortController();running.current=controller;setBusy(true);setError("");setNotice("");
  try{
   const r=await fetch("/api/contacts/export",{method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,cache:"no-store",body:JSON.stringify({action:"download",selection,fingerprint:preview.fingerprint,expectedCount:preview.count})});
   if(!r.ok){const j=await r.json().catch(()=>({}));if(r.status===409)setPreview(null);throw Error(j.error||"Export failed. Please try again.");}
   if(!r.headers.get("content-type")?.startsWith("text/csv")||Number(r.headers.get("X-Export-Count"))!==preview.count)throw Error("Unable to verify the download. Sign in again and retry.");
   const blob=await r.blob();const url=URL.createObjectURL(blob);
   const a=document.createElement("a");a.href=url;
   a.download=r.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1]??"myari-contacts.csv";
   document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
   setNotice("Download started for "+preview.count.toLocaleString()+(preview.count===1?" contact.":" contacts.")+" No contact records were changed.");
  }catch(e){if((e as Error).name!=="AbortError")setError((e as Error).message);}
  finally{setBusy(false);running.current=null;}
 }
 function close(){if(busy)running.current?.abort();setNotice("");setError("");onClose();}
 return <Modal open={open} onClose={close} title="Export your contacts" description="Your relationships, ready to take with you." icon="download" size="md">
 <div ref={content}><fieldset disabled={busy} className="space-y-3"><legend className="sr-only">Export options</legend>
 {[["all","Export All Contacts"],["selected","Export Selected Contacts"],["filtered","Export Current Filtered Results"]].map(([id,label])=><label key={id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-outline-variant/20 bg-cream px-4 py-3 text-[14px]"><input type="radio" name="contact-export-scope" value={id} checked={scope===id} disabled={id!=="all"&&!context} onChange={()=>setScope(id as typeof scope)}/>{label}{id==="selected"&&context?<span className="ml-auto text-taupe">{context.selectedIds.length}</span>:null}</label>)}
 </fieldset>
 <div role="status" aria-live="polite" className="my-4 rounded-2xl bg-champagne/50 p-4 text-[14px]">{loading?"Counting your authorized contacts…":preview?preview.count?preview.count.toLocaleString()+(preview.count===1?" contact ready to export.":" contacts ready to export."):"No contacts match. Select contacts, change your filters, or add contacts.":"Count unavailable."}</div>
 <p className="text-[13px] leading-relaxed text-taupe">Includes standard contact fields. Private notes, message history and internal IDs are excluded. Phone numbers and ZIP codes use an apostrophe text marker to preserve leading zeros in spreadsheets.</p>
 {error&&<p role="alert" className="mt-3 text-[14px] text-error">{error}</p>}{notice&&<p role="status" className="mt-3 text-[14px] text-emerald-muted">{notice}</p>}
 <div className="mt-5 flex flex-wrap gap-3"><button disabled={busy||loading} onClick={()=>setRefresh(v=>v+1)} className="min-h-11 rounded-full border border-outline-variant/30 px-4 text-[14px]">Refresh count</button><button disabled={!preview?.count||loading||busy} onClick={()=>void download()} className="min-h-11 rounded-full bg-rose-gold px-5 text-[14px] font-medium text-ivory disabled:opacity-50">{busy?"Preparing CSV…":"Download CSV"}</button><button onClick={close} className="min-h-11 px-3 text-[14px]">{busy?"Cancel export":"Close"}</button></div>
 </div></Modal>;
}
