import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'

const dbUrl = `file:${path.join(process.cwd(), 'dev.db')}`
const adapter = new PrismaBetterSqlite3({ url: dbUrl })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  await prisma.subTask.deleteMany()
  await prisma.task.deleteMany()
  await prisma.user.deleteMany()

  const password = await bcrypt.hash('admin123', 10)
  const memberPass = await bcrypt.hash('member123', 10)

  const admin = await prisma.user.create({
    data: { name: 'Administrador', username: 'admin', password, role: 'admin' },
  })

  const alice = await prisma.user.create({
    data: { name: 'Alice Ferreira', username: 'alice', password: memberPass, role: 'member' },
  })

  const bob = await prisma.user.create({
    data: { name: 'Bob Mendes', username: 'bob', password: memberPass, role: 'member' },
  })

  const carol = await prisma.user.create({
    data: { name: 'Carol Souza', username: 'carol', password: memberPass, role: 'member' },
  })

  const dan = await prisma.user.create({
    data: { name: 'Dan Oliveira', username: 'dan', password: memberPass, role: 'member' },
  })

  const now = new Date()

  const task1 = await prisma.task.create({
    data: {
      title: 'Redesign da Landing Page',
      description: 'Atualizar o design completo da landing page com nova identidade visual',
      difficulty: 'HARD',
      points: 5,
      status: 'DONE',
      userId: alice.id,
      completedAt: new Date(now.getFullYear(), now.getMonth(), 5),
    },
  })

  const task2 = await prisma.task.create({
    data: {
      title: 'Integração de API de Pagamento',
      description: 'Integrar Stripe para processamento de pagamentos',
      difficulty: 'HARD',
      points: 5,
      status: 'IN_PROGRESS',
      userId: bob.id,
    },
  })

  const task3 = await prisma.task.create({
    data: {
      title: 'Relatório Mensal',
      description: 'Preparar relatório de métricas do mês',
      difficulty: 'MEDIUM',
      points: 3,
      status: 'DONE',
      userId: carol.id,
      completedAt: new Date(now.getFullYear(), now.getMonth(), 10),
    },
  })

  await prisma.task.create({
    data: {
      title: 'Testes Automatizados',
      description: 'Escrever testes unitários para os módulos principais',
      difficulty: 'MEDIUM',
      points: 3,
      status: 'PENDING',
      userId: dan.id,
    },
  })

  await prisma.task.create({
    data: {
      title: 'Documentação Técnica',
      description: 'Atualizar documentação das APIs internas',
      difficulty: 'EASY',
      points: 1,
      status: 'DONE',
      userId: alice.id,
      completedAt: new Date(now.getFullYear(), now.getMonth(), 8),
    },
  })

  await prisma.subTask.createMany({
    data: [
      { title: 'Wireframes', difficulty: 'EASY', points: 1, taskId: task1.id, userId: alice.id, status: 'DONE', completedAt: new Date(now.getFullYear(), now.getMonth(), 3) },
      { title: 'Protótipo no Figma', difficulty: 'MEDIUM', points: 3, taskId: task1.id, userId: alice.id, status: 'DONE', completedAt: new Date(now.getFullYear(), now.getMonth(), 4) },
      { title: 'Implementação HTML/CSS', difficulty: 'MEDIUM', points: 3, taskId: task1.id, userId: bob.id, status: 'DONE', completedAt: new Date(now.getFullYear(), now.getMonth(), 5) },
    ],
  })

  await prisma.subTask.createMany({
    data: [
      { title: 'Configurar Stripe SDK', difficulty: 'EASY', points: 1, taskId: task2.id, userId: bob.id, status: 'DONE', completedAt: new Date(now.getFullYear(), now.getMonth(), 7) },
      { title: 'Criar endpoints de checkout', difficulty: 'HARD', points: 5, taskId: task2.id, userId: bob.id, status: 'IN_PROGRESS' },
      { title: 'Webhook de confirmação', difficulty: 'MEDIUM', points: 3, taskId: task2.id, userId: carol.id, status: 'PENDING' },
    ],
  })

  await prisma.subTask.createMany({
    data: [
      { title: 'Coleta de dados', difficulty: 'EASY', points: 1, taskId: task3.id, userId: carol.id, status: 'DONE', completedAt: new Date(now.getFullYear(), now.getMonth(), 8) },
      { title: 'Análise e gráficos', difficulty: 'MEDIUM', points: 3, taskId: task3.id, userId: carol.id, status: 'DONE', completedAt: new Date(now.getFullYear(), now.getMonth(), 9) },
    ],
  })

  await prisma.user.update({ where: { id: alice.id }, data: { totalPoints: 5 + 1 + 1 + 3 + 3 } })
  await prisma.user.update({ where: { id: bob.id }, data: { totalPoints: 1 + 3 } })
  await prisma.user.update({ where: { id: carol.id }, data: { totalPoints: 3 + 1 + 3 } })
  await prisma.user.update({ where: { id: dan.id }, data: { totalPoints: 0 } })
  await prisma.user.update({ where: { id: admin.id }, data: { totalPoints: 0 } })

  console.log('✅ Seed concluído!')
  console.log('\n👤 Usuários criados:')
  console.log('  admin / admin123  (role: admin)')
  console.log('  alice / member123')
  console.log('  bob   / member123')
  console.log('  carol / member123')
  console.log('  dan   / member123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
