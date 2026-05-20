import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { getSession, getDifficultyPoints } from '@/lib/auth'

export async function PUT(
  req: NextRequest,
  ctx: RouteContext<'/api/tasks/[id]/subtasks/[subtaskId]'>
) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { subtaskId } = await ctx.params
  const body = await req.json()

  const existing = await prisma.subTask.findUnique({ where: { id: subtaskId } })
  if (!existing) return Response.json({ error: 'Sub-tarefa não encontrada' }, { status: 404 })

  const data: Record<string, unknown> = {}
  if (body.title !== undefined) data.title = body.title
  if (body.description !== undefined) data.description = body.description
  if (body.difficulty !== undefined) {
    data.difficulty = body.difficulty
    data.points = getDifficultyPoints(body.difficulty)
  }
  if (body.userId !== undefined) data.userId = body.userId || null
  if (body.status !== undefined) {
    data.status = body.status
    if (body.status === 'DONE' && existing.status !== 'DONE') {
      data.completedAt = new Date()
      if (existing.userId) {
        await prisma.user.update({
          where: { id: existing.userId },
          data: { totalPoints: { increment: existing.points } },
        })
      }
    } else if (body.status !== 'DONE' && existing.status === 'DONE') {
      data.completedAt = null
      if (existing.userId) {
        await prisma.user.update({
          where: { id: existing.userId },
          data: { totalPoints: { decrement: existing.points } },
        })
      }
    }
  }

  const subTask = await prisma.subTask.update({
    where: { id: subtaskId },
    data,
    include: { assignedTo: { select: { id: true, name: true, username: true } } },
  })

  return Response.json(subTask)
}

export async function DELETE(
  _req: NextRequest,
  ctx: RouteContext<'/api/tasks/[id]/subtasks/[subtaskId]'>
) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { subtaskId } = await ctx.params

  try {
    await prisma.subTask.delete({ where: { id: subtaskId } })
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'Sub-tarefa não encontrada' }, { status: 404 })
  }
}
