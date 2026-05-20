'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  DndContext, DragOverlay, closestCorners,
  PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

/* ─── Tipos ──────────────────────────────────────────────────────────── */
interface Me {
  id: string
  name: string
  username: string
  role: string
  totalPoints: number
  avatarUrl?: string | null
}

interface SubTask {
  id: string
  title: string
  difficulty: string
  status: string
  points: number
}

interface Task {
  id: string
  title: string
  description?: string
  difficulty: string
  status: string
  points: number
  clientName?: string | null
  deadline?: string | null
  sprint?: { id: string; name: string; status: string } | null
  subTasks: SubTask[]
}

/* ─── Constantes ─────────────────────────────────────────────────────── */
const STATUSES = [
  { value: 'PENDING',     label: '⏳ Pendente',     color: '#94a3b8' },
  { value: 'IN_PROGRESS', label: '🚀 Em Andamento', color: '#6366f1' },
  { value: 'BLOCKED',     label: '🔴 Bloqueado',    color: '#ef4444' },
  { value: 'DONE',        label: '✅ Concluído',    color: '#22c55e' },
]

const DIFFICULTIES = [
  { value: 'EASY',   label: '🗡️ Fácil',  pts: 1, color: '#22c55e' },
  { value: 'MEDIUM', label: '⚔️ Médio',  pts: 3, color: '#f59e0b' },
  { value: 'HARD',   label: '🔥 Difícil', pts: 5, color: '#ef4444' },
]

function getDiff(d: string) { return DIFFICULTIES.find(x => x.value === d) || DIFFICULTIES[0] }

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function isOverdue(iso: string | null | undefined, status: string) {
  if (!iso || status === 'DONE') return false
  return new Date(iso) < new Date()
}

type DeadlineUrgency = 'overdue' | 'today' | 'tomorrow' | null
function getDeadlineUrgency(iso: string | null | undefined, status: string): DeadlineUrgency {
  if (!iso || status === 'DONE') return null
  const dl   = new Date(iso)
  const now  = new Date()
  const today    = new Date(now.getFullYear(),   now.getMonth(),   now.getDate())
  const tomorrow = new Date(today.getTime() + 86_400_000)
  const dlDay    = new Date(dl.getFullYear(),    dl.getMonth(),    dl.getDate())
  if (dlDay < today)                          return 'overdue'
  if (dlDay.getTime() === today.getTime())    return 'today'
  if (dlDay.getTime() === tomorrow.getTime()) return 'tomorrow'
  return null
}

const URGENCY_CONFIG = {
  overdue:  { label: 'Atrasado',   icon: '🔴', color: '#f87171', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)' },
  today:    { label: 'Vence hoje', icon: '⚠️', color: '#fb923c', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)' },
  tomorrow: { label: 'Amanhã',     icon: '⏰', color: '#fbbf24', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.3)'  },
}

