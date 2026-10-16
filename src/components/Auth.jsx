import { useState } from 'react'
import { PROVINCES } from '../data/seed.js'
import { HOME } from '../data/auth.js'

export default function Auth({ auth, go }) {
  const [mode, setMode] = useState('login')
  const [f, setF] = useState({ name: '', email: '', phone: '', location: PROVINCES[0], role: 'farmer', password: '', confirm: '' })
  const [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const on = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true)
    const r = mode === 'login' ? await auth.login(f.email, f.password) : f.password !== f.confirm ? { error: 'Passwords do not match' } : await auth.register(f)
    setBusy(false)
    if (r.error) return setErr(r.error)
    go(r.user.mustChange ? 'account' : HOME[r.user.role])
  }
  const reg = mode === 'register'
  return (
    <div className="auth card">
      <div className="tabs">
        <button className={'tab' + (!reg ? ' active' : '')} onClick={() => { setMode('login'); setErr('') }}>Log in</button>
        <button className={'tab' + (reg ? ' active' : '')} onClick={() => { setMode('register'); setErr('') }}>Create account</button>
      </div>
      <form onSubmit={submit}>
        {reg && <label>Full name<input value={f.name} onChange={on('name')} required /></label>}
        <label>Email<input type="email" value={f.email} onChange={on('email')} required autoComplete="email" /></label>
        {reg && <>
          <label>Phone<input value={f.phone} onChange={on('phone')} placeholder="+263 ..." /></label>
          <label>Province<select value={f.location} onChange={on('location')}>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label>I am a<select value={f.role} onChange={on('role')}><option value="farmer">Farmer (sell produce, run my farm)</option><option value="customer">Customer (buy produce)</option></select></label>
        </>}
        <label>Password{reg && ' (min 8 characters)'}<input type="password" value={f.password} onChange={on('password')} required autoComplete={reg ? 'new-password' : 'current-password'} /></label>
        {reg && <label>Confirm password<input type="password" value={f.confirm} onChange={on('confirm')} required /></label>}
        {err && <div className="alert over">{err}</div>}
        <button className="btn primary" disabled={busy}>{busy ? 'Please wait…' : reg ? 'Create account' : 'Log in'}</button>
      </form>
      <p className="muted small">{reg ? 'Foreman and administrator accounts are created by an administrator.' : 'Forgot your password? Ask an administrator to reset it. Foremen: your farmer or administrator creates your account.'}</p>
    </div>
  )
}
