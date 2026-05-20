import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function DELETE(_req: NextRequest, ctx: RouteContext<'/api/labels/[id]'>) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await ctx.params
  try {
    await prisma.label.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'Label não encontrada' }, { status: 404 })
  }
}
