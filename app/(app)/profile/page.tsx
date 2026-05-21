'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

interface UserProfile {
  id: string
  name: string
  username: string
  role: string
  totalPoints: number
  avatarUrl: string | null
}

function Avatar({ avatarUrl, name, size = 80 }: { avatarUrl?: string | null; name: string; size?: number }) {
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-2xl object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        unoptimized
      />
    )
  }
  return (
    <div
      className="rounded-2xl flex items-center justify-center font-black text-white flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        fontSize: size * 0.3,
      }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

function InputField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string
  type?: string
  value: string
  onChange?: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-all"
        style={
          disabled
            ? { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', color: '#475569', cursor: 'not-allowed' }
            : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }
        }
      />
    </div>
  )
}

function Feedback({ msg }: { msg: { ok: boolean; text: string } }) {
  return (
    <div
      className="px-4 py-3 rounded-xl text-sm font-medium"
      style={{
        background: msg.ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
        color: msg.ok ? '#4ade80' : '#f87171',
        border: `1px solid ${msg.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
      }}>
      {msg.ok ? '✅ ' : '❌ '}{msg.text}
    </div>
  )
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading]  = useState(true)

  // ── Perfil ──────────────────────────────────────────────────────
  const [name,      setName]      = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // ── Senha ───────────────────────────────────────────────────────
  const [currentPwd,  setCurrentPwd]  = useState('')
  const [newPwd,      setNewPwd]      = useState('')
  const [confirmPwd,  setConfirmPwd]  = useState('')
  const [savingPwd,   setSavingPwd]   = useState(false)
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        setProfile(data)
        setName(data.name || '')
        setAvatarUrl(data.avatarUrl || null)
        setLoading(false)
      })
  }, [])

  // ── Upload de avatar ───────────────────────────────────────────
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setProfileMsg(null)
    const fd = new FormData()
    fd.append('file', file)

    // 1. Upload to Vercel Blob
    const uploadRes  = await fetch('/api/upload', { method: 'POST', body: fd })
    const uploadData = await uploadRes.json()

    if (!uploadData.url) {
      setProfileMsg({ ok: false, text: uploadData.error || 'Erro ao enviar imagem' })
      setUploading(false)
      e.target.value = ''
      return
    }

    // 2. Auto-save avatarUrl to the database immediately
    const newUrl = uploadData.url
    setAvatarUrl(newUrl)

    const saveRes  = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, avatarUrl: newUrl }),
    })
    const saveData = await saveRes.json()

    if (saveRes.ok) {
      setProfile(saveData)
      setProfileMsg({ ok: true, text: 'Avatar atualizado com sucesso!' })
    } else {
      setProfileMsg({ ok: false, text: saveData.error || 'Erro ao salvar avatar' })
    }

    setUploading(false)
    // reset input so the same file can be re-selected
    e.target.value = ''
  }

  // ── Salvar perfil ──────────────────────────────────────────────
  async function handleSaveProfile() {
    setSaving(true)
    setProfileMsg(null)
    const res  = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, avatarUrl }),
    })
    const data = await res.json()
    setSaving(false)
    if (res.ok) {
      setProfile(data)
      setProfileMsg({ ok: true, text: 'Perfil atualizado com sucesso!' })
    } else {
      setProfileMsg({ ok: false, text: data.error || 'Erro ao atualizar perfil' })
    }
  }

  // ── Alterar senha ──────────────────────────────────────────────
  async function handleSavePassword() {
    if (newPwd !== confirmPwd) {
      setPasswordMsg({ ok: false, text: 'As senhas não coincidem' })
      return
    }
    setSavingPwd(true)
    setPasswordMsg(null)
    const res  = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
    })
    const data = await res.json()
    setSavingPwd(false)
    if (res.ok) {
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
      setPasswordMsg({ ok: true, text: 'Senha alterada com sucesso!' })
    } else {
      setPasswordMsg({ ok: false, text: data.error || 'Erro ao alterar senha' })
    }
  }

  // ── Render ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-slate-400 text-lg animate-pulse">⏳ Carregando perfil...</div>
      </div>
    )
  }

  if (!profile) return null

  const isDirty = name !== profile.name

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">👤 Meu Perfil</h1>
        <p className="text-slate-400">Personalize sua conta e gerencie suas credenciais.</p>
      </div>

      {/* ── Seção: Avatar + Dados ── */}
      <div
        className="rounded-2xl p-6 mb-5"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Avatar + info */}
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            <Avatar avatarUrl={avatarUrl} name={name || profile.username} size={80} />

            {/* Botão câmera */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all hover:scale-110 disabled:opacity-60"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: '2px solid #0f0f1a',
                boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
              }}
              title="Alterar foto">
              {uploading ? '⏳' : '📷'}
            </button>
          </div>

          <div>
            <div className="text-xl font-black text-white leading-tight">{profile.name}</div>
            <div className="text-sm text-slate-500 mb-2">@{profile.username}</div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-xs px-2.5 py-1 rounded-full font-bold"
                style={{
                  background: profile.role === 'admin' ? 'rgba(251,191,36,0.15)' : 'rgba(99,102,241,0.15)',
                  color:      profile.role === 'admin' ? '#fbbf24' : '#a5b4fc',
                }}>
                {profile.role === 'admin' ? '👑 Admin' : '⚔️ Membro'}
              </span>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-bold"
                style={{ background: 'rgba(139,92,246,0.15)', color: '#c084fc' }}>
                ⭐ {profile.totalPoints} pts totais
              </span>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleAvatarChange}
        />

        {/* Campos */}
        <div className="space-y-4">
          <InputField
            label="Nome de exibição"
            value={name}
            onChange={setName}
            placeholder="Seu nome"
          />
          <InputField
            label="Username"
            value={profile.username}
            disabled
          />
        </div>

        {uploading && (
          <div className="mt-4 text-xs text-purple-400 animate-pulse">⏳ Enviando imagem...</div>
        )}

        {profileMsg && (
          <div className="mt-4">
            <Feedback msg={profileMsg} />
          </div>
        )}

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={handleSaveProfile}
            disabled={saving || uploading || !isDirty}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
            }}>
            {saving ? '⏳ Salvando...' : '💾 Salvar Perfil'}
          </button>

        </div>
      </div>

      {/* ── Seção: Alterar Senha ── */}
      <div
        className="rounded-2xl p-6"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>

        <div className="flex items-center gap-2 mb-5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' }}>
            🔑
          </div>
          <h2 className="text-lg font-black text-white">Alterar Senha</h2>
        </div>

        <div className="space-y-4">
          <InputField
            label="Senha Atual"
            type="password"
            value={currentPwd}
            onChange={setCurrentPwd}
            placeholder="••••••••"
          />
          <InputField
            label="Nova Senha"
            type="password"
            value={newPwd}
            onChange={setNewPwd}
            placeholder="••••••••"
          />
          <InputField
            label="Confirmar Nova Senha"
            type="password"
            value={confirmPwd}
            onChange={setConfirmPwd}
            placeholder="••••••••"
          />
        </div>

        {passwordMsg && (
          <div className="mt-4">
            <Feedback msg={passwordMsg} />
          </div>
        )}

        <button
          onClick={handleSavePassword}
          disabled={savingPwd || !currentPwd || !newPwd || !confirmPwd}
          className="mt-5 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            boxShadow: '0 4px 15px rgba(239,68,68,0.2)',
          }}>
          {savingPwd ? '⏳ Alterando...' : '🔑 Alterar Senha'}
        </button>
      </div>
    </div>
  )
}
