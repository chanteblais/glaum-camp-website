import { stat } from 'fs/promises'
import path from 'path'

// Absolute path to the badge base art. Single source of truth shared by the
// badge render route and the pages that embed badge URLs.
export const BADGE_BASE_PATH = path.join(process.cwd(), 'public/badge_base.png')

// mtime (ms, floored) of badge_base.png. Used both to invalidate the badge
// route's in-memory caches and to derive a URL version token. A single cheap
// stat — no hashing. Returns 0 if the file is missing.
export async function getBadgeBaseMtime(): Promise<number> {
  try {
    const { mtimeMs } = await stat(BADGE_BASE_PATH)
    return Math.floor(mtimeMs)
  } catch {
    return 0
  }
}

// Short, URL-safe version token that changes whenever badge_base.png is
// replaced. Append to /api/badge URLs so browser/CDN caches bust automatically
// when the base art changes.
export async function getBadgeVersion(): Promise<string> {
  return (await getBadgeBaseMtime()).toString(36)
}
