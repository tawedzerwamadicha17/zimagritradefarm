import { useState } from 'react'

export const KEY = 'agri_farm_v1'
export const CATS = ['Seed / Stock purchase','Fertiliser','Chemicals','Feed','Vet & Drugs','Labour','Fuel','Repairs','Irrigation & Power','Transport','Insurance & Levies','Depreciation','Other']
export const uid = () => Math.random().toString(36).slice(2, 9)
export const today = () => new Date().toISOString().slice(0, 10)
export const sum = (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0)
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10) }
export const Badge = ({ k, children }) => <span className={'badge ' + k}>{children}</span>
export const Bar = ({ pct }) => <div className="bar"><i className={pct > 1 ? 'over' : pct > 0.9 ? 'warn' : ''} style={{ width: Math.min(100, pct * 100) + '%' }} /></div>
export const Tbl = ({ head, rows }) => (
  <div className="scroll"><table className="tbl"><thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>
)
export function csv(head, rows, name) {
  const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const t = [head, ...rows].map((r) => r.map(q).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv' }))
  a.download = name + '.csv'; a.click()
}
// form-state hook: returns [state, setState, inputBuilder, selectBuilder]
export function useF(init) {
  const [f, setF] = useState(init)
  const I = (k, type = 'text') => <input type={type} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
  const S = (k, opts) => (
    <select value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}>
      {opts.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>))}
    </select>
  )
  return [f, setF, I, S]
}

// ---- accounting ----
export function fin(s) {
  const live = s.exps.filter((x) => x.status !== 'pending' && x.status !== 'rejected')
  const pl = live.filter((x) => !x.stock)
  const cost = sum(pl, (x) => x.amount)
  const rev = sum(s.sales, (x) => x.qty * x.price)
  const salesPaid = sum(s.sales.filter((x) => x.status !== 'credit'), (x) => x.qty * x.price)
  const ar = rev - salesPaid
  const paidOut = sum(live.filter((x) => x.status === 'paid'), (x) => x.amount)
  const ap = sum(live.filter((x) => x.status === 'credit'), (x) => x.amount)
  const dep = sum(pl.filter((x) => x.cat === 'Depreciation'), (x) => x.amount)
  const inv = sum(s.stock, (i) => i.qty * i.avg)
  const cash = s.cfg.openCash + salesPaid - paidOut
  const fa = s.cfg.openAssets - dep
  return { rev, cost, profit: rev - cost, ar, ap, inv, cash, fa, dep, assets: cash + inv + ar + fa, equity: s.cfg.openCash + s.cfg.openAssets + rev - cost }
}
export const posRows = (s) => {
  const f = fin(s), m = (n) => n.toFixed(2)
  return [['ASSETS', ''], ['Cash', m(f.cash)], ['Inventory (stock on hand)', m(f.inv)], ['Receivables (customers)', m(f.ar)], ['Fixed assets (net of depreciation)', m(f.fa)], ['Total assets', m(f.assets)],
    ['LIABILITIES', ''], ['Payables (suppliers)', m(f.ap)], ['EQUITY', ''], ['Opening capital', m(s.cfg.openCash + s.cfg.openAssets)], ['Profit / (loss) to date', m(f.profit)], ['Total liabilities + equity', m(f.ap + f.equity)]]
}
export const AGE_HEAD = ['Party', 'Not yet due', '1-30 days', '31-60 days', '61-90 days', '90+ days', 'Total']
export const apRows = (s) => s.exps.filter((x) => x.status === 'credit').map((x) => ({ party: x.supplier || 'Unknown', amount: x.amount, due: x.due || x.date }))
export const arRows = (s) => s.sales.filter((x) => x.status === 'credit').map((x) => ({ party: x.buyer || 'Unknown', amount: x.qty * x.price, due: x.due || x.date }))
export function aging(rows) {
  const m = {}
  rows.forEach((r) => {
    const d = Math.floor((Date.now() - new Date(r.due)) / 864e5)
    const b = d <= 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : d <= 90 ? 3 : 4
    m[r.party] = m[r.party] || [0, 0, 0, 0, 0]; m[r.party][b] += r.amount
  })
  const out = Object.entries(m).map(([p, v]) => [p, ...v.map((x) => x.toFixed(2)), sum(v).toFixed(2)])
  if (out.length) out.push(['TOTAL', ...[0, 1, 2, 3, 4].map((i) => sum(Object.values(m), (v) => v[i]).toFixed(2)), sum(Object.values(m), (v) => sum(v)).toFixed(2)])
  return out
}
