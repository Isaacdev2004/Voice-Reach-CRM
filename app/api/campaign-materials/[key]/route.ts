import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireUserId } from "@/lib/auth";
import { apiError,withApiHandler } from "@/lib/api-response";
import { CAMPAIGN_MATERIALS } from "@/lib/campaigns/premium-drafts";
/** Shared review-only planning resource. No subscriber branding is inferred or published. */
export const GET=withApiHandler(async (_request,context:{params:Promise<{key:string}>})=>{await requireUserId();const {key}=await context.params;if(!Object.hasOwn(CAMPAIGN_MATERIALS,key))return apiError("Resource not found",{status:404});const file=await readFile(path.join(process.cwd(),"private/campaign-materials",`${key}.pdf`));return new Response(file,{headers:{"Content-Type":"application/pdf","Content-Disposition":`inline; filename="${key}.pdf"`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});});
