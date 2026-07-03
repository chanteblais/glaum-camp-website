import { IconImage } from './IconImage'

export const ICON_TYPES = [
  'tea', 'mirror', 'clipboard', 'people',
  'star', 'dome', 'heart', 'moon', 'sparkle', 'hands',
] as const

export function EventIcon({ type, size = 38 }: { type: string; size?: number }) {
  // Image icon (asset library or upload) — the 1.5x box keeps image icons at
  // the visual weight of the built-in stroke icons below.
  if (type.startsWith('http') || type.startsWith('/')) {
    return <IconImage src={type} size={Math.round(size * 1.5)} fill={0.88} />
  }

  const s = { width: size, height: size }
  const p = {
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 1.3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (type) {
    case 'tea':
      return <svg viewBox="0 0 24 24" style={s} {...p}><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
    case 'mirror':
      return <svg viewBox="0 0 24 24" style={s} {...p}><circle cx="12" cy="9" r="6"/><path d="M12 15v6"/><path d="M8 19h8"/></svg>
    case 'clipboard':
      return <svg viewBox="0 0 24 24" style={s} {...p}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
    case 'people':
      return <svg viewBox="0 0 24 24" style={s} {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    case 'star':
      return <svg viewBox="0 0 24 24" style={s} {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    case 'dome':
      return <svg viewBox="0 0 24 24" style={s} {...p}><path d="M3 11a9 9 0 0 1 18 0"/><line x1="2" y1="11" x2="22" y2="11"/><line x1="12" y1="11" x2="12" y2="4"/><line x1="2" y1="20" x2="22" y2="20"/></svg>
    case 'heart':
      return <svg viewBox="0 0 24 24" style={s} {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    case 'moon':
      return <svg viewBox="0 0 24 24" style={s} {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    case 'sparkle':
      return <svg viewBox="0 0 24 24" style={s} {...p}><path d="M12 3v1m0 16v1M4.22 4.22l.7.7m12.02 12.02.7.7M3 12h1m16 0h1M4.22 19.78l.7-.7M18.36 5.64l.7-.7"/><circle cx="12" cy="12" r="4"/></svg>
    case 'hands':
      return <svg viewBox="0 0 24 24" style={s} {...p}><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34L3 19"/></svg>
    default:
      return <svg viewBox="0 0 24 24" style={s} {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
  }
}
