'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

/* ─── Tipos ──────────────────────────────────────────────────────────── */
interface Member { id: string; name: string; username: string }
interface SprintRef { id: string; name: string; status: string }
interface Label { id: string; name: string; color: string }

interface SubTask {
  id: string; title: string; description?: string
  difficulty: string; status: string; points: number
  assignedTo?: Member | null
}

interface Task {
  id: string; title: string; description?: string
  difficulty: string; status: string; points: number
  clientName?: string | null; deadline?: string | null
  assignedTo?: Member | null
  sprint?: SprintRef | null; sprintId?: string | null
  labels: Label[]
  subTasks: SubTask[]
}

interface Sprint { id: string; name: string; status: string }

/* ─── Constantes ─────────────────────────────────────────────────────── */
const DIFFICULTIES = [
  { value: 'EASY',   label: '🗡️ Fácil',   pts: 1, color: '#22c55e' },
  { value: 'MEDIUM', label: '⚔️ Médio',   pts: 3, color: '#f59e0b' },
  { value: 'HARD',   label: '🔥 Difícil', pts: 5, color: '#ef4444' },
]

const STATUSES = [
  { value: 'PENDING',     label: '⏳ Pendente',     color: '#94a3b8' },
  { value: 'IN_PROGRESS', label: '🚀 Em Andamento', color: '#6366f1' },
  { value: 'BLOCKED',     label: '🔴 Bloqueado',    color: '#ef4444' },
  { value: 'DONE',        label: '✅ Concluído',    color: '#22c55e' },
]

const LABEL_PALETTE = [
  '#6366f1','#8b5cf6','#ec4899','#ef4444',
  '#f97316','#f59e0b','#22c55e','#14b8a6',
  '#06b6d4','#3b82f6',
]

function getDiffStyle(d: string) { return DIFFICULTIES.find(x => x.value === d) || DIFFICULTIES[0] }
function formatDeadline(iso: string | null | undefined) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function isOverdue(iso: string | null | undefined, status: string) {
  if (!iso || status === 'DONE') return false
  return new Date(iso) < new Date()
}
function toDateInputValue(iso: string | null | undefined) {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 10)
}

type DeadlineUrgency = 'overdue' | 'today' | 'tomorrow' | null
function getDeadlineUrgency(iso: string | null | undefined, status: string): DeadlineUrgency {
  if (!iso || status === 'DONE') return null
  const dl   = new Date(iso)
  const now  = new Date()
  const today    = new Date(now.getFullYear(),   now.getMonth(),   now.getDate())
  const tomorrow = new Date(today.getTime() + 86_400_000)
  const dlDay    = new Date(dl.getFullYear(),    dl.getMonth(),    dl.getDate())
  if (dlDay < today)                             return 'overdue'
  if (dlDay.getTime() === today.getTime())       return 'today'
  if (dlDay.getTime() === tomorrow.getTime())    return 'tomorrow'
  return null
}

const URGENCY_CONFIG = {
  overdue:  { label: 'Atrasado',   icon: '🔴', color: '#f87171', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)' },
  today:    { label: 'Vence hoje', icon: '⚠️', color: '#fb923c', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.35)' },
  tomorrow: { label: 'Amanhã',     icon: '⏰', color: '#fbbf24', bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.3)'  },
}

