import { useState } from 'react'
import { ROLES } from '../data/auth.js'

export function Users({ auth }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', role: 'foreman' }), [note, setNote] = useState('')
  const show = (r) => r?.error && setNote(r.error)
  const create = async () => {
    const pw = 'Temp-' + Math.random().toString(36).slice(2, 8) + 'A1'
    const r = await auth.create({ ...f, password: pw })
    if (r.error) return setNote(r.error)
    setNote(`Account created for ${f.email}. Temporary password: ${pw} (they must change it at first login).`); setF({ ...f, name: '', email: '', phone: '' })
  }
  return (
    <div className="card">
      <h3>Users ({auth.users.length})</h3>
      <div className="form-grid" style={{ marginBottom: '.8rem' }}>
        <label>Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label>Email<input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label>Phone<input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
        <label>Role<select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <button className="btn primary" onClick={create}>Create account</button>
      </div>
      {note && <div className="alert warn" style={{ marginBottom: '.6rem' }}>{note}</div>}
      {auth.users.map((u) => (
        <div className="row" key={u.id}>
          <span><b>{u.name}</b> · {u.email}{u.phone ? ' · ' + u.phone : ''}</span>
          <span>
            <select value={u.role} onChange={(e) => show(auth.setRole(u.id, e.target.value))} style={{ width: 'auto' }}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>{' '}
            <span className={'badge ' + (u.status === 'active' ? 'ok' : 'over')}>{u.status}</span>{' '}
            <button className="btn sm" onClick={() => show(auth.setStatus(u.id, u.status === 'active' ? 'suspended' : 'active'))}>{u.status === 'active' ? 'Suspend' : 'Activate'}</button>{' '}
            <button className="btn sm" onClick={async () => setNote(`Temporary password for ${u.email}: ${await auth.reset(u.id)}`)}>Reset password</button>{' '}
            <button className="btn sm" onClick={() => window.confirm(`Delete ${u.name}?`) && show(auth.remove(u.id))}>✕</button>
          </span>
        </div>
      ))}
    </div>
  )
}

export function Inbox({ s, set }) {
  const unread = s.msgs.filter((m) => !m.read).length
  return (
    <div className="card">
      <h3>Contact messages ({unread} unread)</h3>
      {!s.msgs.length && <p className="muted">No messages.</p>}
      {s.msgs.map((m) => (
        <div className="row" key={m.id}>
          <span>{!m.read && '🔵 '}<b>{m.subject}</b> — {m.name} · {m.email}{m.phone ? ' · ' + m.phone : ''} · {m.date}<br /><small>{m.text}</small></span>
          <span><button className="btn sm" onClick={() => set((p) => ({ msgs: p.msgs.map((x) => (x.id === m.id ? { ...x, read: !x.read } : x)) }))}>{m.read ? 'Mark unread' : 'Mark read'}</button>{' '}<button className="btn sm" onClick={() => set((p) => ({ msgs: p.msgs.filter((x) => x.id !== m.id) }))}>✕</button></span>
        </div>
      ))}
    </div>
  )
}
