import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/sprints/[id]'>) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const sprint = await prisma.sprint.findUnique({
    where: { id },
    include: {
      tasks: {
        select: {
          id: true, title: true, points: true, status: true,
          difficulty: true, clientName: true, deadline: true,
          assignedTo: { select: { id: true, name: true, username: true } },
        },
      },
    },
  })

  if (!sprint) return Response.json({ error: 'Sprint não encontrado' }, { status: 404 })
  return Response.json(sprint)
}

export async function PUT(req: NextRequest, ctx: RouteContext<'/api/sprints/[id]'>) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const { name, goal, startDate, endDate, status } = await req.json()

  // Ao ativar um sprint, desativa qualquer outro que esteja ACTIVE
  if (status === 'ACTIVE') {
    await prisma.sprint.updateMany({
      where: { status: 'ACTIVE', id: { not: id } },
      data: { status: 'PLANNING' },
    })
  }

  try {
    const data: Record<string, unknown> = {}
    if (name) data.name = name
    if (goal !== undefined) data.goal = goal || null
    if (startDate) data.startDate = new Date(startDate)
    if (endDate) data.endDate = new Date(endDate)
    if (status) data.status = status

    const sprint = await prisma.sprint.update({ where: { id }, data })
    return Response.json(sprint)
  } catch {
    return Response.json({ error: 'Sprint não encontrado' }, { status: 404 })
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/sprints/[id]'>) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params

  // Desvincula tasks antes de excluir
  await prisma.task.updateMany({ where: { sprintId: id }, data: { sprintId: null } })

  try {
    await prisma.sprint.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'Sprint não encontrado' }, { status: 404 })
  }
}
