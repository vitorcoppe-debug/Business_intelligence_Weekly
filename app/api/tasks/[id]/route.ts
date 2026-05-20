import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { getSession, getDifficultyPoints } from '@/lib/auth'

const TASK_INCLUDE = {
  assignedTo: { select: { id: true, name: true, username: true } },
  sprint:     { select: { id: true, name: true, status: true } },
  labels:     true,
  subTasks: {
    include: { assignedTo: { select: { id: true, name: true, username: true } } },
  },
}

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/tasks/[id]'>) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const task = await prisma.task.findUnique({ where: { id }, include: TASK_INCLUDE })

  if (!task) return Response.json({ error: 'Tarefa não encontrada' }, { status: 404 })
  return Response.json(task)
}

export async function PUT(req: NextRequest, ctx: RouteContext<'/api/tasks/[id]'>) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  const body = await req.json()

  const existing = await prisma.task.findUnique({ where: { id } })
  if (!existing) return Response.json({ error: 'Tarefa não encontrada' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.title       !== undefined) data.title       = body.title
  if (body.description !== undefined) data.description = body.description
  if (body.difficulty  !== undefined) {
    data.difficulty = body.difficulty
    data.points     = getDifficultyPoints(body.difficulty)
  }
  if (body.userId     !== undefined) data.userId     = body.userId     || null
  if (body.clientName !== undefined) data.clientName = body.clientName || null
  if (body.deadline   !== undefined) data.deadline   = body.deadline   ? new Date(body.deadline) : null
  if (body.sprintId   !== undefined) data.sprintId   = body.sprintId   || null

  // Labels: replace entire set when labelIds is provided
  if (body.labelIds !== undefined) {
    data.labels = { set: (body.labelIds as string[]).map((lid: string) => ({ id: lid })) }
  }

  if (body.status !== undefined) {
    data.status = body.status
    if (body.status === 'DONE' && existing.status !== 'DONE') {
      data.completedAt = new Date()
      if (existing.userId) {
        await prisma.user.update({
          where: { id: existing.userId },
          data:  { totalPoints: { increment: existing.points } },
        })
      }
    } else if (body.status !== 'DONE' && existing.status === 'DONE') {
      data.completedAt = null
      if (existing.userId) {
        await prisma.user.update({
          where: { id: existing.userId },
          data:  { totalPoints: { decrement: existing.points } },
        })
      }
    }
  }

  const task = await prisma.task.update({ where: { id }, data, include: TASK_INCLUDE })
  return Response.json(task)
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/tasks/[id]'>) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  try {
    await prisma.task.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'Tarefa não encontrada' }, { status: 404 })
  }
}
