/**
 * Transforma URLs do Vercel Blob em URLs do proxy interno.
 * Suporta blobs públicos (*.public.blob.vercel-storage.com)
 * e privados (*.private.blob.vercel-storage.com).
 *
 * URLs locais (blob:, /) são retornadas sem modificação.
 */
export function proxyBlobUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.includes('blob.vercel-storage.com')) {
    return `/api/avatar?url=${encodeURIComponent(url)}`
  }
  return url
}
