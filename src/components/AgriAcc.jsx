import { useState } from 'react'
import { Adder } from './ui.jsx'
import { uid, today, sum, csv } from '../data/store.js'
import { Tbl, useF } from './farmUtil.jsx'
import { costing, valuation, method, METHODS, grantSummary, GRANT_KINDS, produceBalances, PTYPES, FARM_LOC, LOC_DELIVERED, LOC_SOLD, LOC_LOSS, toT } from '../data/agri.js'

const f2 = (n) => (+n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const Stat = ({ n, l }) => <div className="card stat"><span className="stat-num">{n}</span><span className="muted">{l}</span></div>
const TABS = { costing: 'Field & Crop Costing', inv: 'Input Inventory Valuation', produce: 'Harvest & Produce Stock', grants: 'Grants, Subsidies & Insurance' }

export default function AgriAcc({ s, set, tab0 }) {
  const tab = TABS[tab0] ? tab0 : 'costing'
  return (<div className="page"><div className="page-head"><div><h1>{TABS[tab]}</h1><p className="muted">Agricultural accounting · USD · feeds the General Ledger</p></div></div>
    {tab === 'costing' && <Costing s={s} />}{tab === 'inv' && <Inventory s={s} set={set} />}{tab === 'produce' && <Produce s={s} set={set} />}{tab === 'grants' && <Grants s={s} set={set} />}</div>)
}

function Costing({ s }) {
  const [spread, setSpread] = useState(true), [price, setPrice] = useState(''), [sel, setSel] = useState('')
  const C = costing(s, { spread, price: +price || 0 }), R = C.rows, pick = R.find((r) => r.c.id === sel)
  const H = ['Crop cycle', 'Field', 'Enterprise', 'Ha', 'Direct cost', 'Shared cost', 'Total cost', 'Cost / ha', 'Yield t', 'Basis', 't / ha', 'Breakeven US$/t', 'Price used', 'Profit', 'Profit / ha', 'Breakeven t/ha']
  const rows = R.map((r) => [r.c.name, r.field, r.ent, r.area, f2(r.direct), f2(r.shared), f2(r.total), f2(r.perHa), f2(r.yieldT), r.basis, f2(r.tPerHa), f2(r.breakeven), f2(r.px), f2(r.profit), f2(r.profitHa), f2(r.beYield)])
  const byCat = pick ? Object.entries(pick.mine.reduce((m, x) => { m[x.cat] = (m[x.cat] || 0) + x.amount; return m }, {})) : []
  return <>
    <div className="card row"><label>Test selling price (US$/t) — blank uses realised or expected price<input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
      <label className="check"><input type="checkbox" checked={spread} onChange={(e) => setSpread(e.target.checked)} /> Spread overhead and untagged costs by area</label></div>
    <div className="card"><h3>Per crop cycle (field / block)</h3>
      <p className="muted">Tag costs by choosing a Crop cycle or Field on Expenses, Stock issues, Field operations, Fuel, Irrigation and labour expenses. Yield comes from Harvest records linked to the cycle (else area × expected yield).</p>
      <div className="scroll"><table className="tbl"><thead><tr>{H.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i} className="clickable" onClick={() => setSel(R[i].c.id)}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
      {!R.length && <p className="muted">No crop cycles yet — add them under Crops › Crop Cycles.</p>}
      <button className="btn sm" onClick={() => csv(H, rows, 'cycle-costing')}>Export CSV</button></div>
    {pick && <div className="card"><h3>Cost by category — {pick.c.name}</h3><Tbl head={['Category', 'US$']} rows={[...byCat.map(([k, v]) => [k, f2(v)]), ['Shared / overhead share', f2(pick.shared)], ['Total', f2(pick.total)]]} /></div>}
    <div className="card"><h3>Per enterprise (crops and livestock)</h3>
      <Tbl head={['Enterprise', 'Size', 'Total cost', 'Cost per ha / head', 'Units produced / sold', 'Breakeven price per unit', 'Revenue', 'Profit', 'Profit per ha / head', 'Not tagged to a cycle']}
        rows={C.ents.map((e) => [e.name, e.size ? e.size + ' ' + e.unit : '-', f2(e.total), f2(e.perSize), e.units, f2(e.breakeven), f2(e.rev), f2(e.profit), f2(e.profitSize), f2(e.unassigned)])} />
      <p className="muted">Breakeven price = total cost ÷ units produced (set "Units produced / expected" under Enterprises). Livestock units are head.</p></div></>
}

function Inventory({ s, set }) {
  const [sel, setSel] = useState(''), m = method(s), V = s.stock.map((i) => ({ i, v: valuation(s, i) }))
  const it = V.find((x) => x.i.id === sel)
  const iss = s.exps.filter((x) => x.issue && x.status !== 'rejected'), byEnt = Object.entries(iss.reduce((o, x) => { const n = s.ents.find((e) => e.id === x.ent)?.name || '-'; o[n] = (o[n] || 0) + x.amount; return o }, {}))
  return <>
    <div className="card row"><label>Costing method for issues<select value={m} onChange={(e) => set((p) => ({ cfg: { ...p.cfg, erp: { ...(p.cfg.erp || {}), valuation: e.target.value } } }))}>{METHODS.map((x) => <option key={x}>{x}</option>)}</select></label>
      <p className="muted">Applies to new issues (Stock tab, Field operations, Feeding, ERP issues). FIFO consumes the oldest purchase layers first; weighted average uses a running average cost. Existing postings are not restated.</p></div>
    <div className="stat-row"><Stat n={'US$' + f2(sum(V, (x) => x.v.book))} l="Book value (current method)" /><Stat n={'US$' + f2(sum(V, (x) => x.v.fifo))} l="FIFO value" /><Stat n={'US$' + f2(sum(V, (x) => x.v.wa))} l="Weighted-average value" /></div>
    <div className="card"><Tbl head={['Item', 'Unit', 'On hand', 'Book cost', 'Book value', 'FIFO value', 'Wtd-avg value', 'FIFO − WA', 'History']}
      rows={V.map(({ i, v }) => [<button className="btn sm" onClick={() => setSel(i.id)}>{i.name}</button>, i.unit, f2(i.qty), f2(i.avg), f2(v.book), f2(v.fifo), f2(v.wa), f2(v.fifo - v.wa), v.tracked ? 'full' : 'partial'])} />
      <p className="muted">"Partial" means some stock was received or consumed before movements were tracked; that portion is valued at the item's average cost.</p></div>
    {it && <div className="card"><h3>FIFO layers — {it.i.name}</h3><Tbl head={['Received', 'Qty left', 'Unit cost', 'Value']} rows={it.v.layers.map((l) => [l.date, f2(l.q), f2(l.c), f2(l.q * l.c)])} /></div>}
    <div className="card"><h3>Inputs consumed into crop and livestock cost</h3><Tbl head={['Enterprise', 'Issued at cost US$']} rows={byEnt.map(([k, v]) => [k, f2(v)])} />
      <p className="muted">Purchases (Dr 1130 Stock) → issue (Cr 1130, Dr cost of the enterprise / cycle) → crop cost → work in progress or cost of sales.</p></div></>
}

function Produce({ s, set }) {
  const { m, stores } = produceBalances(s), C = costing(s), locs = [FARM_LOC, ...stores, LOC_DELIVERED, LOC_SOLD, LOC_LOSS]
  const [f, setF, I, S] = useF({ date: today(), crop: '', type: 'Move to storage', from: FARM_LOC, to: stores[0] || FARM_LOC, qty: '', unit: 't', ref: '' })
  const add = () => { const to = PTYPES[f.type] || f.to; if (!f.crop || !+f.qty || to === f.from) return; set((p) => ({ pmoves: [{ id: uid(), ...f, to, qty: +f.qty }, ...(p.pmoves || [])] })); setF({ ...f, qty: '', ref: '' }) }
  const cpt = (crop) => { const r = C.rows.filter((x) => (x.c.crop || '').toLowerCase() === crop.toLowerCase() && x.basis === 'actual'); const t = sum(r, (x) => x.yieldT); return t ? sum(r, (x) => x.total) / t : 0 }
  const crops = Object.keys(m), bal = (c, l) => m[c].loc[l] || 0, onHand = (c) => [FARM_LOC, ...stores].reduce((a, l) => a + bal(c, l), 0)
  const mism = (s.dt.storage || []).map((u) => { const t = sum(crops, (c) => bal(c, u.name)); return +u.qty !== undefined && Math.abs((+u.qty || 0) - t) > 0.05 ? `${u.name}: Storage record says ${(+u.qty || 0).toFixed(2)} t, produce ledger says ${t.toFixed(2)} t` : '' }).filter(Boolean)
  return <>
    <Adder label="Movement"><div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>Record produce movement (harvests come in automatically from Harvest Records)</h3>
      <label>Date{I('date', 'date')}</label><label>Crop<input list="crops" value={f.crop} onChange={(e) => setF({ ...f, crop: e.target.value })} /><datalist id="crops">{crops.map((c) => <option key={c} value={c} />)}</datalist></label>
      <label>Movement{S('type', Object.keys(PTYPES))}</label><label>From{S('from', [FARM_LOC, ...stores])}</label>
      {!PTYPES[f.type] && <label>To{S('to', [FARM_LOC, ...stores])}</label>}<label>Quantity{I('qty', 'number')}</label><label>Unit{S('unit', ['t', 'kg', 'bags'])}</label><label>Buyer / co-op / reference{I('ref')}</label>
      <button className="btn primary" onClick={add}>Record</button></div></Adder>
    {mism.map((x) => <div key={x} className="alert warn">⚠ {x}</div>)}
    <div className="card"><h3>Produce on hand (tonnes)</h3><Tbl head={['Crop', 'Harvested', 'On-farm', ...stores, 'Delivered (not yet sold)', 'Sold', 'Losses', 'Loss %', 'On hand', 'Cost / t', 'Value at cost']}
      rows={crops.map((c) => [c, f2(m[c].harvested), f2(bal(c, FARM_LOC)), ...stores.map((n) => f2(bal(c, n))), f2(bal(c, LOC_DELIVERED)), f2(bal(c, LOC_SOLD)), f2(bal(c, LOC_LOSS)), m[c].harvested ? f2((bal(c, LOC_LOSS) / m[c].harvested) * 100) + '%' : '-', f2(onHand(c)), f2(cpt(c)), f2(onHand(c) * cpt(c))])} />
      {!crops.length && <p className="muted">No harvest yet. Add Harvest Records and link them to a crop cycle.</p>}
      <p className="muted">Cost per tonne is the actual cost of linked crop cycles divided by tonnes harvested. Produce delivered to a co-operative stays here until you record the sale.</p></div>
    <div className="card"><h3>Movement log</h3><div className="scroll"><table className="tbl"><thead><tr><th>Date</th><th>Crop</th><th>Movement</th><th>From</th><th>To</th><th>Qty</th><th>Ref</th><th /></tr></thead><tbody>
      {(s.pmoves || []).map((x) => <tr key={x.id}><td>{x.date}</td><td>{x.crop}</td><td>{x.type}</td><td>{x.from}</td><td>{x.to}</td><td>{x.qty} {x.unit} ({f2(toT(x.qty, x.unit))} t)</td><td>{x.ref}</td><td><button className="btn sm" onClick={() => set((p) => ({ pmoves: p.pmoves.filter((y) => y.id !== x.id) }))}>✕</button></td></tr>)}</tbody></table></div></div></>
}

function Grants({ s, set }) {
  const [f, setF, I, S] = useF({ date: today(), kind: GRANT_KINDS[0], source: '', desc: '', amount: '', status: 'Approved', rdate: '', recog: 'On approval', start: '', end: '' })
  const add = () => { if (!+f.amount) return; set((p) => ({ grants: [{ id: uid(), ...f, amount: +f.amount, rdate: f.status === 'Received' ? f.rdate || f.date : '' }, ...(p.grants || [])] })); setF({ ...f, source: '', desc: '', amount: '' }) }
  const upd = (id, patch) => set((p) => ({ grants: p.grants.map((g) => (g.id === id ? { ...g, ...patch } : g)) }))
  const G = grantSummary(s), live = G.filter((x) => ['Approved', 'Received'].includes(x.g.status))
  return <>
    <div className="stat-row"><Stat n={'US$' + f2(sum(live, (x) => +x.g.amount))} l="Approved" /><Stat n={'US$' + f2(sum(live.filter((x) => x.g.status === 'Received'), (x) => +x.g.amount))} l="Received" /><Stat n={'US$' + f2(sum(G, (x) => x.receivable))} l="Receivable" /><Stat n={'US$' + f2(sum(G, (x) => x.recognised))} l="Recognised as income" /><Stat n={'US$' + f2(sum(live, (x) => x.deferred))} l="Deferred income" /></div>
    <Adder label="Grant / Claim"><div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>New grant, subsidy or insurance claim</h3>
      <label>Approval / claim date{I('date', 'date')}</label><label>Type{S('kind', GRANT_KINDS)}</label><label>Funder / insurer{I('source')}</label><label>Description (e.g. drought claim){I('desc')}</label><label>Amount (US$){I('amount', 'number')}</label>
      <label>Status{S('status', ['Applied', 'Approved', 'Received', 'Rejected'])}</label>{f.status === 'Received' && <label>Date received{I('rdate', 'date')}</label>}
      <label>Recognise as income{S('recog', ['On approval', 'On conditions met', 'Over period'])}</label>{f.recog === 'Over period' && <><label>Period start{I('start', 'date')}</label><label>Period end{I('end', 'date')}</label></>}
      <button className="btn primary" onClick={add}>Add</button></div></Adder>
    <div className="card scroll"><table className="tbl"><thead><tr><th>Date</th><th>Type</th><th>Funder</th><th>Description</th><th>Amount</th><th>Status</th><th>Income basis</th><th>Recognised</th><th>Deferred</th><th /></tr></thead><tbody>
      {G.map(({ g, recognised, deferred }) => <tr key={g.id}><td>{g.date}</td><td>{g.kind}</td><td>{g.source}</td><td>{g.desc}</td><td>{f2(g.amount)}</td><td>{g.status}</td><td>{g.recog}{g.recog === 'On conditions met' && !g.met ? ' (pending)' : ''}</td><td>{f2(recognised)}</td><td>{['Approved', 'Received'].includes(g.status) ? f2(deferred) : '-'}</td>
        <td>{g.status === 'Applied' && <button className="btn sm" onClick={() => upd(g.id, { status: 'Approved' })}>Approve</button>} {g.status === 'Approved' && <button className="btn sm" onClick={() => upd(g.id, { status: 'Received', rdate: today() })}>Mark received</button>} {g.recog === 'On conditions met' && !g.met && ['Approved', 'Received'].includes(g.status) && <button className="btn sm" onClick={() => upd(g.id, { met: today() })}>Conditions met</button>} <button className="btn sm" onClick={() => set((p) => ({ grants: p.grants.filter((y) => y.id !== g.id) }))}>✕</button></td></tr>)}</tbody></table>
      {!G.length && <p className="muted">Nothing recorded yet.</p>}
      <p className="muted">Approval: Dr Grants receivable, Cr Deferred income. Receipt: Dr Cash, Cr Receivable. Release to income (accounts 4220 / 4230, shown as Other Income so sales revenue is not distorted): on approval, when conditions are met, or monthly over the period.</p></div></>
}
