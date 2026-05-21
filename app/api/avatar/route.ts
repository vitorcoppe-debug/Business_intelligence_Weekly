import { NextRequest } from 'next/server'
import { get } from '@vercel/blob'
import { getSession } from '@/lib/auth'

/**
 * GET /api/avatar?url=<encoded-blob-url>
 *
 * Proxy server-side para blobs do Vercel Blob (público ou privado).
 * Usa o SDK oficial para autenticar com BLOB_READ_WRITE_TOKEN.
 */
export async function GET(req: NextRequest) {
  // Exige sessão válida
  const session = await getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const url = req.nextUrl.searchParams.get('url')
  if (!url || !url.includes('blob.vercel-storage.com')) {
    return new Response('Invalid URL', { status: 400 })
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) return new Response('BLOB_READ_WRITE_TOKEN not configured', { status: 500 })

  try {
    // Detecta se é blob privado ou público a partir do hostname
    const access: 'private' | 'public' = url.includes('.private.blob.vercel-storage.com')
      ? 'private'
      : 'public'

    const result = await get(url, { access, token })

    if (!result) return new Response('Blob not found', { status: 404 })

    // result.stream pode ser null em respostas 304
    if (!result.stream) return new Response('No content', { status: 204 })

    return new Response(result.stream as unknown as ReadableStream, {
      headers: {
        'Content-Type': result.blob.contentType || 'image/jpeg',
        // Cache de 1 hora no browser
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err) {
    console.error('[avatar proxy]', err)
    return new Response('Failed to fetch blob', { status: 502 })
  }
}
