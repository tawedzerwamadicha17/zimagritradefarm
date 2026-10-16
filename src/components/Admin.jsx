import { useState } from 'react'
import { fmtUSD } from '../data/seed.js'
import { compute, finance, sum, SEED } from '../data/store.js'
import { Users, Inbox } from './AdminUsers.jsx'

const norm = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')
const pairsBy = (records, keyOf) => {
  const groups = new Map()
  records.forEach((record) => {
    const key = keyOf(record)
    if (!key) return
    groups.set(key, [...(groups.get(key) || []), record])
  })
  return [...groups.values()].flatMap((group) => group.slice(1).map((record) => [group[0], record]))
}

function DuplicatePair({ first, second, label, onResolve }) {
  const [keepId, setKeepId] = useState(first.id)
  const keep = keepId === first.id ? first : second
  const remove = keepId === first.id ? second : first
  return <div className="row" style={{ alignItems: 'flex-end', borderTop: '1px solid var(--line)', padding: '10px 0' }}>
    <span>{label(first)}<br />{label(second)}</span>
    <label>Keep<select value={keepId} onChange={(e) => setKeepId(e.target.value)}><option value={first.id}>{label(first)}</option><option value={second.id}>{label(second)}</option></select></label>
    <button className="btn sm" onClick={() => window.confirm(`Keep ${label(keep)} and remove ${label(remove)}?`) && onResolve(keep.id, remove.id)}>Remove duplicate</button>
  </div>
}

