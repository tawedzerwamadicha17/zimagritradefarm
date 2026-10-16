import { Adder } from './ui.jsx'
import { useF, Tbl } from './farmUtil.jsx'
import { uid, today, addDays, sum, csv } from '../data/store.js'
import { carry, bioHist, bioEvents } from '../data/agri.js'

const cfgIn = (s, set, k, l) => <label>{l}<input type="number" step={k === 'whtRate' ? '0.1' : undefined} value={s.cfg[k]} onChange={(e) => set((p) => ({ cfg: { ...p.cfg, [k]: +e.target.value } }))} /></label>
const ents = (s) => s.ents.map((e) => [e.id, e.name])

export function Tax({ s, set }) {
  const [f, setF, I] = useF({ name: '', cert: '', expiry: addDays(today(), 365) })
  const add = () => { if (!f.name) return; set((p) => ({ vendors: [...p.vendors, { id: uid(), ...f }] })); setF({ ...f, name: '', cert: '' }) }
  const w = s.exps.filter((x) => x.wht > 0)
  return <>
    <div className="card row">{cfgIn(s, set, 'zigRate', 'ZiG per US$1 (used for new entries)')}{cfgIn(s, set, 'whtRate', 'WHT % on non-compliant suppliers')}
      <p className="muted">Ledger is in US$. ZiG entries are converted at the rate above and keep their original ZiG amount. Realised FX gain/loss on settlement is not yet calculated.</p></div>
    <Adder label="Supplier"><div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>Supplier tax clearance (ITF263)</h3>
      <label>Supplier{I('name')}</label><label>Certificate no.{I('cert')}</label><label>Expires{I('expiry', 'date')}</label><button className="btn primary" onClick={add}>Save</button></div></Adder>
    <div className="card"><Tbl head={['Supplier', 'ITF263', 'Expires', 'Status']} rows={s.vendors.map((v) => [v.name, v.cert, v.expiry, v.expiry < today() ? 'EXPIRED — WHT applies' : 'Cleared'])} /></div>
    <div className="card"><h3>WHT deducted (payable to ZIMRA)</h3><Tbl head={['Date', 'Supplier', 'Gross', 'WHT']} rows={w.map((x) => [x.date, x.supplier, x.amount.toFixed(2), x.wht.toFixed(2)])} />
      <p><b>Total WHT: {sum(w, (x) => x.wht).toFixed(2)}</b> <button className="btn sm" onClick={() => csv(['Date', 'Supplier', 'Gross', 'WHT'], w.map((x) => [x.date, x.supplier, x.amount, x.wht]), 'wht-schedule')}>CSV</button></p></div></>
}

