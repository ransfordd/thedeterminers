/**
 * Map DB-stored profile paths to URLs that work in production (Next standalone + Docker),
 * where static files under public/ are not always served for runtime uploads.
 *
 * New uploads store `/api/uploads/profiles/...` directly. Legacy rows use `/uploads/profiles/...`.
 */
export function publicProfileImageUrl(stored: string | null | undefined): string | null {
  if (stored == null || String(stored).trim() === "") return null;
  const s = String(stored).trim();
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/api/uploads/profiles/")) return s;
  const legacy = "/uploads/profiles/";
  if (s.startsWith(legacy)) {
    const file = s.slice(legacy.length).replace(/^\/+/, "");
    if (!file || file.includes("..") || file.includes("/")) return null;
    return `/api/uploads/profiles/${encodeURIComponent(file)}`;
  }
  return s;
}
