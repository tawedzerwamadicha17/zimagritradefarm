import { sum, today, addDays, compute } from './store.js'

// ---------------------------------------------------------------------------
// Units: harvest / produce quantities are normalised to tonnes (bags = 50 kg).
// ---------------------------------------------------------------------------
export const toT = (q, u) => (u === 'kg' ? (+q || 0) / 1000 : u === 'bags' ? (+q || 0) * 0.05 : +q || 0)

// ---------------------------------------------------------------------------
// 1. ENTERPRISE / FIELD / CROP-CYCLE COSTING
// Costs are tagged to a crop cycle (or a field) on expenses, stock issues, fuel,
// irrigation and field costs. Shared overhead is spread by area.
// ---------------------------------------------------------------------------
const liveExps = (s) => s.exps.filter((x) => x.status !== 'pending' && x.status !== 'rejected' && !x.stock)

export function costing(s, { spread = true, price = 0 } = {}) {
  const E = compute(s), ok = liveExps(s), cycles = s.dt.crop || [], fields = s.dt.field || [], harv = s.dt.harvest || []
  const fname = (id) => fields.find((f) => f.id === id)?.name || ''
  // which cycle does an expense belong to?
  const owner = (x) => {
    if (x.cycle && cycles.some((c) => c.id === x.cycle)) return x.cycle
    if (!x.field) return null
    const c = cycles.filter((k) => k.field === x.field && (!x.ent || !k.ent || k.ent === x.ent)).sort((a, b) => (b.plant || '').localeCompare(a.plant || ''))
    return (c.find((k) => !k.plant || k.plant <= x.date) || c[c.length - 1])?.id || null
  }
  const tagged = {}
  ok.forEach((x) => { const o = owner(x); if (o) (tagged[o] = tagged[o] || []).push(x) })
  const taggedIds = new Set(Object.values(tagged).flat().map((x) => x.id))
  const entRows = E.filter((e) => e.type !== 'overhead')
  const unassigned = (eid) => sum(ok.filter((x) => x.ent === eid && !taggedIds.has(x.id)), (x) => x.amount)
  const rows = cycles.map((c) => {
    const e = E.find((x) => x.id === c.ent), mine = tagged[c.id] || [], direct = sum(mine, (x) => x.amount)
    const sib = cycles.filter((k) => k.ent === c.ent), area = +c.area || 0, tot = sum(sib, (k) => +k.area || 0)
    const sh = tot ? area / tot : sib.length ? 1 / sib.length : 0
    const shared = e ? (e.alloc + (spread ? unassigned(e.id) : 0)) * sh : 0
    const total = direct + shared
    const hv = harv.filter((h) => h.cycle === c.id), actual = sum(hv, (h) => toT(h.qty, h.unit))
    const expected = area * (+c.eyield || 0), yieldT = actual || expected
    const sold = e && e.sold > 0 && e.rev > 0 ? e.rev / e.sold : 0
    const hp = hv.filter((h) => +h.price > 0), hpAvg = hp.length ? sum(hp, (h) => +h.price) / hp.length : 0
    const px = +price || sold || hpAvg || 0
    const rev = yieldT * px
    return { c, field: fname(c.field), ent: e?.name || '-', area, direct, shared, total, perHa: area ? total / area : 0, yieldT, basis: actual ? 'actual' : expected ? 'expected' : 'none',
      tPerHa: area ? yieldT / area : 0, breakeven: yieldT ? total / yieldT : 0, px, rev, profit: rev - total, profitHa: area ? (rev - total) / area : 0, beYield: px && area ? total / px / area : 0, mine }
  })
  const ents = entRows.map((e) => {
    const units = e.produced > 0 ? e.produced : e.sold > 0 ? e.sold : e.size || 0
    return { ...e, units, perSize: e.size ? e.total / e.size : 0, breakeven: units ? e.total / units : 0, profitSize: e.size ? e.profit / e.size : 0, unassigned: unassigned(e.id) }
  })
  return { rows, ents, taggedIds, owner }
}

