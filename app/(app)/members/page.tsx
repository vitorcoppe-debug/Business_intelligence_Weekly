'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'

interface Member {
  id: string
  name: string
  username: string
  role: string
  totalPoints: number
  avatarUrl?: string | null
}

const EMPTY_FORM = { name: '', username: '', password: '', role: 'member', avatarUrl: '' }

/** Exibe avatar com fallback para iniciais */
function Avatar({
  avatarUrl, name, size = 56, className = '',
}: { avatarUrl?: string | null; name: string; size?: number; className?: string }) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className={`rounded-2xl object-cover flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className={`rounded-2xl flex items-center justify-center font-black text-white flex-shrink-0 ${className}`}
      style={{
        width: size, height: size,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        fontSize: size * 0.3,
      }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // usuário logado
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null)
  const isAdmin = currentUser?.role === 'admin'

  // avatar upload state
  const [avatarPreview, setAvatarPreview] = useState<string>('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchMembers = useCallback(async () => {
    const res = await fetch('/api/members')
    const data = await res.json()
    setMembers(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchMembers()
    fetch('/api/profile').then(r => r.json()).then(d => setCurrentUser({ id: d.id, role: d.role }))
  }, [fetchMembers])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setAvatarPreview('')
    setError('')
    setShowModal(true)
  }

  function openEdit(m: Member) {
    setEditing(m)
    setForm({ name: m.name, username: m.username, password: '', role: m.role, avatarUrl: m.avatarUrl || '' })
    setAvatarPreview(m.avatarUrl || '')
    setError('')
    setShowModal(true)
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // local preview imediato
    setAvatarPreview(URL.createObjectURL(file))
    setUploading(true)
    setError('')

    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro no upload')
        setAvatarPreview(form.avatarUrl) // reverte preview
        return
      }
      setForm(f => ({ ...f, avatarUrl: data.url }))
      setAvatarPreview(data.url)
    } finally {
      setUploading(false)
      // limpa o input para permitir selecionar o mesmo arquivo novamente
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSave() {
    setError('')
    if (!form.name || !form.username || (!editing && !form.password)) {
      setError('Preencha todos os campos obrigatórios')
      return
    }
    if (uploading) {
      setError('Aguarde o upload da imagem terminar')
      return
    }
    setSaving(true)
    try {
      const body: Record<string, string | null> = {
        name: form.name,
        username: form.username,
        role: form.role,
        avatarUrl: form.avatarUrl || null,
      }
      if (form.password) body.password = form.password

      const res = await fetch(editing ? `/api/members/${editing.id}` : '/api/members', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar')
        return
      }
      setShowModal(false)
      fetchMembers()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/members/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setDeleteConfirm(null)
      fetchMembers()
    }
  }

  const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.3)' }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white mb-1">👥 Time B.I.</h1>
          <p className="text-slate-400">Gerencie os membros do time</p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}>
            ➕ Novo Membro
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="text-slate-400 animate-pulse">⏳ Carregando...</div>
        </div>
      ) : (
        <div className="grid gap-4">
          {members.map(member => (
            <div key={member.id}
              className="rounded-2xl p-5 flex items-center gap-4 transition-all hover:scale-[1.005]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>

              <Avatar avatarUrl={member.avatarUrl} name={member.name} size={56} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{member.name}</span>
                  {member.role === 'admin' && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>
                      👑 Admin
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-500">@{member.username}</div>
              </div>

              <div className="text-center px-4">
                <div className="text-2xl font-black text-purple-400">{member.totalPoints}</div>
                <div className="text-xs text-slate-500">pontos totais</div>
              </div>

              {isAdmin && (
                <div className="flex gap-2">
                  <button onClick={() => openEdit(member)}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                    style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>
                    ✏️ Editar
                  </button>
                  <button onClick={() => setDeleteConfirm(member.id)}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                    🗑️ Excluir
                  </button>
                </div>
              )}
            </div>
          ))}

          {members.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <div className="text-6xl mb-4">👤</div>
              <p>Nenhum membro cadastrado ainda.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Modal criar/editar ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ background: '#1a1a2e', border: '1px solid rgba(99,102,241,0.3)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>

            <h2 className="text-xl font-black text-white mb-6">
              {editing ? '✏️ Editar Membro' : '➕ Novo Membro'}
            </h2>

            {/* ── Upload de avatar ── */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                {/* avatar preview */}
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Avatar"
                    width={96}
                    height={96}
                    className="rounded-2xl object-cover"
                    style={{ width: 96, height: 96 }}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl flex items-center justify-center font-black text-white text-2xl"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                    {form.name ? form.name.slice(0, 2).toUpperCase() : '?'}
                  </div>
                )}

                {/* overlay ao hover */}
                <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.6)' }}>
                  {uploading
                    ? <span className="text-white text-xs animate-pulse">⏳</span>
                    : <>
                        <span className="text-2xl">📷</span>
                        <span className="text-white text-xs mt-1 font-medium">Alterar</span>
                      </>}
                </div>

                {/* badge de upload em andamento */}
                {uploading && (
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: '#6366f1' }}>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500 mt-3 text-center">
                Clique para {avatarPreview ? 'trocar a foto' : 'adicionar uma foto'}<br />
                <span className="text-slate-600">JPEG, PNG, WEBP ou GIF · máx. 5 MB</span>
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
              />

              {/* botão de remover avatar (só quando há imagem) */}
              {form.avatarUrl && (
                <button
                  onClick={() => { setForm(f => ({ ...f, avatarUrl: '' })); setAvatarPreview('') }}
                  className="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors">
                  🗑️ Remover foto
                </button>
              )}
            </div>

            {/* ── Campos de texto ── */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nome Completo *</label>
                <input value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-white outline-none"
                  style={inputStyle} placeholder="Nome completo" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Username *</label>
                <input value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-white outline-none"
                  style={inputStyle} placeholder="username_sem_espacos" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Senha {editing ? '(deixe em branco para manter)' : '*'}
                </label>
                <input type="password" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-white outline-none"
                  style={inputStyle} placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Papel</label>
                <select value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-white outline-none"
                  style={{ background: '#1e1e38', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <option value="member">⚔️ Membro</option>
                  <option value="admin">👑 Admin</option>
                </select>
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
                className="flex-1 py-3 rounded-xl font-medium text-slate-400 transition-colors hover:text-white"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving || uploading}
                className="flex-1 py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                {saving ? 'Salvando...' : uploading ? 'Aguardando upload...' : 'Salvar'}
              </button>
            </div>
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
            <h2 className="text-xl font-bold text-white mb-2">Confirmar exclusão</h2>
            <p className="text-slate-400 text-sm mb-6">Esta ação não pode ser desfeita.</p>
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
