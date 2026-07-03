// Rewrites a public Supabase Storage URL to the on-the-fly image-transform
// endpoint (render/image) so avatars ship at display size (~5-15KB) instead of
// the full upload (often 1-2MB).
//
// Two hard-won gotchas live here:
// · Any existing query string (the `?v=` mtime cache-buster from uploads) must
//   be split off the object path and re-appended as extra params — leaving it
//   inline swallows the width/quality params into the `v` value and silently
//   serves the full-size original.
// · `resize=cover` needs BOTH dimensions: with height omitted, Supabase fills
//   a width×(original height) box — i.e. a full-height sliver cropped out of
//   the middle of the photo, not a thumbnail. Every call site is a circle (or
//   square) with CSS object-fit: cover, so height defaults to width.
export function supabaseResizedUrl(url: string | null, width: number, height: number = width): string | null {
  if (!url) return null
  const match = url.match(/\/storage\/v1\/object\/public\/([^?]+)(?:\?(.*))?$/)
  if (!match) return url
  const base = url.split('/storage/v1/object/public/')[0]
  const existingQuery = match[2] ? `&${match[2]}` : ''
  return `${base}/storage/v1/render/image/public/${match[1]}?width=${width}&height=${height}&quality=80&resize=cover${existingQuery}`
}