// ---------------------------------------------------------------------------
// 2. BIOLOGICAL ASSETS (IAS 41): fair value less costs to sell, with a movement log
// split into initial recognition, physical change (growth/births/deaths) and price change.
// ---------------------------------------------------------------------------
export const carry = (h) => (+h.qty || 0) * (+h.fv || 0) * (1 - (+h.cts || 0) / 100)
export const bioHist = (b) => (b.hist && b.hist.length ? b.hist : [{ date: b.date || today(), qty: b.qty, fv: b.fv, cts: b.cts, stage: b.stage || '' }])
export function bioEvents(s) {
  const out = []
  ;(s.bio || []).forEach((b) => {
    const h = bioHist(b)
    h.forEach((x, i) => {
      if (!i) { const a = carry(x) - (+b.cost || 0); out.push({ date: x.date, bio: b.id, name: b.name, type: 'Initial recognition', physical: 0, price: a, amt: a, stage: x.stage }); return }
      const p = h[i - 1], phys = ((+x.qty || 0) - (+p.qty || 0)) * (+p.fv || 0) * (1 - (+p.cts || 0) / 100), amt = carry(x) - carry(p)
      out.push({ date: x.date, bio: b.id, name: b.name, type: Math.abs(phys) > 0.005 && Math.abs(amt - phys) > 0.005 ? 'Physical + price' : Math.abs(phys) > 0.005 ? 'Physical change' : 'Price change', physical: phys, price: amt - phys, amt, stage: x.stage })
    })
  })
  return out.filter((e) => Math.abs(e.amt) > 0.004).sort((a, b) => a.date.localeCompare(b.date))
}

// ---------------------------------------------------------------------------
// 3. GRANTS, SUBSIDIES & INSURANCE (deferred income handling)
// Approved  -> Dr Grants receivable (1160)  Cr Deferred income (2140)
// Received  -> Dr Cash (1110)               Cr Grants receivable (1160)
// Released  -> Dr Deferred income (2140)    Cr Grants / Insurance income (4220 / 4230)
// ---------------------------------------------------------------------------
export const GRANT_KINDS = ['Grant', 'Input subsidy (cash)', 'Insurance claim', 'Other support']
export const grantAcct = (g) => (g.kind === 'Insurance claim' ? '4230' : '4220')
const dayMs = 864e5
export function grantEvents(s) {
  const out = []
  ;(s.grants || []).forEach((g, k) => {
    if (g.status !== 'Approved' && g.status !== 'Received') return
    const amt = +g.amount || 0, vn = `ACC-GRANT-${String(k + 1).padStart(5, '0')}`; if (!amt) return
    out.push({ g: g.id, date: g.date, dr: '1160', cr: '2140', amt, kind: 'approve', vn, remark: `${g.kind} approved: ${g.source || ''} ${g.desc || ''}` })
    if (g.status === 'Received') out.push({ g: g.id, date: g.date, cd: g.rdate || g.date, dr: '1110', cr: '1160', amt, kind: 'receive', vn: vn + '-R', remark: `${g.kind} received: ${g.source || ''}` })
    const inc = grantAcct(g), rel = (date, a) => a > 0.004 && out.push({ g: g.id, date, dr: '2140', cr: inc, amt: +a.toFixed(2), kind: 'release', vn: vn + '-REL', remark: `${g.kind} recognised: ${g.source || ''}` })
    if (g.recog === 'Over period') {
      const st = g.start || g.date, en = g.end && g.end >= st ? g.end : addDays(st, 365), total = Math.round((new Date(en) - new Date(st)) / dayMs) + 1
      let cur = st, n = 0
      while (cur <= en && cur <= today() && n++ < 240) {
        const eom = new Date(new Date(cur).getFullYear(), new Date(cur).getMonth() + 1, 0), eomS = new Date(eom.getTime() - eom.getTimezoneOffset() * 6e4).toISOString().slice(0, 10)
        const stop = [eomS, en, today()].sort()[0], days = Math.round((new Date(stop) - new Date(cur)) / dayMs) + 1
        rel(stop, (amt * days) / total); cur = addDays(stop, 1)
      }
    } else if (g.recog === 'On conditions met') { if (g.met) rel(g.met, amt) } else rel(g.date, amt)
  })
  return out
}
export function grantSummary(s) {
  const ev = grantEvents(s), t = today()
  return (s.grants || []).map((g) => {
    const e = ev.filter((x) => x.g === g.id), rec = sum(e.filter((x) => x.kind === 'release' && x.date <= t), (x) => x.amt)
    const appr = e.some((x) => x.kind === 'approve') ? +g.amount || 0 : 0
    return { g, recognised: rec, deferred: appr - rec, receivable: g.status === 'Approved' ? appr : 0 }
  })
}

