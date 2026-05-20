import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const labels = await prisma.label.findMany({ orderBy: { createdAt: 'asc' } })
  return Response.json(labels)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { name, color } = await req.json()
  if (!name?.trim()) return Response.json({ error: 'Nome é obrigatório' }, { status: 400 })

  const label = await prisma.label.create({
    data: { name: name.trim(), color: color || '#6366f1' },
  })
  return Response.json(label, { status: 201 })
}
