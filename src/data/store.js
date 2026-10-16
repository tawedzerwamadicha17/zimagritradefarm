import { useState, useEffect } from 'react'
import { LISTINGS } from './seed.js'

export const CATS = ['Seed / Stock purchase','Fertiliser','Chemicals','Feed','Vet & Drugs','Labour','Fuel','Repairs','Irrigation & Power','Transport','Insurance & Levies','Depreciation','Livestock purchase','Other']
export const uid = () => Math.random().toString(36).slice(2, 9)
export const today = () => new Date().toISOString().slice(0, 10)
export const addDays = (d, n) => new Date(new Date(d).getTime() + n * 864e5).toISOString().slice(0, 10)
export const sum = (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0)
export const AGEH = ['Party', 'Current', '1-30 days', '31-60', '61-90', '90+', 'Total']
const KEY = 'agri_farm_v1'

export const SEED = {
  ents: [
    { id: 'e1', name: 'Maize 2026/27', type: 'crop', size: 5, unit: 'ha', budget: 6000, produced: 0, start: '2026-10-15', end: '2027-05-31' },
    { id: 'e2', name: 'Beef finishing', type: 'livestock', size: 20, unit: 'head', budget: 9000, produced: 0, start: '2026-10-01', end: '2027-03-31' },
    { id: 'e3', name: 'Shared / overhead', type: 'overhead', size: 0, unit: '', budget: 1500, produced: 0, start: '2026-10-01', end: '2027-09-30' },
  ],
  exps: [], vendors: [], bio: [], batches: [], sprays: [], pays: [], sales: [], att: [], stock: [], buys: [], herd: [], assets: [], depRuns: [], ads: [], reqs: [], orders: [], posts: [], msgs: [], carts: {}, dt: {}, log: [], grants: [], pmoves: [],
  mk: LISTINGS.map((l) => ({ ...l, id: 'm' + l.id, owner: null })),
  workers: [
    { id: 'w1', name: 'Foreman (edit me)', role: 'Foreman', ent: 'e1', foreman: true },
    { id: 'w2', name: 'General hand (edit me)', role: 'Labourer', ent: 'e1', foreman: false },
  ],
  cfg: { zigRate: 26, whtRate: 10, gatewayUrl: '', approveOver: 500, terms: 30, capital: 0, farm: 'My Farm', phone: '', email: '' },
}
export const liveSales = (s) => s.sales.filter((x) => x.approval !== 'pending' && x.approval !== 'rejected')

export const toUSD = (amt, cur, cfg) => (cur === 'ZiG' ? +amt / (cfg.zigRate || 1) : +amt)
// WHT applies only to suppliers registered in Tax & Currency whose ITF263 clearance has expired
export const whtFor = (p, sup, usd) => { const v = (p.vendors || []).find((x) => x.name.toLowerCase() === (sup || '').toLowerCase()); return v && v.expiry < today() ? +((usd * p.cfg.whtRate) / 100).toFixed(2) : 0 }

export function useStore() {
  const [s, setS] = useState(() => { try { const v = JSON.parse(localStorage.getItem(KEY)); return v ? { ...SEED, ...v, cfg: { ...SEED.cfg, ...v.cfg } } : SEED } catch { return SEED } })
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch {} }, [s])
  return [s, (patch) => setS((p) => ({ ...p, ...(typeof patch === 'function' ? patch(p) : patch) }))]
}

export function budgetStatus(spent, b, start, end) {
  const pct = b ? spent / b : 0
  const el = Math.min(1, Math.max(0, (Date.now() - new Date(start)) / (new Date(end) - new Date(start))))
  if (pct > 1) return { k: 'over', label: 'OVER BUDGET', pct, el }
  if (pct > 0.9) return { k: 'warn', label: 'Near limit (>90%)', pct, el }
  if (pct > el + 0.15 && pct > 0.1) return { k: 'warn', label: 'Spending ahead of season pace', pct, el }
  return { k: 'ok', label: 'On track', pct, el }
}

export function csv(head, rows, name) {
  const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"'
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([[head, ...rows].map((r) => r.map(q).join(',')).join('\n')], { type: 'text/csv' }))
  a.download = name + '.csv'; a.click()
}

