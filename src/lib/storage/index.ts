import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Single image upload limit per PRD §3.1.
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const UPLOAD_PUBLIC_PREFIX = "/uploads";
const UPLOAD_FS_ROOT = path.join(process.cwd(), "public", "uploads");

function extensionFor(file: File): string {
  const fromName = path.extname(file.name).toLowerCase();
  if (fromName) return fromName;
  switch (file.type) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    default:
      return ".bin";
  }
}

export class StorageError extends Error {}

/**
 * Persist an uploaded image and return a web-relative URL.
 *
 * Local FS implementation today; swap for Supabase Storage / S3 later by
 * keeping the same contract: `(file, ownerId) → public URL string`.
 */
export async function saveImage(file: File, ownerId: string): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new StorageError(`지원하지 않는 이미지 형식입니다: ${file.type}`);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new StorageError("이미지는 10MB 이하만 업로드할 수 있습니다.");
  }

  const dir = path.join(UPLOAD_FS_ROOT, ownerId);
  await mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}${extensionFor(file)}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buf);

  return `${UPLOAD_PUBLIC_PREFIX}/${ownerId}/${filename}`;
}

/**
 * Best-effort image deletion. No-op for URLs that aren't ours (e.g. legacy
 * Supabase URLs or external links from a future feature).
 */
export async function deleteImage(url: string): Promise<void> {
  if (!url.startsWith(`${UPLOAD_PUBLIC_PREFIX}/`)) return;
  const rel = url.slice(UPLOAD_PUBLIC_PREFIX.length + 1); // strip "/uploads/"
  const target = path.join(UPLOAD_FS_ROOT, rel);
  // Defence-in-depth: refuse paths that climb out of the upload root.
  if (!target.startsWith(UPLOAD_FS_ROOT + path.sep)) return;
  try {
    await unlink(target);
  } catch {
    // Already gone — fine.
  }
}
