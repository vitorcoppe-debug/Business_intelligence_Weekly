'use client'

import { useState, useEffect, useCallback } from 'react'

/* ─── Tipos ─────────────────────────────────────────────────────────── */
interface BurndownDay {
  date: string
  remaining: number  // -1 = futuro
  ideal: number
  isToday: boolean
  isFuture: boolean
}
interface BurndownData {
  sprint: { id: string; name: string; startDate: string; endDate: string; totalPoints: number }
  days: BurndownDay[]
}

/* ─── Componente SVG de Burndown ─────────────────────────────────────── */
function BurndownChart({ data }: { data: BurndownData }) {
  const { days, sprint } = data
  if (!days.length || sprint.totalPoints === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
        Adicione tarefas ao sprint para visualizar o burndown
      </div>
    )
  }

  const W = 560; const H = 200
  const ml = 44; const mr = 16; const mt = 16; const mb = 32
  const cw = W - ml - mr
  const ch = H - mt - mb

  const maxPts = sprint.totalPoints
  const xScale = (i: number) => ml + (i / (days.length - 1)) * cw
  const yScale = (v: number) => mt + ch - (v / maxPts) * ch

  // Linha ideal
  const idealPath = days
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(d.ideal).toFixed(1)}`)
    .join(' ')

  // Linha real (só pontos não-futuros)
  const actualDays = days.filter(d => !d.isFuture)
  const actualPath = actualDays
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(days.indexOf(d)).toFixed(1)},${yScale(d.remaining).toFixed(1)}`)
    .join(' ')

  // Índice do dia de hoje
  const todayIdx = days.findIndex(d => d.isToday)

  // Labels do eixo X (mostra ~6 labels distribuídos)
  const step = Math.max(1, Math.floor(days.length / 6))
  const xLabels = days
    .map((d, i) => ({ d, i }))
    .filter(({ i }) => i % step === 0 || i === days.length - 1)

  // Labels do eixo Y (0, metade, máx)
  const yTicks = [0, Math.round(maxPts / 2), maxPts]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
      {/* Grid horizontal */}
      {yTicks.map(v => (
        <g key={v}>
          <line
            x1={ml} y1={yScale(v)} x2={W - mr} y2={yScale(v)}
            stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <text x={ml - 6} y={yScale(v) + 4} textAnchor="end"
            fill="#475569" fontSize="10">{v}</text>
        </g>
      ))}

      {/* Labels eixo X */}
      {xLabels.map(({ d, i }) => (
        <text key={d.date} x={xScale(i)} y={H - 6} textAnchor="middle"
          fill="#475569" fontSize="9">
          {new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
        </text>
      ))}

      {/* Linha ideal (tracejada cinza) */}
      <path d={idealPath} fill="none" stroke="#475569" strokeWidth="1.5"
        strokeDasharray="5,4" strokeLinecap="round" />

      {/* Área sob a linha real */}
      {actualDays.length > 1 && (
        <path
          d={`${actualPath} L${xScale(actualDays.length - 1).toFixed(1)},${(mt + ch).toFixed(1)} L${xScale(0).toFixed(1)},${(mt + ch).toFixed(1)} Z`}
          fill="url(#burnGrad)" opacity="0.25" />
      )}

      {/* Linha real (sólida roxa) */}
      {actualDays.length > 1 && (
        <path d={actualPath} fill="none" stroke="#818cf8" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Ponto do dia de hoje */}
      {todayIdx >= 0 && !days[todayIdx].isFuture && (
        <>
          <line x1={xScale(todayIdx)} y1={mt} x2={xScale(todayIdx)} y2={mt + ch}
            stroke="rgba(99,102,241,0.3)" strokeWidth="1" strokeDasharray="3,3" />
          <circle cx={xScale(todayIdx)} cy={yScale(days[todayIdx].remaining)}
            r="4" fill="#6366f1" stroke="#1a1a2e" strokeWidth="2" />
        </>
      )}

      {/* Gradiente */}
      <defs>
        <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}

interface Sprint {
  id: string
  name: string
  goal?: string | null
  startDate: string
  endDate: string
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED'
  totalPoints: number
  donePoints: number
  totalTasks: number
  doneTasks: number
}

interface RetroForm {
  wentWell: string
  improve: string
  actions: string
}

const EMPTY_RETRO: RetroForm = { wentWell: '', improve: '', actions: '' }

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  PLANNING:  { label: '📋 Planejamento', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  ACTIVE:    { label: '🚀 Em Andamento', color: '#6366f1', bg: 'rgba(99,102,241,0.15)' },
  COMPLETED: { label: '✅ Concluído',    color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
}

const EMPTY_FORM = { name: '', goal: '', startDate: '', endDate: '' }

function toDateInput(iso: string) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : ''
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function daysLeft(endDate: string) {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000)
}

export default function SprintsPage() {
  const [sprints, setSprints]         = useState<Sprint[]>([])
  const [loading, setLoading]         = useState(true)
  const [showModal, setShowModal]     = useState(false)
  const [editing, setEditing]         = useState<Sprint | null>(null)
  const [form, setForm]               = useState(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showBurndown, setShowBurndown]   = useState(false)
  const [burndown, setBurndown]           = useState<BurndownData | null>(null)
  const [loadingBurndown, setLoadingBurndown] = useState(false)

  // Retrospective
  const [showRetroModal, setShowRetroModal]   = useState(false)
  const [retroSprintId, setRetroSprintId]     = useState<string | null>(null)
  const [retroSprintName, setRetroSprintName] = useState('')
  // mode: 'close' = encerrar sprint + salvar retro | 'view' = só ver/editar retro
  const [retroMode, setRetroMode]   = useState<'close' | 'view'>('close')
  const [retroForm, setRetroForm]   = useState<RetroForm>(EMPTY_RETRO)
  const [retroSaving, setRetroSaving] = useState(false)
  const [retroLoading, setRetroLoading] = useState(false)

  const fetchSprints = useCallback(async () => {
    const res = await fetch('/api/sprints')
    const data = await res.json()
    setSprints(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchSprints() }, [fetchSprints])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowModal(true)
  }

  function openEdit(sprint: Sprint) {
    setEditing(sprint)
    setForm({
      name:      sprint.name,
      goal:      sprint.goal || '',
      startDate: toDateInput(sprint.startDate),
      endDate:   toDateInput(sprint.endDate),
    })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    setError('')
    if (!form.name || !form.startDate || !form.endDate) {
      setError('Nome, data de início e data de fim são obrigatórios')
      return
    }
    if (new Date(form.endDate) <= new Date(form.startDate)) {
      setError('Data de fim deve ser após a data de início')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(
        editing ? `/api/sprints/${editing.id}` : '/api/sprints',
        {
          method:  editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(form),
        }
      )
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao salvar sprint'); return }
      setShowModal(false)
      fetchSprints()
    } finally { setSaving(false) }
  }

  async function toggleBurndown(sprintId: string) {
    if (showBurndown) { setShowBurndown(false); return }
    setLoadingBurndown(true)
    setShowBurndown(true)
    try {
      const res = await fetch(`/api/sprints/${sprintId}/burndown`)
      const data = await res.json()
      setBurndown(data)
    } finally { setLoadingBurndown(false) }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/sprints/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status }),
    })
    fetchSprints()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/sprints/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    fetchSprints()
  }

  // ── Retro helpers ──────────────────────────────────────────────────────
  async function openRetro(sprint: Sprint, mode: 'close' | 'view') {
    setRetroSprintId(sprint.id)
    setRetroSprintName(sprint.name)
    setRetroMode(mode)
    setRetroForm(EMPTY_RETRO)
    setRetroLoading(true)
    setShowRetroModal(true)
    try {
      const res = await fetch(`/api/sprints/${sprint.id}/retrospective`)
      const data = await res.json()
      if (data) {
        setRetroForm({
          wentWell: data.wentWell || '',
          improve:  data.improve  || '',
          actions:  data.actions  || '',
        })
      }
    } finally { setRetroLoading(false) }
  }

  async function closeRetroModal() {
    setShowRetroModal(false)
    setRetroSprintId(null)
  }

  async function handleCloseWithoutRetro() {
    if (!retroSprintId) return
    await updateStatus(retroSprintId, 'COMPLETED')
    setShowRetroModal(false)
    setRetroSprintId(null)
  }

  async function handleSaveRetro(alsoClose: boolean) {
    if (!retroSprintId) return
    setRetroSaving(true)
    try {
      await fetch(`/api/sprints/${retroSprintId}/retrospective`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(retroForm),
      })
      if (alsoClose) {
        await updateStatus(retroSprintId, 'COMPLETED')
      }
      setShowRetroModal(false)
      setRetroSprintId(null)
      fetchSprints()
    } finally { setRetroSaving(false) }
  }

  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.3)' }
  const activeSprint = sprints.find(s => s.status === 'ACTIVE')

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">🗓️ Sprints</h1>
          <p className="text-slate-400">Ciclos ágeis para organizar e entregar valor</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}>
          ➕ Novo Sprint
        </button>
      </div>

      {/* ── Sprint ativo em destaque ── */}
      {activeSprint && (
        <div className="rounded-2xl p-6 mb-6"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))', border: '1px solid rgba(99,102,241,0.4)', boxShadow: '0 0 40px rgba(99,102,241,0.1)' }}>
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(99,102,241,0.3)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.5)' }}>
                  🚀 SPRINT ATIVO
                </span>
              </div>
              <h2 className="text-2xl font-black text-white">{activeSprint.name}</h2>
              {activeSprint.goal && (
                <p className="text-slate-400 text-sm mt-1">🎯 {activeSprint.goal}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              {(() => {
                const days = daysLeft(activeSprint.endDate)
                return (
                  <div>
                    <div className="text-2xl font-black"
                      style={{ color: days < 0 ? '#f87171' : days <= 2 ? '#fbbf24' : '#a5b4fc' }}>
                      {days < 0 ? 'Encerrado' : `${days}d`}
                    </div>
                    <div className="text-xs text-slate-500">
                      {days < 0 ? `há ${Math.abs(days)} dias` : 'restantes'}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-3 text-sm text-slate-400">
            <span>📅 {formatDate(activeSprint.startDate)} → {formatDate(activeSprint.endDate)}</span>
            <span>•</span>
            <span>{activeSprint.doneTasks}/{activeSprint.totalTasks} tarefas</span>
            <span>•</span>
            <span>{activeSprint.donePoints}/{activeSprint.totalPoints} pts</span>
          </div>

          <div className="w-full h-3 rounded-full overflow-hidden mb-1"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: activeSprint.totalPoints > 0
                  ? `${Math.round((activeSprint.donePoints / activeSprint.totalPoints) * 100)}%`
                  : '0%',
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              }} />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mb-5">
            <span>
              {activeSprint.totalPoints > 0
                ? Math.round((activeSprint.donePoints / activeSprint.totalPoints) * 100)
                : 0}% concluído
            </span>
            <span>{activeSprint.totalPoints - activeSprint.donePoints} pts restantes</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => toggleBurndown(activeSprint.id)}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
              style={{
                background: showBurndown ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.1)',
                color: '#a5b4fc',
                border: '1px solid rgba(99,102,241,0.4)',
              }}>
              {showBurndown ? '📊 Ocultar Burndown' : '📊 Ver Burndown'}
            </button>
            <button
              onClick={() => openEdit(activeSprint)}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
              style={{ background: 'rgba(99,102,241,0.08)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>
              ✏️ Editar
            </button>
            <button
              onClick={() => openRetro(activeSprint, 'close')}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
              ✅ Encerrar Sprint
            </button>
          </div>

          {/* ── Burndown Chart ── */}
          {showBurndown && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(99,102,241,0.2)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-white">📉 Burndown Chart</span>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#475569" strokeWidth="1.5" strokeDasharray="4,3"/></svg>
                    Ideal
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#818cf8" strokeWidth="2.5"/></svg>
                    Real
                  </span>
                </div>
              </div>
              {loadingBurndown ? (
                <div className="flex items-center justify-center h-32 text-slate-500 text-sm animate-pulse">
                  ⏳ Carregando gráfico...
                </div>
              ) : burndown ? (
                <BurndownChart data={burndown} />
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* ── Lista de sprints ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="text-slate-400 animate-pulse">⏳ Carregando sprints...</div>
        </div>
      ) : (
        <div className="space-y-3">
          {sprints.filter(s => s.status !== 'ACTIVE').map(sprint => {
            const st  = STATUS_LABEL[sprint.status]
            const pct = sprint.totalPoints > 0
              ? Math.round((sprint.donePoints / sprint.totalPoints) * 100)
              : 0
            const days = daysLeft(sprint.endDate)

            return (
              <div key={sprint.id} className="rounded-2xl p-5 transition-all hover:scale-[1.005]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: st.bg, color: st.color, border: `1px solid ${st.color}40` }}>
                        {st.label}
                      </span>
                    </div>
                    <h3 className="font-bold text-white">{sprint.name}</h3>
                    {sprint.goal && (
                      <p className="text-sm text-slate-500 mt-0.5">🎯 {sprint.goal}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                      <span>📅 {formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}</span>
                      <span>•</span>
                      <span>{sprint.doneTasks}/{sprint.totalTasks} tarefas</span>
                      <span>•</span>
                      <span>{sprint.donePoints}/{sprint.totalPoints} pts</span>
                    </div>
                    {sprint.totalPoints > 0 && (
                      <div className="mt-3 w-full h-1.5 rounded-full overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: sprint.status === 'COMPLETED'
                              ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                              : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                          }} />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {sprint.status === 'COMPLETED' && (
                      <div className="text-xs text-green-400 font-bold">{pct}% ✓</div>
                    )}
                    {sprint.status === 'PLANNING' && days > 0 && (
                      <div className="text-xs text-slate-500">{days}d até início</div>
                    )}

                    {/* Botões de ação */}
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {sprint.status === 'PLANNING' && (
                        <button
                          onClick={() => updateStatus(sprint.id, 'ACTIVE')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                          style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
                          ▶ Ativar
                        </button>
                      )}
                      {sprint.status === 'COMPLETED' && (
                        <button
                          onClick={() => openRetro(sprint, 'view')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                          style={{ background: 'rgba(34,197,94,0.08)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
                          📝 Retrospectiva
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(sprint)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                        style={{ background: 'rgba(99,102,241,0.08)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(sprint.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                        style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {sprints.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <div className="text-6xl mb-4">🗓️</div>
              <p>Nenhum sprint criado ainda.</p>
              <p className="text-sm mt-1">Crie o primeiro para começar a organizar as entregas!</p>
            </div>
          )}
        </div>
      )}

      {/* ── Modal criar / editar sprint ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6"
            style={{ background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.3)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>

            <h2 className="text-xl font-black text-white mb-6">
              {editing ? '✏️ Editar Sprint' : '➕ Novo Sprint'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nome do Sprint *</label>
                <input value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-white outline-none"
                  style={inputStyle} placeholder="Ex: Sprint 1, Sprint 23/06..." />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">🎯 Meta do Sprint</label>
                <textarea value={form.goal}
                  onChange={e => setForm(f => ({ ...f, goal: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-white outline-none resize-none"
                  style={inputStyle} rows={2}
                  placeholder="O que queremos entregar nesse ciclo?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">📅 Início *</label>
                  <input type="date" value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-white outline-none"
                    style={{ ...inputStyle, colorScheme: 'dark' }} />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">🏁 Fim *</label>
                  <input type="date" value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-white outline-none"
                    style={{ ...inputStyle, colorScheme: 'dark' }} />
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-4 px-4 py-3 rounded-xl text-sm text-red-400"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                ⚠️ {error}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-3 rounded-xl font-medium text-slate-400"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-3 rounded-xl font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar Sprint'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de Retrospectiva ── */}
      {showRetroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6"
            style={{ background: '#1a1a2e', border: '1px solid rgba(34,197,94,0.25)', boxShadow: '0 25px 50px rgba(0,0,0,0.6)' }}>

            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h2 className="text-xl font-black text-white">
                  {retroMode === 'close' ? '✅ Encerrar Sprint' : '📝 Retrospectiva'}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">{retroSprintName}</p>
              </div>
              <button onClick={closeRetroModal}
                className="text-slate-600 hover:text-slate-400 transition-colors text-xl leading-none mt-0.5">
                ✕
              </button>
            </div>

            {retroMode === 'close' && (
              <p className="text-sm text-slate-400 mb-5 pb-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                Registre as lições aprendidas antes de encerrar. Isso ajuda o time a evoluir a cada ciclo.
              </p>
            )}

            {retroLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-500 text-sm animate-pulse">
                ⏳ Carregando retrospectiva...
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {/* O que foi bem */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-green-400 mb-1.5">
                    <span className="text-base">🌟</span> O que foi bem?
                  </label>
                  <textarea
                    value={retroForm.wentWell}
                    onChange={e => setRetroForm(f => ({ ...f, wentWell: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-white outline-none resize-none text-sm"
                    style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)' }}
                    rows={3}
                    placeholder="Práticas, conquistas e pontos positivos do sprint..." />
                </div>

                {/* O que pode melhorar */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-amber-400 mb-1.5">
                    <span className="text-base">🔧</span> O que pode melhorar?
                  </label>
                  <textarea
                    value={retroForm.improve}
                    onChange={e => setRetroForm(f => ({ ...f, improve: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-white outline-none resize-none text-sm"
                    style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}
                    rows={3}
                    placeholder="Gargalos, bloqueios ou processos que podem ser ajustados..." />
                </div>

                {/* Ações para o próximo sprint */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-purple-400 mb-1.5">
                    <span className="text-base">⚡</span> Ações para o próximo sprint
                  </label>
                  <textarea
                    value={retroForm.actions}
                    onChange={e => setRetroForm(f => ({ ...f, actions: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-white outline-none resize-none text-sm"
                    style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)' }}
                    rows={3}
                    placeholder="Itens concretos de melhoria para o próximo ciclo..." />
                </div>
              </div>
            )}

            {/* Botões */}
            {!retroLoading && (
              <div className="flex gap-3 mt-6">
                {retroMode === 'close' ? (
                  <>
                    <button
                      onClick={handleCloseWithoutRetro}
                      disabled={retroSaving}
                      className="flex-1 py-3 rounded-xl font-medium text-slate-400 text-sm disabled:opacity-50"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      Encerrar sem retro
                    </button>
                    <button
                      onClick={() => handleSaveRetro(true)}
                      disabled={retroSaving}
                      className="flex-1 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all hover:scale-105"
                      style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 15px rgba(34,197,94,0.2)' }}>
                      {retroSaving ? 'Salvando...' : '💾 Salvar e Encerrar'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={closeRetroModal}
                      className="flex-1 py-3 rounded-xl font-medium text-slate-400 text-sm"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleSaveRetro(false)}
                      disabled={retroSaving}
                      className="flex-1 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-all hover:scale-105"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 15px rgba(99,102,241,0.2)' }}>
                      {retroSaving ? 'Salvando...' : '💾 Salvar Retrospectiva'}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Confirmar exclusão ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 text-center"
            style={{ background: '#1a1a2e', border: '1px solid rgba(239,68,68,0.3)' }}>
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-white mb-2">Excluir Sprint?</h2>
            <p className="text-slate-400 text-sm mb-6">As tarefas do sprint serão desvinculadas (não excluídas).</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl font-medium text-slate-400"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
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