/* ─── Painel de alertas ──────────────────────────────────────────────── */
function DeadlineAlertPanel({ tasks }: { tasks: Task[] }) {
  const urgent = tasks.filter(t => getDeadlineUrgency(t.deadline, t.status) !== null)
  if (urgent.length === 0) return null

  const sorted = [...urgent].sort((a, b) => {
    const order = { overdue: 0, today: 1, tomorrow: 2 }
    return order[getDeadlineUrgency(a.deadline, a.status) ?? 'tomorrow']
         - order[getDeadlineUrgency(b.deadline, b.status) ?? 'tomorrow']
  })

  return (
    <div className="rounded-2xl p-4 mb-6"
      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🔔</span>
        <span className="font-bold text-sm text-white">Prazos que precisam de atenção</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
          {urgent.length} tarefa{urgent.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {sorted.map(task => {
          const u   = getDeadlineUrgency(task.deadline, task.status)!
          const cfg = URGENCY_CONFIG[u]
          return (
            <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
              <span className="text-base flex-shrink-0">{cfg.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm truncate">{task.title}</p>
                {task.clientName && (
                  <p className="text-xs" style={{ color: '#06b6d4' }}>🏢 {task.clientName}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
                <p className="text-xs text-slate-500">{formatDate(task.deadline!)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Avatar ─────────────────────────────────────────────────────────── */
function Avatar({ avatarUrl, name, size = 56 }: { avatarUrl?: string | null; name: string; size?: number }) {
  if (avatarUrl) {
    return (
      <Image src={avatarUrl} alt={name} width={size} height={size}
        className="rounded-2xl object-cover flex-shrink-0"
        style={{ width: size, height: size }} />
    )
  }
  return (
    <div className="rounded-2xl flex items-center justify-center font-black text-white flex-shrink-0"
      style={{ width: size, height: size, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontSize: size * 0.3 }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

/* ─── Página ─────────────────────────────────────────────────────────── */
export default function MyTasksPage() {
  const [me, setMe]       = useState<Me | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const fetchData = useCallback(async () => {
    const meRes = await fetch('/api/auth/me')
    const { user } = await meRes.json()
    if (!user) return
    setMe(user)

    const tasksRes = await fetch(`/api/tasks?userId=${user.id}`)
    const tasksData = await tasksRes.json()
    setTasks(tasksData)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function updateStatus(taskId: string, status: string) {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchData()
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTaskId(null)
    const { active, over } = event
    if (!over) return
    const taskId    = active.id as string
    const newStatus = over.id   as string
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return
    if (!STATUSES.find(s => s.value === newStatus)) return
    await updateStatus(taskId, newStatus)
  }

  function toggleExpand(id: string) {
    setExpandedTasks(prev => {
      const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
    })
  }

  /* Stats rápidas */
  const stats = {
    total:      tasks.length,
    pending:    tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    blocked:    tasks.filter(t => t.status === 'BLOCKED').length,
    done:       tasks.filter(t => t.status === 'DONE').length,
    pointsDone: tasks.filter(t => t.status === 'DONE').reduce((s, t) => s + t.points, 0),
    pointsTotal: tasks.reduce((s, t) => s + t.points, 0),
  }

  const tasksByStatus: Record<string, Task[]> = {
    PENDING:     tasks.filter(t => t.status === 'PENDING'),
    IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
    BLOCKED:     tasks.filter(t => t.status === 'BLOCKED'),
    DONE:        tasks.filter(t => t.status === 'DONE'),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400 animate-pulse">⏳ Carregando suas tarefas...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">

      {/* ── Cabeçalho com perfil ── */}
      {me && (
        <div className="flex items-center gap-5 mb-8 p-5 rounded-2xl"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
          <Avatar avatarUrl={me.avatarUrl} name={me.name} size={64} />
          <div className="flex-1">
            <h1 className="text-2xl font-black text-white">Olá, {me.name.split(' ')[0]}! 👋</h1>
            <p className="text-slate-400 text-sm">@{me.username} · {me.role === 'admin' ? '👑 Admin' : '⚔️ Membro'}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-purple-400">{me.totalPoints}</div>
            <div className="text-xs text-slate-500">pontos totais</div>
          </div>
        </div>
      )}

      {/* ── Cards de estatísticas ── */}
      <div className="grid grid-cols-2 gap-3 mb-8 sm:grid-cols-4">
        {[
          { label: 'Pendentes',    value: stats.pending,    color: '#94a3b8', icon: '⏳' },
          { label: 'Em Andamento', value: stats.inProgress, color: '#6366f1', icon: '🚀' },
          { label: 'Bloqueadas',   value: stats.blocked,    color: '#ef4444', icon: '🔴' },
          { label: 'Concluídas',   value: stats.done,       color: '#22c55e', icon: '✅' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center"
            style={{ background: `${s.color}10`, border: `1px solid ${s.color}25` }}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progresso de pontos */}
      {stats.pointsTotal > 0 && (
        <div className="rounded-xl p-4 mb-8"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400 font-medium">⚡ Progresso de pontos</span>
            <span className="text-purple-400 font-bold">{stats.pointsDone} / {stats.pointsTotal} pts</span>
          </div>
          <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.round((stats.pointsDone / stats.pointsTotal) * 100)}%`,
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              }} />
          </div>
          <div className="text-xs text-slate-600 mt-1.5 text-right">
            {Math.round((stats.pointsDone / stats.pointsTotal) * 100)}% concluído
          </div>
        </div>
      )}

      {/* ── Alertas de prazo ── */}
      {!loading && <DeadlineAlertPanel tasks={tasks} />}

      {/* ── Kanban pessoal ── */}
      {tasks.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <div className="text-6xl mb-4">🎯</div>
          <p className="font-medium">Nenhuma tarefa atribuída a você ainda.</p>
          <p className="text-sm mt-1">Peça ao seu admin para te atribuir algumas missões!</p>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-600 mb-4 flex items-center gap-1.5">
            <span>⠿</span> Arraste os cartões entre colunas para mover rapidamente
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}>

            <div className="flex gap-4 overflow-x-auto pb-3">
              {STATUSES.map(statusDef => {
                const col = tasksByStatus[statusDef.value] || []
                return (
                  <MyTasksColumn key={statusDef.value} statusDef={statusDef} tasks={col}
                    expandedTasks={expandedTasks} onToggleExpand={toggleExpand} onUpdateStatus={updateStatus} />
                )
              })}
            </div>

            <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
              {activeTaskId && (() => {
                const t = tasks.find(x => x.id === activeTaskId)
                if (!t) return null
                return <MyTaskCard task={t} expandedTasks={expandedTasks} onToggleExpand={toggleExpand} onUpdateStatus={updateStatus} overlay />
              })()}
            </DragOverlay>
          </DndContext>
        </>
      )}
    </div>
  )
}

/* ─── Droppable column ───────────────────────────────────────────────── */
function MyTasksColumn({ statusDef, tasks, expandedTasks, onToggleExpand, onUpdateStatus }: {
  statusDef: typeof STATUSES[number]
  tasks: Task[]
  expandedTasks: Set<string>
  onToggleExpand: (id: string) => void
  onUpdateStatus: (id: string, s: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: statusDef.value })
  return (
    <div ref={setNodeRef} className="rounded-2xl p-4 flex-shrink-0 flex-1 transition-all duration-200"
      style={{
        minWidth: '260px',
        background: isOver ? `${statusDef.color}12` : 'rgba(255,255,255,0.02)',
        border: isOver ? `2px solid ${statusDef.color}60` : '1px solid rgba(255,255,255,0.05)',
        boxShadow: isOver ? `0 0 20px ${statusDef.color}15` : 'none',
      }}>
      <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: `2px solid ${statusDef.color}30` }}>
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: statusDef.color }} />
        <span className="font-bold text-xs leading-tight" style={{ color: statusDef.color }}>{statusDef.label}</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: `${statusDef.color}15`, color: statusDef.color }}>{tasks.length}</span>
      </div>
      <div className="space-y-3 min-h-[60px]">
        {tasks.map(task => (
          <MyTaskCard key={task.id} task={task} expandedTasks={expandedTasks}
            onToggleExpand={onToggleExpand} onUpdateStatus={onUpdateStatus} />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-6 text-slate-700 text-xs" style={{ opacity: isOver ? 0 : 1 }}>
            Nenhuma tarefa
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Draggable card ─────────────────────────────────────────────────── */
function MyTaskCard({ task, expandedTasks, onToggleExpand, onUpdateStatus, overlay }: {
  task: Task; expandedTasks: Set<string>
  onToggleExpand: (id: string) => void
  onUpdateStatus: (id: string, s: string) => void
  overlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const diff     = getDiff(task.difficulty)
  const overdue  = isOverdue(task.deadline, task.status)
  const urgency  = getDeadlineUrgency(task.deadline, task.status)
  const expanded = expandedTasks.has(task.id)

  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      className={overlay ? 'rotate-1 scale-105' : ''}>
      <div className="rounded-xl p-3 transition-all"
        style={{
          background: overlay ? '#1a1a2e' : task.status === 'BLOCKED' ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)',
          border: overlay ? '1px solid rgba(99,102,241,0.5)'
            : task.status === 'BLOCKED' ? '1px solid rgba(239,68,68,0.3)'
            : overdue ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.06)',
        }}>

        {/* Sprint badge */}
        {task.sprint && (
          <div className="mb-1.5">
            <span className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{
                background: task.sprint.status === 'ACTIVE' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
                color: task.sprint.status === 'ACTIVE' ? '#a5b4fc' : '#64748b',
                border: task.sprint.status === 'ACTIVE' ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.08)',
              }}>🗓️ {task.sprint.name}</span>
          </div>
        )}

        {/* Handle + Título + pts */}
        <div className="flex items-start gap-1.5 mb-2">
          <div {...attributes} {...listeners}
            className="flex-shrink-0 mt-0.5 px-0.5 rounded cursor-grab active:cursor-grabbing select-none"
            style={{ color: '#334155', touchAction: 'none' }} title="Arrastar">
            <svg width="8" height="14" viewBox="0 0 10 16" fill="currentColor">
              <circle cx="3" cy="3" r="1.5"/><circle cx="7" cy="3" r="1.5"/>
              <circle cx="3" cy="8" r="1.5"/><circle cx="7" cy="8" r="1.5"/>
              <circle cx="3" cy="13" r="1.5"/><circle cx="7" cy="13" r="1.5"/>
            </svg>
          </div>
          <span className="font-bold text-white text-xs leading-tight flex-1">{task.title}</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
            style={{ background: `${diff.color}15`, color: diff.color }}>{diff.pts}pt</span>
        </div>

        {task.clientName && <div className="text-xs mb-1 ml-4" style={{ color: '#06b6d4' }}>🏢 {task.clientName}</div>}
        {task.deadline && (
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5 ml-4">
            <span className="text-xs" style={{ color: overdue ? '#f87171' : '#64748b' }}>
              {overdue ? '🔴' : '📅'} {formatDate(task.deadline)}
            </span>
            {urgency && urgency !== 'overdue' && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: URGENCY_CONFIG[urgency].bg,
                  color:      URGENCY_CONFIG[urgency].color,
                  border:     `1px solid ${URGENCY_CONFIG[urgency].border}`,
                }}>
                {URGENCY_CONFIG[urgency].icon} {URGENCY_CONFIG[urgency].label}
              </span>
            )}
          </div>
        )}

        {task.subTasks.length > 0 && (
          <button onClick={() => onToggleExpand(task.id)}
            className="text-xs text-purple-400 hover:text-purple-300 mb-1.5 ml-4 transition-colors">
            {expanded ? '▼' : '▶'} {task.subTasks.length} sub-tarefa{task.subTasks.length !== 1 ? 's' : ''}
          </button>
        )}
        {expanded && (
          <div className="mb-2 space-y-1 ml-4 pl-2 border-l-2" style={{ borderColor: 'rgba(99,102,241,0.3)' }}>
            {task.subTasks.map(sub => {
              const subDiff   = getDiff(sub.difficulty)
              const subStatus = STATUSES.find(s => s.value === sub.status)
              return (
                <div key={sub.id} className="text-xs rounded-lg px-2 py-1.5"
                  style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.12)' }}>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-white font-medium truncate">{sub.title}</span>
                    <span style={{ color: subDiff.color, flexShrink: 0 }}>{subDiff.pts}pt</span>
                  </div>
                  {subStatus && <span className="text-xs mt-0.5" style={{ color: subStatus.color }}>{subStatus.label}</span>}
                </div>
              )
            })}
          </div>
        )}

        <div className="flex items-center gap-1 flex-wrap mt-1 ml-4">
          {STATUSES.map(s => (
            <button key={s.value} onClick={() => onUpdateStatus(task.id, s.value)} title={s.label}
              className="text-xs px-1.5 py-0.5 rounded transition-all"
              style={{
                background: task.status === s.value ? `${s.color}25` : 'rgba(255,255,255,0.03)',
                color: task.status === s.value ? s.color : '#475569',
                border: `1px solid ${task.status === s.value ? s.color + '50' : 'transparent'}`,
              }}>
              {s.value === 'PENDING' ? '⏳' : s.value === 'IN_PROGRESS' ? '🚀' : s.value === 'BLOCKED' ? '🔴' : '✅'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
