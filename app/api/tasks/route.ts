import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { getSession, getDifficultyPoints } from '@/lib/auth'

const TASK_INCLUDE = {
  assignedTo: { select: { id: true, name: true, username: true } },
  sprint:     { select: { id: true, name: true, status: true } },
  labels:     true,
  subTasks: {
    include: { assignedTo: { select: { id: true, name: true, username: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId  = searchParams.get('userId')
  const labelId = searchParams.get('labelId')

  const where: Record<string, unknown> = {}
  if (userId)  where.userId = userId
  if (labelId) where.labels = { some: { id: labelId } }

  const tasks = await prisma.task.findMany({
    where: Object.keys(where).length ? where : undefined,
    include: TASK_INCLUDE,
    orderBy: { createdAt: 'desc' },
  })

  return Response.json(tasks)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { title, description, difficulty, userId, clientName, deadline, sprintId, labelIds } = await req.json()

  if (!title) return Response.json({ error: 'Título é obrigatório' }, { status: 400 })

  const diff = difficulty || 'EASY'
  const task = await prisma.task.create({
    data: {
      title,
      description,
      difficulty: diff,
      points:     getDifficultyPoints(diff),
      userId:     userId     || null,
      clientName: clientName || null,
      deadline:   deadline   ? new Date(deadline) : null,
      sprintId:   sprintId   || null,
      labels:     labelIds?.length ? { connect: labelIds.map((id: string) => ({ id })) } : undefined,
    },
    include: TASK_INCLUDE,
  })

  return Response.json(task, { status: 201 })
}
