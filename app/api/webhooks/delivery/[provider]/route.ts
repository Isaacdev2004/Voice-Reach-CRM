import { NextResponse } from "next/server";
import { processDeliveryWebhook } from "@/lib/delivery/webhook";
export async function POST(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  try {
    const result = await processDeliveryWebhook(request, provider);
    return NextResponse.json(
      { result: result.result },
      { status: result.status },
    );
  } catch {
    return NextResponse.json(
      { error: "Delivery event processing unavailable" },
      { status: 503 },
    );
  }
}
