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
        select: { points: true, completedAt: true, status: true },
      },
    },
  })

  if (!sprint) return Response.json({ error: 'Sprint não encontrado' }, { status: 404 })

  const totalPoints = sprint.tasks.reduce((sum, t) => sum + t.points, 0)
  const start   = new Date(sprint.startDate)
  const end     = new Date(sprint.endDate)
  const today   = new Date()
  const chartEnd = today < end ? today : end

  // Gera ponto por dia desde o início até hoje (ou fim do sprint)
  const totalDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / 86400000),
  )

  const days: {
    date: string
    remaining: number
    ideal: number
    isToday: boolean
    isFuture: boolean
  }[] = []

  // Itera do dia 0 até o fim do sprint
  for (let i = 0; i <= totalDays; i++) {
    const day = new Date(start.getTime() + i * 86400000)
    const dayEnd = new Date(day)
    dayEnd.setHours(23, 59, 59, 999)

    const isFuture = day > chartEnd
    const isToday  = day.toDateString() === today.toDateString()

    // Pontos concluídos até o fim deste dia
    const completedPoints = isFuture
      ? null
      : sprint.tasks
          .filter(t => t.completedAt && new Date(t.completedAt) <= dayEnd)
          .reduce((sum, t) => sum + t.points, 0)

    const ideal = Math.round(totalPoints * (1 - i / totalDays))

    days.push({
      date:      day.toISOString().slice(0, 10),
      remaining: completedPoints !== null ? totalPoints - completedPoints : -1,
      ideal:     Math.max(0, ideal),
      isToday,
      isFuture,
    })
  }

  return Response.json({
    sprint: {
      id:          sprint.id,
      name:        sprint.name,
      startDate:   sprint.startDate,
      endDate:     sprint.endDate,
      totalPoints,
    },
    days,
  })
}
