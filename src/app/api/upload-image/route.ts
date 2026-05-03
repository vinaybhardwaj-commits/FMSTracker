/**
 * src/app/api/upload-image/route.ts — POST a single image to Vercel Blob.
 *
 * Accepts multipart/form-data with field "file". Returns { url, pathname }.
 * Used by S01 onboarding (baseline selfie) and Phase 3 completion flows.
 *
 * Public access for now — facility photos + crew selfies are not PHI;
 * NABH evidence chain works fine with public URLs.
 */

import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB hard cap (compressed images should be well under this)
const ALLOWED_PREFIX = ["selfie/", "photo/", "vendor/"] as const;

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  const prefix = String(form.get("prefix") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "bad_file_size" }, { status: 400 });
  }
  if (!ALLOWED_PREFIX.some((p) => prefix === p.replace("/", ""))) {
    return NextResponse.json({ error: "invalid_prefix" }, { status: 400 });
  }

  const ext = (file.type.split("/")[1] || "jpg").replace(/[^a-z]/g, "");
  const key = `${prefix}/${crypto.randomUUID()}.${ext}`;

  try {
    const blob = await put(key, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type || "image/jpeg",
    });
    return NextResponse.json({ url: blob.url, pathname: blob.pathname });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
