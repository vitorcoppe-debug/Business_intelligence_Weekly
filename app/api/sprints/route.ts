import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const sprints = await prisma.sprint.findMany({
    orderBy: { startDate: 'desc' },
    include: {
      tasks: {
        select: { id: true, points: true, status: true },
      },
    },
  })

  const result = sprints.map(s => {
    const totalPoints = s.tasks.reduce((sum, t) => sum + t.points, 0)
    const donePoints = s.tasks.filter(t => t.status === 'DONE').reduce((sum, t) => sum + t.points, 0)
    const totalTasks = s.tasks.length
    const doneTasks = s.tasks.filter(t => t.status === 'DONE').length
    return {
      id: s.id,
      name: s.name,
      goal: s.goal,
      startDate: s.startDate,
      endDate: s.endDate,
      status: s.status,
      createdAt: s.createdAt,
      totalPoints,
      donePoints,
      totalTasks,
      doneTasks,
    }
  })

  return Response.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { name, goal, startDate, endDate } = await req.json()
  if (!name || !startDate || !endDate) {
    return Response.json({ error: 'Nome, data de início e data de fim são obrigatórios' }, { status: 400 })
  }

  const sprint = await prisma.sprint.create({
    data: {
      name,
      goal: goal || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: 'PLANNING',
    },
  })

  return Response.json(sprint, { status: 201 })
}
