import { NextRequest } from 'next/server'
import { put } from '@vercel/blob'
import { getSession } from '@/lib/auth'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file)
    return Response.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type))
    return Response.json({ error: 'Formato inválido. Use JPEG, PNG, WEBP ou GIF.' }, { status: 400 })
  if (file.size > MAX_SIZE)
    return Response.json({ error: 'Arquivo muito grande (máx. 5 MB).' }, { status: 400 })

  const ext      = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filename = `avatars/avatar-${session.userId}-${Date.now()}.${ext}`

  const blob = await put(filename, file, {
    access: 'public',
    contentType: file.type,
  })

  return Response.json({ url: blob.url })
}
