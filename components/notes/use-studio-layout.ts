"use client";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { DEFAULT_STUDIO_PANELS, readStudioPanels, studioStorageKey, type StudioPanels } from "@/lib/notes/studio-layout";
export function useStudioLayout(owner: string, editor: RefObject<HTMLTextAreaElement | null>) {
  const [panels,setPanels]=useState<StudioPanels>(DEFAULT_STUDIO_PANELS), [ready,setReady]=useState(false), [focus,setFocus]=useState(false), [overlay,setOverlay]=useState(false), [expanded,setExpanded]=useState(false);
  const columns=useRef<HTMLDivElement>(null);
  const selection=useRef<{start:number;end:number;direction:"forward"|"backward"|"none";scroll:number;previewScroll:number} | null>(null);
  const key=studioStorageKey(owner);
  useEffect(()=>{
    try {setPanels(readStudioPanels(localStorage.getItem(key) ?? localStorage.getItem(`myari:notes:panels:v1:${owner}`)));}catch{}
    setReady(true);
  },[key,owner]);
  useEffect(()=>{if(ready)try{localStorage.setItem(key,JSON.stringify(panels));}catch{}},[ready,key,panels]);
  useEffect(()=>{
    const element=columns.current;if(!element)return;
    const resize=new ResizeObserver(([entry])=>setOverlay(entry.contentRect.width<1250));resize.observe(element);
    return()=>resize.disconnect();
  },[]);
  const preserve=useCallback(()=>{
    const el=editor.current;
    selection.current=el?{start:el.selectionStart,end:el.selectionEnd,direction:el.selectionDirection,scroll:el.scrollTop,previewScroll:columns.current?.querySelector('.notes-rendered')?.scrollTop??0}:null;
  },[editor]);
  const restore=useCallback(()=>requestAnimationFrame(()=>{
    const pos=selection.current,el=editor.current;if(!pos||!el)return;
    el.setSelectionRange(pos.start,pos.end,pos.direction);el.scrollTop=pos.scroll;
    const rendered=columns.current?.querySelector('.notes-rendered');if(rendered)rendered.scrollTop=pos.previewScroll;
  }),[editor]);
  function toggle(which:keyof StudioPanels) {
    preserve();setFocus(false);setExpanded(false);
    const showing=which==='library'?shownLibrary:shownPlanner;
    setPanels(p=>({...p,[which]:!showing,...(overlay&&!showing?{[which==='library'?'planner':'library']:false}:{})}));restore();
  }
  function close(which:keyof StudioPanels) {
    preserve();setPanels(p=>({...p,[which]:false}));setExpanded(false);restore();
    requestAnimationFrame(()=>document.getElementById(`notes-toggle-${which}`)?.focus());
  }
  function focusMode() {preserve();setFocus(v=>!v);setExpanded(false);restore();}
  const library=panels.library&&!focus, planner=panels.planner&&!focus;
  // If both preferences were saved on a wide screen, a narrow workspace shows one overlay.
  const shownLibrary=library&&!(overlay&&planner), shownPlanner=planner;
  const overlayOpen=(overlay&&(shownLibrary||shownPlanner))||(expanded&&shownPlanner);
  useEffect(()=>{
    if(!overlayOpen)return;
    const target=shownPlanner?'planner':'library';
    requestAnimationFrame(()=>document.getElementById(`notes-close-${target}`)?.focus());
  },[overlayOpen,shownPlanner]);
  useEffect(()=>{
    if(!overlayOpen)return;
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!document.querySelector('[role=dialog],dialog[open]')){event.preventDefault();close(shownPlanner?'planner':'library');}};
    window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
  });
  return {columns,library:shownLibrary,planner:shownPlanner,overlay,overlayOpen,focus,expanded,toggle,close,
    toggleFocus:focusMode, expandPlanner:()=>{preserve();setExpanded(v=>!v);restore();},
    closeOverlay:()=>{if(overlay){setPanels(p=>({...p,library:false,planner:false}));setExpanded(false);}}};
}