/* ─── Painel de alertas de prazo ─────────────────────────────────────── */
function DeadlineAlertPanel({ tasks }: { tasks: Task[] }) {
  const urgent = tasks.filter(t => getDeadlineUrgency(t.deadline, t.status) !== null)
  if (urgent.length === 0) return null

  const sorted = [...urgent].sort((a, b) => {
    const order = { overdue: 0, today: 1, tomorrow: 2 }
    const ua = getDeadlineUrgency(a.deadline, a.status) ?? 'tomorrow'
    const ub = getDeadlineUrgency(b.deadline, b.status) ?? 'tomorrow'
    return order[ua] - order[ub]
  })

  return (
    <div className="rounded-2xl p-4 mb-5"
      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base">🔔</span>
        <span className="font-bold text-sm text-white">Prazos que precisam de atenção</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
          {urgent.length} tarefa{urgent.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {sorted.map(task => {
          const u = getDeadlineUrgency(task.deadline, task.status)!
          const cfg = URGENCY_CONFIG[u]
          return (
            <div key={task.id}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
              <span>{cfg.icon}</span>
              <span className="font-semibold text-white truncate max-w-[140px]">{task.title}</span>
              {task.clientName && (
                <span className="hidden sm:inline" style={{ color: '#06b6d4' }}>· {task.clientName}</span>
              )}
              <span className="font-bold flex-shrink-0" style={{ color: cfg.color }}>
                {cfg.label} · {formatDeadline(task.deadline)}
              </span>
              {task.assignedTo && (
                <span className="hidden md:inline text-slate-500">→ {task.assignedTo.name.split(' ')[0]}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const EMPTY_TASK_FORM = {
  title: '', description: '', difficulty: 'EASY',
  userId: '', clientName: '', deadline: '', sprintId: '',
  labelIds: [] as string[],
}
const EMPTY_SUBTASK_FORM = { title: '', description: '', difficulty: 'EASY', userId: '' }

/* ─── Droppable Column ───────────────────────────────────────────────── */
function DroppableColumn({
  statusDef, children, count,
}: {
  statusDef: typeof STATUSES[number]
  children: React.ReactNode
  count: number
}) {
  const { setNodeRef, isOver } = useDroppable({ id: statusDef.value })

  return (
    <div
      ref={setNodeRef}
      className="rounded-2xl p-4 flex-shrink-0 flex-1 transition-all duration-200"
      style={{
        minWidth: '260px',
        background: isOver
          ? `${statusDef.color}12`
          : 'rgba(255,255,255,0.02)',
        border: isOver
          ? `2px solid ${statusDef.color}60`
          : '1px solid rgba(255,255,255,0.06)',
        boxShadow: isOver ? `0 0 20px ${statusDef.color}15` : 'none',
      }}>

      {/* Column header */}
      <div className="flex items-center gap-2 mb-4 pb-3"
        style={{ borderBottom: `2px solid ${statusDef.color}30` }}>
        <div className="w-2 h-2 rounded-full" style={{ background: statusDef.color }} />
        <span className="font-bold text-sm" style={{ color: statusDef.color }}>{statusDef.label}</span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full"
          style={{ background: `${statusDef.color}15`, color: statusDef.color }}>
          {count}
        </span>
      </div>

      <div className="space-y-3 min-h-[60px]">
        {children}
        {count === 0 && (
          <div className="text-center py-6 text-slate-600 text-xs transition-opacity"
            style={{ opacity: isOver ? 0 : 1 }}>
            Nenhuma tarefa aqui
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Draggable Task Card ────────────────────────────────────────────── */
function DraggableTaskCard({
  task, overlay, expandedTasks, onToggleExpand,
  onUpdateStatus, onOpenEditTask, onOpenCreateSubtask, onDeleteConfirm,
  onUpdateSubtaskStatus, onOpenEditSubtask, onDeleteSubtask,
}: {
  task: Task
  overlay?: boolean
  expandedTasks: Set<string>
  onToggleExpand: (id: string) => void
  onUpdateStatus: (id: string, status: string) => void
  onOpenEditTask: (t: Task) => void
  onOpenCreateSubtask: (id: string) => void
  onDeleteConfirm: (x: { type: 'task' | 'subtask'; id: string; taskId?: string }) => void
  onUpdateSubtaskStatus: (taskId: string, subId: string, status: string) => void
  onOpenEditSubtask: (sub: SubTask, taskId: string) => void
  onDeleteSubtask: (taskId: string, subId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity:   isDragging ? 0.4 : 1,
    cursor:    'default',
  }

  const diff     = getDiffStyle(task.difficulty)
  const expanded = expandedTasks.has(task.id)
  const overdue  = isOverdue(task.deadline, task.status)
  const urgency  = getDeadlineUrgency(task.deadline, task.status)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl transition-all ${overlay ? 'shadow-2xl rotate-1 scale-105' : ''}`}>

      <div
        className="rounded-xl p-4"
        style={{
          background: overlay
            ? '#1a1a2e'
            : task.status === 'BLOCKED'
              ? 'rgba(239,68,68,0.05)'
              : 'rgba(255,255,255,0.03)',
          border: overlay
            ? '1px solid rgba(99,102,241,0.5)'
            : task.status === 'BLOCKED'
              ? '1px solid rgba(239,68,68,0.35)'
              : overdue
                ? '1px solid rgba(239,68,68,0.35)'
                : '1px solid rgba(255,255,255,0.06)',
        }}>

        {/* Drag handle + título + pontos */}
        <div className="flex items-start gap-2 mb-2">
          {/* Handle */}
          <div
            {...attributes}
            {...listeners}
            className="flex-shrink-0 mt-0.5 px-0.5 rounded cursor-grab active:cursor-grabbing select-none"
            style={{ color: '#334155', touchAction: 'none' }}
            title="Arrastar">
            <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
              <circle cx="3" cy="3"  r="1.5"/><circle cx="7" cy="3"  r="1.5"/>
              <circle cx="3" cy="8"  r="1.5"/><circle cx="7" cy="8"  r="1.5"/>
              <circle cx="3" cy="13" r="1.5"/><circle cx="7" cy="13" r="1.5"/>
            </svg>
          </div>

          <span className="font-bold text-white text-sm flex-1 leading-tight">{task.title}</span>
          <span className="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0"
            style={{ background: `${diff.color}15`, color: diff.color }}>
            {diff.pts}pt
          </span>
        </div>

        {/* Labels */}
        {task.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2 ml-5">
            {task.labels.map(label => (
              <span key={label.id} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: `${label.color}20`,
                  color: label.color,
                  border: `1px solid ${label.color}40`,
                }}>
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Sprint badge */}
        {task.sprint && (
          <div className="flex items-center gap-1.5 mb-1.5 ml-5">
            <span className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{
                background: task.sprint.status === 'ACTIVE' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
                color: task.sprint.status === 'ACTIVE' ? '#a5b4fc' : '#64748b',
                border: task.sprint.status === 'ACTIVE' ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.08)',
              }}>
              🗓️ {task.sprint.name}
            </span>
          </div>
        )}

        {/* Cliente */}
        {task.clientName && (
          <div className="flex items-center gap-1.5 mb-1.5 ml-5">
            <span className="text-xs font-medium" style={{ color: '#06b6d4' }}>🏢 {task.clientName}</span>
          </div>
        )}

        {/* Prazo + badge de urgência */}
        {task.deadline && (
          <div className="flex items-center gap-1.5 mb-1.5 ml-5 flex-wrap">
            <span className="text-xs font-medium" style={{ color: overdue ? '#f87171' : '#94a3b8' }}>
              {overdue ? '🔴' : '📅'} {formatDeadline(task.deadline)}
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

        {/* Descrição */}
        {task.description && (
          <p className="text-xs text-slate-500 mb-2 ml-5 leading-relaxed">{task.description}</p>
        )}

        {/* Responsável */}
        {task.assignedTo && (
          <div className="flex items-center gap-1.5 mb-2 ml-5">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {task.assignedTo.name.slice(0, 1)}
            </div>
            <span className="text-xs text-slate-400">{task.assignedTo.name}</span>
          </div>
        )}

        {/* Sub-tarefas toggle */}
        {task.subTasks.length > 0 && (
          <button onClick={() => onToggleExpand(task.id)}
            className="flex items-center gap-1 text-xs text-purple-400 mb-2 ml-5 hover:text-purple-300 transition-colors">
            {expanded ? '▼' : '▶'} {task.subTasks.length} sub-tarefa{task.subTasks.length !== 1 ? 's' : ''}
          </button>
        )}

        {/* Sub-tarefas expandidas */}
        {expanded && task.subTasks.length > 0 && (
          <div className="ml-5 mb-2 space-y-2 border-l-2 pl-3"
            style={{ borderColor: 'rgba(99,102,241,0.3)' }}>
            {task.subTasks.map(sub => {
              const subDiff = getDiffStyle(sub.difficulty)
              return (
                <div key={sub.id} className="rounded-lg p-2.5"
                  style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs text-white font-medium">{sub.title}</span>
                    <span className="text-xs" style={{ color: subDiff.color }}>{subDiff.pts}pt</span>
                  </div>
                  {sub.assignedTo && <div className="text-xs text-slate-500 mb-1">{sub.assignedTo.name}</div>}
                  <div className="flex items-center gap-1 flex-wrap">
                    {STATUSES.map(s => (
                      <button key={s.value}
                        onClick={() => onUpdateSubtaskStatus(task.id, sub.id, s.value)}
                        className="text-xs px-1.5 py-0.5 rounded transition-all"
                        style={{
                          background: sub.status === s.value ? `${s.color}25` : 'rgba(255,255,255,0.03)',
                          color: sub.status === s.value ? s.color : '#475569',
                          border: `1px solid ${sub.status === s.value ? s.color + '50' : 'transparent'}`,
                        }}>
                        {s.value === 'PENDING' ? '⏳' : s.value === 'IN_PROGRESS' ? '🚀' : s.value === 'BLOCKED' ? '🔴' : '✅'}
                      </button>
                    ))}
                    <button onClick={() => onOpenEditSubtask(sub, task.id)}
                      className="text-xs px-1.5 py-0.5 rounded text-slate-500 hover:text-purple-400 transition-colors">✏️</button>
                    <button onClick={() => onDeleteSubtask(task.id, sub.id)}
                      className="text-xs px-1.5 py-0.5 rounded text-slate-500 hover:text-red-400 transition-colors">🗑️</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Ações */}
        <div className="flex items-center gap-1 flex-wrap mt-2 ml-5">
          {STATUSES.map(s => (
            <button key={s.value}
              onClick={() => onUpdateStatus(task.id, s.value)}
              className="text-xs px-2 py-1 rounded-lg transition-all"
              style={{
                background: task.status === s.value ? `${s.color}20` : 'rgba(255,255,255,0.04)',
                color: task.status === s.value ? s.color : '#475569',
                border: `1px solid ${task.status === s.value ? s.color + '40' : 'transparent'}`,
              }}>
              {s.value === 'PENDING' ? '⏳' : s.value === 'IN_PROGRESS' ? '🚀' : s.value === 'BLOCKED' ? '🔴' : '✅'}
            </button>
          ))}
          <button onClick={() => onOpenCreateSubtask(task.id)}
            className="text-xs px-2 py-1 rounded-lg text-slate-500 hover:text-purple-400 transition-colors"
            style={{ border: '1px solid rgba(99,102,241,0.2)' }}>
            + Sub
          </button>
          <button onClick={() => onOpenEditTask(task)}
            className="text-xs px-2 py-1 rounded-lg text-slate-500 hover:text-purple-400 transition-colors">✏️</button>
          <button onClick={() => onDeleteConfirm({ type: 'task', id: task.id })}
            className="text-xs px-2 py-1 rounded-lg text-slate-500 hover:text-red-400 transition-colors">🗑️</button>
        </div>
      </div>
    </div>
  )
}

/* ─── Página principal ───────────────────────────────────────────────── */
export default function TasksPage() {
  const [tasks,   setTasks]   = useState<Task[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [labels,  setLabels]  = useState<Label[]>([])
  const [loading, setLoading] = useState(true)

  const [sprintFilter, setSprintFilter] = useState<string>('all')
  const [labelFilter,  setLabelFilter]  = useState<string>('all')
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  const [taskModal,    setTaskModal]    = useState(false)
  const [editingTask,  setEditingTask]  = useState<Task | null>(null)
  const [taskForm,     setTaskForm]     = useState(EMPTY_TASK_FORM)
  const [subtaskModal,    setSubtaskModal]    = useState(false)
  const [subtaskParentId, setSubtaskParentId] = useState<string | null>(null)
  const [editingSubtask,  setEditingSubtask]  = useState<SubTask | null>(null)
  const [subtaskForm,     setSubtaskForm]     = useState(EMPTY_SUBTASK_FORM)

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<
    { type: 'task' | 'subtask'; id: string; taskId?: string } | null
  >(null)

  const [showLabelManager, setShowLabelManager] = useState(false)
  const [newLabelName,  setNewLabelName]  = useState('')
  const [newLabelColor, setNewLabelColor] = useState(LABEL_PALETTE[0])
  const [savingLabel,   setSavingLabel]   = useState(false)

  // dnd-kit sensors — require 8px movement before drag starts (avoids accidental drags on clicks)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  /* ── Fetch ─────────────────────────────────────────────────────────── */
  const fetchData = useCallback(async () => {
    const [tasksRes, membersRes, sprintsRes, labelsRes] = await Promise.all([
      fetch('/api/tasks'), fetch('/api/members'), fetch('/api/sprints'), fetch('/api/labels'),
    ])
    const [tasksData, membersData, sprintsData, labelsData] = await Promise.all([
      tasksRes.json(), membersRes.json(), sprintsRes.json(), labelsRes.json(),
    ])
    setTasks(tasksData); setMembers(membersData); setSprints(sprintsData); setLabels(labelsData)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  /* ── Handlers ──────────────────────────────────────────────────────── */
  function toggleExpand(id: string) {
    setExpandedTasks(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function openCreateTask() {
    setEditingTask(null); setTaskForm(EMPTY_TASK_FORM); setError(''); setTaskModal(true)
  }

  function openEditTask(t: Task) {
    setEditingTask(t)
    setTaskForm({
      title:       t.title,
      description: t.description || '',
      difficulty:  t.difficulty,
      userId:      t.assignedTo?.id || '',
      clientName:  t.clientName  || '',
      deadline:    toDateInputValue(t.deadline),
      sprintId:    t.sprintId    || '',
      labelIds:    t.labels.map(l => l.id),
    })
    setError(''); setTaskModal(true)
  }

  async function saveTask() {
    if (!taskForm.title) { setError('Título é obrigatório'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(
        editingTask ? `/api/tasks/${editingTask.id}` : '/api/tasks',
        {
          method: editingTask ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...taskForm,
            userId:     taskForm.userId     || null,
            clientName: taskForm.clientName || null,
            deadline:   taskForm.deadline   || null,
            sprintId:   taskForm.sprintId   || null,
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro'); return }
      setTaskModal(false); fetchData()
    } finally { setSaving(false) }
  }

  async function updateTaskStatus(taskId: string, status: string) {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
    await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchData()
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null); fetchData()
  }

  function openCreateSubtask(taskId: string) {
    setSubtaskParentId(taskId); setEditingSubtask(null)
    setSubtaskForm(EMPTY_SUBTASK_FORM); setError(''); setSubtaskModal(true)
  }

  function openEditSubtask(sub: SubTask, taskId: string) {
    setSubtaskParentId(taskId); setEditingSubtask(sub)
    setSubtaskForm({ title: sub.title, description: sub.description || '', difficulty: sub.difficulty, userId: sub.assignedTo?.id || '' })
    setError(''); setSubtaskModal(true)
  }

  async function saveSubtask() {
    if (!subtaskForm.title) { setError('Título é obrigatório'); return }
    setSaving(true); setError('')
    try {
      const url = editingSubtask
        ? `/api/tasks/${subtaskParentId}/subtasks/${editingSubtask.id}`
        : `/api/tasks/${subtaskParentId}/subtasks`
      const res = await fetch(url, {
        method: editingSubtask ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...subtaskForm, userId: subtaskForm.userId || null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro'); return }
      setSubtaskModal(false); fetchData()
    } finally { setSaving(false) }
  }

  async function updateSubtaskStatus(taskId: string, subtaskId: string, status: string) {
    await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchData()
  }

  async function deleteSubtask(taskId: string, subtaskId: string) {
    await fetch(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { method: 'DELETE' })
    setDeleteConfirm(null); fetchData()
  }

  async function createLabel() {
    if (!newLabelName.trim()) return
    setSavingLabel(true)
    try {
      await fetch('/api/labels', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLabelName.trim(), color: newLabelColor }),
      })
      setNewLabelName(''); setNewLabelColor(LABEL_PALETTE[0]); fetchData()
    } finally { setSavingLabel(false) }
  }

  async function deleteLabel(id: string) {
    await fetch(`/api/labels/${id}`, { method: 'DELETE' })
    if (labelFilter === id) setLabelFilter('all')
    fetchData()
  }

  /* ── Drag & Drop ───────────────────────────────────────────────────── */
  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTaskId(null)
    const { active, over } = event
    if (!over) return
    const taskId   = active.id as string
    const newStatus = over.id   as string
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return
    // Only accept drops on status columns
    if (!STATUSES.find(s => s.value === newStatus)) return
    await updateTaskStatus(taskId, newStatus)
  }

  /* ── Filtragem ─────────────────────────────────────────────────────── */
  let filteredTasks = tasks
  if (sprintFilter !== 'all') {
    filteredTasks = sprintFilter === 'none'
      ? filteredTasks.filter(t => !t.sprintId)
      : filteredTasks.filter(t => t.sprintId === sprintFilter)
  }
  if (labelFilter !== 'all') {
    filteredTasks = filteredTasks.filter(t => t.labels.some(l => l.id === labelFilter))
  }

  const tasksByStatus = {
    PENDING:     filteredTasks.filter(t => t.status === 'PENDING'),
    IN_PROGRESS: filteredTasks.filter(t => t.status === 'IN_PROGRESS'),
    BLOCKED:     filteredTasks.filter(t => t.status === 'BLOCKED'),
    DONE:        filteredTasks.filter(t => t.status === 'DONE'),
  }

  const activeTask = activeTaskId ? tasks.find(t => t.id === activeTaskId) ?? null : null

  const cardProps = {
    expandedTasks,
    onToggleExpand:        toggleExpand,
    onUpdateStatus:        updateTaskStatus,
    onOpenEditTask:        openEditTask,
    onOpenCreateSubtask:   openCreateSubtask,
    onDeleteConfirm:       setDeleteConfirm,
    onUpdateSubtaskStatus: updateSubtaskStatus,
    onOpenEditSubtask:     openEditSubtask,
    onDeleteSubtask:       deleteSubtask,
  }

  /* ── Render ────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">📋 Painel de Demandas</h1>
          <p className="text-slate-400">Gerencie as tarefas e ganhe pontos de experiência!</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowLabelManager(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
            🏷️ Labels
          </button>
          <button onClick={openCreateTask}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}>
            ➕ Nova Demanda
          </button>
        </div>
      </div>

      {/* Filtros */}
      {sprints.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-slate-500 font-medium w-16 flex-shrink-0">🗓️ Sprint:</span>
          {[
            { id: 'all', name: 'Todas' }, { id: 'none', name: 'Sem sprint' },
            ...sprints.map(s => ({ id: s.id, name: s.name + (s.status === 'ACTIVE' ? ' 🚀' : s.status === 'COMPLETED' ? ' ✓' : '') })),
          ].map(opt => (
            <button key={opt.id} onClick={() => setSprintFilter(opt.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: sprintFilter === opt.id ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.04)',
                color:  sprintFilter === opt.id ? '#fff' : '#64748b',
                border: sprintFilter === opt.id ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
              }}>
              {opt.name}
            </button>
          ))}
        </div>
      )}
      {labels.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-xs text-slate-500 font-medium w-16 flex-shrink-0">🏷️ Label:</span>
          <button onClick={() => setLabelFilter('all')}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: labelFilter === 'all' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
              color:  labelFilter === 'all' ? '#fff' : '#64748b',
              border: labelFilter === 'all' ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.08)',
            }}>Todas</button>
          {labels.map(label => (
            <button key={label.id} onClick={() => setLabelFilter(labelFilter === label.id ? 'all' : label.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{
                background: labelFilter === label.id ? `${label.color}30` : `${label.color}12`,
                color:  label.color,
                border: labelFilter === label.id ? `1px solid ${label.color}80` : `1px solid ${label.color}30`,
              }}>
              {label.name}
            </button>
          ))}
        </div>
      )}

      {/* Painel de alertas de prazo */}
      {!loading && <DeadlineAlertPanel tasks={filteredTasks} />}

      {/* Dica de drag */}
      {!loading && (
        <p className="text-xs text-slate-600 mb-4 flex items-center gap-1.5">
          <span>⠿</span> Arraste os cartões entre colunas para mover rapidamente
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="text-slate-400 animate-pulse">⏳ Carregando missões...</div>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}>

          <div className="flex gap-4 overflow-x-auto pb-3">
            {STATUSES.map(statusDef => {
              const statusTasks = tasksByStatus[statusDef.value as keyof typeof tasksByStatus] || []
              return (
                <DroppableColumn key={statusDef.value} statusDef={statusDef} count={statusTasks.length}>
                  {statusTasks.map(task => (
                    <DraggableTaskCard key={task.id} task={task} {...cardProps} />
                  ))}
                </DroppableColumn>
              )
            })}
          </div>

          {/* Ghost card while dragging */}
          <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
            {activeTask && (
              <DraggableTaskCard task={activeTask} overlay {...cardProps} />
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── Modais ── */}
      {taskModal && (
        <Modal title={editingTask ? '✏️ Editar Demanda' : '➕ Nova Demanda'}
          onClose={() => setTaskModal(false)} onSave={saveTask} saving={saving} error={error}>
          <TaskFormFields form={taskForm} setForm={setTaskForm} members={members} sprints={sprints} labels={labels} />
        </Modal>
      )}
      {subtaskModal && (
        <Modal title={editingSubtask ? '✏️ Editar Sub-tarefa' : '➕ Nova Sub-tarefa'}
          onClose={() => setSubtaskModal(false)} onSave={saveSubtask} saving={saving} error={error}>
          <SubTaskFormFields form={subtaskForm} setForm={setSubtaskForm} members={members} />
        </Modal>
      )}
      {showLabelManager && (
        <LabelManager
          labels={labels} newLabelName={newLabelName} newLabelColor={newLabelColor}
          savingLabel={savingLabel}
          onNameChange={setNewLabelName} onColorChange={setNewLabelColor}
          onCreate={createLabel} onDelete={deleteLabel}
          onClose={() => setShowLabelManager(false)} />
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 text-center"
            style={{ background: '#1a1a2e', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">Confirmar exclusão</h2>
            <p className="text-slate-400 text-sm mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl font-medium text-slate-400"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'task') deleteTask(deleteConfirm.id)
                  else if (deleteConfirm.taskId) deleteSubtask(deleteConfirm.taskId, deleteConfirm.id)
                }}
                className="flex-1 py-3 rounded-xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Label Manager modal ────────────────────────────────────────────── */
function LabelManager({ labels, newLabelName, newLabelColor, savingLabel, onNameChange, onColorChange, onCreate, onDelete, onClose }: {
  labels: Label[]; newLabelName: string; newLabelColor: string; savingLabel: boolean
  onNameChange: (v: string) => void; onColorChange: (v: string) => void
  onCreate: () => void; onDelete: (id: string) => void; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md rounded-2xl p-6"
        style={{ background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.3)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-black text-white">🏷️ Gerenciar Labels</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors text-xl leading-none">✕</button>
        </div>
        <div className="mb-5 p-4 rounded-xl"
          style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
          <p className="text-xs text-slate-500 font-medium mb-3">Nova label</p>
          <div className="flex gap-2 mb-3">
            <input value={newLabelName} onChange={e => onNameChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onCreate()}
              className="flex-1 px-3 py-2 rounded-lg text-white text-sm outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(99,102,241,0.3)' }}
              placeholder="Nome da label..." />
            <button onClick={onCreate} disabled={!newLabelName.trim() || savingLabel}
              className="px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-40 transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {savingLabel ? '...' : '+ Add'}
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {LABEL_PALETTE.map(color => (
              <button key={color} onClick={() => onColorChange(color)}
                className="w-7 h-7 rounded-full transition-all hover:scale-110"
                style={{ background: color, outline: newLabelColor === color ? '3px solid white' : 'none', outlineOffset: '2px' }} />
            ))}
          </div>
          {newLabelName.trim() && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-slate-500">Preview:</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: `${newLabelColor}20`, color: newLabelColor, border: `1px solid ${newLabelColor}40` }}>
                {newLabelName}
              </span>
            </div>
          )}
        </div>
        {labels.length === 0 ? (
          <p className="text-center text-slate-600 text-sm py-4">Nenhuma label criada ainda.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {labels.map(label => (
              <div key={label.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ background: `${label.color}10`, border: `1px solid ${label.color}25` }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: label.color }} />
                  <span className="text-sm font-semibold" style={{ color: label.color }}>{label.name}</span>
                </div>
                <button onClick={() => onDelete(label.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors text-sm px-2 py-0.5 rounded">🗑️</button>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} className="w-full mt-5 py-3 rounded-xl font-medium text-slate-400 text-sm"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          Fechar
        </button>
      </div>
    </div>
  )
}

/* ─── Modal wrapper ─────────────────────────────────────────────────── */
function Modal({ title, onClose, onSave, saving, error, children }: {
  title: string; onClose: () => void; onSave: () => void; saving: boolean; error: string; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{ background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.3)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        <h2 className="text-xl font-black text-white mb-5">{title}</h2>
        {children}
        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl text-sm text-red-400"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            ⚠️ {error}
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-medium text-slate-400"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>Cancelar</button>
          <button onClick={onSave} disabled={saving} className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Campos base ────────────────────────────────────────────────────── */
type BaseForm = { title: string; description: string; difficulty: string; userId: string }

function BaseFormFields<T extends BaseForm>({ form, setForm, members }: {
  form: T; setForm: (fn: (f: T) => T) => void; members: Member[]
}) {
  const inputStyle  = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.3)' }
  const selectStyle = { background: '#1e1e38', border: '1px solid rgba(99,102,241,0.3)' }
  return (
    <>
      <div>
        <label className="block text-sm text-slate-400 mb-1">Título *</label>
        <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          className="w-full px-4 py-3 rounded-xl text-white outline-none" style={inputStyle} placeholder="Título da missão" />
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-1">Descrição</label>
        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className="w-full px-4 py-3 rounded-xl text-white outline-none resize-none" style={inputStyle} rows={2} placeholder="Descrição opcional..." />
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-1">Dificuldade</label>
        <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
          className="w-full px-4 py-3 rounded-xl text-white outline-none" style={selectStyle}>
          {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label} ({d.pts} pts)</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-1">Responsável</label>
        <select value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}
          className="w-full px-4 py-3 rounded-xl text-white outline-none" style={selectStyle}>
          <option value="">— Sem responsável —</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name} (@{m.username})</option>)}
        </select>
      </div>
    </>
  )
}

/* ─── Formulário de Demanda ─────────────────────────────────────────── */
type TaskForm = BaseForm & { clientName: string; deadline: string; sprintId: string; labelIds: string[] }

function TaskFormFields({ form, setForm, members, sprints, labels }: {
  form: TaskForm; setForm: (fn: (f: TaskForm) => TaskForm) => void
  members: Member[]; sprints: Sprint[]; labels: Label[]
}) {
  const inputStyle  = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.3)' }
  const selectStyle = { background: '#1e1e38', border: '1px solid rgba(99,102,241,0.3)' }
  function toggleLabel(id: string) {
    setForm(f => ({
      ...f,
      labelIds: f.labelIds.includes(id) ? f.labelIds.filter(l => l !== id) : [...f.labelIds, id],
    }))
  }
  return (
    <div className="space-y-4">
      <BaseFormFields form={form} setForm={setForm} members={members} />
      {sprints.length > 0 && (
        <div>
          <label className="block text-sm text-slate-400 mb-1">🗓️ Sprint</label>
          <select value={form.sprintId} onChange={e => setForm(f => ({ ...f, sprintId: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl text-white outline-none" style={selectStyle}>
            <option value="">— Sem sprint —</option>
            {sprints.map(s => <option key={s.id} value={s.id}>{s.status === 'ACTIVE' ? '🚀 ' : s.status === 'COMPLETED' ? '✅ ' : '📋 '}{s.name}</option>)}
          </select>
        </div>
      )}
      {labels.length > 0 && (
        <div>
          <label className="block text-sm text-slate-400 mb-2">🏷️ Labels</label>
          <div className="flex flex-wrap gap-2">
            {labels.map(label => {
              const selected = form.labelIds.includes(label.id)
              return (
                <button key={label.id} type="button" onClick={() => toggleLabel(label.id)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: selected ? `${label.color}30` : `${label.color}10`,
                    color: label.color,
                    border: selected ? `1px solid ${label.color}70` : `1px solid ${label.color}25`,
                    transform: selected ? 'scale(1.05)' : 'scale(1)',
                  }}>
                  {selected ? '✓ ' : ''}{label.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 pt-1">
        <div className="flex-1 h-px" style={{ background: 'rgba(99,102,241,0.2)' }} />
        <span className="text-xs text-slate-500 font-medium">Informações do Cliente</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(99,102,241,0.2)' }} />
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-1">🏢 Nome do Cliente</label>
        <input value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
          className="w-full px-4 py-3 rounded-xl text-white outline-none" style={inputStyle} placeholder="Ex: Acme Corp..." />
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-1">📅 Prazo de Entrega</label>
        <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
          className="w-full px-4 py-3 rounded-xl text-white outline-none" style={{ ...inputStyle, colorScheme: 'dark' }} />
      </div>
    </div>
  )
}

/* ─── Formulário de Sub-tarefa ───────────────────────────────────────── */
function SubTaskFormFields({ form, setForm, members }: {
  form: BaseForm; setForm: (fn: (f: BaseForm) => BaseForm) => void; members: Member[]
}) {
  return <div className="space-y-4"><BaseFormFields form={form} setForm={setForm} members={members} /></div>
}
