"use client";
import {useEffect,useRef,useState} from "react";
import {useUser} from "@clerk/nextjs";
import type {VoiceAsset} from "@/lib/hooks/use-voice-assets";
export function RecordingTranscript({asset,available}:{asset:VoiceAsset;available:boolean|null}){
  const mounted=useRef(true),editRevision=useRef(0);
  const {user}=useUser();const key=`myari:voice-transcript:${user?.id}:${asset.id}`;
  const [text,setText]=useState("");const [machine,setMachine]=useState("");
  const [busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[reviewed,setReviewed]=useState(false);
  const [status,setStatus]=useState("Loading reviewed transcript…"),[error,setError]=useState(""),[localError,setLocalError]=useState(false);
  useEffect(()=>{
    mounted.current=true;const controller=new AbortController();let recovery="";
    try{const value=JSON.parse(localStorage.getItem(key)||"null");if(typeof value?.text==="string"){recovery=value.text;setText(recovery);if(typeof value.machine==="string")setMachine(value.machine);setStatus("Recovered transcript draft — review before saving.");}}catch{/* The server review remains available. */}
    fetch(`/api/voice-studio/transcripts?assetId=${asset.id}`,{cache:"no-store",signal:controller.signal}).then(async response=>{
      const data=await response.json();if(!response.ok || data.success!==true)throw Error();if(controller.signal.aborted || editRevision.current>0)return;
      if(data.review && typeof data.review.text==="string"){
        if(!recovery || recovery===data.review.text){setText(data.review.text);setReviewed(true);setStatus("Agent-reviewed transcript saved.");}
        else setStatus("Recovered transcript draft differs from the saved review.");
      }else if(!recovery)setStatus("No agent-reviewed transcript saved for this recording.");
    }).catch(()=>{if(!controller.signal.aborted){setError("Saved transcript could not be loaded. Retry by reopening this recording; recovered text is unchanged.");setStatus("Reviewed transcript availability is unverified.");}});
    return()=>{mounted.current=false;controller.abort();};
  },[asset.id,key]);
  const backup=(value:string,source=machine)=>{try{localStorage.setItem(key,JSON.stringify({text:value,machine:source}));setLocalError(false);}catch{setLocalError(true);}};
  const transcribe=async()=>{
    if(!window.confirm("I am authorized to process this recording and have the required consent. Send this audio to the configured transcription provider for a draft transcript?"))return;
    setBusy(true);setError("");
    try{
      const r=await fetch("/api/voice-studio/transcribe",{method:"POST",headers:{"Content-Type":"application/json"},signal:AbortSignal.timeout(75000),body:JSON.stringify({voiceAssetId:asset.id,consent:true})});const data=await r.json();
      if(!mounted.current)return;
      if(!r.ok || data.success!==true || typeof data.transcript!=="string" || !data.transcript.trim() || data.transcript.length>5000)throw Error();
      if(text && !window.confirm("Replace the current transcript draft with this new machine transcript? The saved review remains unchanged."))return;
      editRevision.current++;setMachine(data.transcript);setText(data.transcript);setReviewed(false);backup(data.transcript,data.transcript);setStatus("AI-generated draft transcript — not agent reviewed.");
    }catch{setError("Transcription is unavailable or could not complete. Existing text, script and approved audio are unchanged.");}finally{setBusy(false);}
  };
  const save=async()=>{
    editRevision.current++;setSaving(true);setError("");const snapshot=text;
    try{const response=await fetch("/api/voice-studio/transcripts",{method:"POST",headers:{"Content-Type":"application/json"},signal:AbortSignal.timeout(15000),body:JSON.stringify({voiceAssetId:asset.id,transcript:snapshot,reviewed:true})});const data=await response.json();if(!response.ok || data.success!==true || data.review?.text!==snapshot || !data.review.id)throw Error();setStatus("Agent-reviewed transcript saved. Approved audio is unchanged.");}
    catch{setError("Transcript was not confirmed saved. Keep your recovery copy and retry.");}finally{setSaving(false);}
  };
  const original=asset.studio_metadata?.script ?? "";
  const same=Boolean(original.trim() && text.trim() && original.trim().replace(/\s+/g," ").toLowerCase()===text.trim().replace(/\s+/g," ").toLowerCase());
  return <details className="vs-card vs-transcription-details" aria-label="Recording transcription" data-protect-leave={localError}>
    <summary>Transcript & comparison</summary><p>Recording: {asset.title} · {asset.approved?"Approved audio version":"Unapproved audio version"}. Transcripts never change the recording.</p>
    <button type="button" disabled={!available || busy || saving} onClick={()=>void transcribe()}>{busy?"Transcribing…":"Transcribe Recording"}</button>
    {!available?<p>{available===null?"Checking transcription availability…":"The transcription provider is unavailable. Enter a reviewed transcript manually."}</p>:null}
    <p role="status">{status}</p>{error?<p role="alert">{error}</p>:null}{localError?<p role="alert">Device recovery is unavailable. Copy or save this transcript before leaving.</p>:null}
    <div className="vs-transcript-compare"><div><h4>Original script</h4><pre>{original||"No original script was stored with this recording."}</pre></div><div><label htmlFor={`transcript-${asset.id}`}>Transcript draft</label><textarea id={`transcript-${asset.id}`} rows={7} maxLength={5000} value={text} disabled={saving || busy} onChange={event=>{editRevision.current++;setText(event.target.value);setReviewed(false);setStatus("Transcript draft — review before saving.");backup(event.target.value);}} /></div></div>
    {machine?<details><summary>Original AI-generated draft transcript</summary><p>{machine}</p></details>:null}
    {text && original?<p>{same?"Text matches the original script after whitespace/case normalization.":"Text differs from the original script. Review names, numbers, missing words and placeholders while listening. This is a text comparison, not an audio accuracy certification."}</p>:null}
    <label><span><input type="checkbox" style={{width:"auto"}} checked={reviewed} onChange={event=>setReviewed(event.target.checked)}/> I listened to this exact recording and reviewed the transcript.</span></label>
    <button type="button" disabled={!reviewed || !text.trim() || busy || saving} onClick={()=>void save()}>{saving?"Saving transcript…":"Save reviewed transcript"}</button>
  </details>;
}
