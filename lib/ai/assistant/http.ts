import { apiSuccess } from "@/lib/api-response";
export function privateSuccess<T>(data: T) {
  const response = apiSuccess(data);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
