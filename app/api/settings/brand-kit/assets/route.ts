import sharp from "sharp";
import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { imageFileValid } from "@/lib/settings/brand-kit";
export const POST = withApiHandler(async (request) => {
  const owner = await requireUserId();
  if (Number(request.headers.get("content-length")) > 4.4 * 1024 * 1024)
    return apiError("Image must be smaller than 4 MB.", { status: 400 });
  const form = await request.formData(),
    file = form.get("file");
  if (!(file instanceof File) || file.size > 4 * 1024 * 1024)
    return apiError("Choose a JPG, PNG or WebP image smaller than 4 MB.", {
      status: 400,
    });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!imageFileValid(file.type, bytes))
    return apiError(
      "Image content could not be verified. Choose a valid JPG, PNG or WebP file.",
      { status: 400 },
    );
  try {
    const metadata = await sharp(bytes, {
      limitInputPixels: 40000000,
    }).metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width > 12000 ||
      metadata.height > 12000
    )
      throw Error();
  } catch {
    return apiError(
      "Image dimensions or encoding could not be verified. Choose a standard JPG, PNG or WebP image.",
      { status: 400 },
    );
  }
  const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg",
    path = `${owner}/branding/${crypto.randomUUID()}.${ext}`;
  const bucket = process.env.BRAND_STORAGE_BUCKET || "brand-assets";
  const uploaded = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploaded.error)
    return apiError(
      "Image upload failed. Your current branding is unchanged.",
      { status: 503 },
    );
  const signed = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, 3600);
  if (signed.error)
    return apiError("Image preview could not be loaded. Please retry.", {
      status: 503,
    });
  return apiOk({ path, url: signed.data.signedUrl });
});
