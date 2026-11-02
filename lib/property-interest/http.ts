import { NextResponse } from "next/server";
export function response(data: unknown, status = 200) {
  return NextResponse.json(data, {status, headers: {"Cache-Control":"no-store", "Referrer-Policy":"no-referrer", "X-Robots-Tag":"noindex, nofollow"}});
}
export async function body(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("Invalid request");
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new Error("Invalid request");
  const s = await request.text();
  if (s.length > 4096) throw new Error("Invalid request");
  return JSON.parse(s);
}
