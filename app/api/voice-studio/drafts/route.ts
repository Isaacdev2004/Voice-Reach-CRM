import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { VoiceDraftSaveSchema } from "@/lib/voice-studio/drafts";
import { readVoiceDrafts, saveVoiceDraft, VoiceDraftConflict } from "@/lib/voice-studio/drafts-store";
export const GET = withApiHandler(async request => {
  const owner=await requireUserId();
  if(request?.headers.get("X-MyARI-Owner") && request.headers.get("X-MyARI-Owner")!==owner)return apiError("Your account changed. Reload before accessing drafts.",{status:409,code:"account_changed"});
  try{return apiOk(await readVoiceDrafts(owner));}
  catch{return apiError("Cloud drafts could not be loaded. Your recovery copies are unchanged. Please retry.",{status:503,code:"drafts_unavailable"});}
});
export const PUT = withApiHandler(async request => {
  const owner=await requireUserId();
  if(request?.headers.get("X-MyARI-Owner") && request.headers.get("X-MyARI-Owner")!==owner)return apiError("Your account changed. Reload before accessing drafts.",{status:409,code:"account_changed"});
  const parsed=VoiceDraftSaveSchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("Use a title of 1–120 characters and a script of at most 5,000 characters.",{status:400});
  try{return apiOk({draft:await saveVoiceDraft(owner,parsed.data)});}
  catch(error){return error instanceof VoiceDraftConflict?apiError("This draft changed in another session. Your edits are preserved; reload the cloud version or save a new copy.",{status:409,code:"draft_conflict"}):apiError("Cloud save failed. Keep your recovery copy and retry.",{status:503,code:"drafts_unavailable"});}
});