function DuplicateReview({ s, set }) {
  const stocks = pairsBy(s.stock || [], (item) => [norm(item.code || item.name), norm(item.cat), norm(item.unit), norm(item.wh), norm(item.expiry)].join('|'))
  const contacts = [
    ...(s.dt?.supplier || []).map((record) => ({ ...record, duplicateType: 'supplier' })),
    ...(s.dt?.contact || []).map((record) => ({ ...record, duplicateType: 'contact' })),
  ]
  const contactPairs = pairsBy(contacts, (record) => {
    const identity = norm(record.tin) || norm(record.email) || norm(record.phone) || norm(record.name)
    return identity && `${record.duplicateType}:${record.kind || ''}:${identity}`
  })
  const quotePairs = pairsBy(((s.docs || {}).squote || []).filter((doc) => doc.status === 'Posted'), (doc) => {
    const lines = (doc.lines || []).map((line) => [norm(line.desc), norm(line.uom), +line.qty || 0, +line.price || 0, +line.disc || 0].join(':')).sort().join('|')
    return lines && `${norm(doc.party)}|${doc.date || ''}|${norm(doc.cur)}|${norm(doc.x?.qref)}|${lines}`
  })
  const removeStockDuplicate = (keepId, removeId) => set((p) => {
    const keep = p.stock.find((item) => item.id === keepId), remove = p.stock.find((item) => item.id === removeId)
    if (!keep || !remove) return {}
    const qty = (+keep.qty || 0) + (+remove.qty || 0)
    const value = (+keep.qty || 0) * (+keep.avg || 0) + (+remove.qty || 0) * (+remove.avg || 0)
    const stock = p.stock.filter((item) => item.id !== removeId).map((item) => item.id === keepId ? { ...item, qty, avg: qty ? value / qty : 0, reorder: Math.max(+item.reorder || 0, +remove.reorder || 0) } : item)
    const docs = Object.fromEntries(Object.entries(p.docs || {}).map(([type, list]) => [type, list.map((doc) => ({ ...doc, lines: (doc.lines || []).map((line) => line.item === removeId ? { ...line, item: keepId, desc: line.desc || keep.name, uom: line.uom || keep.unit } : line) }))]))
    const dt = Object.fromEntries(Object.entries(p.dt || {}).map(([type, list]) => [type, list.map((record) => record.item === removeId ? { ...record, item: keepId } : record)]))
    return { stock, docs, dt, moves: (p.moves || []).map((move) => move.item === removeId ? { ...move, item: keepId, name: keep.name } : move) }
  })
  const removeContactDuplicate = (type, keepId, removeId) => set((p) => {
    const list = p.dt?.[type] || [], keep = list.find((record) => record.id === keepId), remove = list.find((record) => record.id === removeId)
    if (!keep || !remove) return {}
    const merged = { ...remove, ...keep }
    Object.keys(merged).forEach((key) => { if ((merged[key] === '' || merged[key] == null) && remove[key]) merged[key] = remove[key] })
    const dt = { ...(p.dt || {}), [type]: list.filter((record) => record.id !== removeId).map((record) => record.id === keepId ? merged : record) }
    if (type === 'contact') dt.project = (p.dt?.project || []).map((project) => project.customer === removeId ? { ...project, customer: keepId } : project)
    const docTypes = type === 'supplier' ? ['grv', 'squote', 'po', 'pinv'] : ['quote', 'sorder', 'blanket', 'proforma', 'sinv', 'cnote']
    const docs = Object.fromEntries(Object.entries(p.docs || {}).map(([docType, records]) => [docType, records.map((doc) => docTypes.includes(docType) && doc.party === remove.name ? { ...doc, party: keep.name } : doc)]))
    if (type === 'supplier') return {
      dt, docs,
      exps: (p.exps || []).map((record) => record.supplier === remove.name ? { ...record, supplier: keep.name } : record),
      buys: (p.buys || []).map((record) => record.supplier === remove.name ? { ...record, supplier: keep.name } : record),
      assets: (p.assets || []).map((record) => record.supplier === remove.name ? { ...record, supplier: keep.name } : record),
      vendors: (p.vendors || []).map((record) => record.name === remove.name ? { ...record, name: keep.name } : record),
      paymentEntries: (p.paymentEntries || []).map((record) => record.partyType === 'Supplier' && record.party === remove.name ? { ...record, party: keep.name } : record),
    }
    return {
      dt, docs,
      sales: (p.sales || []).map((record) => record.cust === remove.name ? { ...record, cust: keep.name } : record),
      paymentEntries: (p.paymentEntries || []).map((record) => record.partyType === 'Customer' && record.party === remove.name ? { ...record, party: keep.name } : record),
    }
  })
  const removeQuoteDuplicate = (keepId, removeId) => set((p) => {
    const list = p.docs?.squote || [], remove = list.find((doc) => doc.id === removeId), keep = list.find((doc) => doc.id === keepId)
    if (!remove || !keep) return {}
    const po = (p.docs?.po || []).map((doc) => ({
      ...doc,
      from: doc.from === remove.no ? keep.no : doc.from,
      x: doc.x?.qref === remove.x?.qref ? { ...doc.x, qref: keep.x?.qref || keep.no } : doc.x,
    }))
    return { docs: { ...(p.docs || {}), squote: list.filter((doc) => doc.id !== removeId), po } }
  })
  const stockLabel = (item) => `${item.name} · ${item.wh || 'Unassigned'} · ${item.code || item.id}`
  const contactLabel = (record) => `${record.name} · ${record.duplicateType === 'supplier' ? 'Supplier' : record.kind || 'Contact'}`
  const quoteLabel = (doc) => `${doc.no} · ${doc.party} · ${doc.date} · ${doc.cur}`
  return <div className="card">
    <h3>Duplicate review</h3>
    <p className="muted">Review each match and choose which record to keep. Stock quantities, values, and linked records are merged when duplicates are removed.</p>
    <h4>Stock items ({stocks.length})</h4>{stocks.map(([first, second]) => <DuplicatePair key={`${first.id}-${second.id}`} first={first} second={second} label={stockLabel} onResolve={removeStockDuplicate} />)}{!stocks.length && <p className="muted">No likely duplicate stock items found.</p>}
    <h4>Suppliers and contacts ({contactPairs.length})</h4>{contactPairs.map(([first, second]) => <DuplicatePair key={`${first.duplicateType}-${first.id}-${second.id}`} first={first} second={second} label={contactLabel} onResolve={(keepId, removeId) => removeContactDuplicate(first.duplicateType, keepId, removeId)} />)}{!contactPairs.length && <p className="muted">No likely duplicate contacts found.</p>}
    <h4>Supplier quotes ({quotePairs.length})</h4>{quotePairs.map(([first, second]) => <DuplicatePair key={`${first.id}-${second.id}`} first={first} second={second} label={quoteLabel} onResolve={removeQuoteDuplicate} />)}{!quotePairs.length && <p className="muted">No exact duplicate posted supplier quotes found.</p>}
  </div>
}

