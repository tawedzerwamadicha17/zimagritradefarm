import { useState } from 'react'
import { PROVINCES } from '../data/seed.js'
import { ROLES } from '../data/auth.js'

export default function Account({ auth }) {
  const u = auth.user
  const [p, setP] = useState({ name: u.name, phone: u.phone || '', location: u.location || PROVINCES[0] })
  const [pw, setPw] = useState({ old: '', nw: '', again: '' }), [msg, setMsg] = useState(''), [err, setErr] = useState('')
  const save = () => { auth.update(u.id, p); setMsg('Details saved.') }
  const change = async () => {
    setMsg(''); setErr('')
    if (pw.nw !== pw.again) return setErr('New passwords do not match')
    const r = await auth.changePassword(u.id, pw.old, pw.nw)
    if (r.error) return setErr(r.error)
    setPw({ old: '', nw: '', again: '' }); setMsg('Password changed.')
  }
  return (
    <div className="page">
      <h1>My account</h1>
      {u.mustChange && <div className="alert warn">Please set a new password now — you are using a temporary or default one.</div>}
      <div className="card form-grid"><h3>Details · {ROLES[u.role]} · {u.email}</h3>
        <label>Name<input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></label>
        <label>Phone<input value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></label>
        <label>Province<select value={p.location} onChange={(e) => setP({ ...p, location: e.target.value })}>{PROVINCES.map((x) => <option key={x}>{x}</option>)}</select></label>
        <button className="btn primary" onClick={save}>Save</button></div>
      <div className="card form-grid"><h3>Change password</h3>
        <label>Current<input type="password" value={pw.old} onChange={(e) => setPw({ ...pw, old: e.target.value })} /></label>
        <label>New (min 8)<input type="password" value={pw.nw} onChange={(e) => setPw({ ...pw, nw: e.target.value })} /></label>
        <label>Repeat new<input type="password" value={pw.again} onChange={(e) => setPw({ ...pw, again: e.target.value })} /></label>
        <button className="btn primary" onClick={change}>Change password</button></div>
      {msg && <div className="alert warn">{msg}</div>}{err && <div className="alert over">{err}</div>}
    </div>
  )
}