const STAGES = ['Planted / young stock', 'Vegetative / growing', 'Flowering / breeding', 'Grain fill / finishing', 'Mature / ready to harvest or sell']
export function Bio({ s, set }) {
  const [f, setF, I, S] = useF({ name: '', ent: s.ents[0]?.id, stage: STAGES[0], qty: '', unit: 'head', cost: '', fv: '', cts: 5, date: today() })
  const [r, setR, RI, RS] = useF({ id: s.bio[0]?.id || '', date: today(), qty: '', fv: '', cts: '', stage: '' })
  const add = () => { if (!f.name || !+f.qty) return; const h = { date: f.date, qty: +f.qty, fv: +f.fv, cts: +f.cts, stage: f.stage }; set((p) => ({ bio: [...p.bio, { id: uid(), name: f.name, ent: f.ent, unit: f.unit, cost: +f.cost, qty: +f.qty, fv: +f.fv, cts: +f.cts, stage: f.stage, date: f.date, hist: [h] }] })); setF({ ...f, name: '', qty: '', cost: '', fv: '' }) }
  const cur = s.bio.find((b) => b.id === (r.id || s.bio[0]?.id))
  const reval = () => { if (!cur) return; const last = bioHist(cur).slice(-1)[0], h = { date: r.date, qty: r.qty === '' ? last.qty : +r.qty, fv: r.fv === '' ? last.fv : +r.fv, cts: r.cts === '' ? last.cts : +r.cts, stage: r.stage || last.stage }
    set((p) => ({ bio: p.bio.map((b) => (b.id === cur.id ? { ...b, qty: h.qty, fv: h.fv, cts: h.cts, stage: h.stage, date: h.date, hist: [...bioHist(b), h] } : b)) })); setR({ ...r, qty: '', fv: '', cts: '', stage: '' }) }
  const ev = bioEvents(s), tot = sum(ev, (e) => e.amt)
  return <>
    <Adder label="Asset / Revaluation"><div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>Biological assets (standing crop / livestock) — fair value less costs to sell (IAS 41)</h3>
      <label>Asset{I('name')}</label><label>Enterprise{S('ent', ents(s))}</label><label>Maturity stage{S('stage', STAGES)}</label><label>Qty{I('qty', 'number')}</label><label>Unit{I('unit')}</label>
      <label>Cost carried so far (US$){I('cost', 'number')}</label><label>Fair value / unit{I('fv', 'number')}</label><label>Costs to sell %{I('cts', 'number')}</label><label>Valuation date{I('date', 'date')}</label><button className="btn primary" onClick={add}>Add</button></div>
    <div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>Revalue — record growth, births / deaths or a new market price (leave blank to keep)</h3>
      <label>Asset{RS('id', s.bio.map((b) => [b.id, b.name]))}</label><label>Date{RI('date', 'date')}</label><label>New qty{RI('qty', 'number')}</label><label>New fair value / unit{RI('fv', 'number')}</label><label>Costs to sell %{RI('cts', 'number')}</label><label>Stage{RS('stage', [['', 'unchanged'], ...STAGES])}</label><button className="btn primary" onClick={reval}>Post revaluation</button></div></Adder>
    <div className="card scroll"><table className="tbl"><thead><tr><th>Asset</th><th>Stage</th><th>Qty</th><th>Fair value / unit</th><th>Carrying (FV − CTS)</th><th>Cost</th><th>Cumulative gain / (loss)</th><th>Revalued</th></tr></thead><tbody>
      {s.bio.map((b) => <tr key={b.id}><td>{b.name}</td><td>{b.stage || bioHist(b).slice(-1)[0].stage || '-'}</td><td>{b.qty} {b.unit}</td><td>{(+b.fv).toFixed(2)}</td><td>{carry(b).toFixed(2)}</td><td>{b.cost.toFixed(2)}</td><td>{(carry(b) - b.cost).toFixed(2)}</td><td>{b.date}</td></tr>)}
      <tr><th colSpan="6">Total fair-value gain (posted to General Ledger: Dr 1150 Biological Assets, Cr 4210 Fair Value Gain)</th><th>{tot.toFixed(2)}</th><td /></tr></tbody></table>
      <p className="muted">Cost is assumed already held in produce / work in progress, so only the uplift is posted. Harvested produce should be moved out of biological assets at fair value less costs to sell — not yet automated.</p></div>
    <div className="card"><h3>Fair-value movement log</h3><Tbl head={['Date', 'Asset', 'Type', 'Physical change', 'Price change', 'Total']} rows={ev.map((e) => [e.date, e.name, e.type, e.physical.toFixed(2), e.price.toFixed(2), e.amt.toFixed(2)])} />
      <button className="btn sm" onClick={() => csv(['Date', 'Asset', 'Type', 'Physical', 'Price', 'Total'], ev.map((e) => [e.date, e.name, e.type, e.physical.toFixed(2), e.price.toFixed(2), e.amt.toFixed(2)]), 'biological-asset-movements')}>Export CSV</button></div></>
}

