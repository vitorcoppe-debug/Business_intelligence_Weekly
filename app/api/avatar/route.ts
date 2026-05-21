import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'

/**
 * GET /api/avatar?url=<encoded-blob-url>
 *
 * Proxy server-side para blobs privados do Vercel Blob.
 * Autentica a requisição com BLOB_READ_WRITE_TOKEN e retorna o conteúdo da imagem.
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
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) return new Response('Blob not found', { status: 404 })

    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const buffer = await res.arrayBuffer()

    return new Response(buffer, {
      headers: {
        'Content-Type': contentType,
        // Cache de 1 hora no browser; não compartilhado (avatar é por-usuário)
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return new Response('Failed to fetch blob', { status: 502 })
  }
}
