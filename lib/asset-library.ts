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
// NOTE: the Glåüm Elder emblem is community-specific branding. Shipping it as a
// built-in is a single-tenant expedient for the dogfood; in multi-tenant it should
// be a Glåüm-tenant UPLOAD, with built-ins reserved for generic/global art.

export type AssetKind = 'raster' | 'svg'

// Where an asset can be used. One category for now; add more (group icons,
// schedule icons, …) as features adopt the library.
export type AssetCategory = 'distinction'

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

// The built-in library. Append entries as curated art is added.
export const BUILTIN_ASSETS: AssetLibraryItem[] = [
  {
    id: 'glaum-elder',
    label: 'Glåüm Elder',
    src: '/asset-library/distinctions/glaum-elder.webp',
    kind: 'raster',
    category: 'distinction',
    source: 'builtin',
    tags: ['tree', 'laurel', 'elder', 'nature'],
  },
]

/** Built-in assets usable in a given category. */
export function builtinAssets(category: AssetCategory): AssetLibraryItem[] {
  return BUILTIN_ASSETS.filter(a => a.category === category)
}