export function Trace({ s, set, entName }) {
  const [sp, setSp, SI, SS] = useF({ date: today(), ent: s.ents[0]?.id, chem: '', rate: '', phi: 14 })
  const [b, setB, BI, BS] = useF({ lot: '', ent: s.ents[0]?.id, date: today(), qty: '', grade: 'A', dest: '' })
  const addS = () => { if (!sp.chem) return; set((p) => ({ sprays: [{ id: uid(), ...sp, phi: +sp.phi }, ...p.sprays] })); setSp({ ...sp, chem: '', rate: '' }) }
  const addB = () => { if (!b.lot) return; set((p) => ({ batches: [{ id: uid(), ...b, qty: +b.qty }, ...p.batches] })); setB({ ...b, lot: '', qty: '', dest: '' }) }
  const chk = (x) => { const v = s.sprays.find((q) => q.ent === x.ent && addDays(q.date, q.phi) > x.date); return v ? `⚠ ${v.chem} safe from ${addDays(v.date, v.phi)}` : 'OK' }
  return <>
    <Adder label="Record"><div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>Spray / chemical log</h3><label>Date{SI('date', 'date')}</label><label>Enterprise{SS('ent', ents(s))}</label><label>Chemical{SI('chem')}</label><label>Rate{SI('rate')}</label><label>Withholding period (days){SI('phi', 'number')}</label><button className="btn primary" onClick={addS}>Log</button></div>
    <div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>Harvest lots</h3><label>Lot no.{BI('lot')}</label><label>Enterprise{BS('ent', ents(s))}</label><label>Harvest date{BI('date', 'date')}</label><label>Qty (kg){BI('qty', 'number')}</label><label>Grade{BS('grade', ['A', 'B', 'C', 'Reject'])}</label><label>Destination / buyer{BI('dest')}</label><button className="btn primary" onClick={addB}>Add lot</button></div></Adder>
    <div className="card"><Tbl head={['Lot', 'Enterprise', 'Harvested', 'Qty', 'Grade', 'Destination', 'Withholding check']} rows={s.batches.map((x) => [x.lot, entName(x.ent), x.date, x.qty, x.grade, x.dest, chk(x)])} /></div>
    <div className="card"><Tbl head={['Date', 'Enterprise', 'Chemical', 'Rate', 'Safe to harvest from']} rows={s.sprays.map((x) => [x.date, entName(x.ent), x.chem, x.rate, addDays(x.date, x.phi)])} />
      <button className="btn sm" onClick={() => csv(['Lot', 'Enterprise', 'Harvested', 'Qty', 'Grade', 'Destination'], s.batches.map((x) => [x.lot, entName(x.ent), x.date, x.qty, x.grade, x.dest]), 'traceability')}>Export lots CSV</button></div></>
}

export function Pays({ s, set }) {
  const [f, setF, I, S] = useF({ ref: '', amount: '', cur: 'USD', method: 'EcoCash', phone: '' })
  const go = async () => {
    if (!+f.amount) return
    const rec = { id: uid(), date: today(), ...f, amount: +f.amount, status: 'not sent' }
    if (s.cfg.gatewayUrl) { try { const r = await fetch(s.cfg.gatewayUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rec) }); const j = await r.json(); rec.status = j.status || 'pending'; rec.link = j.redirectUrl || '' } catch { rec.status = 'gateway unreachable' } }
    set((p) => ({ pays: [rec, ...p.pays] })); if (rec.link) window.open(rec.link, '_blank')
  }
  return <>
    <div className="card"><label>Your payment-gateway backend URL<input value={s.cfg.gatewayUrl} placeholder="https://yourserver/api/pay" onChange={(e) => set((p) => ({ cfg: { ...p.cfg, gatewayUrl: e.target.value } }))} /></label>
      <p className="muted">Paynow/EcoCash/InnBucks integration keys must stay on a server. This sends the request to your backend, which calls Paynow and returns {'{status, redirectUrl}'}.</p></div>
    <Adder label="Payment Request"><div className="card form-grid"><label>Reference / invoice{I('ref')}</label><label>Amount{I('amount', 'number')}</label><label>Currency{S('cur', ['USD', 'ZiG'])}</label><label>Method{S('method', ['EcoCash', 'InnBucks', 'OneMoney', 'Paynow (card)'])}</label><label>Mobile no.{I('phone')}</label><button className="btn primary" onClick={go}>Request payment</button></div></Adder>
    <div className="card"><Tbl head={['Date', 'Ref', 'Method', 'Amount', 'Status']} rows={s.pays.map((x) => [x.date, x.ref, x.method, x.amount + ' ' + x.cur, x.status])} /></div></>
}
