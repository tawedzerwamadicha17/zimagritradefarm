import { useState } from 'react'
import { MODULES } from '../data/modules.js'
import { DT, ttl } from '../data/doctypes.js'

// ERPNext-style awesomebar: jump to a module or find a record across the system.
export default function Search({ s, users, user, go }) {
  const [q, setQ] = useState('')
  const t = q.trim().toLowerCase()
  let hits = []
  if (t) {
    MODULES.forEach(([g, it]) => it.filter((i) => i[3].includes(user.role)).forEach((i) => (i[1] + ' ' + g).toLowerCase().includes(t) && hits.push({ l: i[1], sub: 'Module · ' + g, page: i[0] })))
    Object.entries(DT).filter(([, D]) => D.access[user.role]).forEach(([k, D]) => (s.dt[k] || []).forEach((r) => { if (JSON.stringify(Object.values(r)).toLowerCase().includes(t)) hits.push({ l: ttl(r), sub: D.label, page: 'dt:' + k, q: ttl(r) }) }))
    s.mk.forEach((l) => (l.crop + ' ' + l.district + ' ' + l.province).toLowerCase().includes(t) && hits.push({ l: `${l.crop} · ${l.tonnes} t`, sub: 'Listing · ' + l.district, page: 'marketplace' }))
    if (user.role !== 'foreman') s.orders.filter((o) => user.role === 'admin' || o.buyerId === user.id || o.sellerId === user.id).forEach((o) => (o.buyer + o.seller + o.id + o.lines.map((x) => x.crop).join()).toLowerCase().includes(t) && hits.push({ l: `Order ${o.id} · ${o.buyer}`, sub: 'Order · ' + o.status, page: 'orders' }))
    if (user.role === 'admin') users.forEach((u) => (u.name + u.email).toLowerCase().includes(t) && hits.push({ l: u.name, sub: 'User · ' + u.email, page: 'admin' }))
    hits = hits.slice(0, 8)
  }
  return (
    <div className="search">
      <input placeholder="Search modules and records…" value={q} onChange={(e) => setQ(e.target.value)} />
      {!!hits.length && <div className="search-pop">{hits.map((h, i) => <button key={i} onClick={() => { go(h.page, h.q); setQ('') }}><b>{h.l}</b><small>{h.sub}</small></button>)}</div>}
      {t && !hits.length && <div className="search-pop"><small style={{ padding: '.6rem' }}>No results</small></div>}
    </div>
  )
}
