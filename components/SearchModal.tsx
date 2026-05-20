'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface SearchTask {
  id: string
  title: string
  status: string
  difficulty: string
  clientName: string | null
  deadline: string | null
  assignedTo: { id: string; name: string; avatarUrl: string | null } | null
  sprint: { id: string; name: string } | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:     { label: 'A Fazer',       color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  IN_PROGRESS: { label: 'Em Andamento',  color: '#a5b4fc', bg: 'rgba(99,102,241,0.12)'  },
  IN_REVIEW:   { label: 'Em Revisão',    color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
  DONE:        { label: 'Concluído',     color: '#4ade80', bg: 'rgba(34,197,94,0.12)'   },
}

const DIFF_CONFIG: Record<string, { label: string; color: string }> = {
  EASY:   { label: '🗡️ Fácil',   color: '#4ade80' },
  MEDIUM: { label: '⚔️ Médio',   color: '#fbbf24' },
  HARD:   { label: '🔥 Difícil', color: '#f87171' },
}

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<SearchTask[]>([])
  const [loading,  setLoading]  = useState(false)
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)
  const router   = useRouter()

  // Foca o input ao abrir e reseta estado
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Busca com debounce de 300 ms
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(d => {
          setResults(d.results || [])
          setSelected(0)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Scroll do item selecionado para a view
  useEffect(() => {
    const el = listRef.current?.children[selected] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  // Navegação por teclado
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape')    { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && results[selected]) navigate(results[selected])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, results, selected]) // eslint-disable-line react-hooks/exhaustive-deps

  function navigate(task: SearchTask) {
    onClose()
    router.push('/tasks')
  }

  if (!open) return null

  const showEmpty   = query.length >= 2 && !loading && results.length === 0
  const showHint    = query.length < 2
  const showResults = results.length > 0

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center"
      style={{ paddingTop: '12vh', background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>

      <div
        className="w-full max-w-xl mx-4 rounded-2xl overflow-hidden"
        style={{
          background:  '#131320',
          border:      '1px solid rgba(99,102,241,0.35)',
          boxShadow:   '0 30px 90px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.1)',
        }}
        onClick={e => e.stopPropagation()}>

        {/* ── Input ── */}
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-lg flex-shrink-0" style={{ color: '#6366f1' }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar tarefas por título, cliente ou descrição..."
            className="flex-1 bg-transparent text-white text-sm placeholder-slate-600 focus:outline-none"
          />
          {loading
            ? <span className="text-xs text-slate-600 animate-pulse flex-shrink-0">buscando...</span>
            : <kbd
                className="text-xs px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#475569', border: '1px solid rgba(255,255,255,0.08)' }}>
                Esc
              </kbd>
          }
        </div>

        {/* ── Resultados ── */}
        {showResults && (
          <div ref={listRef} className="max-h-[26rem] overflow-y-auto py-1.5">
            {results.map((task, i) => {
              const status = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.PENDING
              const diff   = DIFF_CONFIG[task.difficulty]  ?? DIFF_CONFIG.EASY
              const isSelected = i === selected

              return (
                <button
                  key={task.id}
                  onClick={() => navigate(task)}
                  onMouseEnter={() => setSelected(i)}
                  className="w-full flex items-start gap-3 px-5 py-3 text-left transition-colors"
                  style={{ background: isSelected ? 'rgba(99,102,241,0.1)' : 'transparent' }}>

                  {/* Ícone de status */}
                  <div
                    className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: status.color, marginTop: 6 }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{task.title}</div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{ background: status.bg, color: status.color }}>
                        {status.label}
                      </span>
                      <span className="text-xs font-medium" style={{ color: diff.color }}>
                        {diff.label}
                      </span>
                      {task.assignedTo && (
                        <span className="text-xs text-slate-500">
                          👤 {task.assignedTo.name}
                        </span>
                      )}
                      {task.sprint && (
                        <span className="text-xs text-slate-600">
                          🗓️ {task.sprint.name}
                        </span>
                      )}
                      {task.clientName && (
                        <span className="text-xs text-slate-600">
                          🏢 {task.clientName}
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className="flex-shrink-0 text-xs mt-1 transition-opacity"
                    style={{ color: isSelected ? '#6366f1' : 'transparent' }}>
                    ↵
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* ── Sem resultados ── */}
        {showEmpty && (
          <div className="py-12 text-center">
            <div className="text-4xl mb-3">🔎</div>
            <p className="text-sm text-slate-500">
              Nenhuma tarefa encontrada para{' '}
              <span className="text-slate-300 font-semibold">"{query}"</span>
            </p>
          </div>
        )}

        {/* ── Dica inicial ── */}
        {showHint && (
          <div className="py-8 text-center">
            <p className="text-xs text-slate-600 mb-4">
              {query.length === 1 ? 'Digite mais um caractere...' : 'Digite para começar a busca'}
            </p>
            <div className="flex items-center justify-center gap-5 text-xs" style={{ color: '#334155' }}>
              <span><kbd className="font-mono">↑↓</kbd> navegar</span>
              <span><kbd className="font-mono">↵</kbd> abrir</span>
              <span><kbd className="font-mono">Esc</kbd> fechar</span>
            </div>
          </div>
        )}

        {/* ── Rodapé com contagem ── */}
        {showResults && (
          <div
            className="px-5 py-2.5 flex items-center justify-between text-xs"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#334155' }}>
            <span>{results.length} resultado{results.length !== 1 ? 's' : ''}</span>
            <span>Ctrl+K para fechar</span>
          </div>
        )}
      </div>
    </div>
  )
}
