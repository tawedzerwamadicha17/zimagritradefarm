import { useState } from 'react'
import { uid, today } from '../data/store.js'
import { ROLES } from '../data/auth.js'

const CATS = ['Crops', 'Livestock', 'Market', 'Weather', 'Questions']

export default function Community({ s, set, user }) {
  const [f, setF] = useState({ cat: 'Crops', text: '' }), [cat, setCat] = useState('All'), [cm, setCm] = useState({})
  const upd = (id, fn) => set((p) => ({ posts: p.posts.map((x) => (x.id === id ? fn(x) : x)) }))
  const post = () => { if (!f.text.trim()) return; set((p) => ({ posts: [{ id: uid(), date: today(), authorId: user.id, author: user.name, role: user.role, cat: f.cat, text: f.text.trim(), likes: [], comments: [] }, ...p.posts] })); setF({ ...f, text: '' }) }
  const like = (x) => upd(x.id, (y) => ({ ...y, likes: y.likes.includes(user.id) ? y.likes.filter((i) => i !== user.id) : [...y.likes, user.id] }))
  const comment = (x) => { const t = (cm[x.id] || '').trim(); if (!t) return; upd(x.id, (y) => ({ ...y, comments: [...y.comments, { id: uid(), by: user.name, role: user.role, text: t, date: today() }] })); setCm({ ...cm, [x.id]: '' }) }
  const del = (x) => window.confirm('Delete this post?') && set((p) => ({ posts: p.posts.filter((y) => y.id !== x.id) }))
  const rows = s.posts.filter((x) => cat === 'All' || x.cat === cat)
  return (
    <div className="page">
      <h1>Community</h1>
      <p className="muted">Share tips, ask questions and talk prices with other farmers, foremen and customers. Be respectful — administrators can remove posts.</p>
      <div className="card form-grid">
        <label>Topic<select value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label style={{ gridColumn: 'span 2' }}>Post<input value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder="Share something…" /></label>
        <button className="btn primary" onClick={post}>Post</button>
      </div>
      <div className="filters">{['All', ...CATS].map((c) => <button key={c} className={'btn sm' + (cat === c ? ' primary' : '')} onClick={() => setCat(c)}>{c}</button>)}</div>
      {!rows.length && <p className="muted">No posts yet — be the first.</p>}
      {rows.map((x) => (
        <div className="card post" key={x.id}>
          <div className="meta"><b>{x.author}</b> · {ROLES[x.role]} · {x.date} · <span className="badge ok">{x.cat}</span></div>
          <p>{x.text}</p>
          <div className="row" style={{ justifyContent: 'flex-start' }}>
            <button className="btn sm" onClick={() => like(x)}>{x.likes.includes(user.id) ? '👍 Liked' : '👍 Like'} ({x.likes.length})</button>
            {(x.authorId === user.id || user.role === 'admin') && <button className="btn sm" onClick={() => del(x)}>Delete</button>}
          </div>
          {x.comments.map((c) => <div key={c.id} className="meta" style={{ margin: '.3rem 0 0 1rem' }}><b>{c.by}</b>: {c.text}</div>)}
          <div className="row" style={{ marginTop: '.5rem' }}><input value={cm[x.id] || ''} onChange={(e) => setCm({ ...cm, [x.id]: e.target.value })} placeholder="Write a comment…" style={{ flex: 1 }} /><button className="btn sm" onClick={() => comment(x)}>Reply</button></div>
        </div>
      ))}
    </div>
  )
}
