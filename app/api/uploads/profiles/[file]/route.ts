import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const PROFILES_DIR = path.join(process.cwd(), "public", "uploads", "profiles");

function contentTypeFor(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

/** Matches filenames created in uploadProfilePicture: user_<id>_<time>.<ext> */
function isSafeProfileFilename(name: string): boolean {
  return /^user_\d+_\d+\.[a-zA-Z0-9]+$/.test(name);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  let raw = (await params).file;
  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* use raw */
  }
  const base = path.basename(raw);
  if (!isSafeProfileFilename(base)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const resolvedDir = path.resolve(PROFILES_DIR);
  const filePath = path.resolve(path.join(PROFILES_DIR, base));
  if (!filePath.startsWith(resolvedDir + path.sep)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const buf = await readFile(filePath);
    const ext = path.extname(base);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": contentTypeFor(ext),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
