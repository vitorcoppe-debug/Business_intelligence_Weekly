'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { proxyBlobUrl } from '@/lib/blobUrl'

interface AppNavProps {
  username: string
  role: string
  isOpen?: boolean
  onClose?: () => void
  onSearchOpen?: () => void
}

interface NavUserInfo {
  name: string
  avatarUrl: string | null
  totalPoints: number
}

const NAV_ITEMS = [
  { href: '/dashboard', icon: '🏆', label: 'Ranking' },
  { href: '/sprints',   icon: '🗓️', label: 'Sprints' },
  { href: '/tasks',     icon: '📋', label: 'Demandas' },
  { href: '/my-tasks',  icon: '🎯', label: 'Minhas Tarefas' },
  { href: '/members',   icon: '👥', label: 'Membros' },
]

function UserAvatar({ avatarUrl, name, size = 36 }: { avatarUrl?: string | null; name: string; size?: number }) {
  const src = proxyBlobUrl(avatarUrl)
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-xl object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        unoptimized
      />
    )
  }
  return (
    <div
      className="rounded-xl flex items-center justify-center font-black text-white flex-shrink-0"
      style={{
        width: size, height: size,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        fontSize: size * 0.33,
      }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

export default function AppNav({ username, role, isOpen = false, onClose, onSearchOpen }: AppNavProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const [userInfo, setUserInfo] = useState<NavUserInfo | null>(null)

  // Busca nome + avatar do usuário logado
  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setUserInfo({ name: d.name, avatarUrl: d.avatarUrl, totalPoints: d.totalPoints })
      })
      .catch(() => null)
  }, [pathname]) // refetch ao navegar (captura mudanças salvas no perfil)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  function handleNavClick() {
    onClose?.()
  }

  const displayName = userInfo?.name || username

  return (
    <aside
      className={[
        'fixed left-0 top-0 h-full w-64 flex flex-col z-50',
        'transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      ].join(' ')}
      style={{
        background:     'rgba(15,15,26,0.98)',
        borderRight:    '1px solid rgba(99,102,241,0.15)',
        backdropFilter: 'blur(20px)',
      }}>

      {/* ── Logo ── */}
      <div className="p-6 border-b" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            🧠
          </div>
          <div>
            <div className="font-black text-white text-lg leading-none">Weekly</div>
            <div className="text-purple-400 font-bold text-sm">Quest</div>
          </div>
        </div>
      </div>

      {/* ── Busca ── */}
      <div className="px-4 pt-4">
        <button
          onClick={() => { onSearchOpen?.(); onClose?.() }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all hover:scale-[1.01]"
          style={{
            background: 'rgba(99,102,241,0.08)',
            border:     '1px solid rgba(99,102,241,0.18)',
            color:      '#64748b',
          }}>
          <span>🔍</span>
          <span className="flex-1 text-left text-slate-500">Buscar tarefas...</span>
          <kbd
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#334155', border: '1px solid rgba(255,255,255,0.07)' }}>
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleNavClick}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all"
              style={{
                background: active
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))'
                  : 'transparent',
                color:  active ? '#a5b4fc' : '#64748b',
                border: active
                  ? '1px solid rgba(99,102,241,0.3)'
                  : '1px solid transparent',
              }}>
              <span className="text-lg">{item.icon}</span>
              {item.label}
              {active && <span className="ml-auto w-2 h-2 rounded-full bg-purple-400" />}
            </Link>
          )
        })}
      </nav>

      {/* ── Footer: card do usuário + sair ── */}
      <div className="p-4 border-t" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>

        {/* Card clicável → /profile */}
        <Link
          href="/profile"
          onClick={handleNavClick}
          className="flex items-center gap-3 px-3 py-3 rounded-xl mb-2 transition-all group"
          style={{
            background: pathname === '/profile'
              ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))'
              : 'rgba(99,102,241,0.08)',
            border: pathname === '/profile'
              ? '1px solid rgba(99,102,241,0.4)'
              : '1px solid rgba(99,102,241,0.15)',
          }}>
          <UserAvatar avatarUrl={userInfo?.avatarUrl} name={displayName} size={36} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">{displayName}</div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <span>{role === 'admin' ? '👑 Admin' : '⚔️ Membro'}</span>
              {userInfo?.totalPoints !== undefined && (
                <span className="text-purple-400">· ⭐ {userInfo.totalPoints}</span>
              )}
            </div>
          </div>
          <span className="text-slate-600 group-hover:text-slate-400 transition-colors text-xs">✏️</span>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-500 hover:text-red-400 transition-colors"
          style={{ border: '1px solid rgba(239,68,68,0.1)' }}>
          🚪 Sair
        </button>
      </div>
    </aside>
  )
}
