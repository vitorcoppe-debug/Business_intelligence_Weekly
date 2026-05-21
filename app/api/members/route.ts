import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const members = await prisma.user.findMany({
    select: { id: true, name: true, username: true, role: true, totalPoints: true, avatarUrl: true, createdAt: true },
    orderBy: { totalPoints: 'desc' },
  })

  return Response.json(members)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })
  if (session.role !== 'admin') return Response.json({ error: 'Acesso restrito a administradores' }, { status: 403 })

  const { name, username, password, role, avatarUrl } = await req.json()

  if (!name || !username || !password) {
    return Response.json({ error: 'Nome, username e senha são obrigatórios' }, { status: 400 })
  }

  const exists = await prisma.user.findUnique({ where: { username } })
  if (exists) {
    return Response.json({ error: 'Username já em uso' }, { status: 409 })
  }

  const hashed = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, username, password: hashed, role: role || 'member', avatarUrl: avatarUrl || null },
    select: { id: true, name: true, username: true, role: true, totalPoints: true, avatarUrl: true },
  })

  return Response.json(user, { status: 201 })
}
