import { useState, useEffect } from 'react'

// Browser-side accounts (localStorage). Passwords are salted + SHA-256 hashed, but this is NOT
// server security: anyone with access to the browser can read/alter the data. Move to a real
// backend (see README) before handling real customers or money.
const UK = 'agri_users_v1', SK = 'agri_session_v1'
export const ROLES = { farmer: 'Farmer', foreman: 'Foreman', customer: 'Customer', admin: 'Administrator' }
export const HOME = { farmer: 'workspace', foreman: 'workspace', customer: 'workspace', admin: 'workspace' }
const rid = () => Math.random().toString(36).slice(2, 10)
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }

async function hash(pw, salt) {
  const text = salt + ':' + pw
  if (globalThis.crypto?.subtle) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
    return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
  }
  return 'x' + btoa(unescape(encodeURIComponent(text)))
}
async function mk(f) {
  const salt = rid() + rid()
  return { id: rid(), status: 'active', created: new Date().toISOString().slice(0, 10), phone: '', location: '', ...f, email: f.email.trim().toLowerCase(), name: f.name.trim(), salt, hash: await hash(f.password, salt), password: undefined }
}

export function useAuth() {
  const [users, setUsers] = useState(() => read(UK, []))
  const [sid, setSid] = useState(() => localStorage.getItem(SK))
  useEffect(() => { try { localStorage.setItem(UK, JSON.stringify(users)) } catch {} }, [users])
  useEffect(() => { try { sid ? localStorage.setItem(SK, sid) : localStorage.removeItem(SK) } catch {} }, [sid])
  // first run: create the default administrator (must change password at first login)
  useEffect(() => {
    if (!users.length) mk({ name: 'Administrator', email: 'admin@agritrade.zw', password: 'Admin@123', role: 'admin', mustChange: true }).then((a) => setUsers((u) => (u.length ? u : [a])))
  }, [])

  const user = users.find((u) => u.id === sid && u.status === 'active') || null
  const patch = (id, p) => setUsers((us) => us.map((u) => (u.id === id ? { ...u, ...p } : u)))
  const lastAdmin = (id) => users.find((u) => u.id === id)?.role === 'admin' && users.filter((u) => u.role === 'admin' && u.status === 'active').length < 2

  const add = async (f, allowed) => {
    if (!f.name?.trim() || !f.email?.trim()) return { error: 'Name and email are required' }
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return { error: 'Enter a valid email address' }
    if ((f.password || '').length < 8) return { error: 'Password must be at least 8 characters' }
    if (!allowed.includes(f.role)) return { error: 'That account type is not allowed' }
    if (users.some((u) => u.email === f.email.trim().toLowerCase())) return { error: 'That email is already registered' }
    const u = await mk(f)
    setUsers((x) => [...x, u])
    return { user: u }
  }
  const guarded = (id, p) => {
    if (lastAdmin(id) && ((p.role && p.role !== 'admin') || p.status === 'suspended')) return { error: 'Keep at least one active administrator' }
    patch(id, p); return { ok: true }
  }
  const newPass = async (id, pw, mustChange) => { const salt = rid() + rid(); patch(id, { salt, hash: await hash(pw, salt), mustChange }) }

  return {
    user, users,
    register: (f) => add({ ...f, role: f.role === 'customer' ? 'customer' : 'farmer' }, ['farmer', 'customer']).then((r) => { if (r.user) setSid(r.user.id); return r }),
    create: (f) => add({ ...f, mustChange: true }, Object.keys(ROLES)),
    login: async (email, pw) => {
      const u = users.find((x) => x.email === email.trim().toLowerCase())
      if (!u || (await hash(pw, u.salt)) !== u.hash) return { error: 'Wrong email or password' }
      if (u.status !== 'active') return { error: 'This account is suspended. Please contact an administrator.' }
      setSid(u.id); return { user: u }
    },
    logout: () => setSid(null),
    update: (id, p) => patch(id, { name: p.name, phone: p.phone, location: p.location }),
    changePassword: async (id, old, nw) => {
      const u = users.find((x) => x.id === id)
      if ((await hash(old, u.salt)) !== u.hash) return { error: 'Current password is wrong' }
      if (nw.length < 8) return { error: 'New password must be at least 8 characters' }
      await newPass(id, nw, false); return { ok: true }
    },
    reset: async (id) => { const t = 'Temp-' + rid(); await newPass(id, t, true); return t },
    setRole: (id, role) => guarded(id, { role }),
    setStatus: (id, status) => guarded(id, { status }),
    remove: (id) => {
      if (id === sid) return { error: 'You cannot delete your own account' }
      if (lastAdmin(id)) return { error: 'Keep at least one active administrator' }
      setUsers((us) => us.filter((u) => u.id !== id)); return { ok: true }
    },
  }
}
