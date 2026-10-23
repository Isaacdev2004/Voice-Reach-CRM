import { handleInbound } from "@/lib/communications/webhook";
export const POST = (request: Request) => handleInbound(request, "sms");
