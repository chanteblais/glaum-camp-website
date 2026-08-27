// Magic-byte checks for user uploads (2026-08-27 security review follow-up):
// the declared Content-Type is client-controlled, so an allowlist alone still
// admits, say, an HTML file labelled application/pdf. This verifies the bytes
// actually look like the declared type before we store them. It is NOT malware
// scanning (that needs an external AV service) — it closes the type-spoofing
// hole and keeps stored files boring.
//
// Image uploads that pass through sharp (avatars, icons) don't need this —
// decoding IS the validation there.

const startsWith = (buf: Buffer, bytes: number[], offset = 0) =>
  buf.length >= offset + bytes.length && bytes.every((b, i) => buf[offset + i] === b)

const ascii = (s: string) => Array.from(s, c => c.charCodeAt(0))

/** True when `buf` plausibly matches the declared MIME type. Unknown types fail closed. */
export function bytesMatchType(declared: string, buf: Buffer): boolean {
  switch (declared) {
    case 'image/jpeg':
      return startsWith(buf, [0xff, 0xd8, 0xff])
    case 'image/png':
      return startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case 'image/gif':
      return startsWith(buf, ascii('GIF87a')) || startsWith(buf, ascii('GIF89a'))
    case 'image/webp':
      return startsWith(buf, ascii('RIFF')) && startsWith(buf, ascii('WEBP'), 8)
    case 'image/heic':
      // ISO-BMFF: box size (4 bytes) then 'ftyp'; brand varies (heic/heix/mif1…).
      return startsWith(buf, ascii('ftyp'), 4)
    case 'application/pdf':
      return startsWith(buf, ascii('%PDF-'))
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      // .docx is a zip container.
      return startsWith(buf, [0x50, 0x4b, 0x03, 0x04])
    case 'application/msword':
      // Legacy .doc: OLE compound file.
      return startsWith(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    case 'text/plain':
      // No binary signature — reject anything with NUL bytes in the first 8KB
      // (catches executables and other binary payloads relabelled as text).
      return !buf.subarray(0, 8192).includes(0)
    default:
      return false
  }
}
