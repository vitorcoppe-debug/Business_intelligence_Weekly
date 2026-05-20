'use client'

import { useState, useEffect } from 'react'
import AppNav from './AppNav'
import SearchModal from './SearchModal'

interface AppShellProps {
  children: React.ReactNode
  username: string
  role: string
}

export default function AppShell({ children, username, role }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen,  setSearchOpen]  = useState(false)

  // Atalho global Ctrl+K / Cmd+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0f2e 100%)' }}>

      {/* ── Backdrop mobile ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Search Modal ── */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* ── Sidebar ── */}
      <AppNav
        username={username}
        role={role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSearchOpen={() => setSearchOpen(true)}
      />

      {/* ── Área principal ── */}
      <div className="flex-1 flex flex-col md:ml-64">

        {/* Top bar — só mobile */}
        <header
          className="md:hidden flex items-center gap-3 px-4 h-14 sticky top-0 z-30 flex-shrink-0"
          style={{
            background: 'rgba(15,15,26,0.95)',
            borderBottom: '1px solid rgba(99,102,241,0.15)',
            backdropFilter: 'blur(20px)',
          }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex flex-col gap-1.5 p-2 rounded-lg transition-colors"
            style={{ color: '#a5b4fc' }}
            aria-label="Abrir menu">
            <span className="block w-5 h-0.5 rounded-full bg-current" />
            <span className="block w-5 h-0.5 rounded-full bg-current" />
            <span className="block w-3.5 h-0.5 rounded-full bg-current" />
          </button>

          <div className="flex items-center gap-2 flex-1">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              🧠
            </div>
            <span className="font-black text-white text-base leading-none">
              Weekly<span className="text-purple-400">Quest</span>
            </span>
          </div>

          {/* Botão de busca — mobile */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
            style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}
            aria-label="Buscar">
            🔍 <span className="hidden xs:inline">Buscar</span>
          </button>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
