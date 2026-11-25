"use client";
import Image from "next/image";
import { useState } from "react";
/** Approved local photography, through Next's configured quality allowlist. */
export function ConciergePhoto({src,alt,className="",priority=false}:{src:string;alt:string;className?:string;priority?:boolean}) {
  const [failure,setFailure]=useState(0);
  const fallback="/brand/heroes/campaign-library-interior.png";
  return <div className={`concierge-photo ${className}`}>
    {failure < 2 ? <Image src={failure ? fallback : src} alt={alt} fill quality={75} priority={priority} sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 600px" style={{objectFit:"cover",objectPosition:"center"}} onError={()=>setFailure(n=>n+1)}/> : <p className="concierge-photo-error" role="status">Photography is temporarily unavailable. Your setup remains available.</p>}
  </div>;
}