// Costs = approved expenses + stock issued + depreciation. Cost of sales = enterprise cost x (sold / produced);
// the unsold share stays on the balance sheet as produce/work-in-progress.
export function compute(s) {
  const ok = s.exps.filter((x) => x.status !== 'pending' && x.status !== 'rejected')
  const direct = (id) => sum(ok.filter((x) => x.ent === id), (x) => x.amount)
  const prod = s.ents.filter((e) => e.type !== 'overhead')
  const ovh = sum(s.ents.filter((e) => e.type === 'overhead'), (e) => direct(e.id))
  const dTot = sum(prod, (e) => direct(e.id))
  return s.ents.map((e) => {
    const d = direct(e.id), oh = e.type === 'overhead'
    const alloc = oh ? 0 : dTot ? (ovh * d) / dTot : 0
    const sl = liveSales(s).filter((x) => x.ent === e.id)
    const sold = sum(sl, (x) => x.qty), rev = sum(sl, (x) => x.qty * x.price)
    const total = oh ? d : d + alloc
    const cogs = oh ? 0 : total * (e.produced > 0 ? Math.min(1, sold / e.produced) : 1)
    return { ...e, direct: d, alloc, total, sold, rev, cogs, wip: oh ? 0 : total - cogs, profit: oh ? 0 : rev - cogs, st: budgetStatus(d, e.budget, e.start, e.end) }
  })
}

export const payables = (s) => [
  ...s.exps.filter((x) => x.status === 'credit').map((x) => ({ party: x.supplier || 'Unknown', amount: Math.max(0, (x.invoiceTotal ?? x.amount) - (+x.paid || 0)), due: x.due || x.date })),
  ...s.buys.filter((x) => x.status === 'credit').map((x) => ({ party: x.supplier || 'Unknown', amount: x.cost, due: x.due || x.date })),
  ...s.assets.filter((x) => x.status === 'credit').map((x) => ({ party: x.supplier || 'Unknown', amount: x.cost, due: x.due || x.date })),
]
export const receivables = (s) => liveSales(s).filter((x) => x.status === 'credit').map((x) => ({ party: x.cust || 'Unknown', amount: Math.max(0, (x.invoiceTotal ?? x.qty * x.price) - (+x.paid || 0)), due: x.due || x.date }))

export function age(items) {
  const m = {}
  items.forEach((i) => {
    const d = Math.floor((Date.now() - new Date(i.due)) / 864e5)
    const b = d <= 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : d <= 90 ? 3 : 4
    m[i.party] = m[i.party] || [0, 0, 0, 0, 0]; m[i.party][b] += i.amount
  })
  return Object.entries(m).map(([p, v]) => [p, ...v, sum(v)])
}

export function finance(s, E) {
  const ok = s.exps.filter((x) => x.status !== 'pending' && x.status !== 'rejected')
  const T = sum(ok, (x) => x.amount), rev = sum(E, (e) => e.rev), cogs = sum(E, (e) => e.cogs)
  const salesReceived = sum(liveSales(s), (x) => x.paid !== undefined ? +x.paid || 0 : x.status !== 'credit' ? x.qty * x.price : 0)
  const expensesPaid = sum(s.exps, (x) => x.paid !== undefined ? Math.max(0, (+x.paid || 0) - (x.wht || 0)) : x.status === 'paid' ? x.amount - (x.wht || 0) : 0)
  const cash = s.cfg.capital + salesReceived
    - expensesPaid - sum(s.buys.filter((x) => x.status === 'paid'), (x) => x.cost) - sum(s.assets.filter((x) => x.status === 'paid'), (x) => x.cost)
  const ar = sum(receivables(s), (x) => x.amount), ap = sum(payables(s), (x) => x.amount)
  const inv = sum(s.stock, (i) => i.qty * i.avg), wip = T - cogs, nbv = sum(s.assets, (a) => a.cost - a.accDep)
  const whtp = sum(s.exps.filter((x) => x.status === 'paid'), (x) => x.wht || 0)
  const bio = sum(s.bio, (b) => b.qty * b.fv * (1 - b.cts / 100) - b.cost)
  const assets = cash + ar + inv + wip + nbv + bio, equity = s.cfg.capital + rev - cogs + bio
  return { rev, cogs, gross: rev - cogs, cash, ar, ap, inv, wip, nbv, assets, liab: ap + whtp, whtp, bio, equity, diff: assets - ap - whtp - equity }
}
