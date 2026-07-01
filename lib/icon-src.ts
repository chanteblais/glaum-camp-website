// True when an icon/badge string is an image reference (a built-in library path
// like `/asset-library/...` or an uploaded storage URL like `https://…`) rather
// than an emoji/short-text glyph. Used everywhere department/group/distinction
// icons render, so uploads and library art both display as <img>.
export function isImageIcon(icon?: string | null): icon is string {
  return !!icon && (icon.startsWith('/') || icon.startsWith('http'))
}
