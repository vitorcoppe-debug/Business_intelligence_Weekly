import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'
import { getSession, setSessionCookie } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, username: true, role: true, totalPoints: true, avatarUrl: true },
  })

  if (!user) return Response.json({ error: 'Usuário não encontrado' }, { status: 404 })
  return Response.json(user)
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { name, avatarUrl, currentPassword, newPassword } = await req.json()

  const data: Record<string, unknown> = {}

  if (name?.trim()) data.name = name.trim()
  if (avatarUrl !== undefined) data.avatarUrl = avatarUrl || null

  // ── Troca de senha ──────────────────────────────────────────────
  if (newPassword) {
    if (!currentPassword)
      return Response.json({ error: 'Informe a senha atual' }, { status: 400 })

    const existing = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!existing)
      return Response.json({ error: 'Usuário não encontrado' }, { status: 404 })

    const valid = await bcrypt.compare(currentPassword, existing.password)
    if (!valid)
      return Response.json({ error: 'Senha atual incorreta' }, { status: 400 })

    if (newPassword.length < 4)
      return Response.json({ error: 'Nova senha muito curta (mín. 4 caracteres)' }, { status: 400 })

    data.password = await bcrypt.hash(newPassword, 10)
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.userId },
      data,
      select: { id: true, name: true, username: true, role: true, totalPoints: true, avatarUrl: true },
    })

    // Atualiza cookie de sessão para refletir mudanças
    await setSessionCookie({ userId: user.id, username: user.username, role: user.role })

    return Response.json(user)
  } catch {
    return Response.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
  }
}
