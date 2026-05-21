import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return Response.json({ results: [] })

  const tasks = await prisma.task.findMany({
    where: {
      OR: [
        { title:       { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { clientName:  { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id:          true,
      title:       true,
      status:      true,
      difficulty:  true,
      clientName:  true,
      deadline:    true,
      assignedTo:  { select: { id: true, name: true, avatarUrl: true } },
      sprint:      { select: { id: true, name: true } },
    },
    take: 8,
    orderBy: { updatedAt: 'desc' },
  })

  return Response.json({ results: tasks })
}
