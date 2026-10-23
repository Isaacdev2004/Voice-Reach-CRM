import { z } from "zod";
import { apiError, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hasAudioSignature } from "@/lib/voice-studio/verification";
import { POST as transcribeAudio } from "@/app/api/notes/transcribe/route";
export const POST=withApiHandler(async request=>{
  const owner=await requireUserId();
  const parsed=z.object({voiceAssetId:z.string().uuid(),consent:z.literal(true)}).strict().safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return apiError("Select a recording and confirm authorization before transcription.",{status:400});
  try{
    const found=await supabaseAdmin.from("voice_assets").select("id,storage_path").eq("owner_id",owner).eq("id",parsed.data.voiceAssetId).maybeSingle();
    if(found.error)return apiError("Recording could not be checked. Please retry.",{status:503});
    if(!found.data)return apiError("Recording not found.",{status:404});
    if(!found.data.storage_path?.startsWith(`${owner}/`))return apiError("Recording ownership could not be verified.",{status:400});
    if(!process.env.OPENAI_API_KEY?.trim())return apiError("Transcription is not configured. You can enter an agent-reviewed transcript manually.",{status:503});
    const result=await supabaseAdmin.storage.from(process.env.SUPABASE_STORAGE_BUCKET||"voice-assets").download(found.data.storage_path);
    if(result.error || !result.data || result.data.size>20*1024*1024 || !result.data.size)return apiError("Choose an available recording under 20 MB.",{status:400});
    if(!hasAudioSignature(new Uint8Array(await result.data.arrayBuffer()),found.data.storage_path))return apiError("The recording format could not be verified.",{status:400});
    const mime:Record<string,string>={mp3:"audio/mpeg",wav:"audio/wav",webm:"audio/webm",m4a:"audio/mp4",ogg:"audio/ogg"};
    const extension=found.data.storage_path.split(".").at(-1)?.toLowerCase() ?? "";
    const audio=new Blob([await result.data.arrayBuffer()],{type:mime[extension]||result.data.type});
    const form=new FormData();form.set("consent","confirmed");form.set("audio",audio,found.data.storage_path.split("/").at(-1));
    return await transcribeAudio(new Request("http://localhost/api/notes/transcribe",{method:"POST",body:form}),undefined);
  }catch{return apiError("Transcription could not complete. Your script and recording are unchanged.",{status:503});}
});
