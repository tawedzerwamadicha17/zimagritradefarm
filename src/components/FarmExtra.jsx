import { useState } from 'react'
import { fmtUSD } from '../data/seed.js'
import { Badge, Tbl, useF, CATS, uid, today, sum, addDays, fin, posRows, aging, AGE_HEAD, apRows, arRows, KEY } from './farmUtil.jsx'

const prod = (s) => s.ents.filter((e) => e.type !== 'overhead')
const Stat = ({ n, l }) => <div className="card stat"><span className="stat-num">{n}</span><span className="muted">{l}</span></div>

export function Stock({ s, set }) {
  const [n, setN, NI, NS] = useF({ name: '', unit: 'kg', cat: CATS[1], min: '' })
  const [r, setR, RI, RS] = useF({ item: '', qty: '', cost: '', supplier: '', status: 'paid', date: today() })
  const [i, setI, II, IS] = useF({ item: '', qty: '', ent: s.ents[0]?.id })
  const opts = s.stock.map((x) => [x.id, `${x.name} (${x.qty} ${x.unit})`])
  const find = (id) => s.stock.find((x) => x.id === (id || s.stock[0]?.id))
  const addItem = () => { if (!n.name) return; set((p) => ({ stock: [...p.stock, { id: uid(), name: n.name, unit: n.unit, cat: n.cat, min: +n.min || 0, qty: 0, avg: 0 }] })); setN({ ...n, name: '' }) }
  const receive = () => {
    const it = find(r.item); if (!it || !+r.qty || !+r.cost) return
    set((p) => ({
      stock: p.stock.map((x) => (x.id === it.id ? { ...x, avg: (x.qty * x.avg + +r.cost) / (x.qty + +r.qty), qty: x.qty + +r.qty } : x)),
      exps: [{ id: uid(), date: r.date, ent: '', cat: it.cat, desc: `Stock in: ${r.qty} ${it.unit} ${it.name}`, supplier: r.supplier, amount: +r.cost, status: r.status, due: r.status === 'credit' ? addDays(r.date, p.cfg.terms) : '', stock: true }, ...p.exps],
    })); setR({ ...r, qty: '', cost: '' })
  }
  const issue = () => {
    const it = find(i.item), q = +i.qty; if (!it || !q) return
    if (q > it.qty) return alert('Only ' + it.qty + ' ' + it.unit + ' in stock')
    set((p) => ({
      stock: p.stock.map((x) => (x.id === it.id ? { ...x, qty: x.qty - q } : x)),
      exps: [{ id: uid(), date: today(), ent: i.ent, cat: it.cat, desc: `Issued ${q} ${it.unit} ${it.name}`, supplier: 'Stock', amount: +(q * it.avg).toFixed(2), status: 'noncash', issue: true }, ...p.exps],
    })); setI({ ...i, qty: '' })
  }
  return (
    <>
      <div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>New stock item</h3>
        <label>Name{NI('name')}</label><label>Unit{NS('unit', ['kg', 'bags', 'litres', 'tonnes', 'doses'])}</label><label>Cost category{NS('cat', CATS)}</label><label>Reorder level{NI('min', 'number')}</label>
        <button className="btn primary" onClick={addItem}>Add item</button></div>
      <div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>Receive stock (purchase → inventory asset)</h3>
        <label>Item{RS('item', opts)}</label><label>Qty{RI('qty', 'number')}</label><label>Total cost (US$){RI('cost', 'number')}</label><label>Supplier{RI('supplier')}</label>
        <label>Payment{RS('status', [['paid', 'Paid'], ['credit', 'On credit']])}</label><label>Date{RI('date', 'date')}</label><button className="btn primary" onClick={receive}>Receive</button></div>
      <div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>Issue stock to an enterprise (becomes a cost)</h3>
        <label>Item{IS('item', opts)}</label><label>Qty{II('qty', 'number')}</label><label>Enterprise{IS('ent', s.ents.map((e) => [e.id, e.name]))}</label><button className="btn primary" onClick={issue}>Issue</button></div>
      <div className="card"><h3>Stock on hand — value {fmtUSD(sum(s.stock, (x) => x.qty * x.avg))}</h3>
        <Tbl head={['Item', 'Unit', 'Qty', 'Avg cost', 'Value', 'Alert']} rows={s.stock.map((x) => [x.name, x.unit, x.qty, x.avg.toFixed(2), (x.qty * x.avg).toFixed(2), x.min && x.qty <= x.min ? <Badge k="over">Low stock</Badge> : ''])} /></div>
    </>
  )
}

