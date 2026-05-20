import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { getSession, getDifficultyPoints } from '@/lib/auth'

export async function POST(req: NextRequest, ctx: RouteContext<'/api/tasks/[id]/subtasks'>) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id: taskId } = await ctx.params
  const { title, description, difficulty, userId } = await req.json()

  if (!title) return Response.json({ error: 'Título é obrigatório' }, { status: 400 })

  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) return Response.json({ error: 'Tarefa não encontrada' }, { status: 404 })

  const diff = difficulty || 'EASY'
  const subTask = await prisma.subTask.create({
    data: {
      title,
      description,
      difficulty: diff,
      points: getDifficultyPoints(diff),
      taskId,
      userId: userId || null,
    },
    include: { assignedTo: { select: { id: true, name: true, username: true } } },
  })

  return Response.json(subTask, { status: 201 })
}