export default function Admin({ s, set, auth }) {
  const E = compute(s), F = finance(s, E)
  const cfg = (k, v) => set((p) => ({ cfg: { ...p.cfg, [k]: v } }))
  const C = (v, l) => <div className="card stat"><span className="stat-num">{v}</span><span className="muted">{l}</span></div>
  const restore = (file) => { const r = new FileReader(); r.onload = () => { try { set(() => ({ ...SEED, ...JSON.parse(r.result) })) } catch { alert('Invalid backup file') } }; r.readAsText(file) }
  const backup = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(s)], { type: 'application/json' })); a.download = 'agritrade-backup.json'; a.click() }
  return (
    <div className="page">
      <h1>Administrator portal</h1>
      <div className="stat-row">{C(fmtUSD(F.rev), 'Total sales')}{C(fmtUSD(F.gross), 'Gross profit')}{C(fmtUSD(F.cash), 'Cash')}{C(s.ads.filter((a) => a.status === 'active').length + '/' + s.ads.length, 'Active / total ads')}{C(s.reqs.filter((r) => r.status === 'open').length + '/' + s.reqs.length, 'Open / total requests')}{C(auth.users.length, 'Registered users')}{C(s.orders.length, 'Orders')}{C(s.workers.length, 'Workers')}{C(E.filter((e) => e.st.k === 'over').length, 'Enterprises over budget')}{C(s.exps.filter((x) => x.status === 'pending').length, 'Expenses awaiting approval')}</div>
      <div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>Settings</h3>
        <label>Farm name<input value={s.cfg.farm} onChange={(e) => cfg('farm', e.target.value)} /></label>
        <label>Contact phone<input value={s.cfg.phone} onChange={(e) => cfg('phone', e.target.value)} /></label>
        <label>Default credit terms (days)<input type="number" value={s.cfg.terms} onChange={(e) => cfg('terms', +e.target.value || 0)} /></label>
        <label>Opening capital / cash (US$)<input type="number" value={s.cfg.capital} onChange={(e) => cfg('capital', +e.target.value || 0)} /></label>
        <label>Contact email<input value={s.cfg.email || ''} onChange={(e) => cfg('email', e.target.value)} /></label></div>
      <Users auth={auth} />
      <DuplicateReview s={s} set={set} />
      <Inbox s={s} set={set} />
      <div className="card"><h3>Moderate ads</h3>{s.ads.map((a) => <div key={a.id} className="row"><span>{a.product} · {a.qty} {a.unit} · {a.farm} · {a.status}</span><span><button className="btn sm" onClick={() => set((p) => ({ ads: p.ads.map((x) => (x.id === a.id ? { ...x, status: 'hidden' } : x)) }))}>Hide</button> <button className="btn sm" onClick={() => set((p) => ({ ads: p.ads.filter((x) => x.id !== a.id) }))}>Remove</button></span></div>)}{!s.ads.length && <p className="muted">No ads.</p>}</div>
      <div className="card"><h3>Moderate requests</h3>{s.reqs.map((r) => <div key={r.id} className="row"><span>{r.product} · {r.qty} {r.unit} · {r.buyer} · {r.status}</span><button className="btn sm" onClick={() => set((p) => ({ reqs: p.reqs.filter((x) => x.id !== r.id) }))}>Remove</button></div>)}{!s.reqs.length && <p className="muted">No requests.</p>}</div>
      <div className="card row"><button className="btn primary" onClick={backup}>Download full backup (JSON)</button><label className="btn">Restore backup<input type="file" accept=".json" hidden onChange={(e) => e.target.files[0] && restore(e.target.files[0])} /></label><button className="btn" onClick={() => window.confirm('Erase ALL farm data and reset demo data?') && set(() => SEED)}>Reset all data</button></div>
    </div>
  )
}
