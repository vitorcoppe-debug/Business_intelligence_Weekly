/**
 * Transforma URLs do Vercel Blob em URLs do proxy interno.
 * Necessário quando o Blob Store está configurado como privado.
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
