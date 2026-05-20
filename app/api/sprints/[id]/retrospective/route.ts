import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/sprints/[id]'>) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const retro = await prisma.retrospective.findUnique({ where: { sprintId: id } })
  return Response.json(retro ?? null)
}

export async function PUT(req: NextRequest, ctx: RouteContext<'/api/sprints/[id]'>) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const { wentWell, improve, actions } = await req.json()

  const retro = await prisma.retrospective.upsert({
    where:  { sprintId: id },
    update: { wentWell: wentWell ?? null, improve: improve ?? null, actions: actions ?? null },
    create: { sprintId: id, wentWell: wentWell ?? null, improve: improve ?? null, actions: actions ?? null },
  })

  return Response.json(retro)
}
