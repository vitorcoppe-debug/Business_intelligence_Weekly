import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const filter = searchParams.get('filter') || 'month'

  const now = new Date()
  let startDate: Date

  if (filter === 'quarter') {
    const quarter = Math.floor(now.getMonth() / 3)
    startDate = new Date(now.getFullYear(), quarter * 3, 1)
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, username: true, totalPoints: true, avatarUrl: true },
    orderBy: { name: 'asc' },
  })

  const taskPoints = await prisma.task.groupBy({
    by: ['userId'],
    where: {
      status: 'DONE',
      completedAt: { gte: startDate },
      userId: { not: null },
    },
    _sum: { points: true },
  })

  const subTaskPoints = await prisma.subTask.groupBy({
    by: ['userId'],
    where: {
      status: 'DONE',
      completedAt: { gte: startDate },
      userId: { not: null },
    },
    _sum: { points: true },
  })

  const pointsMap: Record<string, number> = {}
  for (const t of taskPoints) {
    if (t.userId) pointsMap[t.userId] = (pointsMap[t.userId] || 0) + (t._sum.points || 0)
  }
  for (const s of subTaskPoints) {
    if (s.userId) pointsMap[s.userId] = (pointsMap[s.userId] || 0) + (s._sum.points || 0)
  }

  const ranking = users
    .map((u) => ({ ...u, periodPoints: pointsMap[u.id] || 0 }))
    .sort((a, b) => b.periodPoints - a.periodPoints)

  return Response.json({ ranking, filter, startDate })
}
