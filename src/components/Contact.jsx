import { useState } from 'react'
import { uid, today } from '../data/store.js'

export default function Contact({ s, set, user }) {
  const [f, setF] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', subject: 'General question', text: '' })
  const [sent, setSent] = useState(false)
  const on = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const send = (e) => { e.preventDefault(); set((p) => ({ msgs: [{ id: uid(), date: today(), ...f, read: false }, ...p.msgs] })); setSent(true); setF({ ...f, text: '' }) }
  return (
    <div className="page">
      <h1>Contact us</h1>
      {(s.cfg.phone || s.cfg.email) && <div className="card">{s.cfg.phone && <p>📞 {s.cfg.phone}</p>}{s.cfg.email && <p>✉️ {s.cfg.email}</p>}</div>}
      <form className="card form-grid" onSubmit={send}>
        <label>Name<input value={f.name} onChange={on('name')} required /></label>
        <label>Email<input type="email" value={f.email} onChange={on('email')} required /></label>
        <label>Phone<input value={f.phone} onChange={on('phone')} /></label>
        <label>Subject<select value={f.subject} onChange={on('subject')}>{['General question', 'Account help', 'Report a listing', 'Partnership', 'Other'].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label style={{ gridColumn: '1/-1' }}>Message<textarea rows="5" value={f.text} onChange={on('text')} required style={{ font: 'inherit', padding: '.5rem', border: '1px solid var(--line)', borderRadius: 8 }} /></label>
        <button className="btn primary">Send message</button>
        {sent && <div className="alert warn" style={{ gridColumn: '1/-1' }}>Thanks — your message was sent to the administrator.</div>}
      </form>
    </div>
  )
}
