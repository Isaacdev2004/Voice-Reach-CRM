import { apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
export const GET=withApiHandler(async()=>{await requireUserId();return apiOk({writingConfigured:Boolean(process.env.ANTHROPIC_API_KEY?.trim()),transcriptionConfigured:Boolean(process.env.OPENAI_API_KEY?.trim())});});
