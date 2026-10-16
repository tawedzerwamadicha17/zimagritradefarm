import { useState } from 'react'
import { Adder } from './ui.jsx'
import { fmtUSD } from '../data/seed.js'
import { CATS, uid, today, addDays, sum, AGEH, csv, compute, finance, payables, receivables, age, toUSD, whtFor } from '../data/store.js'
import { Tax, Bio, Trace, Pays } from './FarmPlus.jsx'
import { useF } from './farmUtil.jsx'
import { costIssue } from '../data/agri.js'

const Badge = ({ k, children }) => <span className={'badge ' + k}>{children}</span>
const Bar = ({ pct }) => <div className="bar"><i className={pct > 1 ? 'over' : pct > 0.9 ? 'warn' : ''} style={{ width: Math.min(100, pct * 100) + '%' }} /></div>
const AgeTable = ({ rows }) => {
  const tot = AGEH.slice(1).map((_, i) => sum(rows, (r) => r[i + 1]))
  return <div className="scroll"><table className="tbl"><thead><tr>{AGEH.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>
    {rows.map((r) => <tr key={r[0]}>{r.map((v, i) => <td key={i} className={i > 2 && i < 6 && v ? 'red' : ''}>{i ? v.toFixed(2) : v}</td>)}</tr>)}
    <tr><th>Total</th>{tot.map((v, i) => <th key={i}>{v.toFixed(2)}</th>)}</tr></tbody></table>{!rows.length && <p className="muted">Nothing outstanding.</p>}</div>
}

export default function Farm({ s, set, role, tab0 }) {
  const [tab, setTab] = useState(tab0 || 'dash')
  const E = compute(s)
  const entName = (id) => s.ents.find((e) => e.id === id)?.name || '-'
  const flagged = E.filter((e) => e.st.k !== 'ok')
  const pending = s.exps.filter((x) => x.status === 'pending')
  const low = s.stock.filter((i) => i.reorder > 0 && i.qty <= i.reorder)
  const tabs = [['dash', 'Dashboard'], ['exp', 'Purchases & Expenses'], ['stock', 'Stock Items'], ['herd', 'Herd'], ['sales', 'Sales'], ['workers', 'Farm Workers'], ['bud', 'Budgets'], ['assets', 'Assets'], ['fin', 'Financials'], ['rep', 'Reports'], ['ent', 'Enterprises'], ['tax', 'Tax & Currency'], ['bio', 'Biological assets'], ['trace', 'Traceability'], ['pays', 'Payments']]
  return (
    <div className="page">
      <div className="page-head"><div><h1>{role === 'foreman' ? s.cfg.farm + ' — Foreman portal' : (tabs.find((x) => x[0] === tab) || [])[1]}</h1>{role === 'foreman' && <p className="muted">Attendance and expense submissions.</p>}</div></div>
      {(tab === 'dash' || tab === 'bud') && role !== 'foreman' && flagged.map((e) => <div key={e.id} className={'alert ' + e.st.k}>{e.st.k === 'over' ? '🚨' : '⚠️'} <b>{e.name}</b>: {e.st.label} — spent {fmtUSD(e.direct)} of {fmtUSD(e.budget)} ({Math.round(e.st.pct * 100)}%), season {Math.round(e.st.el * 100)}% elapsed</div>)}
      {tab === 'stock' && role !== 'foreman' && low.length > 0 && <div className="alert warn">📦 Low stock: {low.map((i) => i.name).join(', ')}</div>}
      {role === 'foreman' ? <Foreman s={s} set={set} E={E} /> : (
        <>
          {tab === 'dash' && <Dash s={s} E={E} pending={pending} low={low} />}
          {tab === 'exp' && <Expenses s={s} set={set} entName={entName} />}
          {tab === 'stock' && <Stock s={s} set={set} />}
          {tab === 'herd' && <Herd s={s} set={set} E={E} />}
          {tab === 'sales' && <Sales s={s} set={set} entName={entName} />}
          {tab === 'workers' && <FarmWorkers s={s} set={set} />}
          {tab === 'bud' && <Budgets s={s} set={set} E={E} />}
          {tab === 'assets' && <Assets s={s} set={set} />}
          {tab === 'fin' && <Fin s={s} set={set} E={E} />}
          {tab === 'rep' && <Reports s={s} E={E} entName={entName} />}
          {tab === 'ent' && <Ents s={s} set={set} />}
          {tab === 'tax' && <Tax s={s} set={set} />}{tab === 'bio' && <Bio s={s} set={set} />}{tab === 'trace' && <Trace s={s} set={set} entName={entName} />}{tab === 'pays' && <Pays s={s} set={set} />}
        </>
      )}
    </div>
  )
}

function Dash({ s, E, pending, low }) {
  const F = finance(s, E)
  const od = (rows) => sum(rows, (r) => r[2] + r[3] + r[4] + r[5])
  const C = (n, l) => <div className="card stat"><span className="stat-num">{fmtUSD(n)}</span><span className="muted">{l}</span></div>
  return (
    <>
      <div className="stat-row">{C(F.rev, 'Sales revenue')}{C(F.cogs, 'Cost of sales')}{C(F.gross, 'Gross profit')}{C(F.cash, 'Cash')}{C(F.inv + F.wip, 'Stock & produce on hand')}{C(F.ar, 'Customers owe you')}{C(F.ap, 'You owe suppliers')}{C(F.equity, "Owner's equity")}</div>
      <div className="card"><h3>Budget use by enterprise</h3>
        {E.map((e) => <div key={e.id} className="row"><span>{e.name}</span><Bar pct={e.st.pct} /><Badge k={e.st.k}>{Math.round(e.st.pct * 100)}% · {e.st.label}</Badge></div>)}</div>
      <div className="card muted">Overdue receivables: <b>{fmtUSD(od(age(receivables(s))))}</b> · Overdue payables: <b>{fmtUSD(od(age(payables(s))))}</b> · Low-stock items: <b>{low.length}</b> · Foreman expenses awaiting approval: <b>{pending.length}</b></div>
    </>
  )
}

function Stock({ s, set }) {
  const [b, setB] = useState({ date: today(), item: '', cat: 'Fertiliser', unit: 'kg', qty: '', cost: '', supplier: '', costCenterId: '', projectId: '', status: 'paid' })
  const [u, setU] = useState({ item: '', qty: '', ent: s.ents[0]?.id, field: '', cycle: '', costCenterId: '', projectId: '' })
  const buy = () => {
    const q = +b.qty, c = +b.cost; if (!b.item || !q || !c) return
    set((p) => {
      const ex = p.stock.find((i) => i.name.toLowerCase() === b.item.toLowerCase())
      const stock = ex ? p.stock.map((i) => (i === ex ? { ...i, qty: i.qty + q, avg: (i.qty * i.avg + c) / (i.qty + q) } : i)) : [...p.stock, { id: uid(), name: b.item, cat: b.cat, unit: b.unit, qty: q, avg: c / q, reorder: 0 }]
      return { stock, buys: [{ id: uid(), date: b.date, item: b.item, qty: q, cost: c, supplier: b.supplier, costCenterId: b.costCenterId, projectId: b.projectId, status: b.status, due: addDays(b.date, p.cfg.terms) }, ...p.buys] }
    })
    setB({ ...b, item: '', qty: '', cost: '' })
  }
  const issue = () => {
    const it = s.stock.find((i) => i.id === u.item), q = +u.qty
    if (!it || !q || q > it.qty) return alert('Pick an item and a quantity within stock on hand')
    set((p) => { const ci = costIssue(p, it, q); return { stock: p.stock.map((i) => (i.id === it.id ? { ...i, qty: i.qty - q, avg: ci.avg } : i)), moves: [{ id: uid(), date: today(), item: it.id, name: it.name, type: 'Farm Issue', qty: -q, ref: '', value: -ci.cost, costCenterId: u.costCenterId, projectId: u.projectId }, ...(p.moves || [])], exps: [{ id: uid(), date: today(), ent: u.ent, costCenterId: u.costCenterId, projectId: u.projectId, field: u.field, cycle: u.cycle, cat: it.cat, desc: `Issued from stock: ${it.name} x ${q} ${it.unit}`, supplier: 'Store', amount: ci.cost, status: 'issued', issue: true }, ...p.exps] } })
    setU({ ...u, qty: '' })
  }
  const B = (k, type = 'text') => <input type={type} value={b[k]} onChange={(e) => setB({ ...b, [k]: e.target.value })} />
  return (
    <>
      <Adder label="Stock Entry"><div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>Buy stock (feed, seed, fertiliser, chemicals, drugs…)</h3>
        <label>Date{B('date', 'date')}</label><label>Item{B('item')}</label>
        <label>Category<select value={b.cat} onChange={(e) => setB({ ...b, cat: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Unit{B('unit')}</label><label>Qty{B('qty', 'number')}</label><label>Total cost (US$){B('cost', 'number')}</label><label>Supplier{B('supplier')}</label>
        <label>Cost center<select value={b.costCenterId} onChange={(e) => setB({ ...b, costCenterId: e.target.value, projectId: '' })}><option value="">—</option>{(s.dt.costcenter || []).filter((center) => center.status !== 'Inactive').map((center) => <option key={center.id} value={center.id}>{center.farm ? center.farm + ' · ' : ''}{center.name}</option>)}</select></label>
        <label>Project<select disabled={!b.costCenterId} value={b.projectId} onChange={(e) => setB({ ...b, projectId: e.target.value })}><option value="">—</option>{(s.dt.project || []).filter((project) => project.costCenter === b.costCenterId && project.status !== 'Cancelled').map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label>Payment<select value={b.status} onChange={(e) => setB({ ...b, status: e.target.value })}><option value="paid">Paid</option><option value="credit">On credit</option></select></label>
        <button className="btn primary" onClick={buy}>Add to stock</button></div>
      <div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>Issue stock to an enterprise (becomes a cost)</h3>
        <label>Item<select value={u.item} onChange={(e) => setU({ ...u, item: e.target.value })}><option value="">Select…</option>{s.stock.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.qty.toFixed(1)} {i.unit})</option>)}</select></label>
        <label>Qty<input type="number" value={u.qty} onChange={(e) => setU({ ...u, qty: e.target.value })} /></label>
        <label>Enterprise<select value={u.ent} onChange={(e) => setU({ ...u, ent: e.target.value })}>{s.ents.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
        <label>Cost center<select value={u.costCenterId} onChange={(e) => setU({ ...u, costCenterId: e.target.value, projectId: '' })}><option value="">—</option>{(s.dt.costcenter || []).filter((center) => center.status !== 'Inactive').map((center) => <option key={center.id} value={center.id}>{center.farm ? center.farm + ' · ' : ''}{center.name}</option>)}</select></label>
        <label>Project<select disabled={!u.costCenterId} value={u.projectId} onChange={(e) => setU({ ...u, projectId: e.target.value })}><option value="">—</option>{(s.dt.project || []).filter((project) => project.costCenter === u.costCenterId && project.status !== 'Cancelled').map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label>Crop cycle<select value={u.cycle} onChange={(e) => setU({ ...u, cycle: e.target.value })}><option value="">—</option>{(s.dt.crop || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <button className="btn primary" onClick={issue}>Issue</button></div></Adder>
      <div className="card scroll"><table className="tbl"><thead><tr><th>Item</th><th>Unit</th><th>On hand</th><th>Avg cost</th><th>Value</th><th>Reorder at</th><th /></tr></thead><tbody>
        {s.stock.map((i) => <tr key={i.id}><td>{i.name}</td><td>{i.unit}</td><td>{i.qty.toFixed(1)}</td><td>{i.avg.toFixed(2)}</td><td>{(i.qty * i.avg).toFixed(2)}</td>
          <td><input type="number" value={i.reorder} onChange={(e) => set((p) => ({ stock: p.stock.map((x) => (x.id === i.id ? { ...x, reorder: +e.target.value } : x)) }))} /></td>
          <td>{i.reorder > 0 && i.qty <= i.reorder && <Badge k="warn">Low</Badge>}</td></tr>)}
        <tr><th colSpan="4">Total stock value</th><th>{sum(s.stock, (i) => i.qty * i.avg).toFixed(2)}</th><td colSpan="2" /></tr></tbody></table></div>
      <div className="card scroll"><h3>Stock purchases</h3><table className="tbl"><thead><tr><th>Date</th><th>Item</th><th>Qty</th><th>Cost</th><th>Supplier</th><th>Due</th><th>Status</th></tr></thead><tbody>
        {s.buys.map((x) => <tr key={x.id}><td>{x.date}</td><td>{x.item}</td><td>{x.qty}</td><td>{x.cost.toFixed(2)}</td><td>{x.supplier}</td><td>{x.due}</td>
          <td>{x.status === 'credit' ? <button className="btn sm" onClick={() => set((p) => ({ buys: p.buys.map((y) => (y.id === x.id ? { ...y, status: 'paid', paidOn: today() } : y)) }))}>Mark paid</button> : 'paid'}</td></tr>)}</tbody></table></div>
    </>
  )
}

function Herd({ s, set, E }) {
  const L = s.ents.filter((e) => e.type === 'livestock')
  const [f, setF] = useState({ date: today(), ent: L[0]?.id || '', type: 'Purchased', head: '', note: '' })
  const add = () => { if (!+f.head || !f.ent) return; set((p) => ({ herd: [{ id: uid(), ...f, head: +f.head }, ...p.herd] })); setF({ ...f, head: '', note: '' }) }
  const n = (id, t) => sum(s.herd.filter((h) => h.ent === id && h.type === t), (h) => h.head)
  return (
    <>
      <Adder label="Movement"><div className="card form-grid">
        <label>Date<input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
        <label>Enterprise<select value={f.ent} onChange={(e) => setF({ ...f, ent: e.target.value })}>{L.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
        <label>Movement<select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{['Purchased', 'Born', 'Sold', 'Died'].map((t) => <option key={t}>{t}</option>)}</select></label>
        <label>Head<input type="number" value={f.head} onChange={(e) => setF({ ...f, head: e.target.value })} /></label>
        <label>Note<input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
        <button className="btn primary" onClick={add}>Record</button></div></Adder>
      <div className="card scroll"><p className="muted">Sales of livestock are added here automatically. Record animal purchase cost under Expenses → "Livestock purchase".</p><table className="tbl"><thead><tr><th>Enterprise</th><th>Bought</th><th>Born</th><th>Sold</th><th>Died</th><th>On hand</th><th>Mortality</th><th>Cost / head</th></tr></thead><tbody>
        {L.map((e) => { const b = n(e.id, 'Purchased'), bo = n(e.id, 'Born'), so = n(e.id, 'Sold'), d = n(e.id, 'Died'), c = E.find((x) => x.id === e.id)
          return <tr key={e.id}><td>{e.name}</td><td>{b}</td><td>{bo}</td><td>{so}</td><td>{d}</td><td><b>{b + bo - so - d}</b></td><td>{b + bo ? Math.round((d / (b + bo)) * 100) + '%' : '-'}</td><td>{b + bo ? (c.total / (b + bo)).toFixed(2) : '-'}</td></tr> })}</tbody></table></div>
    </>
  )
}

function Sales({ s, set, entName }) {
  const P = s.ents.filter((e) => e.type !== 'overhead')
  const [f, setF] = useState({ date: today(), ent: P[0]?.id, cust: '', qty: '', price: '', cur: 'USD', status: 'paid' })
  const add = () => {
    if (!+f.qty || !+f.price) return
    const e = s.ents.find((x) => x.id === f.ent)
    set((p) => ({ sales: [{ id: uid(), ...f, approval: f.status === 'credit' ? 'pending' : 'approved', qty: +f.qty, price: toUSD(f.price, f.cur, p.cfg), due: addDays(f.date, p.cfg.terms) }, ...p.sales], herd: e?.type === 'livestock' && f.status !== 'credit' ? [{ id: uid(), date: f.date, ent: f.ent, type: 'Sold', head: +f.qty, note: 'Sale to ' + f.cust }, ...p.herd] : p.herd }))
    setF({ ...f, cust: '', qty: '', price: '' })
  }
  const I = (k, type = 'text') => <input type={type} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
  return (
    <>
      <Adder label="Sale"><div className="card form-grid">
        <label>Date{I('date', 'date')}</label>
        <label>Enterprise<select value={f.ent} onChange={(e) => setF({ ...f, ent: e.target.value })}>{P.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
        <label>Customer{I('cust')}</label><label>Qty (t / head){I('qty', 'number')}</label><label>Unit price{I('price', 'number')}</label><label>Currency<select value={f.cur} onChange={(e) => setF({ ...f, cur: e.target.value })}><option>USD</option><option>ZiG</option></select></label>
        <label>Payment<select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="paid">Paid now</option><option value="credit">On credit (owing)</option></select></label>
        <button className="btn primary" onClick={add}>Record sale</button></div></Adder>
      <div className="card scroll"><table className="tbl"><thead><tr><th>Date</th><th>Enterprise</th><th>Customer</th><th>Qty</th><th>Price</th><th>Total</th><th>Due</th><th>Status</th><th>Approval</th><th /></tr></thead><tbody>
        {s.sales.map((x) => <tr key={x.id}><td>{x.date}</td><td>{entName(x.ent)}</td><td>{x.cust}</td><td>{x.qty}</td><td>{x.price}</td><td>{(x.qty * x.price).toFixed(2)}</td><td>{x.status === 'credit' ? x.due : ''}</td>
          <td>{x.status === 'credit' ? <button className="btn sm" onClick={() => set((p) => ({ sales: p.sales.map((y) => (y.id === x.id ? { ...y, status: 'paid', paidOn: today() } : y)) }))}>Mark received</button> : 'paid'}</td>
          <td>{x.approval === 'pending' ? <><button className="btn sm" onClick={() => set((p) => ({ sales: p.sales.map((y) => (y.id === x.id ? { ...y, approval: 'approved' } : y)), herd: s.ents.find((e) => e.id === x.ent)?.type === 'livestock' ? [{ id: uid(), date: x.date, ent: x.ent, type: 'Sold', head: x.qty, note: 'Sale to ' + x.cust }, ...p.herd] : p.herd }))}>Approve</button> <button className="btn sm" onClick={() => set((p) => ({ sales: p.sales.map((y) => (y.id === x.id ? { ...y, approval: 'rejected' } : y)) }))}>Reject</button></> : x.approval || 'approved'}</td>
          <td><button className="btn sm" onClick={() => set((p) => ({ sales: p.sales.filter((y) => y.id !== x.id) }))}>✕</button></td></tr>)}</tbody></table></div>
    </>
  )
}

function Assets({ s, set }) {
  const [f, setF] = useState({ name: '', cost: '', life: 5, date: today(), supplier: '', status: 'paid' })
  const [m, setM] = useState(today().slice(0, 7))
  const add = () => { if (!f.name || !+f.cost) return; set((p) => ({ assets: [...p.assets, { id: uid(), ...f, cost: +f.cost, life: +f.life || 5, accDep: 0, due: addDays(f.date, p.cfg.terms) }] })); setF({ ...f, name: '', cost: '' }) }
  const post = () => set((p) => {
    const oh = p.ents.find((e) => e.type === 'overhead') || p.ents[0], rows = []
    const assets = p.assets.map((a) => { const d = +Math.min(a.cost - a.accDep, a.cost / a.life / 12).toFixed(2); if (d <= 0) return a
      rows.push({ id: uid(), date: today(), ent: oh.id, cat: 'Depreciation', desc: `Depreciation ${m}: ${a.name}`, supplier: '-', amount: d, status: 'noncash' }); return { ...a, accDep: a.accDep + d } })
    return { assets, exps: [...rows, ...p.exps], depRuns: [...p.depRuns, m] }
  })
  const I = (k, type = 'text') => <input type={type} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
  return (
    <>
      <Adder label="Asset"><div className="card form-grid"><label>Asset (tractor, pump, shed…){I('name')}</label><label>Cost (US$){I('cost', 'number')}</label><label>Life (years){I('life', 'number')}</label><label>Date{I('date', 'date')}</label><label>Supplier{I('supplier')}</label>
        <label>Payment<select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="paid">Paid</option><option value="credit">On credit</option></select></label><button className="btn primary" onClick={add}>Add asset</button></div></Adder>
      <div className="card"><div className="row"><label>Depreciation month<input type="month" value={m} onChange={(e) => setM(e.target.value)} /></label>
        <button className="btn primary" disabled={s.depRuns.includes(m)} onClick={post}>{s.depRuns.includes(m) ? 'Already posted' : 'Post straight-line depreciation'}</button></div>
        <div className="scroll"><table className="tbl"><thead><tr><th>Asset</th><th>Cost</th><th>Life</th><th>Accum. dep.</th><th>Book value</th></tr></thead><tbody>
          {s.assets.map((a) => <tr key={a.id}><td>{a.name}</td><td>{a.cost.toFixed(2)}</td><td>{a.life}y</td><td>{a.accDep.toFixed(2)}</td><td>{(a.cost - a.accDep).toFixed(2)}</td></tr>)}</tbody></table></div></div>
    </>
  )
}

function Fin({ s, set, E }) {
  const F = finance(s, E), L = (a, b, bold) => <tr key={a}>{bold ? <><th>{a}</th><th>{fmtUSD(b)}</th></> : <><td>{a}</td><td>{fmtUSD(b)}</td></>}</tr>
  return (
    <>
      {F.cash < 0 && <div className="alert over">🚨 Cash is negative (US${F.cash.toFixed(2)}). Record the owner's capital / cash injected below, or check which costs were marked "Paid".</div>}
      <div className="card row"><label>Owner's capital / cash injected (US$)<input type="number" value={s.cfg.capital || ''} onChange={(e) => set((p) => ({ cfg: { ...p.cfg, capital: +e.target.value } }))} /></label></div>
      <div className="two">
        <div className="card"><h3>Profit & loss</h3><table className="tbl"><tbody>{L('Sales revenue', F.rev)}{L('Cost of sales', F.cogs)}{L('Gross profit', F.gross, 1)}<tr><td>Margin</td><td>{F.rev ? Math.round((F.gross / F.rev) * 100) + '%' : '-'}</td></tr></tbody></table>
          <p className="muted">Unsold produce stays in "Produce / work-in-progress" until sold — set units produced on the Enterprises tab.</p></div>
        <div className="card"><h3>Financial position</h3><table className="tbl"><tbody>
          {L('Cash', F.cash)}{L('Customers owe you', F.ar)}{L('Stock on hand (inputs)', F.inv)}{L('Produce / work-in-progress', F.wip)}{L('Fixed assets (book value)', F.nbv)}{L('Biological assets (IAS 41 uplift)', F.bio)}{L('Total assets', F.assets, 1)}
          {L('Suppliers + WHT payable', F.liab)}{L("Owner's capital", s.cfg.capital)}{L('Retained profit', F.gross)}{L('Fair-value gain (IAS 41)', F.bio)}{L('Total liabilities + equity', F.liab + F.equity, 1)}</tbody></table>
          {Math.abs(F.diff) > 0.05 && <p className="alert over">Out of balance by {F.diff.toFixed(2)} — check for deleted entries.</p>}</div>
      </div>
      <div className="card"><h3>Supplier aging (payables)</h3><AgeTable rows={age(payables(s))} /></div>
      <div className="card"><h3>Customer aging (receivables)</h3><AgeTable rows={age(receivables(s))} /></div>
    </>
  )
}

function Expenses({ s, set, entName }) {
  const [f, setF, I, S] = useF({ date: today(), ent: s.ents[0]?.id, field: '', cycle: '', costCenterId: '', projectId: '', cat: CATS[0], desc: '', supplier: '', amount: '', cur: 'USD', status: 'paid', due: '' })
  const add = () => { if (!+f.amount) return; set((p) => ({ exps: [{ id: uid(), ...f, amount: toUSD(f.amount, f.cur, p.cfg), orig: f.cur === 'ZiG' ? +f.amount : 0, wht: whtFor(p, f.supplier, toUSD(f.amount, f.cur, p.cfg)), status: toUSD(f.amount, f.cur, p.cfg) > p.cfg.approveOver ? 'pending' : f.cat === 'Depreciation' ? 'noncash' : f.status, then: f.status, due: f.status === 'credit' ? f.due || addDays(f.date, p.cfg.terms) : '' }, ...p.exps] })); setF({ ...f, desc: '', amount: '', due: '' }) }
  const upd = (id, patch) => set((p) => ({ exps: p.exps.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))
  const del = (id) => set((p) => ({ exps: p.exps.filter((x) => x.id !== id) }))
  return (
    <>
      <Adder label="Expense"><div className="card form-grid">
        <label>Date{I('date', 'date')}</label>
        <label>Enterprise{S('ent', s.ents.map((e) => [e.id, e.name]))}</label>
        <label>Field (optional){S('field', [['', '—'], ...(s.dt.field || []).map((x) => [x.id, x.name])])}</label>
        <label>Crop cycle (optional){S('cycle', [['', '—'], ...(s.dt.crop || []).map((x) => [x.id, x.name])])}</label>
        <label>Cost center<select value={f.costCenterId} onChange={(e) => setF({ ...f, costCenterId: e.target.value, projectId: '' })}><option value="">—</option>{(s.dt.costcenter || []).filter((center) => center.status !== 'Inactive').map((center) => <option key={center.id} value={center.id}>{center.farm ? center.farm + ' · ' : ''}{center.name}</option>)}</select></label>
        <label>Project<select disabled={!f.costCenterId} value={f.projectId} onChange={(e) => setF({ ...f, projectId: e.target.value })}><option value="">—</option>{(s.dt.project || []).filter((project) => project.costCenter === f.costCenterId && project.status !== 'Cancelled').map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <label>Category{S('cat', CATS)}</label>
        <label>Description{I('desc')}</label>
        <label>Supplier{I('supplier')}</label>
        <label>Amount{I('amount', 'number')}</label><label>Currency{S('cur', ['USD', 'ZiG'])}</label>
        <label>Payment{S('status', [['paid', 'Paid'], ['credit', 'On credit (owing)']])}</label>
        {f.status === 'credit' && <label>Due date{I('due', 'date')}</label>}
        <button className="btn primary" onClick={add}>Add</button>
      </div></Adder>
      <div className="card scroll"><table className="tbl"><thead><tr><th>Date</th><th>Enterprise</th><th>Cost center</th><th>Project</th><th>Category</th><th>Description</th><th>Supplier</th><th>US$</th><th>Status</th><th>Due</th><th /></tr></thead><tbody>
        {s.exps.map((x) => <tr key={x.id}><td>{x.date}</td><td>{entName(x.ent)}</td><td>{(s.dt.costcenter || []).find((center) => center.id === x.costCenterId)?.name || '—'}</td><td>{(s.dt.project || []).find((project) => project.id === x.projectId)?.name || '—'}</td><td>{x.cat}</td><td>{x.desc}</td><td>{x.supplier}</td><td>{x.amount.toFixed(2)}</td><td>{x.stock ? 'stock · ' : ''}{x.status}</td><td>{x.due}</td>
          <td>{x.status === 'pending' && <><button className="btn sm" onClick={() => upd(x.id, { status: x.then || 'paid' })}>Approve</button> <button className="btn sm" onClick={() => upd(x.id, { status: 'rejected' })}>Reject</button> </>}
            {x.status === 'credit' && <button className="btn sm" onClick={() => upd(x.id, { status: 'paid', paidOn: today() })}>Mark paid</button>} {!x.stock && !x.issue && <button className="btn sm" onClick={() => del(x.id)}>✕</button>}</td></tr>)}
      </tbody></table>{!s.exps.length && <p className="muted">No expenses yet. Approval limits are set in Purchases › Settings.</p>}</div>
    </>
  )
}

function FarmWorkers({ s, set }) {
  const [worker, setWorker] = useState({ name: '', role: '', ent: s.ents[0]?.id || '', foreman: false })
  const add = () => {
    if (!worker.name.trim()) return
    set((p) => ({ workers: [...p.workers, { id: uid(), name: worker.name.trim(), role: worker.role, ent: worker.ent, foreman: worker.foreman }] }))
    setWorker({ ...worker, name: '', role: '', foreman: false })
  }
  const enterpriseName = (id) => s.ents.find((enterprise) => enterprise.id === id)?.name || '—'
  return <>
    <Adder label="Worker"><div className="card form-grid">
      <label>Name<input value={worker.name} onChange={(e) => setWorker({ ...worker, name: e.target.value })} /></label>
      <label>Role<input value={worker.role} onChange={(e) => setWorker({ ...worker, role: e.target.value })} /></label>
      <label>Enterprise<select value={worker.ent} onChange={(e) => setWorker({ ...worker, ent: e.target.value })}>{s.ents.map((enterprise) => <option key={enterprise.id} value={enterprise.id}>{enterprise.name}</option>)}</select></label>
      <label>Foreman<select value={worker.foreman ? 'yes' : 'no'} onChange={(e) => setWorker({ ...worker, foreman: e.target.value === 'yes' })}><option value="no">No</option><option value="yes">Yes</option></select></label>
      <button className="btn primary" onClick={add}>Add worker</button>
    </div></Adder>
    <div className="card scroll"><table className="tbl"><thead><tr><th>Name</th><th>Role</th><th>Enterprise</th><th>Foreman</th><th /></tr></thead><tbody>
      {s.workers.map((item) => <tr key={item.id}><td>{item.name}</td><td>{item.role || '—'}</td><td>{enterpriseName(item.ent)}</td><td>{item.foreman ? 'Yes' : 'No'}</td><td><button className="btn sm" onClick={() => set((p) => ({ workers: p.workers.filter((entry) => entry.id !== item.id) }))}>Remove</button></td></tr>)}
    </tbody></table>{!s.workers.length && <p className="muted">No farm workers recorded.</p>}</div>
  </>
}

function Budgets({ s, set, E }) {
  const up = (id, k, v) => set((p) => ({ ents: p.ents.map((e) => (e.id === id ? { ...e, [k]: v } : e)) }))
  return (
    <div className="card scroll"><table className="tbl"><thead><tr><th>Enterprise</th><th>Budget (US$)</th><th>Season start</th><th>Season end</th><th>Spent</th><th>Remaining</th><th>Status</th></tr></thead><tbody>
      {E.map((e) => <tr key={e.id}><td>{e.name}</td>
        <td><input type="number" value={e.budget} onChange={(ev) => up(e.id, 'budget', +ev.target.value)} /></td>
        <td><input type="date" value={e.start} onChange={(ev) => up(e.id, 'start', ev.target.value)} /></td>
        <td><input type="date" value={e.end} onChange={(ev) => up(e.id, 'end', ev.target.value)} /></td>
        <td>{e.direct.toFixed(2)}</td><td>{(e.budget - e.direct).toFixed(2)}</td><td><Badge k={e.st.k}>{e.st.label}</Badge></td></tr>)}
    </tbody></table><p className="muted">Flags: red when spending exceeds budget; amber above 90% or when spend runs 15+ points ahead of the season's elapsed time.</p></div>
  )
}

function Ents({ s, set }) {
  const [f, setF] = useState({ name: '', type: 'crop', size: '', unit: 'ha', budget: '' })
  const add = () => { if (!f.name) return; set((p) => ({ ents: [...p.ents, { id: uid(), ...f, size: +f.size, budget: +f.budget, start: today(), end: today().slice(0, 4) + '-12-31' }] })); setF({ ...f, name: '' }) }
  return (
    <>
      <Adder label="Enterprise"><div className="card form-grid">
        <label>Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label>Type<select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value, unit: e.target.value === 'crop' ? 'ha' : e.target.value === 'livestock' ? 'head' : '' })}><option value="crop">Crop</option><option value="livestock">Livestock / meat</option><option value="overhead">Shared overhead</option></select></label>
        <label>Size (ha or head)<input type="number" value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })} /></label>
        <label>Budget (US$)<input type="number" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} /></label>
        <button className="btn primary" onClick={add}>Add enterprise</button>
      </div></Adder>
      <div className="card"><p className="muted">Costs booked to "Shared / overhead" are spread across crops and livestock in proportion to their direct costs.</p>
        {s.ents.map((e) => <div key={e.id} className="row"><span>{e.name} — {e.type}{e.size ? `, ${e.size} ${e.unit}` : ''}</span>{e.type !== 'overhead' && <label>Units produced / expected (t or head)<input type="number" value={e.produced || ''} onChange={(ev) => set((p) => ({ ents: p.ents.map((x) => (x.id === e.id ? { ...x, produced: +ev.target.value } : x)) }))} /></label>}<button className="btn sm" onClick={() => set((p) => ({ ents: p.ents.filter((x) => x.id !== e.id) }))}>Remove</button></div>)}</div>
    </>
  )
}

function Reports({ s, E, entName }) {
  const [r, setR] = useState('cost')
  const ok = s.exps.filter((x) => x.status !== 'pending' && x.status !== 'rejected' && !x.stock)
  const f2 = (n) => n.toFixed(2)
  const R = {
    cost: ['Cost & margin by enterprise', ['Enterprise', 'Direct cost', 'Overhead share', 'Total cost', 'Cost of sales', 'Revenue', 'Profit', 'Cost per ha/head', 'Budget used %'],
      E.map((e) => [e.name, f2(e.direct), f2(e.alloc), f2(e.total), f2(e.cogs), f2(e.rev), f2(e.profit), e.size ? f2(e.total / e.size) + '/' + e.unit : '-', Math.round(e.st.pct * 100) + '%'])],
    cat: ['Expenses by category', ['Category', ...s.ents.map((e) => e.name), 'Total'],
      CATS.map((c) => [c, ...s.ents.map((e) => f2(sum(ok.filter((x) => x.cat === c && x.ent === e.id), (x) => x.amount))), f2(sum(ok.filter((x) => x.cat === c), (x) => x.amount))])],
    pos: ['Financial position', ['Item', 'US$'], Object.entries((() => { const F = finance(s, E); return { Cash: F.cash, Receivables: F.ar, 'Stock on hand': F.inv, 'Produce / WIP': F.wip, 'Fixed assets': F.nbv, 'Total assets': F.assets, Payables: F.liab, 'Owner capital': s.cfg.capital, 'Retained profit': F.gross } })()).map(([k, v]) => [k, f2(v)])],
    stockv: ['Stock valuation', ['Item', 'Unit', 'Qty', 'Avg cost', 'Value'], s.stock.map((x) => [x.name, x.unit, x.qty, f2(x.avg), f2(x.qty * x.avg)])],
    herd: ['Herd movements', ['Date', 'Enterprise', 'Event', 'Head', 'Note'], s.herd.map((x) => [x.date, entName(x.ent), x.type, x.head, x.note])],
    ledger: ['Expense & purchase ledger', ['Date', 'Enterprise', 'Category', 'Description', 'Supplier', 'US$', 'Status'], s.exps.map((x) => [x.date, entName(x.ent), x.cat, x.desc, x.supplier, f2(x.amount), x.status])],
    labour: ['Salaries & labour', ['Date', 'Enterprise', 'Description', 'US$'], ok.filter((x) => x.cat === 'Labour').map((x) => [x.date, entName(x.ent), x.desc, f2(x.amount)])],
    pay: ['Payables (owed to suppliers)', ['Supplier', 'Invoices', 'Owed US$'],
      Object.entries(s.exps.filter((x) => x.status === 'credit').reduce((m, x) => { const k = x.supplier || 'Unknown'; m[k] = m[k] || [0, 0]; m[k][0]++; m[k][1] += x.amount; return m }, {})).map(([k, v]) => [k, v[0], f2(v[1])])],
    stock: ['Stock on hand', ['Item', 'Unit', 'Qty', 'Avg cost', 'Value'], s.stock.map((i) => [i.name, i.unit, f2(i.qty), f2(i.avg), f2(i.qty * i.avg)])],
    ap: ['Supplier aging (payables)', AGEH, age(payables(s)).map((r) => r.map((v, i) => (i ? f2(v) : v)))],
    ar: ['Customer aging (receivables)', AGEH, age(receivables(s)).map((r) => r.map((v, i) => (i ? f2(v) : v)))],
    sales: ['Sales ledger', ['Date', 'Enterprise', 'Buyer', 'Qty', 'Price', 'Total'], s.sales.map((x) => [x.date, entName(x.ent), x.cust, x.qty, x.price, f2(x.qty * x.price)])],
  }
  const [title, head, rows] = R[r]
  return (
    <div className="card">
      <div className="row"><select value={r} onChange={(e) => setR(e.target.value)}>{Object.entries(R).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select>
        <button className="btn primary" onClick={() => csv(head, rows, r)}>Download CSV</button><button className="btn" onClick={() => window.print()}>Print</button></div>
      <h3>{title}</h3>
      <div className="scroll"><table className="tbl"><thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
    </div>
  )
}

function Foreman({ s, set, E }) {
  const fm = s.workers.filter((w) => w.foreman)
  const [id, setId] = useState(fm[0]?.id || '')
  const me = s.workers.find((w) => w.id === id)
  const [date, setDate] = useState(today())
  const [f, setF] = useState({ cat: CATS[0], desc: '', amount: '' })
  if (!me) return <div className="card">Add a farm worker and mark them as foreman in Farm Workers first.</div>
  const crew = s.workers.filter((w) => w.ent === me.ent)
  const ent = E.find((e) => e.id === me.ent)
  const present = (w) => s.att.some((a) => a.w === w && a.date === date)
  const toggle = (w) => set((p) => ({ att: present(w) ? p.att.filter((a) => !(a.w === w && a.date === date)) : [...p.att, { w, date }] }))
  const submit = () => { if (!+f.amount) return; set((p) => ({ exps: [{ id: uid(), date, ent: me.ent, ...f, amount: +f.amount, supplier: me.name, status: 'pending' }, ...p.exps] })); setF({ ...f, desc: '', amount: '' }) }
  return (
    <>
      <div className="card row"><label>Foreman<select value={id} onChange={(e) => setId(e.target.value)}>{fm.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
        <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label></div>
      <div className="card"><h3>{ent?.name} — budget</h3><div className="row"><Bar pct={ent.st.pct} /><Badge k={ent.st.k}>{fmtUSD(ent.direct)} of {fmtUSD(ent.budget)} · {ent.st.label}</Badge></div></div>
      <div className="card"><h3>Attendance for {date}</h3>
        {crew.map((w) => <label key={w.id} className="check"><input type="checkbox" checked={present(w.id)} onChange={() => toggle(w.id)} /> {w.name} — {w.role}</label>)}</div>
      <div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>Submit expense for approval</h3>
        <label>Category<select value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
        <label>Description<input value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} /></label>
        <label>Amount (US$)<input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></label>
        <button className="btn primary" onClick={submit}>Submit</button></div>
      <div className="card"><h3>My submissions</h3>{s.exps.filter((x) => x.supplier === me.name && x.ent === me.ent).slice(0, 8).map((x) => <div key={x.id} className="row"><span>{x.date} · {x.cat} · {x.desc}</span><b>{fmtUSD(x.amount)}</b><Badge k={x.status === 'pending' ? 'warn' : x.status === 'rejected' ? 'over' : 'ok'}>{x.status}</Badge></div>)}</div>
    </>
  )
}
