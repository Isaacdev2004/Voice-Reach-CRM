"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
export default function PropertyInterestEntry({contactId}:{contactId?:string}){
 const [available,setAvailable]=useState(false);
 useEffect(()=>{let active=true;fetch("/api/property-interest/shares").then(r=>{if(active)setAvailable(r.ok);}).catch(()=>{});return()=>{active=false;};},[]);
 return available?<Link href={"/dashboard/property-interest"+(contactId?"?contactId="+encodeURIComponent(contactId):"")} className="pf-text-action">Property interest pilot · recipient-link activity →</Link>:null;
}
