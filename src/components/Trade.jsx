import { useState } from 'react'
import { fmtUSD } from '../data/seed.js'
import { compute, uid, today, addDays, sum } from '../data/store.js'

const UNITS = ['t', 'kg', 'head', 'bags', 'L']
const KS = { open: 'warn', quoted: 'warn', accepted: 'ok', fulfilled: 'ok', declined: 'over' }

export default function Trade({ s, set, role, user }) {
  return role === 'buyer' ? <Buyer s={s} set={set} user={user} /> : <FarmerSide s={s} set={set} />
}

function FarmerSide({ s, set }) {
  const E = compute(s), P = E.filter((e) => e.type !== 'overhead')
  const [f, setF] = useState({ product: '', ent: '', qty: '', unit: 't', price: '', phone: s.cfg.phone, note: '' })
  const rev = sum(P, (e) => e.rev), cogs = sum(P, (e) => e.cogs)
  const live = s.ads.filter((a) => a.status === 'active')
  const open = s.reqs.filter((r) => ['open', 'quoted', 'accepted'].includes(r.status))
  const post = () => { if (!f.product || !+f.qty || !+f.price) return; set((p) => ({ ads: [{ id: uid(), date: today(), ...f, qty: +f.qty, price: +f.price, status: 'active', farm: p.cfg.farm }, ...p.ads] })); setF({ ...f, product: '', qty: '', price: '', note: '' }) }
  const updReq = (id, patch) => set((p) => ({ reqs: p.reqs.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))
  const quote = (r) => { const v = window.prompt(`Your price per ${r.unit} (US$)`, r.maxPrice || ''); if (+v) updReq(r.id, { status: 'quoted', quote: +v }) }
  const fulfil = (r) => {
    const ad = s.ads.find((a) => a.id === r.adId)
    const e = s.ents.find((x) => x.id === ad?.ent) || P.find((x) => r.product.toLowerCase().includes(x.name.split(' ')[0].toLowerCase())) || P[0]
    if (!e) return
    set((p) => ({
      sales: [{ id: uid(), date: today(), ent: e.id, cust: r.buyer, qty: r.qty, price: r.quote || r.maxPrice || ad?.price || 0, status: 'credit', due: addDays(today(), p.cfg.terms) }, ...p.sales],
      herd: e.type === 'livestock' ? [{ id: uid(), date: today(), ent: e.id, type: 'Sold', head: r.qty, note: 'Request from ' + r.buyer }, ...p.herd] : p.herd,
      reqs: p.reqs.map((x) => (x.id === r.id ? { ...x, status: 'fulfilled' } : x)),
    }))
  }
  const C = (v, l) => <div className="card stat"><span className="stat-num">{v}</span><span className="muted">{l}</span></div>
  return (
    <div className="page">
      <h1>Advertise & sell</h1>
      <div className="stat-row">{C(fmtUSD(rev), 'Sales made')}{C(fmtUSD(cogs), 'Cost of sales')}{C(fmtUSD(rev - cogs), 'Profit gained')}{C(rev ? Math.round(((rev - cogs) / rev) * 100) + '%' : '-', 'Margin')}{C(live.length, 'Active ads')}{C(open.length, 'Buyer requests open')}</div>
      <div className="card scroll"><h3>Sales performance by product</h3><table className="tbl"><thead><tr><th>Enterprise</th><th>Sold</th><th>Revenue</th><th>Cost of sales</th><th>Profit</th><th>Margin</th><th>Active ads</th></tr></thead><tbody>
        {P.map((e) => <tr key={e.id}><td>{e.name}</td><td>{e.sold}</td><td>{e.rev.toFixed(2)}</td><td>{e.cogs.toFixed(2)}</td><td className={e.profit < 0 ? 'red' : ''}>{e.profit.toFixed(2)}</td><td>{e.rev ? Math.round((e.profit / e.rev) * 100) + '%' : '-'}</td><td>{live.filter((a) => a.ent === e.id).length}</td></tr>)}</tbody></table></div>

      <div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>Post an ad</h3>
        <label>Product<input value={f.product} onChange={(e) => setF({ ...f, product: e.target.value })} placeholder="e.g. Grade A maize" /></label>
        <label>From enterprise<select value={f.ent} onChange={(e) => setF({ ...f, ent: e.target.value })}><option value="">—</option>{P.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
        <label>Qty available<input type="number" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></label>
        <label>Unit<select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></label>
        <label>Price per unit (US$)<input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></label>
        <label>Contact phone<input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
        <button className="btn primary" onClick={post}>Publish ad</button></div>
      <div className="card"><h3>My ads</h3>{s.ads.map((a) => <div key={a.id} className="row"><span>{a.product} — {a.qty} {a.unit} @ {fmtUSD(a.price)}</span>
        <span><select value={a.status} onChange={(e) => set((p) => ({ ads: p.ads.map((x) => (x.id === a.id ? { ...x, status: e.target.value } : x)) }))}><option value="active">Active</option><option value="soldout">Sold out</option><option value="hidden">Hidden</option></select> <button className="btn sm" onClick={() => set((p) => ({ ads: p.ads.filter((x) => x.id !== a.id) }))}>✕</button></span></div>)}{!s.ads.length && <p className="muted">No ads yet.</p>}</div>
      <div className="card"><h3>Buyer requests</h3>{s.reqs.map((r) => <div key={r.id} className="row"><span><b>{r.product}</b> — {r.qty} {r.unit}{r.maxPrice ? `, up to ${fmtUSD(r.maxPrice)}/${r.unit}` : ''}{r.needBy ? `, by ${r.needBy}` : ''}<br /><small className="muted">{r.buyer} · {r.phone} {r.note && '· ' + r.note}{r.quote ? ` · your quote ${fmtUSD(r.quote)}` : ''}</small></span>
        <span><span className={'badge ' + (KS[r.status] || 'warn')}>{r.status}</span>{' '}
          {['open', 'quoted'].includes(r.status) && <><button className="btn sm" onClick={() => quote(r)}>Quote</button> <button className="btn sm" onClick={() => updReq(r.id, { status: 'accepted' })}>Accept</button> <button className="btn sm" onClick={() => updReq(r.id, { status: 'declined' })}>Decline</button></>}
          {r.status === 'accepted' && <button className="btn sm primary" onClick={() => fulfil(r)}>Fulfil → record sale</button>}</span></div>)}{!s.reqs.length && <p className="muted">No buyer requests yet.</p>}</div>
    </div>
  )
}

function Buyer({ s, set, user }) {
  const [me, setMe] = useState({ buyer: user?.name || '', phone: user?.phone || '' })
  const [f, setF] = useState({ product: '', qty: '', unit: 't', maxPrice: '', needBy: '', note: '' })
  const send = (r) => { if (!me.buyer) return alert('Enter your name and phone first'); set((p) => ({ reqs: [{ id: uid(), date: today(), ...me, status: 'open', ...r }, ...p.reqs] })) }
  const mine = s.reqs.filter((r) => me.buyer && r.buyer === me.buyer)
  return (
    <div className="page">
      <h1>Browse & request produce</h1>
      <div className="card form-grid"><label>Your name<input value={me.buyer} onChange={(e) => setMe({ ...me, buyer: e.target.value })} /></label><label>Phone<input value={me.phone} onChange={(e) => setMe({ ...me, phone: e.target.value })} /></label></div>
      <div className="card"><h3>Available from farmers</h3>{s.ads.filter((a) => a.status === 'active').map((a) => <div key={a.id} className="row"><span><b>{a.product}</b> — {a.qty} {a.unit} @ {fmtUSD(a.price)}/{a.unit}<br /><small className="muted">{a.farm} · {a.phone}</small></span>
        <button className="btn sm primary" onClick={() => { const q = +window.prompt(`Quantity needed (${a.unit})`, a.qty); if (q) send({ product: a.product, qty: q, unit: a.unit, maxPrice: a.price, adId: a.id }) }}>Request this</button></div>)}{!s.ads.some((a) => a.status === 'active') && <p className="muted">No ads yet — post a request below and farmers will respond.</p>}</div>
      <div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>Can't find it? Post a request</h3>
        <label>Product wanted<input value={f.product} onChange={(e) => setF({ ...f, product: e.target.value })} /></label>
        <label>Quantity<input type="number" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} /></label>
        <label>Unit<select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></label>
        <label>Max price / unit (US$)<input type="number" value={f.maxPrice} onChange={(e) => setF({ ...f, maxPrice: e.target.value })} /></label>
        <label>Needed by<input type="date" value={f.needBy} onChange={(e) => setF({ ...f, needBy: e.target.value })} /></label>
        <label>Notes<input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
        <button className="btn primary" onClick={() => { if (!f.product || !+f.qty) return; send({ ...f, qty: +f.qty, maxPrice: +f.maxPrice }); setF({ ...f, product: '', qty: '', maxPrice: '', note: '' }) }}>Send request</button></div>
      <div className="card"><h3>My requests</h3>{mine.map((r) => <div key={r.id} className="row"><span>{r.product} — {r.qty} {r.unit}{r.quote ? ` · farmer quoted ${fmtUSD(r.quote)}/${r.unit}` : ''}</span>
        <span><span className={'badge ' + (KS[r.status] || 'warn')}>{r.status}</span> {r.status === 'quoted' && <button className="btn sm" onClick={() => set((p) => ({ reqs: p.reqs.map((x) => (x.id === r.id ? { ...x, status: 'accepted' } : x)) }))}>Accept quote</button>}</span></div>)}{!mine.length && <p className="muted">Enter your name above to see your requests.</p>}</div>
    </div>
  )
}
