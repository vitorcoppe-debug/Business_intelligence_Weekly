import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/members/[id]'>) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, username: true, role: true, totalPoints: true, avatarUrl: true },
  })

  if (!user) return Response.json({ error: 'Membro não encontrado' }, { status: 404 })
  return Response.json(user)
}

export async function PUT(req: NextRequest, ctx: RouteContext<'/api/members/[id]'>) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const { name, username, password, role, avatarUrl } = await req.json()

  const data: Record<string, unknown> = {}
  if (name) data.name = name
  if (username) data.username = username
  if (password) data.password = await bcrypt.hash(password, 10)
  if (role) data.role = role
  if (avatarUrl !== undefined) data.avatarUrl = avatarUrl || null

  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, username: true, role: true, totalPoints: true, avatarUrl: true },
    })
    return Response.json(user)
  } catch {
    return Response.json({ error: 'Membro não encontrado' }, { status: 404 })
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/members/[id]'>) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params

  try {
    await prisma.user.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'Membro não encontrado' }, { status: 404 })
  }
}
