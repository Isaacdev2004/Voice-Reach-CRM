"use client";
import {useRecipientPage} from "@/lib/hooks/use-recipient-page";
import {ContactPageControls} from "@/components/crm/contact-page-controls";
import { useUser } from "@clerk/nextjs";
import { useEffect,useState } from "react";
import Link from "next/link";
import { REVIEW_LABELS,type ReviewState } from "@/lib/reviews/model";
import { ContactReviewsPanel } from "./contact-reviews-panel";
export function ReviewsDashboard(){const {user,isLoaded}=useUser();return isLoaded&&user?<OwnedReviewsDashboard key={user.id}/>:<p role="status">Loading your relationship workspace…</p>;}
function OwnedReviewsDashboard(){const [data,setData]=useState<{metrics:Record<string,number|null>;records:{entity_id:string;metadata:{state:ReviewState}}[]}|null>(null),[error,setError]=useState(""),[query,setQuery]=useState(""),[filter,setFilter]=useState("all"),[selected,setSelected]=useState("");
useEffect(()=>{const controller=new AbortController();void fetch('/api/reviews',{cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)throw Error();const result=await response.json();if(!controller.signal.aborted)setData(result);}).catch(()=>{if(!controller.signal.aborted)setError('Review information could not be loaded. No metrics are inferred.');});return()=>controller.abort();},[]);
const statuses=new Map<string,string>();for(const record of data?.records??[])if(!statuses.has(record.entity_id))statuses.set(record.entity_id,record.metadata.state.status);
const only=filter!=='all'&&filter!=='not_requested'?[...statuses].filter(([,status])=>status===filter).map(([id])=>id):undefined;
const excluded=filter==='not_requested'?[...statuses].filter(([,status])=>status!=='not_requested').map(([id])=>id):[];
const contactPage=useRecipientPage(Boolean(data),query,excluded,only,true);
const contacts=contactPage.data?.contacts??[];

const labels:Record<string,string>={requestsSent:"Requests sent (provider confirmed)",awaitingResponse:"Awaiting response",clientConfirmed:"Client-confirmed reviews",verified:"Independent verification",declined:"Declined requests",skippedReminders:"Skipped reminders"};
return <main className="reviews-workspace"><Link href="/dashboard/campaigns">← Campaigns</Link><p className="text-xs uppercase tracking-widest text-rose-gold-deep">Reviews &amp; Referrals</p><h1 className="font-serif text-4xl">Relationships, thoughtfully tended.</h1><p>Recorded requests, client-reported confirmations and referral follow-ups. Independent Zillow verification is not connected.</p>{(error||contactPage.error)&&<p role="alert">{error||contactPage.error}</p>}<div className="review-metrics">{Object.entries(labels).map(([key,label])=><article key={key}><p>{label}</p><strong>{data?.metrics[key]??'Unavailable'}</strong></article>)}</div><label>Search contacts<input value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Review status<select value={filter} onChange={e=>{setFilter(e.target.value);contactPage.setPage(1);}}><option value="all">All statuses</option>{Object.entries(REVIEW_LABELS).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></label>{contactPage.loading&&<p role="status">Loading contacts…</p>}<ContactPageControls page={contactPage.page} pages={contactPage.pages} onPage={contactPage.setPage} loading={contactPage.loading}/><ul>{contacts.map(c=><li key={c.id}><button type="button" onClick={()=>setSelected(c.id)}>{c.first_name} {c.last_name}</button> · <Link href={`/dashboard/contacts/${c.id}`}>Open profile →</Link></li>)}</ul>{selected&&<ContactReviewsPanel key={selected} contactId={selected}/>}</main>}