// ---------------------------------------------------------------------------
// 4. INPUT INVENTORY: FIFO layers vs weighted average, built from the stock ledger
// ---------------------------------------------------------------------------
export const METHODS = ['Weighted average', 'FIFO']
export const method = (p) => (p.cfg?.erp?.valuation === 'FIFO' ? 'FIFO' : 'Weighted average')
function events(p, i) {
  const ev = []
  ;(p.buys || []).forEach((b, k) => { if ((b.item || '').toLowerCase() === (i.name || '').toLowerCase() && +b.qty > 0) ev.push({ date: b.date, q: +b.qty, c: b.cost / b.qty, k }) })
  ;[...(p.moves || [])].reverse().forEach((m, k) => { if (m.item === i.id && +m.qty) ev.push({ date: m.date, q: +m.qty, c: Math.abs(m.value / m.qty) || i.avg, k: 1e6 + k }) })
  return ev.sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.k - b.k)
}
const eat = (L, n) => { let c = 0; while (n > 1e-9 && L.length) { const t = Math.min(n, L[0].q); c += t * L[0].c; L[0].q -= t; n -= t; if (L[0].q <= 1e-9) L.shift() } return c }
export function valuation(p, i) {
  const ev = events(p, i), L = []; let q = 0, avg = 0
  ev.forEach((e) => {
    if (e.q > 0) { L.push({ q: e.q, c: e.c, date: e.date }); avg = (q * avg + e.q * e.c) / (q + e.q); q += e.q } else { eat(L, -e.q); q = Math.max(0, q + e.q) }
  })
  const have = sum(L, (l) => l.q), diff = (+i.qty || 0) - have
  if (diff > 1e-9) L.push({ q: diff, c: i.avg || 0, date: 'untracked' }); else if (diff < -1e-9) eat(L, -diff)
  const tracked = Math.abs(diff) < 1e-6
  return { layers: L, fifo: sum(L, (l) => l.q * l.c), wa: tracked && ev.length ? i.qty * avg : i.qty * i.avg, book: i.qty * i.avg, tracked }
}
// Cost of issuing q units of item i under the configured method; returns the cost and the new average.
export function costIssue(p, i, q) {
  if (method(p) !== 'FIFO') return { cost: +(q * i.avg).toFixed(2), avg: i.avg }
  const L = valuation(p, i).layers.map((l) => ({ ...l })), cost = eat(L, q), rq = sum(L, (l) => l.q)
  return { cost: +cost.toFixed(2), avg: rq > 1e-9 ? sum(L, (l) => l.q * l.c) / rq : i.avg }
}

// ---------------------------------------------------------------------------
// 5. HARVESTED PRODUCE: on-farm vs storage vs delivered / sold / lost (tonnes)
// ---------------------------------------------------------------------------
export const FARM_LOC = 'On-farm (unstored)', LOC_DELIVERED = 'Delivered (consignment)', LOC_SOLD = 'Sold', LOC_LOSS = 'Loss'
export const PTYPES = { 'Move to storage': null, 'Transfer between stores': null, 'Drying / handling loss': LOC_LOSS, 'Spoilage / pests': LOC_LOSS, 'Delivered to co-op / buyer (consignment)': LOC_DELIVERED, 'Sold from store': LOC_SOLD }
export function produceBalances(s) {
  const stores = (s.dt.storage || []).map((u) => u.name), m = {}
  const add = (crop, loc, t) => { const c = (crop || 'Unspecified').trim(); m[c] = m[c] || { harvested: 0, loc: {} }; m[c].loc[loc] = (m[c].loc[loc] || 0) + t }
  ;(s.dt.harvest || []).forEach((h) => {
    const t = toT(h.qty, h.unit), loc = stores.find((n) => n.toLowerCase() === (h.store || '').trim().toLowerCase()) || FARM_LOC
    add(h.crop, loc, t); m[(h.crop || 'Unspecified').trim()].harvested += t
  })
  ;(s.pmoves || []).forEach((x) => { const t = toT(x.qty, x.unit); add(x.crop, x.from, -t); add(x.crop, x.to, t) })
  return { m, stores }
}