export function Herd({ s, set, entName }) {
  const L = s.ents.filter((e) => e.type === 'livestock')
  const [f, setF, I, S] = useF({ date: today(), ent: L[0]?.id || '', type: 'opening', head: '', note: '' })
  const add = () => { if (!+f.head || !f.ent) return; set((p) => ({ herd: [{ id: uid(), ...f, head: +f.head }, ...p.herd] })); setF({ ...f, head: '', note: '' }) }
  const rows = L.map((e) => {
    const h = (t) => sum(s.herd.filter((x) => x.ent === e.id && x.type === t), (x) => x.head)
    const inn = h('opening') + h('purchase') + h('birth')
    return [e.name, inn, h('death'), h('sale'), inn - h('death') - h('sale'), inn ? ((h('death') / inn) * 100).toFixed(1) + '%' : '-']
  })
  return (
    <>
      <div className="card form-grid">
        <label>Date{I('date', 'date')}</label><label>Livestock enterprise{S('ent', L.map((e) => [e.id, e.name]))}</label>
        <label>Event{S('type', ['opening', 'purchase', 'birth', 'death', 'sale'])}</label><label>Head{I('head', 'number')}</label><label>Note{I('note')}</label>
        <button className="btn primary" onClick={add}>Record</button></div>
      <div className="card"><h3>Herd summary</h3><Tbl head={['Enterprise', 'Intake', 'Deaths', 'Sold', 'On hand', 'Mortality']} rows={rows} /></div>
      <div className="card"><h3>Herd log</h3><Tbl head={['Date', 'Enterprise', 'Event', 'Head', 'Note']} rows={s.herd.map((x) => [x.date, entName(x.ent), x.type, x.head, x.note])} /></div>
    </>
  )
}

export function Finance({ s }) {
  const f = fin(s)
  const cr = f.ap ? ((f.cash + f.inv + f.ar) / f.ap).toFixed(2) : '—'
  return (
    <>
      <div className="stat-row"><Stat n={fmtUSD(f.cash)} l="Cash" /><Stat n={fmtUSD(f.inv)} l="Stock value" /><Stat n={fmtUSD(f.ar)} l="Owed by customers" /><Stat n={fmtUSD(f.ap)} l="Owed to suppliers" /></div>
      <div className="card"><h3>Income statement</h3><Tbl head={['Item', 'US$']} rows={[['Sales revenue', f.rev.toFixed(2)], ['Cost of production (stock used, labour, depreciation, other)', f.cost.toFixed(2)], ['Net profit / (loss)', f.profit.toFixed(2)], ['Margin', f.rev ? ((f.profit / f.rev) * 100).toFixed(1) + '%' : '-']]} /></div>
      <div className="card"><h3>Financial position</h3><Tbl head={['Item', 'US$']} rows={posRows(s)} /><p className="muted">Current ratio: {cr}. Set opening cash and assets in Admin → Settings.</p></div>
      <div className="card"><h3>Supplier ageing (payables)</h3><Tbl head={AGE_HEAD} rows={aging(apRows(s))} /></div>
      <div className="card"><h3>Customer ageing (receivables)</h3><Tbl head={AGE_HEAD} rows={aging(arRows(s))} /></div>
    </>
  )
}

