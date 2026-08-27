// Application file-upload attachments live in the private `application-files`
// storage bucket (public until migration 072), namespaced `<clerkUserId>/<ts>-<name>`.
// Answers store an href, not a storage URL: access goes through
// GET /api/apply/file?path=…, which checks owner-or-admin and redirects to a
// short-lived signed URL. Applications submitted before 072 still hold the
// bucket's original public URL — applicationFilePath() understands both forms,
// so render sites can rewrite legacy values to the authorized route.
// Dependency-free: shared by server components, API routes, and the client wizard.

export const APPLICATION_FILES_BUCKET = 'application-files'
export const APPLICATION_FILE_ROUTE = '/api/apply/file'

/** Storage path inside the bucket, from either stored form (route href or legacy public URL); null if the value isn't an application file. */
export function applicationFilePath(value: string): string | null {
  if (value.startsWith(`${APPLICATION_FILE_ROUTE}?`)) {
    return new URLSearchParams(value.slice(value.indexOf('?') + 1)).get('path')
  }
  const marker = `/${APPLICATION_FILES_BUCKET}/`
  const i = value.indexOf(marker)
  if (/^https?:\/\//.test(value) && i !== -1) {
    try {
      return decodeURIComponent(value.slice(i + marker.length).split('?')[0]) || null
    } catch {
      return null
    }
  }
  return null
}

/** The href to render for a stored file answer — always the authorized route. */
export function applicationFileHref(value: string): string {
  const path = applicationFilePath(value)
  return path ? `${APPLICATION_FILE_ROUTE}?path=${encodeURIComponent(path)}` : value
}

/** Human-readable file name (strips the user-id folder + upload timestamp). */
export function applicationFileName(value: string, fallback = 'Uploaded file'): string {
  const path = applicationFilePath(value) ?? value.split('?')[0]
  const seg = path.split('/').pop() ?? ''
  try {
    return decodeURIComponent(seg).replace(/^\d{10,}-/, '') || fallback
  } catch {
    return fallback
  }
}
