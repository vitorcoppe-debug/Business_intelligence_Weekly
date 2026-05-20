import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'
import { setSessionCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  if (!username || !password) {
    return Response.json({ error: 'Username e senha são obrigatórios' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    return Response.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return Response.json({ error: 'Credenciais inválidas' }, { status: 401 })
  }

  await setSessionCookie({ userId: user.id, username: user.username, role: user.role })

  return Response.json({
    user: { id: user.id, name: user.name, username: user.username, role: user.role },
  })
}
