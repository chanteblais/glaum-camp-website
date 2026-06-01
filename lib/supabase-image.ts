export function supabaseResizedUrl(url: string | null, width: number): string | null {
  if (!url) return null
  const match = url.match(/\/storage\/v1\/object\/public\/(.+)/)
  if (!match) return url
  const base = url.split('/storage/v1/object/public/')[0]
  return `${base}/storage/v1/render/image/public/${match[1]}?width=${width}&quality=80&resize=cover`
}
