/**
 * src/lib/image.ts — Client-side image compression via canvas.
 *
 * Reads a File (from native camera or file input), draws into a canvas,
 * resizes to fit within maxDim×maxDim preserving aspect ratio, re-encodes
 * as JPEG at the given quality. Handles EXIF orientation.
 *
 * Selfie target: 512×512, q=0.6, ~80KB
 * Photo target:  1024×1024, q=0.7, ~150KB
 */

export interface CompressOptions {
  maxDim: number;
  quality: number;
  /** If output blob is larger than this, retry once at quality - 0.1 */
  targetBytes?: number;
}

export async function compressImage(file: File, opts: CompressOptions): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = fitWithin(bitmap.width, bitmap.height, opts.maxDim);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d context unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);

  let blob = await canvasToBlob(canvas, opts.quality);
  if (opts.targetBytes && blob.size > opts.targetBytes) {
    const retryQ = Math.max(0.4, opts.quality - 0.1);
    const retry = await canvasToBlob(canvas, retryQ);
    if (retry.size < blob.size) blob = retry;
  }
  return blob;
}

function fitWithin(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = Math.min(max / w, max / h);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
      "image/jpeg",
      quality
    );
  });
}

export const SELFIE_OPTS: CompressOptions = { maxDim: 512, quality: 0.6, targetBytes: 80 * 1024 };
export const PHOTO_OPTS: CompressOptions = { maxDim: 1024, quality: 0.7, targetBytes: 150 * 1024 };
