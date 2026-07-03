// Rewrites a public Supabase Storage URL to the on-the-fly image-transform
// endpoint (render/image) so avatars ship at display size (~50KB) instead of
// the full upload (often 1-2MB). Any existing query string (the `?v=` mtime
// cache-buster from uploads) must be split off the object path and re-appended
// as extra params — leaving it inline used to swallow the width/quality params
// into the `v` value, silently serving the full-size image.
export function supabaseResizedUrl(url: string | null, width: number): string | null {
  if (!url) return null
  const match = url.match(/\/storage\/v1\/object\/public\/([^?]+)(?:\?(.*))?$/)
  if (!match) return url
  const base = url.split('/storage/v1/object/public/')[0]
  const existingQuery = match[2] ? `&${match[2]}` : ''
  return `${base}/storage/v1/render/image/public/${match[1]}?width=${width}&quality=80&resize=cover${existingQuery}`
}
