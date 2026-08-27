import { unstable_cache } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase'

// Cached reads of the `page_content` config table (form configs, homepage
// copy, feature toggles). The table is tiny, admin-edited, and read on nearly
// every server render and API call — so reads are cached in Next's data cache
// and invalidated by tag from the ONE writer, the upsert in
// app/api/admin/page-content/route.ts (which calls revalidateTag on save).
// Anything else that starts writing page_content must revalidate this tag too.
export const PAGE_CONTENT_TAG = 'page-content'

const fetchPageContent = unstable_cache(
  async (keys: string[]): Promise<Record<string, string>> => {
    const { data, error } = await supabaseAdmin
      .from('page_content')
      .select('key, value')
      .in('key', keys)
    if (error) {
      // Don't cache failures as empty config — surface them.
      throw new Error(`[page-content] read failed: ${error.message}`)
    }
    const map: Record<string, string> = {}
    for (const row of data ?? []) map[row.key] = row.value
    return map
  },
  ['page-content'],
  { tags: [PAGE_CONTENT_TAG] },
)

/** Cached `page_content` lookup: returns { key → value } for the keys that exist. */
export function getPageContent(keys: readonly string[]): Promise<Record<string, string>> {
  // Sorted so ['a','b'] and ['b','a'] share one cache entry.
  return fetchPageContent([...keys].sort())
}

/** Cached single-key convenience: the value or null. */
export async function getPageContentValue(key: string): Promise<string | null> {
  const map = await getPageContent([key])
  return map[key] ?? null
}

// Whole-table read for pages that render many copy keys (homepage, about).
const fetchAllPageContent = unstable_cache(
  async (): Promise<Record<string, string>> => {
    const { data, error } = await supabaseAdmin.from('page_content').select('key, value')
    if (error) throw new Error(`[page-content] read failed: ${error.message}`)
    const map: Record<string, string> = {}
    for (const row of data ?? []) map[row.key] = row.value
    return map
  },
  ['page-content-all'],
  { tags: [PAGE_CONTENT_TAG] },
)

export function getAllPageContent(): Promise<Record<string, string>> {
  return fetchAllPageContent()
}