export function Sell({ s, set, E }) {
  const f = fin(s)
  const sold = E.filter((e) => e.rev > 0)
  const cos = sum(sold, (e) => e.total), prof = f.rev - cos
  const first = prod(s)[0]?.id || ''
  const [a, setA, I, S] = useF({ product: '', ent: first, qty: '', unit: 't', price: '', district: '', desc: '' })
  const post = () => { if (!a.product || !+a.price) return; set((p) => ({ ads: [{ id: uid(), ...a, qty: +a.qty, price: +a.price, status: 'active', date: today() }, ...p.ads] })); setA({ ...a, product: '', qty: '', price: '', desc: '' }) }
  const updR = (id, patch) => set((p) => ({ reqs: p.reqs.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))
  const offer = (r) => { const v = +prompt('Your price per ' + r.unit + ' (US$)?', r.price); if (v) updR(r.id, { status: 'offered', offer: v }) }
  const record = (r) => {
    const ad = s.ads.find((x) => x.id === r.ad)
    const ent = ad?.ent || prod(s).find((e) => r.product.toLowerCase().includes(e.name.split(' ')[0].toLowerCase()))?.id || first
    set((p) => ({ sales: [{ id: uid(), date: today(), ent, buyer: r.customer, qty: r.qty, price: r.offer || r.price, status: 'credit', due: addDays(today(), p.cfg.terms) }, ...p.sales], reqs: p.reqs.map((x) => (x.id === r.id ? { ...x, status: 'fulfilled' } : x)) }))
  }
  const open = s.reqs.filter((r) => ['open', 'offered', 'accepted'].includes(r.status))
  return (
    <>
      <div className="stat-row"><Stat n={fmtUSD(f.rev)} l="Sales made" /><Stat n={fmtUSD(cos)} l="Cost of sales" /><Stat n={fmtUSD(prof)} l="Profit gained" /><Stat n={f.rev ? ((prof / f.rev) * 100).toFixed(1) + '%' : '-'} l="Margin" /></div>
      <div className="stat-row"><Stat n={fmtUSD(f.ar)} l="Still to collect" /><Stat n={s.ads.filter((x) => x.status === 'active').length} l="Active adverts" /><Stat n={open.length} l="Open customer requests" /><Stat n={fmtUSD(f.cash)} l="Cash on hand" /></div>
      <div className="card"><h3>Profit by product</h3><Tbl head={['Enterprise', 'Qty sold', 'Revenue', 'Cost', 'Profit', 'Margin', 'Avg price']} rows={sold.map((e) => { const q = sum(s.sales.filter((x) => x.ent === e.id), (x) => x.qty); return [e.name, q, e.rev.toFixed(2), e.total.toFixed(2), (e.rev - e.total).toFixed(2), (((e.rev - e.total) / e.rev) * 100).toFixed(1) + '%', (e.rev / q).toFixed(2)] })} /></div>
      <div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>Advertise produce</h3>
        <label>Product{I('product')}</label><label>Enterprise{S('ent', prod(s).map((e) => [e.id, e.name]))}</label><label>Qty available{I('qty', 'number')}</label>
        <label>Unit{S('unit', ['t', 'kg', 'head', 'bags'])}</label><label>Price / unit (US$){I('price', 'number')}</label><label>District{I('district')}</label><label>Description{I('desc')}</label>
        <button className="btn primary" onClick={post}>Publish advert</button></div>
      <div className="card"><h3>My adverts</h3>{s.ads.map((x) => <div key={x.id} className="row"><span>{x.product} · {x.qty} {x.unit} · {fmtUSD(x.price)}/{x.unit} · {x.district} {x.flagged && <Badge k="over">flagged by admin</Badge>}</span>
        <span><Badge k={x.status === 'active' ? 'ok' : 'warn'}>{x.status}</Badge> <button className="btn sm" onClick={() => set((p) => ({ ads: p.ads.map((y) => (y.id === x.id ? { ...y, status: y.status === 'active' ? 'sold out' : 'active' } : y)) }))}>Toggle</button> <button className="btn sm" onClick={() => set((p) => ({ ads: p.ads.filter((y) => y.id !== x.id) }))}>✕</button></span></div>)}
        {!s.ads.length && <p className="muted">No adverts yet.</p>}</div>
      <div className="card"><h3>Customer requests & orders</h3>{open.map((r) => <div key={r.id} className="row"><span><b>{r.kind === 'order' ? 'Order' : 'Wanted'}:</b> {r.customer} — {r.qty} {r.unit} {r.product} @ {fmtUSD(r.price || 0)} {r.district && `· ${r.district}`} {r.needBy && `· by ${r.needBy}`} {r.offer ? `· your offer ${fmtUSD(r.offer)}` : ''}</span>
        <span><Badge k={r.status === 'open' ? 'warn' : 'ok'}>{r.status}</Badge> {r.status !== 'accepted' && <button className="btn sm" onClick={() => offer(r)}>Offer price</button>} {(r.kind === 'order' || r.status === 'accepted') && <button className="btn sm" onClick={() => record(r)}>Record sale</button>} <button className="btn sm" onClick={() => updR(r.id, { status: 'declined' })}>Decline</button></span></div>)}
        {!open.length && <p className="muted">No open requests.</p>}</div>
    </>
  )
}

export function Customer({ s, set }) {
  const cs = s.users.filter((u) => u.role === 'customer' && u.active !== false)
  const [id, setId] = useState(cs[0]?.id)
  const [w, setW, I, S] = useF({ product: '', qty: '', unit: 't', price: '', district: '', needBy: '' })
  const me = cs.find((u) => u.id === id) || cs[0]
  if (!me) return <div className="card">No active customer accounts. An admin can add one.</div>
  const order = (ad) => { const q = +prompt(`Quantity (${ad.unit})?`); if (q) set((p) => ({ reqs: [{ id: uid(), kind: 'order', ad: ad.id, customer: me.name, product: ad.product, qty: q, unit: ad.unit, price: ad.price, district: ad.district, status: 'open' }, ...p.reqs] })) }
  const post = () => { if (!w.product || !+w.qty) return; set((p) => ({ reqs: [{ id: uid(), kind: 'wanted', customer: me.name, ...w, qty: +w.qty, price: +w.price, status: 'open' }, ...p.reqs] })); setW({ ...w, product: '', qty: '', price: '' }) }
  const updR = (rid, patch) => set((p) => ({ reqs: p.reqs.map((x) => (x.id === rid ? { ...x, ...patch } : x)) }))
  const mine = s.reqs.filter((r) => r.customer === me.name)
  const bills = s.sales.filter((x) => x.buyer === me.name)
  return (
    <>
      <div className="card row"><label>Signed in as<select value={me.id} onChange={(e) => setId(e.target.value)}>{cs.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label></div>
      <h2>Available produce</h2>
      <div className="ads">{s.ads.filter((a) => a.status === 'active' && !a.flagged).map((a) => <div key={a.id} className="card ad"><b>{a.product}</b><span className="muted">{a.qty} {a.unit} · {a.district}</span><span>{a.desc}</span><b>{fmtUSD(a.price)}/{a.unit}</b><button className="btn primary" onClick={() => order(a)}>Order</button></div>)}</div>
      {!s.ads.some((a) => a.status === 'active' && !a.flagged) && <p className="muted">No adverts at the moment — post a request below.</p>}
      <div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>Request a product you need</h3>
        <label>Product{I('product')}</label><label>Qty{I('qty', 'number')}</label><label>Unit{S('unit', ['t', 'kg', 'head', 'bags'])}</label><label>Target price / unit{I('price', 'number')}</label><label>District{I('district')}</label><label>Needed by{I('needBy', 'date')}</label>
        <button className="btn primary" onClick={post}>Post request</button></div>
      <div className="card"><h3>My requests & orders</h3>{mine.map((r) => <div key={r.id} className="row"><span>{r.kind === 'order' ? 'Order' : 'Wanted'}: {r.qty} {r.unit} {r.product}{r.offer ? ` · farmer offers ${fmtUSD(r.offer)}/${r.unit}` : ''}</span>
        <span><Badge k={r.status === 'declined' ? 'over' : r.status === 'open' ? 'warn' : 'ok'}>{r.status}</Badge> {r.status === 'offered' && <><button className="btn sm" onClick={() => updR(r.id, { status: 'accepted' })}>Accept</button> <button className="btn sm" onClick={() => updR(r.id, { status: 'declined' })}>Decline</button></>}</span></div>)}
        {!mine.length && <p className="muted">Nothing yet.</p>}</div>
      <div className="card"><h3>My account</h3><Tbl head={['Date', 'Qty', 'Total US$', 'Status', 'Due']} rows={bills.map((x) => [x.date, x.qty, (x.qty * x.price).toFixed(2), x.status === 'credit' ? 'Owing' : 'Paid', x.due || ''])} /></div>
    </>
  )
}

export function Admin({ s, set, E }) {
  const [t, setT] = useState('ov')
  const [u, setU, I, S] = useF({ name: '', role: 'customer', phone: '' })
  const f = fin(s)
  const flag = (k, id) => set((p) => ({ [k]: p[k].map((x) => (x.id === id ? { ...x, flagged: !x.flagged } : x)) }))
  const rm = (k, id) => set((p) => ({ [k]: p[k].filter((x) => x.id !== id) }))
  const C = (k, l) => <label>{l}<input type="number" value={s.cfg[k]} onChange={(e) => set((p) => ({ cfg: { ...p.cfg, [k]: +e.target.value } }))} /></label>
  const T = [['ov', 'Overview'], ['us', 'Users'], ['mod', 'Moderation'], ['set', 'Settings']]
  return (
    <>
      <div className="tabs">{T.map(([id, l]) => <button key={id} className={t === id ? 'tab active' : 'tab'} onClick={() => setT(id)}>{l}</button>)}</div>
      {t === 'ov' && <>
        <div className="stat-row"><Stat n={s.users.length} l="Users" /><Stat n={s.ads.filter((a) => a.status === 'active').length} l="Active adverts" /><Stat n={s.reqs.filter((r) => ['open', 'offered'].includes(r.status)).length} l="Open requests" /><Stat n={s.ads.concat(s.reqs).filter((x) => x.flagged).length} l="Flagged items" /></div>
        <div className="stat-row"><Stat n={fmtUSD(f.rev)} l="Total sales" /><Stat n={fmtUSD(f.profit)} l="Farm profit" /><Stat n={E.filter((e) => e.st.k === 'over').length} l="Enterprises over budget" /><Stat n={s.exps.filter((x) => x.status === 'pending').length} l="Pending approvals" /></div></>}
      {t === 'us' && <>
        <div className="card form-grid"><label>Name{I('name')}</label><label>Role{S('role', ['farmer', 'customer', 'admin'])}</label><label>Phone{I('phone')}</label>
          <button className="btn primary" onClick={() => { if (u.name) { set((p) => ({ users: [...p.users, { id: uid(), ...u, active: true }] })); setU({ ...u, name: '', phone: '' }) } }}>Add user</button></div>
        <div className="card">{s.users.map((x) => <div key={x.id} className="row"><span>{x.name} — {x.role} {x.phone}</span><span><Badge k={x.active === false ? 'over' : 'ok'}>{x.active === false ? 'suspended' : 'active'}</Badge> <button className="btn sm" onClick={() => flag('users', x.id) || set((p) => ({ users: p.users.map((y) => (y.id === x.id ? { ...y, flagged: undefined, active: y.active === false } : y)) }))}>{x.active === false ? 'Activate' : 'Suspend'}</button> <button className="btn sm" onClick={() => rm('users', x.id)}>✕</button></span></div>)}</div></>}
      {t === 'mod' && <div className="card"><h3>Adverts</h3>{s.ads.map((x) => <div key={x.id} className="row"><span>{x.product} · {fmtUSD(x.price)}/{x.unit} {x.flagged && <Badge k="over">flagged</Badge>}</span><span><button className="btn sm" onClick={() => flag('ads', x.id)}>{x.flagged ? 'Unflag' : 'Flag / hide'}</button> <button className="btn sm" onClick={() => rm('ads', x.id)}>Remove</button></span></div>)}
        <h3>Customer requests</h3>{s.reqs.map((x) => <div key={x.id} className="row"><span>{x.customer}: {x.qty} {x.unit} {x.product} ({x.status})</span><button className="btn sm" onClick={() => rm('reqs', x.id)}>Remove</button></div>)}</div>}
      {t === 'set' && <div className="card form-grid">{C('openCash', 'Opening cash (US$)')}{C('openAssets', 'Opening fixed assets (US$)')}{C('terms', 'Default credit terms (days)')}
        <button className="btn" onClick={() => { if (confirm('Erase ALL farm data in this browser?')) { localStorage.removeItem(KEY); location.reload() } }}>Reset demo data</button></div>}
    </>
  )
}
