import { handleInbound } from "@/lib/communications/webhook";
/** Configure as a call status callback; do not replace existing forwarding TwiML. */
export const POST = (request: Request) => handleInbound(request, "call");
