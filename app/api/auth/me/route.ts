import { getSession } from '@/lib/auth'
import prisma from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ user: null }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, username: true, role: true, totalPoints: true, avatarUrl: true },
  })

  return Response.json({ user })
}
