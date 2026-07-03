// Stable URL anchors for the Registry of Roles (/roles#<slug>). Derived from
// names rather than stored — renaming a role moves its anchor, which is fine
// for fragment links (worst case the page opens at the top).
export function roleSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics (Glåüm → glaum)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
