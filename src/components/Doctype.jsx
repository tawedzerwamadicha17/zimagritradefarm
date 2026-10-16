import { useState } from 'react'
import { DT, sk, ttl, logAct, POST } from '../data/doctypes.js'
import { uid, today, csv } from '../data/store.js'
import { ListHead, Filters, Empty, FormShell, Sec, Wide } from './ui.jsx'

// ERPNext-style list view (filter bar, empty state) and tabbed form view for every DocType.
export default function Doctype({ type, s, set, user, users, q0 }) {
  const D = DT[type], mode = D.access[user.role], can = mode === 'rw' || mode === 'w'
  const all = s.dt[type] || [], mine = user.role === 'foreman' && D.own
  const base = mine ? all.filter((r) => r[D.own] === user.id) : all
  const [qry, setQry] = useState(q0 || ''), [stat, setStat] = useState('All'), [sel, setSel] = useState(null), [f, setF] = useState({}), [orig, setOrig] = useState('{}'), [err, setErr] = useState('')
  const opts = (d) => (d.o === 'user' ? users.filter((u) => u.role !== 'customer') : d.o === 'ent' ? s.ents : d.o === 'stock' ? s.stock : s.dt[d.o] || []).map((r) => [r.id, r.name])
  const show = (d, v) => (d.t === 'ref' ? opts(d).find((o) => o[0] === v)?.[1] || '' : v ?? '')
  const sf = D.fields.find((d) => d.k === D.status)
  const rows = base.filter((r) => (stat === 'All' || r[D.status] === stat) && (!qry || D.fields.some((d) => String(show(d, r[d.k])).toLowerCase().includes(qry.toLowerCase()))))
  const cols = D.cols.map((k) => D.fields.find((d) => d.k === k))
  const locked = (k) => !can || (user.role === 'foreman' && D.ownLock && sel !== 'new' && !D.ownLock.includes(k))
  const canAdd = can && mode !== 'r' && !mine

  const open = (r) => {
    setErr('')
    const v = r ? { ...r } : Object.fromEntries(D.fields.map((d) => [d.k, d.t === 'select' ? d.o[0] : d.k === 'date' ? today() : '']))
    if (['supplier', 'contact'].includes(type)) {
      const category = v.taxCategory || 'VAT', rates = s.cfg.erp?.taxRates || {}
      v.taxCategory = category
      if (v.taxRate === '' || v.taxRate == null) v.taxRate = +(rates[category] ?? (category === 'VAT' ? s.cfg.erp?.vat ?? 15 : 0))
    }
    setSel(r ? r.id : 'new'); setF(v); setOrig(JSON.stringify(v))
  }
  const save = () => {
    const miss = D.req.find((k) => !String(f[k] ?? '').trim())
    if (miss) return setErr(D.fields.find((d) => d.k === miss).l + ' is required')
    const hk = POST[D.post], isNew = sel === 'new'
    const bad = isNew && hk?.check?.(s, f); if (bad) return setErr(bad)
    const rec = isNew ? { ...f, id: uid(), created: today(), by: user.id } : f
    set((p) => ({ dt: { ...p.dt, [type]: isNew ? [rec, ...(p.dt[type] || [])] : (p.dt[type] || []).map((r) => (r.id === rec.id ? rec : r)) }, ...(isNew && hk ? hk.run(p, rec, D.label === 'Feed record' ? 'Feeding' : D.label) : {}) }))
    logAct(set, user, `${isNew ? 'Created' : 'Updated'} ${D.label}: ${ttl(rec)}`); setSel(null)
  }
  const del = () => { if (!window.confirm('Delete this record?')) return; set((p) => ({ dt: { ...p.dt, [type]: (p.dt[type] || []).filter((r) => r.id !== f.id) } })); logAct(set, user, `Deleted ${D.label}: ${ttl(f)}`); setSel(null) }
  // CSV import: header row = field labels or keys
  const imp = (e) => { const fl = e.target.files[0]; if (!fl) return; fl.text().then((tx) => {
    const L = tx.split(/\r?\n/).filter(Boolean).map((l) => (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || []).map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'))), h = L.shift() || []
    const key = h.map((x) => D.fields.find((d) => d.k === x.trim() || d.l.toLowerCase() === x.trim().toLowerCase())?.k)
    const recs = L.map((r) => { const o = { id: uid(), created: today(), by: user.id }; key.forEach((k, i) => { if (k) { const d = D.fields.find((x) => x.k === k); o[k] = d.t === 'number' && r[i] !== '' ? +r[i] : r[i] } }); return o }).filter((o) => D.req.every((k) => String(o[k] ?? '').trim()))
    set((p) => ({ dt: { ...p.dt, [type]: [...recs, ...(p.dt[type] || [])] } })); logAct(set, user, `Imported ${recs.length} ${D.plural}`); e.target.value = '' }) }
  const inp = (d) => d.t === 'select' ? <select disabled={locked(d.k)} value={f[d.k] ?? ''} onChange={(e) => {
    const category = e.target.value, rates = s.cfg.erp?.taxRates || {}
    const rate = +(rates[category] ?? (category === 'VAT' ? s.cfg.erp?.vat ?? 15 : 0))
    setF({ ...f, [d.k]: category, ...(d.k === 'taxCategory' ? { taxRate: rate } : {}) })
  }}>{d.o.map((o) => <option key={o}>{o}</option>)}</select>
    : d.t === 'ref' ? <select disabled={locked(d.k)} value={f[d.k] ?? ''} onChange={(e) => setF({ ...f, [d.k]: e.target.value })}><option value="">—</option>{opts(d).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    : d.t === 'area' ? <textarea rows="3" disabled={locked(d.k)} value={f[d.k] ?? ''} onChange={(e) => setF({ ...f, [d.k]: e.target.value })} />
    : <input type={d.t} step={d.k === 'taxRate' ? '0.1' : undefined} disabled={locked(d.k)} value={f[d.k] ?? ''} onChange={(e) => setF({ ...f, [d.k]: d.t === 'number' && e.target.value !== '' ? +e.target.value : e.target.value })} />
  const fld = (d) => <label key={d.k} style={d.t === 'area' ? { gridColumn: '1/-1' } : undefined}><span className="lbl">{d.l}{D.req.includes(d.k) && <span className="red"> *</span>}</span>{inp(d)}</label>

  if (sel) {
    const flat = D.fields.filter((d) => d.t !== 'area'), notes = D.fields.filter((d) => d.t === 'area')
    const main = flat.filter((d, i) => D.req.includes(d.k) || i < 9), more = flat.filter((d) => !main.includes(d))
    const dirty = sel === 'new' || JSON.stringify(f) !== orig, st = sf && f[sf.k]
    const tabs = [['Details', <><Sec title="">{main.map(fld)}</Sec>{!more.length && notes.length > 0 && <Sec title="Notes">{notes.map(fld)}</Sec>}</>]]
    if (more.length || notes.length) tabs.push(['More Info', <>{more.length > 0 && <Sec title="Additional details">{more.map(fld)}</Sec>}{more.length > 0 && notes.length > 0 && <Sec title="Notes">{notes.map(fld)}</Sec>}</>])
    return <div className="page">
      <FormShell parent={D.plural} title={sel === 'new' ? 'New ' + D.label : ttl(f) || D.label} status={dirty ? 'Not Saved' : st} statusKind={dirty ? 'warn' : sk(st)} tabs={tabs} onClose={() => setSel(null)} onSave={can ? save : null}
        actions={mode === 'rw' && sel !== 'new' ? <button className="btn" onClick={del}>Delete</button> : null} />
      {err && <div className="alert over">{err}</div>}</div>
  }
  return (
    <div className="page">
      <ListHead title={D.plural} addLabel={D.label} onAdd={canAdd ? () => open(null) : null}>{base.length > 0 && <button className="btn" onClick={() => csv(D.fields.map((d) => d.l), rows.map((r) => D.fields.map((d) => show(d, r[d.k]))), type)}>Export</button>}</ListHead>
      <Filters onClear={() => { setQry(''); setStat('All') }}>
        <input placeholder="ID / Search" value={qry} onChange={(e) => setQry(e.target.value)} />
        {sf && <select value={stat} onChange={(e) => setStat(e.target.value)}><option>All</option>{sf.o.map((o) => <option key={o}>{o}</option>)}</select>}
        <span className="muted">{rows.length} of {base.length}{mine ? ' (assigned to you)' : ''}</span></Filters>
      {rows.length > 0 ? <div className="card scroll"><table className="tbl"><thead><tr>{cols.map((d) => <th key={d.k}>{d.l}</th>)}</tr></thead><tbody>
        {rows.map((r) => <tr key={r.id} className="clickable" onClick={() => open(r)}>{cols.map((d) => <td key={d.k}>{d.k === D.status ? <span className={'badge ' + sk(r[d.k])}>{r[d.k]}</span> : String(show(d, r[d.k]))}</td>)}</tr>)}
        {D.sum && <tr>{cols.map((d, i) => <th key={d.k}>{i === 0 ? 'Total' : D.sum.includes(d.k) ? rows.reduce((a, r) => a + (+r[d.k] || 0), 0).toLocaleString() : ''}</th>)}</tr>}</tbody></table></div>
        : <Empty label={D.label} hint={base.length ? 'No records match your filters.' : D.plural + ' you add will be listed here.'} onCreate={canAdd ? () => open(null) : null}
            extra={canAdd && <label className="btn" style={{ flexDirection: 'row' }}>⇩ Import<input type="file" accept=".csv" hidden onChange={imp} /></label>} />}
    </div>
  )
}
