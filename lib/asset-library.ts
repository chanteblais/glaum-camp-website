// Reusable asset library — curated, themeable art that admin features pick from
// (starting with Distinction medals; widen `AssetCategory` as it grows).
//
// SaaS direction (see docs/generalizability-log.md): there are two libraries.
//   • BUILT-IN — art shipped in the repo under public/asset-library/, shared by
//     every community. Defined here in code. No DB, no per-tenant state.
//   • UPLOAD — art a single community uploads for itself. Post–What If this moves
//     to a tenant-scoped DB table (asset_library, with community_id) and is merged
//     into the same picker behind the AssetLibraryItem shape — so consumers never
//     learn where an asset came from.
// Until uploads exist, the built-ins below ARE the whole library.
//
// NOTE: the "Elder Tree" emblem originated as Glåüm-specific branding. Shipping
// it as a built-in is a single-tenant expedient for the dogfood; in multi-tenant
// it should be a tenant UPLOAD, with built-ins reserved for generic/global art.
// Labels are kept generic so the library reads cleanly for any community.

export type AssetKind = 'raster' | 'svg'

// Image groups in the library. A picker shows its primary category first but lets
// the user browse the others. Add categories (badges, schedule icons, …) as
// features adopt the library.
export type AssetCategory = 'distinction' | 'icon'

// Display order + labels for category tabs. NOTE: keep labels generic (no
// community-specific wording) — the built-in library is meant to be global.
export const ASSET_CATEGORIES: { value: AssetCategory; label: string }[] = [
  { value: 'distinction', label: 'Distinctions' },
  { value: 'icon', label: 'Icons' },
]

// Categories ordered with `primary` first, so a picker surfaces the relevant
// type up front while still exposing the rest.
export function orderedCategories(primary: AssetCategory): { value: AssetCategory; label: string }[] {
  return [...ASSET_CATEGORIES].sort((a, b) =>
    a.value === primary ? -1 : b.value === primary ? 1 : 0)
}

export type AssetLibraryItem = {
  id: string
  label: string
  /** Public path (built-in) or storage URL (upload). Goes straight into a rule's `image`. */
  src: string
  kind: AssetKind
  category: AssetCategory
  /** Built-in (shipped in repo) vs uploaded by a community. */
  source: 'builtin' | 'upload'
  /** Optional search/filter tags for the picker. */
  tags?: string[]
}

// The built-in library. Append entries as curated art is added. Keep `label`s
// generic (describe the art, not a specific community/honour).
export const BUILTIN_ASSETS: AssetLibraryItem[] = [
  {
    id: 'elder-tree',
    label: 'Elder Tree',
    src: '/asset-library/distinctions/elder-tree.webp',
    kind: 'raster',
    category: 'distinction',
    source: 'builtin',
    tags: ['tree', 'laurel', 'elder', 'hands', 'nature'],
  },
]

/** Built-in assets usable in a given category. */
export function builtinAssets(category: AssetCategory): AssetLibraryItem[] {
  return BUILTIN_ASSETS.filter(a => a.category === category)
}
