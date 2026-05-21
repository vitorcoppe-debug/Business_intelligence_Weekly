'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

interface SprintVelocity {
  id: string
  name: string
  status: string
  startDate: string
  endDate: string
  totalPoints: number
  donePoints: number
  totalTasks: number
  doneTasks: number
}

interface RankedUser {
  id: string
  name: string
  username: string
  totalPoints: number
  periodPoints: number
  avatarUrl?: string | null
}

function Avatar({ avatarUrl, name, size = 40 }: { avatarUrl?: string | null; name: string; size?: number }) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-xl object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-xl flex items-center justify-center font-black text-white flex-shrink-0"
      style={{
        width: size, height: size,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        fontSize: size * 0.3,
      }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

const MEDALS = ['🥇', '🥈', '🥉']
const RANK_COLORS = ['#fbbf24', '#94a3b8', '#f97316']
const RANK_BG = [
  'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(251,191,36,0.05))',
  'linear-gradient(135deg, rgba(148,163,184,0.1), rgba(148,163,184,0.03))',
  'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(249,115,22,0.04))',
]

const FILTER_LABELS: Record<string, string> = {
  month: 'Mês Atual',
  quarter: 'Trimestre Atual',
}

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

export default function DashboardPage() {
  const now = new Date()
  const [mode,         setMode]         = useState<'month' | 'quarter'>('month')
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth,setSelectedMonth]= useState(now.getMonth()) // 0-indexed
  const [ranking, setRanking] = useState<RankedUser[]>([])
  const [sprints, setSprints] = useState<SprintVelocity[]>([])
  const [loading, setLoading] = useState(true)

  // monta o parâmetro de filtro para a API
  const filterParam = mode === 'quarter'
    ? 'quarter'
    : `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`

  const fetchRanking = useCallback(async () => {
    setLoading(true)
    try {
      const [rankRes, sprintRes] = await Promise.all([
        fetch(`/api/ranking?filter=${filterParam}`),
        fetch('/api/sprints'),
      ])
      const [rankData, sprintData] = await Promise.all([rankRes.json(), sprintRes.json()])
      setRanking(rankData.ranking || [])
      setSprints(sprintData || [])
    } finally {
      setLoading(false)
    }
  }, [filterParam])

  useEffect(() => { fetchRanking() }, [fetchRanking])

  const maxPoints = Math.max(...ranking.map(u => u.periodPoints), 1)

  // navegação de mês
  function prevMonth() {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1) }
    else setSelectedMonth(m => m - 1)
  }
  function nextMonth() {
    const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth()
    if (isCurrentMonth) return // não vai além do mês atual
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1) }
    else setSelectedMonth(m => m + 1)
  }
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === now.getMonth()

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">
          🏆 Leaderboard
        </h1>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-wrap items-center gap-3 mb-8">

        {/* Seletor de mês */}
        <div
          className="flex items-center rounded-xl overflow-hidden"
          style={{
            background: mode === 'month' ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))' : 'rgba(255,255,255,0.05)',
            border: mode === 'month' ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.08)',
          }}>

          {/* ‹ mês anterior */}
          <button
            onClick={() => { setMode('month'); prevMonth() }}
            className="px-3 py-2 text-lg leading-none hover:text-white transition-colors"
            style={{ color: '#94a3b8' }}
            title="Mês anterior">
            ‹
          </button>

          {/* label do mês — clicar ativa o modo mês */}
          <button
            onClick={() => setMode('month')}
            className="px-2 py-2 text-sm font-bold min-w-[130px] text-center transition-colors"
            style={{ color: mode === 'month' ? '#fff' : '#64748b' }}>
            {MONTHS[selectedMonth]} {selectedYear}
          </button>

          {/* › próximo mês (desabilitado no mês atual) */}
          <button
            onClick={() => { setMode('month'); nextMonth() }}
            disabled={isCurrentMonth}
            className="px-3 py-2 text-lg leading-none transition-colors disabled:cursor-not-allowed"
            style={{ color: isCurrentMonth ? '#1e293b' : '#94a3b8' }}
            title="Próximo mês">
            ›
          </button>
        </div>

        {/* Trimestre */}
        <button
          onClick={() => setMode('quarter')}
          className="px-5 py-2 rounded-xl text-sm font-bold transition-all"
          style={{
            background: mode === 'quarter' ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)',
            color:  mode === 'quarter' ? '#fff' : '#64748b',
            border: mode === 'quarter' ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: mode === 'quarter' ? '0 4px 15px rgba(99,102,241,0.3)' : 'none',
          }}>
          Trimestre Atual
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="text-slate-400 text-lg animate-pulse">⏳ Carregando ranking...</div>
        </div>
      ) : ranking.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <div className="text-6xl mb-4">📊</div>
          <p>Nenhum ponto acumulado no período.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ranking.map((user, index) => (
            <div
              key={user.id}
              className="relative rounded-2xl p-5 transition-all hover:scale-[1.01]"
              style={{
                background: index < 3
                  ? RANK_BG[index]
                  : 'rgba(255,255,255,0.03)',
                border: index < 3
                  ? `1px solid ${RANK_COLORS[index]}30`
                  : '1px solid rgba(255,255,255,0.06)',
                boxShadow: index === 0
                  ? '0 0 30px rgba(251,191,36,0.1)'
                  : 'none',
              }}>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-2xl text-2xl font-black"
                  style={{
                    background: index < 3
                      ? `${RANK_COLORS[index]}20`
                      : 'rgba(99,102,241,0.1)',
                    color: index < 3 ? RANK_COLORS[index] : '#6366f1',
                    border: `1px solid ${index < 3 ? RANK_COLORS[index] : '#6366f1'}30`,
                  }}>
                  {index < 3 ? MEDALS[index] : `#${index + 1}`}
                </div>

                <Avatar avatarUrl={user.avatarUrl} name={user.name} size={40} />

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white">{user.name}</div>
                  <div className="text-xs text-slate-500">@{user.username}</div>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.round((user.periodPoints / maxPoints) * 100)}%`,
                          background: index < 3
                            ? `linear-gradient(90deg, ${RANK_COLORS[index]}, ${RANK_COLORS[index]}80)`
                            : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                        }} />
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-black"
                    style={{ color: index < 3 ? RANK_COLORS[index] : '#a5b4fc' }}>
                    {user.periodPoints}
                  </div>
                  <div className="text-xs text-slate-500">pts período</div>
                  <div className="text-xs text-slate-600 mt-1">
                    Total: {user.totalPoints} pts
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Velocidade por Sprint ── */}
      {sprints.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-black text-white mb-4">⚡ Velocidade por Sprint</h2>
          <div className="space-y-3">
            {sprints.slice(0, 5).map(s => {
              const pct = s.totalPoints > 0 ? Math.round((s.donePoints / s.totalPoints) * 100) : 0
              const isActive = s.status === 'ACTIVE'
              const isDone = s.status === 'COMPLETED'
              return (
                <div key={s.id} className="rounded-xl p-4"
                  style={{
                    background: isActive ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                    border: isActive ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{s.name}</span>
                      {isActive && (
                        <span className="text-xs px-1.5 py-0.5 rounded font-bold"
                          style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }}>
                          🚀 ativo
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-black" style={{ color: isDone ? '#4ade80' : isActive ? '#a5b4fc' : '#64748b' }}>
                      {s.donePoints}<span className="text-xs font-normal text-slate-600">/{s.totalPoints} pts</span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: isDone
                          ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                          : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                      }} />
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs text-slate-600">
                    <span>{s.doneTasks}/{s.totalTasks} tarefas concluídas</span>
                    <span>{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: '🗡️', label: 'Fácil', pts: '1 ponto', color: '#22c55e' },
          { icon: '⚔️', label: 'Médio', pts: '3 pontos', color: '#f59e0b' },
          { icon: '🔥', label: 'Difícil', pts: '5 pontos', color: '#ef4444' },
        ].map(item => (
          <div key={item.label} className="rounded-xl p-4 text-center"
            style={{ background: `${item.color}10`, border: `1px solid ${item.color}30` }}>
            <div className="text-2xl mb-1">{item.icon}</div>
            <div className="font-bold text-sm" style={{ color: item.color }}>{item.label}</div>
            <div className="text-xs text-slate-500">{item.pts}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
