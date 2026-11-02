import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ownerEnabled } from "@/lib/property-interest/model";
import InterestWorkspace from "@/components/property-interest/InterestWorkspace";
export default async function Page(){
 const owner=await requireUserId();if(!ownerEnabled(owner))notFound();
 const {data,error}=await supabaseAdmin.from("contacts").select("id,first_name,last_name").eq("owner_id",owner).order("first_name").limit(500);
 if(error)throw new Error("Unable to load owned contacts.");
 return <InterestWorkspace contacts={data??[]}/>;
}
