import { useState } from 'react'
import { uid, today, sum, csv, addDays, CATS } from '../data/store.js'
import { costIssue, METHODS, method } from '../data/agri.js'
import { ListHead, Filters, Empty, FormShell, Sec, Wide, PageHead, NCards, Adder } from './ui.jsx'

const DEF = { vat: 15, taxRates: { VAT: 15, 'Zero Rated': 0, Exempt: 0 }, rates: { ZiG: 0.037, ZAR: 0.055 }, appr: ['', '', ''], acct: { inv: '1300', cogs: '5000', dam: '5100', exp: '5110', adj: '5120' }, expFlow: true, valuation: 'Weighted average', cur: 'USD' }
export const cfgE = (s) => ({ ...DEF, ...(s.cfg.erp || {}), taxRates: { ...DEF.taxRates, VAT: s.cfg.erp?.taxRates?.VAT ?? s.cfg.erp?.vat ?? DEF.vat, ...(s.cfg.erp?.taxRates || {}) }, rates: { ...DEF.rates, ...(s.cfg.erp?.rates || {}) }, acct: { ...DEF.acct, ...(s.cfg.erp?.acct || {}) } })
const rt = (s, c) => (c === 'USD' ? 1 : c === 'ZiG' && s.cfg.zigRate ? 1 / s.cfg.zigRate : cfgE(s).rates[c] || 1)
const f2 = (n) => (+n || 0).toFixed(2)
const CUR = ['USD', 'ZiG', 'ZAR']
const warehouseNames = (s) => [...new Set(['Main store', ...(s.stock || []).map((item) => item.wh), ...(s.dt?.storage || []).map((location) => location.name)].filter(Boolean))]
const nx = (a) => a.map(([t, l]) => ({ t, l }))
const D = {
  grv: { m: 'stock', l: 'GRV', pre: 'GRV', kind: 'in', party: 'supplier' },
  mreq: { m: 'stock', l: 'Material Request', pre: 'MR', kind: 'out', flow: 1 },
  issue: { m: 'stock', l: 'Stock Issue', pre: 'SI', kind: 'out', flow: 1 },
  damaged: { m: 'stock', l: 'Damaged Stock', pre: 'DM', kind: 'out', flow: 1 },
  expired: { m: 'stock', l: 'Expired Stock', pre: 'EX', kind: 'out', flow: 1 },
  recon: { m: 'stock', l: 'Stock Reconciliation', pre: 'SR', kind: 'recon', flow: 1 },
  quote: { m: 'sales', l: 'Quotation', pre: 'QT', party: 'cust', money: 1, next: nx([['sorder', 'Make Sales Order'], ['proforma', 'Make Proforma'], ['sinv', 'Make Invoice']]) },
  sorder: { m: 'sales', l: 'Sales Order', pre: 'SO', party: 'cust', money: 1, next: nx([['sinv', 'Make Invoice'], ['blanket', 'Blanket Order']]) },
  blanket: { m: 'sales', l: 'Blanket Order', pre: 'BO', party: 'cust', money: 1, next: nx([['sinv', 'Make Invoice']]) },
  proforma: { m: 'sales', l: 'Proforma Invoice', pre: 'PF', party: 'cust', money: 1, next: nx([['sinv', 'Make Invoice']]) },
  sinv: { m: 'sales', l: 'Sales Invoice', pre: 'INV', party: 'cust', money: 1, post: 'sale', next: nx([['cnote', 'Credit Note']]) },
  cnote: { m: 'sales', l: 'Credit Note', pre: 'CN', party: 'cust', money: 1, post: 'sale', sign: -1 },
  pmreq: { m: 'buy', l: 'Purchase Request', pre: 'PR', flow: 1, next: nx([['squote', 'Add Supplier Quote']]) },
  squote: { m: 'buy', l: 'Supplier Quote', pre: 'SQ', party: 'supplier', money: 1, next: nx([['po', 'Make Purchase Order']]) },
  po: { m: 'buy', l: 'Purchase Order', pre: 'PO', party: 'supplier', money: 1, next: nx([['pinv', 'Make Purchase Invoice']]) },
  pinv: { m: 'buy', l: 'Purchase Invoice', pre: 'PI', party: 'supplier', money: 1, post: 'exp', upload: 1 },
}
const PT = ['Immediate', '7 days', '14 days', '30 days', '60 days'], PM = ['Cash', 'EcoCash', 'Bank transfer', 'Swipe / card', 'Cheque'], U = ['Low', 'Normal', 'High', 'Urgent']
const SX = [['Salesperson', 'rep'], ['Price list', 'plist', 'select', ['Retail', 'Wholesale', 'Export']], ['Payment terms', 'terms', 'select', PT], ['Customer PO / reference', 'custpo'], ['Delivery date', 'deldate', 'date'], ['Delivery address', 'ship'], ['Shipping method', 'shipm', 'select', ['Own transport', 'Customer collects', 'Courier', 'Haulier']], ['Source warehouse', 'wh']]
const TC = [['Terms & conditions', 'tc', 'area'], ['Internal notes', 'notes', 'area']]
const XF = {
  grv: [['Supplier delivery note no.', 'dn'], ['Purchase order ref', 'poref'], ['Warehouse received into', 'wh'], ['Vehicle reg. no.', 'veh'], ['Driver', 'driver'], ['Received by', 'recby'], ['Inspection result', 'insp', 'select', ['Accepted', 'Partially accepted', 'Rejected']], ['Condition / remarks', 'tc', 'area']],
  mreq: [['Requested by', 'reqby'], ['Department / section', 'dept'], ['Required date', 'reqdate', 'date'], ['Priority', 'prio', 'select', U], ['Issuing warehouse', 'wh'], ['Charge to enterprise / cost centre', 'cc'], ['Purpose / reason', 'tc', 'area']],
  issue: [['Issued to (person)', 'to'], ['Department / section', 'dept'], ['Issuing warehouse', 'wh'], ['Charge to enterprise / cost centre', 'cc'], ['Vehicle / delivery note', 'veh'], ['Received by', 'recby'], ['Remarks', 'tc', 'area']],
  damaged: [['Cause of damage', 'cause', 'select', ['Handling', 'Storage / weather', 'Pests / rodents', 'Transport', 'Spillage', 'Other']], ['Location / warehouse', 'wh'], ['Reported by', 'reqby'], ['Insurance claim?', 'ins', 'select', ['No', 'Yes']], ['Description', 'tc', 'area']],
  expired: [['Disposal method', 'disp', 'select', ['Destroyed', 'Returned to supplier', 'Sold at discount', 'Donated']], ['Location / warehouse', 'wh'], ['Reported by', 'reqby'], ['Witness', 'witness'], ['Remarks', 'tc', 'area']],
  recon: [['Warehouse counted', 'wh'], ['Counted by', 'reqby'], ['Count date', 'cdate', 'date'], ['Supervised by', 'witness'], ['Reason for adjustment', 'tc', 'area']],
  quote: [...SX, ['Valid until', 'valid', 'date'], ...TC],
  sorder: [...SX, ['Customer order date', 'cdate', 'date'], ...TC],
  blanket: [['Salesperson', 'rep'], ['Valid from', 'vfrom', 'date'], ['Valid to', 'valid', 'date'], ['Agreed total quantity', 'agreed', 'number'], ['Payment terms', 'terms', 'select', PT], ['Customer PO / reference', 'custpo'], ['Release schedule', 'sched', 'select', ['On demand', 'Weekly', 'Monthly', 'Seasonal']], ...TC],
  proforma: [...SX, ['Valid until', 'valid', 'date'], ['Bank / payment details', 'bank', 'area'], ...TC],
  sinv: [...SX, ['Due date', 'due', 'date'], ['Payment method', 'pm', 'select', PM], ['Fiscal receipt / device no.', 'fisc'], ['Bank / payment reference', 'payref'], ...TC],
  cnote: [['Reason', 'reason', 'select', ['Returned goods', 'Damaged goods', 'Price adjustment', 'Discount', 'Billing error']], ['Original invoice no.', 'orig'], ['Return warehouse', 'wh'], ['Refund method', 'pm', 'select', ['Credit to account', ...PM]], ['Fiscal credit note no.', 'fisc'], ...TC],
  pmreq: [['Requested by', 'reqby'], ['Department / section', 'dept'], ['Required date', 'reqdate', 'date'], ['Priority', 'prio', 'select', U], ['Deliver to', 'ship'], ['Charge to enterprise / cost centre', 'cc'], ['Justification', 'tc', 'area']],
  squote: [['Supplier quote ref', 'qref'], ['Quote valid until', 'valid', 'date'], ['Delivery lead time (days)', 'lead', 'number'], ['Payment terms', 'terms', 'select', PT], ['Delivery terms', 'incoterm', 'select', ['Delivered', 'Ex-supplier', 'Collected by us']], ['Warranty / guarantee', 'warr'], ['Remarks', 'tc', 'area']],
  po: [['Delivery date', 'deldate', 'date'], ['Deliver to', 'ship'], ['Payment terms', 'terms', 'select', PT], ['Delivery terms', 'incoterm', 'select', ['Delivered', 'Ex-supplier', 'Collected by us']], ['Buyer', 'rep'], ['Supplier quote ref', 'qref'], ['Terms & conditions', 'tc', 'area']],
  pinv: [['Supplier invoice no.', 'sinv'], ['Supplier invoice date', 'idate', 'date'], ['Due date', 'due', 'date'], ['Payment terms', 'terms', 'select', PT], ['Delivery note no.', 'dn'], ['Purchase order ref', 'poref'], ['Supplier TIN / VAT no.', 'tin'], ['Tax clearance (ITF263) no.', 'itf'], ['Withholding tax applicable?', 'wht', 'select', ['No', 'Yes']], ['Payment method', 'pm', 'select', PM], ['Remarks', 'tc', 'area']],
}
const tot = (d) => { const L = d.lines || [], gross = sum(L, (l) => l.qty * l.price), disc = sum(L, (l) => (l.qty * l.price * (l.disc || 0)) / 100), net = gross - disc, vat = (net * (d.vat || 0)) / 100; return { gross, disc, net, vat, total: net + vat + (+d.freight || 0) } }
const live = (d) => ['Posted', 'Approved'].includes(d.status)
const short = (s, d) => D[d.type].kind === 'out' && d.lines.map((l) => { const i = s.stock.find((x) => x.id === l.item); return i && sum(d.lines.filter((y) => y.item === l.item), (y) => +y.qty) > i.qty ? i.name : null }).find(Boolean)

function apply(p, d) {
  const C = D[d.type], R = rt(p, d.cur), mv = [], t = tot(d), patch = {}
  let stock = p.stock
  if (C.kind) d.lines.forEach((l) => {
    const i = stock.find((x) => x.id === l.item); if (!i) return
    const q = +l.qty || 0, delta = C.kind === 'in' ? q : C.kind === 'out' ? -q : q - i.qty
    const ci = C.kind === 'out' ? costIssue(p, i, q) : null, avg = C.kind === 'in' && q + i.qty > 0 ? (i.qty * i.avg + q * l.price * R) / (i.qty + q) : ci ? ci.avg : i.avg
    stock = stock.map((x) => (x.id === i.id ? { ...x, qty: x.qty + delta, avg } : x))
    mv.push({ id: uid(), date: d.date, item: i.id, name: i.name, type: C.l, qty: delta, ref: d.no, value: C.kind === 'in' ? q * l.price * R : ci ? -ci.cost : delta * avg, costCenterId: d.costCenterId || '', projectId: d.projectId || '' })
  })
  if (C.post === 'sale') { const q = sum(d.lines, (l) => +l.qty) || 1; patch.sales = [{ id: uid(), invoiceId: d.id, projectId: d.projectId || '', costCenterId: d.costCenterId || '', date: d.date, ent: d.project || p.ents[0]?.id, cust: d.party, qty: (C.sign || 1) * q, price: (t.net * R) / q, paid: +(d.paid * R).toFixed(2), invoiceTotal: (C.sign || 1) * t.total * R, vat: (C.sign || 1) * t.vat * R, freight: (C.sign || 1) * (+d.freight || 0) * R, status: d.pay || 'credit', approval: 'approved', due: addDays(d.date, p.cfg.terms), ref: d.no }, ...p.sales] }
  if (C.post === 'exp') patch.exps = [{ id: uid(), invoiceId: d.id, ref: d.no, projectId: d.projectId || '', costCenterId: d.costCenterId || '', date: d.date, ent: d.project || p.ents[0]?.id, cat: 'Other', desc: 'Purchase invoice ' + d.no, supplier: d.party, amount: +((t.net + (+d.freight || 0)) * R).toFixed(2), invoiceTotal: t.total * R, vat: t.vat * R, freight: (+d.freight || 0) * R, paid: +(d.paid * R).toFixed(2), status: d.pay || 'credit', due: addDays(d.date, p.cfg.terms) }, ...p.exps]
  const initialPayment = ['sinv', 'pinv'].includes(d.type) && d.paid > 0 ? [{
    id: uid(), no: 'PE-' + d.date.slice(0, 4) + '-OPEN-' + d.no, type: d.type === 'sinv' ? 'Receive' : 'Pay',
    partyType: d.type === 'sinv' ? 'Customer' : 'Supplier', party: d.party, invoiceType: d.type,
    invoiceId: d.id, invoiceNo: d.no, costCenterId: d.costCenterId || '', projectId: d.projectId || '', date: d.date, currency: d.cur, amount: d.paid,
    amountUSD: +(d.paid * R).toFixed(2), mode: d.x?.pm || '', reference: d.x?.payref || '', status: 'Submitted', by: d.by,
  }] : []
  return { ...patch, ...(initialPayment.length ? { paymentEntries: [...initialPayment, ...(p.paymentEntries || [])] } : {}), stock, moves: [...mv, ...(p.moves || [])] }
}
const put = (p, d) => ({ docs: { ...(p.docs || {}), [d.type]: [d, ...((p.docs || {})[d.type] || []).filter((x) => x.id !== d.id)] } })
const printDoc = (d, s) => { const w = window.open('', '_blank'), t = tot(d), C = D[d.type]; if (!w) return
  w.document.write(`<title>${d.no}</title><body style="font-family:sans-serif;padding:24px"><h2>${s.cfg.farm} — ${C.l} ${d.no}</h2><p>${d.date} · ${d.party || ''} · ${d.cur}${d.project ? ' · Project: ' + (s.ents.find((e) => e.id === d.project)?.name || '') : ''}</p><table border=1 cellpadding=6 style="border-collapse:collapse;width:100%"><tr><th>Item</th><th>Qty</th><th>Price</th><th>Disc%</th></tr>${d.lines.map((l) => `<tr><td>${l.desc || ''}</td><td>${l.qty}</td><td>${l.price || ''}</td><td>${l.disc || 0}</td></tr>`).join('')}</table>${C.money ? `<p>Gross ${f2(t.gross)} · Discount ${f2(t.disc)} · VAT ${f2(t.vat)} · <b>Total ${d.cur} ${f2(t.total)}</b></p>` : ''}<p>Approved by: ${(d.approvals || []).map((a) => a.by).join(', ') || '—'}</p>`); w.document.close(); w.print() }

function DocList({ type, s, set, user, users, seed, onSwitch }) {
  const C = D[type], E = cfgE(s), list = (s.docs || {})[type] || [], warehouses = warehouseNames(s)
  const blank = { type, date: today(), party: '', cur: E.cur, taxCategory: 'VAT', vat: C.money ? E.taxRates.VAT : 0, project: '', projectId: '', costCenterId: '', pay: 'credit', lines: [{ item: '', desc: '', uom: '', qty: '', price: '', disc: 0, batch: '', expiry: '', note: '' }], x: {}, freight: '', paid: '', ref: '', from: '', file: '', ...seed }
  const [q, setQ] = useState(''), [st, setSt] = useState('All'), [sel, setSel] = useState(seed ? 'new' : null), [f, setF] = useState(seed ? blank : null), [msg, setMsg] = useState('')
  const shown = list.filter((d) => (st === 'All' || d.status === st) && (!q || JSON.stringify([d.no, d.party, d.ref, d.x]).toLowerCase().includes(q.toLowerCase())))
  const ro = sel !== 'new', t = f ? tot(f) : {}, setX = (k, v) => setF({ ...f, x: { ...f.x, [k]: v } }), LB = ['in', 'out'].includes(C.kind) || ['pinv', 'po'].includes(type)
  const parties = C.party === 'cust' ? (s.dt.contact || []).filter((c) => c.kind === 'Customer') : C.party === 'supplier' ? s.dt.supplier || [] : []
  const pm = f && parties.find((c) => c.name === f.party), owed = pm && C.party === 'cust' ? sum(s.sales.filter((x) => x.cust === pm.name && x.status === 'credit'), (x) => x.qty * x.price) : 0, over = pm?.climit && C.party === 'cust' && owed + t.total * rt(s, f.cur) > pm.climit, expd = pm?.clearance && C.party === 'supplier' && pm.clearance < today()
  const selectParty = (partyName) => {
    const profile = parties.find((party) => party.name === partyName), category = profile?.taxCategory || 'VAT'
    const vat = profile?.taxRate !== '' && profile?.taxRate != null ? +profile.taxRate : E.taxRates[category] ?? E.taxRates.VAT
    setF({ ...f, party: partyName, taxCategory: category, vat })
  }
  const upL = (i, k, v) => setF({ ...f, lines: f.lines.map((x, j) => (j === i ? { ...x, [k]: v } : x)) })
  const save = () => {
    const L = f.lines.filter((l) => (l.item || l.desc) && +l.qty > 0)
    if (!L.length) return setMsg('Add at least one line with a quantity')
    if (C.kind && L.some((l) => !l.item)) return setMsg('Pick a stock item on every line')
    if (C.party && !f.party) return setMsg('Choose from the master data: ' + (C.party === 'cust' ? 'customer' : 'supplier'))
    const fullAmount = tot({ ...f, lines: L }).total
    if (['sinv', 'pinv'].includes(type) && (+f.paid || 0) > fullAmount) return setMsg('Amount paid cannot exceed the invoice total')
    if (['sinv', 'pinv'].includes(type) && f.pay === 'paid' && +f.paid > 0 && +f.paid < fullAmount) return setMsg('Choose On credit for a partial payment, or enter the full amount paid')
    const d = { ...f, id: uid(), freight: +f.freight || 0, paid: ['sinv', 'pinv'].includes(type) && f.pay === 'paid' ? fullAmount : +f.paid || 0, ts: Date.now(), lines: L.map((l) => ({ ...l, qty: +l.qty, price: +l.price || 0, disc: +l.disc || 0, sys: C.kind === 'recon' ? s.stock.find((x) => x.id === l.item)?.qty : undefined })), no: C.pre + '-' + String(list.length + 1).padStart(4, '0'), status: C.flow ? 'Pending approval' : 'Posted', approvals: [], by: user.name, rate: rt(s, f.cur) }
    set((p) => ({ ...put(p, d), ...(C.flow ? {} : apply(p, d)) })); setSel(null); setMsg('')
  }
  const approve = (d) => {
    const sh = short(s, { ...d }); const ap = [...d.approvals, { by: user.name, at: today() }], done = ap.length >= 3
    if (done && sh) return alert('Not enough stock on hand for: ' + sh)
    const n = { ...d, approvals: ap, status: done ? 'Approved' : 'Pending approval' }
    set((p) => ({ ...put(p, n), ...(done ? apply(p, n) : {}) })); setSel(null)
  }
  const conv = (d, to) => onSwitch(to, { party: d.party, cur: d.cur, taxCategory: d.taxCategory || 'VAT', vat: d.vat, project: d.project, projectId: d.projectId, costCenterId: d.costCenterId, lines: d.lines.map((l) => ({ ...l })), from: d.no, ref: d.type === 'pmreq' ? d.no : d.ref })
  const cur = !ro ? null : f
  const idx = cur?.approvals?.length || 0, need = E.appr[idx], canA = cur?.status === 'Pending approval' && (!need || need === user.id)
  const file = (e) => { const fl = e.target.files[0]; if (!fl) return; setF((x) => ({ ...x, file: fl.name })); if (fl.type.startsWith('text') || /\.(txt|csv)$/i.test(fl.name)) fl.text().then((tx) => { const g = (re) => (tx.match(re) || [])[1]; setF((x) => ({ ...x, party: g(/supplier[:,]\s*([^\n,]+)/i) || x.party, ref: g(/invoice\s*(?:no|number|#)?[:,]\s*([^\n,]+)/i) || x.ref, lines: g(/total[:,]\s*\$?([\d.]+)/i) ? [{ item: '', desc: 'Scanned invoice total', qty: 1, price: +g(/total[:,]\s*\$?([\d.]+)/i), disc: 0 }] : x.lines })) }); else setMsg('Attached. Reading scanned PDFs/images needs an OCR service (backend) — enter the details manually for now.') }
  if (sel && f) return (
    <div className="page">
      <FormShell parent={C.l} title={ro ? f.no : 'New ' + C.l} status={ro ? f.status : 'Not Saved'} statusKind={ro ? (live(f) ? 'ok' : f.status === 'Rejected' ? 'over' : 'warn') : 'warn'}
        onSave={!ro ? save : null} saveLabel={C.flow ? 'Submit for approval' : 'Save'} onClose={() => setSel(null)}
        actions={<>
            {ro && canA && <><button className="btn primary" onClick={() => approve(f)}>Approve ({idx + 1}/3)</button><button className="btn" onClick={() => { set((p) => put(p, { ...f, status: 'Rejected' })); setSel(null) }}>Reject</button></>}
            {ro && <button className="btn" disabled={C.flow && f.status !== 'Approved'} title={C.flow && f.status !== 'Approved' ? 'Printing unlocks after the 3rd approval' : ''} onClick={() => printDoc(f, s)}>Print</button>}
            {ro && live(f) !== false && (C.next || []).filter(() => !C.flow || f.status === 'Approved').map((n) => <button key={n.t} className="btn" onClick={() => conv(f, n.t)}>{n.l}</button>)}
        </>}
        tabs={[['Details', <>
          <Sec title="">
          <label>Date<input type="date" disabled={ro} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
          {C.party && <label>{C.party === 'cust' ? 'Customer (master data)' : 'Supplier (master data)'}<select disabled={ro} value={f.party} onChange={(e) => selectParty(e.target.value)}><option value="">—</option>{parties.map((c) => <option key={c.id}>{c.name}</option>)}</select></label>}
          {C.money && <><label>Currency<select disabled={ro} value={f.cur} onChange={(e) => setF({ ...f, cur: e.target.value })}>{CUR.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label>Tax category<select disabled={ro} value={f.taxCategory || 'VAT'} onChange={(e) => setF({ ...f, taxCategory: e.target.value, vat: E.taxRates[e.target.value] ?? 0 })}>{Object.keys(E.taxRates).map((category) => <option key={category}>{category}</option>)}</select></label>
            <label>Tax rate (%)<input type="number" step="0.1" disabled={ro} value={f.vat} onChange={(e) => setF({ ...f, vat: +e.target.value })} /></label></>}
          {C.m !== 'stock' && <>
            <label>Farm enterprise<select disabled={ro} value={f.project} onChange={(e) => setF({ ...f, project: e.target.value })}><option value="">—</option>{s.ents.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
            <label>Cost center<select disabled={ro} value={f.costCenterId || ''} onChange={(e) => setF({ ...f, costCenterId: e.target.value, projectId: (s.dt.project || []).some((project) => project.id === f.projectId && project.costCenter === e.target.value) ? f.projectId : '' })}><option value="">—</option>{(s.dt.costcenter || []).filter((center) => center.status !== 'Inactive').map((center) => <option key={center.id} value={center.id}>{center.farm ? center.farm + ' · ' : ''}{center.name}</option>)}</select></label>
            <label>Project<select disabled={ro || !f.costCenterId} value={f.projectId || ''} onChange={(e) => setF({ ...f, projectId: e.target.value })}><option value="">—</option>{(s.dt.project || []).filter((project) => project.status !== 'Cancelled' && project.costCenter === f.costCenterId).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
          </>}
          {C.post && <label>Payment<select disabled={ro} value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value })}><option value="credit">On credit</option><option value="paid">Paid</option></select></label>}
          <label>Reference<input disabled={ro} value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} /></label>
          </Sec>
          {pm && <div className="card muted" style={{ gridColumn: '1/-1' }}><b>{pm.name}</b> · {[pm.group || pm.category, pm.contactp && 'Contact: ' + pm.contactp, pm.phone, pm.email, pm.address || pm.location, pm.tin && 'TIN: ' + pm.tin, pm.vatNo && 'VAT no.: ' + pm.vatNo, pm.taxCategory && `Tax: ${pm.taxCategory} ${pm.taxRate ?? ''}%`, pm.terms && 'Terms: ' + pm.terms + ' days', pm.climit && 'Credit limit: US$' + pm.climit, pm.clearance && 'Tax clearance expires ' + pm.clearance].filter(Boolean).join(' · ')}
            {over && <div className="alert over">🚨 Credit limit exceeded: owing US${f2(owed)} + this document US${f2(t.total * rt(s, f.cur))} &gt; limit US${pm.climit}</div>}{expd && <div className="alert warn">⚠️ Supplier tax clearance expired {pm.clearance} — withholding tax may apply</div>}</div>}
          <Sec title="Items"><Wide>
          <div className="card scroll" style={{ gridColumn: '1/-1' }}><table className="tbl"><thead><tr><th>Stock item</th><th>Description</th><th>UOM</th><th>{C.kind === 'recon' ? 'Counted qty' : 'Qty'}</th>{type !== 'pmreq' && <th>Price</th>}{C.money && <th>Disc %</th>}{C.money && <th>Line total</th>}{LB && <th>Batch / lot</th>}{LB && <th>Expiry</th>}<th>Line note</th><th /></tr></thead><tbody>
            {f.lines.map((l, i) => <tr key={i}><td><select disabled={ro} value={l.item} onChange={(e) => { const it = s.stock.find((x) => x.id === e.target.value); setF({ ...f, lines: f.lines.map((x, j) => (j === i ? { ...x, item: e.target.value, desc: x.desc || it?.name || '', uom: it?.unit || x.uom, expiry: x.expiry || it?.expiry || '', price: x.price || (it && (C.kind || C.m === 'buy') ? +(it.avg / rt(s, f.cur)).toFixed(2) : '') } : x)) }) }}><option value="">—</option>{s.stock.map((x) => <option key={x.id} value={x.id}>{x.code ? x.code + ' · ' : ''}{x.name} ({x.qty})</option>)}</select></td>
              <td><input disabled={ro} value={l.desc} onChange={(e) => upL(i, 'desc', e.target.value)} /></td><td><input disabled={ro} style={{ width: 60 }} value={l.uom || ''} onChange={(e) => upL(i, 'uom', e.target.value)} /></td><td><input type="number" disabled={ro} value={l.qty} onChange={(e) => upL(i, 'qty', e.target.value)} /></td>
              {type !== 'pmreq' && <td><input type="number" disabled={ro} value={l.price} onChange={(e) => upL(i, 'price', e.target.value)} /></td>}{C.money && <td><input type="number" disabled={ro} value={l.disc} onChange={(e) => upL(i, 'disc', e.target.value)} /></td>}{C.money && <td>{f2(l.qty * l.price * (1 - (l.disc || 0) / 100))}</td>}
              {LB && <td><input disabled={ro} value={l.batch || ''} onChange={(e) => upL(i, 'batch', e.target.value)} /></td>}{LB && <td><input type="date" disabled={ro} value={l.expiry || ''} onChange={(e) => upL(i, 'expiry', e.target.value)} /></td>}<td><input disabled={ro} value={l.note || ''} onChange={(e) => upL(i, 'note', e.target.value)} /></td>
              <td>{!ro && <button className="btn sm" onClick={() => setF({ ...f, lines: f.lines.filter((_, j) => j !== i) })}>✕</button>}</td></tr>)}</tbody></table>
            {!ro && <button className="btn sm" onClick={() => setF({ ...f, lines: [...f.lines, { item: '', desc: '', uom: '', qty: '', price: '', disc: 0, batch: '', expiry: '', note: '' }] })}>+ Line</button>}</div>
          </Wide></Sec>
          <Sec title="Totals">
          {C.money && <div className="row" style={{ gridColumn: '1/-1' }}><label>Freight / other charges<input type="number" disabled={ro} value={f.freight || ''} onChange={(e) => setF({ ...f, freight: e.target.value })} /></label>{C.post && <label>Amount paid<input type="number" disabled={ro} value={f.paid || ''} onChange={(e) => setF({ ...f, paid: e.target.value })} /></label>}</div>}
          {C.money && <p style={{ gridColumn: '1/-1' }}>Gross <b>{f2(t.gross)}</b> · Discount <b>{f2(t.disc)}</b> · VAT <b>{f2(t.vat)}</b>{+f.freight > 0 && <> · Freight <b>{f2(f.freight)}</b></>} · Total <b>{f.cur} {f2(t.total)}</b>{C.post && <> · Balance due <b>{f.cur} {f2(t.total - (+f.paid || 0))}</b></>}{f.cur !== 'USD' && <span className="muted"> (≈ US${f2(t.total * rt(s, f.cur))})</span>}</p>}
          </Sec>
          {msg && <div className="alert warn" style={{ gridColumn: '1/-1' }}>{msg}</div>}
        </>], ['More Info', <>
          <Sec title="Document details">
          {(XF[type] || []).map(([l, k, ty, o]) => <label key={k} style={ty === 'area' ? { gridColumn: '1/-1' } : undefined}>{l}{ty === 'select' ? <select disabled={ro} value={f.x?.[k] ?? ''} onChange={(e) => setX(k, e.target.value)}><option value="">—</option>{o.map((v) => <option key={v}>{v}</option>)}</select> : ty === 'area' ? <textarea rows="2" disabled={ro} value={f.x?.[k] ?? ''} onChange={(e) => setX(k, e.target.value)} style={{ font: 'inherit', padding: '.5rem', border: '1px solid var(--line)', borderRadius: 8 }} /> : k === 'wh' ? <><input type="text" list={'warehouse-options-' + type} disabled={ro} value={f.x?.[k] ?? ''} onChange={(e) => setX(k, e.target.value)} /><datalist id={'warehouse-options-' + type}>{warehouses.map((warehouse) => <option key={warehouse} value={warehouse} />)}</datalist></> : <input type={ty || 'text'} disabled={ro} value={f.x?.[k] ?? ''} onChange={(e) => setX(k, e.target.value)} />}</label>)}
          {(C.upload || type === 'squote' || type === 'po') && <label>{C.upload ? 'Upload invoice (scan)' : 'Upload supplier order / quote'}<input type="file" disabled={ro} onChange={file} />{f.file && <span className="muted">{f.file}</span>}</label>}
          </Sec>
        </>], ...((C.flow && ro) || (sel === 'new' && list.length > 0) ? [['Approvals & History', <>
          {C.flow && ro && <p style={{ gridColumn: '1/-1' }}>Approvals: {[0, 1, 2].map((i) => <span key={i} className={'badge ' + (f.approvals[i] ? 'ok' : 'warn')} style={{ marginRight: 6 }}>{i + 1}. {f.approvals[i]?.by || (users.find((u) => u.id === E.appr[i])?.name || 'any approver') + ' — waiting'}</span>)}</p>}
          {sel === 'new' && list.length > 0 && <div className="card scroll" style={{ gridColumn: '1/-1' }}><b>Last {C.l} transactions{f.party ? ' — ' + f.party : ''}</b><table className="tbl"><tbody>{list.filter((d) => !f.party || d.party === f.party).slice(0, 5).map((d) => <tr key={d.id}><td>{d.no}</td><td>{d.date}</td><td>{d.party}</td><td>{C.money ? d.cur + ' ' + f2(tot(d).total) : d.lines.length + ' lines'}</td><td>{d.status}</td></tr>)}</tbody></table></div>}
        </>]] : [])]} />
    </div>
  )
  return (
    <div className="page">
      <ListHead title={C.l} addLabel={C.l} onAdd={() => { setF(blank); setSel('new'); setMsg('') }}>{C.money && list.length > 0 && <button className="btn" onClick={() => csv(['No.', 'Date', 'Party', 'Cur', 'Net', 'Discount', 'VAT', 'Total', 'Status'], shown.map((d) => { const x = tot(d); return [d.no, d.date, d.party, d.cur, f2(x.net), f2(x.disc), f2(x.vat), f2(x.total), d.status] }), type)}>Export</button>}</ListHead>
      <Filters onClear={() => { setQ(''); setSt('All') }}><input placeholder="ID / reference / party" value={q} onChange={(e) => setQ(e.target.value)} /><select value={st} onChange={(e) => setSt(e.target.value)}><option>All</option>{[...new Set(list.map((d) => d.status))].map((x) => <option key={x}>{x}</option>)}</select><span className="muted">{shown.length} of {list.length}</span></Filters>
      {shown.length > 0 ? <div className="card scroll">
        <table className="tbl"><thead><tr><th>No.</th><th>Date</th>{C.party && <th>{C.party === 'cust' ? 'Customer' : 'Supplier'}</th>}{C.money ? <><th>Cur</th><th>Net</th><th>Discount</th><th>VAT</th><th>Total</th>{C.post && <th>Balance</th>}</> : <th>Lines</th>}<th>Reference</th><th>By</th><th>From</th><th>Status</th></tr></thead><tbody>
        {shown.map((d) => { const x = tot(d); return <tr key={d.id} className="clickable" onClick={() => { setF({ x: {}, ...d }); setSel(d.id); setMsg('') }}><td>{d.no}</td><td>{d.date}</td>{C.party && <td>{d.party}</td>}{C.money ? <><td>{d.cur}</td><td>{f2(x.net)}</td><td>{f2(x.disc)}</td><td>{f2(x.vat)}</td><td>{f2(x.total)}</td>{C.post && <td>{f2(x.total - (d.paid || 0))}</td>}</> : <td>{d.lines.length}</td>}<td>{d.ref}</td><td>{d.by}</td><td>{d.from}</td><td><span className={'badge ' + (live(d) ? 'ok' : d.status === 'Rejected' ? 'over' : 'warn')}>{d.status}</span></td></tr> })}</tbody></table>
      </div> : <Empty label={C.l} hint={list.length ? 'No documents match your filters.' : 'Create your first ' + C.l.toLowerCase() + ' to see it here.'} onCreate={() => { setF(blank); setSel('new'); setMsg('') }} />}
    </div>
  )
}

function Items({ s, set }) {
  const warehouses = warehouseNames(s)
  const [warehouseChoice, setWarehouseChoice] = useState('Main store')
  const [f, setF] = useState({ name: '', code: '', cat: CATS[1], unit: 'kg', qty: '', cost: '', reorder: '', expiry: '', wh: 'Main store' })
  const add = () => { if (!f.name || !f.wh.trim()) return; const q = +f.qty || 0, id = uid()
    set((p) => ({ stock: [...p.stock, { id, name: f.name, code: f.code, cat: f.cat, unit: f.unit, qty: q, avg: +f.cost || 0, reorder: +f.reorder || 0, expiry: f.expiry, wh: f.wh }], moves: q ? [{ id: uid(), date: today(), item: id, name: f.name, type: 'Opening stock', qty: q, ref: 'OPEN', value: q * (+f.cost || 0) }, ...(p.moves || [])] : p.moves })); setF({ ...f, name: '', code: '', qty: '', cost: '', reorder: '', expiry: '' }) }
  const I = (k, t = 'text') => <input type={t} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
  return (<>
    <Adder label="Item"><div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>Add stock item / opening stock</h3><label>Item{I('name')}</label><label>Code{I('code')}</label><label>Category<select value={f.cat} onChange={(e) => setF({ ...f, cat: e.target.value })}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label>Unit{I('unit')}</label><label>Opening qty{I('qty', 'number')}</label><label>Unit cost (US$){I('cost', 'number')}</label><label>Reorder at{I('reorder', 'number')}</label><label>Expiry date{I('expiry', 'date')}</label>
      <label>Warehouse<select value={warehouseChoice} onChange={(e) => { const value = e.target.value; setWarehouseChoice(value); setF({ ...f, wh: value === '__new__' ? '' : value }) }}>
        {warehouses.map((warehouse) => <option key={warehouse} value={warehouse}>{warehouse}</option>)}<option value="__new__">Add new storage location...</option>
      </select></label>{warehouseChoice === '__new__' && <label>New storage location<input value={f.wh} onChange={(e) => setF({ ...f, wh: e.target.value })} placeholder="Enter warehouse name" /></label>}
      <button className="btn primary" onClick={add}>Add to stock</button></div></Adder>
    {!s.stock.length ? <Empty label="Item" hint="Stock items you add appear here." /> : <div className="card scroll"><table className="tbl"><thead><tr><th>Code</th><th>Item</th><th>Warehouse</th><th>On hand</th><th>Avg cost</th><th>Value (US$)</th><th>Expiry</th></tr></thead><tbody>
      {s.stock.map((i) => <tr key={i.id}><td>{i.code}</td><td>{i.name}</td><td>{i.wh}</td><td>{f2(i.qty)} {i.unit}</td><td>{f2(i.avg)}</td><td>{f2(i.qty * i.avg)}</td><td>{i.expiry}</td></tr>)}
      <tr><th colSpan="5">Total stock value (US$)</th><th>{f2(sum(s.stock, (i) => i.qty * i.avg))}</th><td /></tr></tbody></table></div>}</>)
}

function Reports({ mod, s }) {
  const [r, setR] = useState(mod === 'stock' ? 'avail' : mod === 'sales' ? 'period' : 'itax'), [from, setFrom] = useState(today().slice(0, 4) + '-01-01'), [to, setTo] = useState(today()), [cur, setCur] = useState('All'), [per, setPer] = useState('month'), [by, setBy] = useState('customer')
  const inR = (d) => d.date >= from && d.date <= to && (cur === 'All' || d.cur === cur)
  const docs = (...ts) => ts.flatMap((t) => ((s.docs || {})[t] || []).map((d) => ({ ...d, sg: D[t].sign || 1 }))).filter((d) => live(d) && inR(d))
  const grp = (n) => (s.dt.contact || []).find((c) => c.name === n)?.group || '—'
  const pk = (d) => (per === 'day' ? d : per === 'week' ? d.slice(0, 4) + '-W' + String(Math.ceil((new Date(d) - new Date(d.slice(0, 4) + '-01-01')) / 6048e5 + 0.1)).padStart(2, '0') : per === 'month' ? d.slice(0, 7) : d.slice(0, 4))
  const row = (d) => { const t = tot(d); return { d, t, usd: d.sg * t.total * (d.rate || 1) } }
  const lineRows = (t) => docs(t).flatMap((d) => d.lines.map((l) => [d.date, d.no, d.party || '', l.desc, l.qty, f2(l.price), d.cur, f2(l.qty * l.price * (d.rate || 1)), d.status]))
  const agg = (key, ts) => { const m = {}; docs(...ts).forEach((d) => { const { t } = row(d), k = key(d); m[k] = m[k] || [0, 0, 0, 0, 0, 0]; [1, t.gross, t.disc, t.net, t.vat, t.total * (d.rate || 1)].forEach((v, i) => { m[k][i] += d.sg * v }) }); return Object.entries(m).map(([k, v]) => [k, ...v.map((x, i) => (i ? f2(x) : x))]) }
  const taxRows = (ts) => docs(...ts).map((d) => { const { t } = row(d); return [d.date, d.no, D[d.type].l, d.party, d.cur, f2(d.sg * t.net), f2(d.sg * t.vat), f2(d.sg * t.total), f2(d.sg * t.vat * (d.rate || 1))] })
  const TAXH = ['Date', 'No.', 'Type', 'Party', 'Cur', 'Net', 'VAT', 'Total', 'VAT (US$)'], AGH = ['Gross', 'Discount', 'Net', 'VAT', 'Total US$']
  const REP = {
    stock: { avail: ['Available stock', ['Code', 'Item', 'Warehouse', 'Unit', 'On hand', 'Avg cost US$', 'Value US$'], s.stock.map((i) => [i.code, i.name, i.wh, i.unit, f2(i.qty), f2(i.avg), f2(i.qty * i.avg)])],
      count: ['Stock count sheet (stock taker)', ['Code', 'Item', 'Warehouse', 'Unit', 'System qty', 'Counted qty', 'Variance'], s.stock.map((i) => [i.code, i.name, i.wh, i.unit, f2(i.qty), '', ''])],
      grv: ['GRV report', ['Date', 'GRV', 'Supplier', 'Item', 'Qty', 'Price', 'Cur', 'Value US$', 'Status'], lineRows('grv')],
      recon: ['Stock reconciliation', ['Date', 'No.', 'Item', 'System qty', 'Counted', 'Variance', 'Status'], docs('recon').flatMap((d) => d.lines.map((l) => [d.date, d.no, l.desc, l.sys, l.qty, f2(l.qty - l.sys), d.status]))],
      move: ['Stock movement', ['Date', 'Item', 'Type', 'Qty (+/-)', 'Ref', 'Value US$'], (s.moves || []).filter((m) => m.date >= from && m.date <= to).map((m) => [m.date, m.name, m.type, f2(m.qty), m.ref, f2(m.value)])],
      dam: ['Damaged stock', ['Date', 'No.', '', 'Item', 'Qty', 'Price', 'Cur', 'Value US$', 'Status'], lineRows('damaged')],
      exp: ['Expired stock', ['Item', 'Expiry', 'On hand', 'Value US$'], s.stock.filter((i) => i.expiry && i.expiry <= today() && i.qty > 0).map((i) => [i.name, i.expiry, f2(i.qty), f2(i.qty * i.avg)]).concat(lineRows('expired').map((x) => ['Written off: ' + x[3], x[0], x[4], x[7]]))] },
    sales: { period: ['Sales by period', ['Period', 'Docs', ...AGH], agg((d) => pk(d.date), ['sinv', 'cnote'])],
      cust: ['Sales per customer / group', [by === 'group' ? 'Customer group' : 'Customer', 'Docs', ...AGH], agg((d) => (by === 'group' ? grp(d.party) : d.party), ['sinv', 'cnote'])],
      otax: ['Output tax report', TAXH, taxRows(['sinv', 'cnote'])],
      disc: ['Discounts given', ['Date', 'Invoice', 'Customer', 'Group', 'Cur', 'Gross', 'Discount', 'Disc %'], docs('sinv').filter((d) => row(d).t.disc > 0).map((d) => { const { t } = row(d); return [d.date, d.no, d.party, grp(d.party), d.cur, f2(t.gross), f2(t.disc), f2((t.disc / t.gross) * 100)] })] },
    buy: { itax: ['Input tax report', TAXH, taxRows(['pinv'])], disc: ['Purchase discounts', ['Date', 'Invoice', 'Supplier', 'Cur', 'Gross', 'Discount'], docs('pinv').filter((d) => row(d).t.disc > 0).map((d) => { const { t } = row(d); return [d.date, d.no, d.party, d.cur, f2(t.gross), f2(t.disc)] })],
      sup: ['Purchases per supplier', ['Supplier', 'Docs', ...AGH], agg((d) => d.party, ['pinv'])] },
  }[mod], [title, head, rows] = REP[r]
  return (<div className="card"><div className="row"><select value={r} onChange={(e) => setR(e.target.value)}>{Object.entries(REP).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select>
    <label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
    <label>Currency<select value={cur} onChange={(e) => setCur(e.target.value)}><option>All</option>{CUR.map((c) => <option key={c}>{c}</option>)}</select></label>
    {r === 'period' && <label>Per<select value={per} onChange={(e) => setPer(e.target.value)}>{['day', 'week', 'month', 'year'].map((x) => <option key={x}>{x}</option>)}</select></label>}
    {r === 'cust' && <label>By<select value={by} onChange={(e) => setBy(e.target.value)}><option>customer</option><option>group</option></select></label>}
    <button className="btn primary" onClick={() => csv(head, rows, title)}>Export CSV</button><button className="btn" onClick={() => window.print()}>Print</button></div>
    <p className="muted">Reporting currency: USD (foreign amounts converted at the rate saved on each document).</p>
    <h3>{title}</h3><div className="scroll"><table className="tbl"><thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead><tbody>{rows.map((x, i) => <tr key={i}>{x.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>{!rows.length && <p className="muted">No data for this filter.</p>}</div></div>)
}

function Compare({ s, onSwitch }) {
  const [selected, setSelected] = useState('')
  const grouped = new Map()
  ;((s.docs || {}).squote || []).filter((doc) => doc.status === 'Posted').forEach((doc) => (doc.lines || []).forEach((line) => {
    const description = String(line.desc || s.stock.find((item) => item.id === line.item)?.name || '').trim()
    if (!description) return
    const date = doc.date || '', currency = doc.cur || 'USD'
    const key = JSON.stringify([date, currency, description.toLowerCase().replace(/\s+/g, ' ')])
    const group = grouped.get(key) || { key, date, currency, description, quotes: [] }
    const unitPrice = (+line.price || 0) * (1 - (+line.disc || 0) / 100)
    group.quotes.push({ doc, line, unitPrice })
    grouped.set(key, group)
  }))
  const comparisons = [...grouped.values()].map((group) => {
    let hash = 0
    for (let i = 0; i < group.key.length; i++) hash = (hash * 31 + group.key.charCodeAt(i)) >>> 0
    const itemCode = group.description.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 12) || 'ITEM'
    return { ...group, code: `SC-${group.date.replace(/-/g, '')}-${group.currency}-${itemCode}-${hash.toString(36).toUpperCase()}`, quotes: group.quotes.sort((a, b) => a.unitPrice - b.unitPrice) }
  }).sort((a, b) => b.date.localeCompare(a.date) || a.description.localeCompare(b.description) || a.currency.localeCompare(b.currency))
  const comparison = comparisons.find((group) => group.key === selected) || comparisons[0]
  return (<div className="card"><div className="row"><label>Supplier Comparison<select value={comparison?.key || ''} onChange={(e) => setSelected(e.target.value)} disabled={!comparisons.length}>
    {comparisons.map((group) => <option key={group.key} value={group.key}>{group.code} · {group.description} · {group.date} · {group.currency}</option>)}
  </select></label></div>
    <p className="muted">Posted supplier quotes are grouped by matching item description, quote date, and currency. The lowest discounted unit price is recommended.</p>
    {comparison ? <><h3>{comparison.code} · {comparison.description}</h3><p>{comparison.date} · {comparison.currency} · {comparison.quotes.length} quote{comparison.quotes.length === 1 ? '' : 's'}</p>
      {comparison.quotes.length > 1 ? <table className="tbl"><thead><tr><th>Supplier</th><th>Quote</th><th>Qty</th><th>Unit price</th><th>Line total</th><th>Currency</th><th /></tr></thead><tbody>{comparison.quotes.map(({ doc, line, unitPrice }, index) => <tr key={`${doc.id}-${line.item}-${line.desc}`}>
        <td>{doc.party || '-'}</td><td>{doc.no}</td><td>{line.qty} {line.uom || ''}</td><td>{f2(unitPrice)}</td><td>{f2(unitPrice * (+line.qty || 0))}</td><td>{comparison.currency}</td>
        <td>{index === 0 ? <><span className="badge ok">Recommended — lowest unit price</span> <button className="btn sm" onClick={() => onSwitch('po', { party: doc.party, cur: doc.cur, vat: doc.vat, project: doc.project, lines: [{ ...line, price: unitPrice }], from: doc.no, ref: doc.ref })}>Make PO</button></> : `+${f2(unitPrice - comparison.quotes[0].unitPrice)} / unit`}</td>
      </tr>)}</tbody></table> : <p className="muted">Only one posted quote matches this item, date, and currency. Add another quote to compare suppliers.</p>}
    </> : <p className="muted">No posted supplier quote lines with a description are available to compare.</p>}</div>)
}

function Payments({ mod, s, set, user }) {
  const docType = mod === 'sales' ? 'sinv' : 'pinv'
  const direction = mod === 'sales' ? 'Receive' : 'Pay'
  const partyType = mod === 'sales' ? 'Customer' : 'Supplier'
  const invoices = ((s.docs || {})[docType] || []).filter((doc) => doc.status === 'Posted' && doc.pay !== 'paid' && tot(doc).total - (+doc.paid || 0) > 0.005)
  const [invoiceId, setInvoiceId] = useState(''), [amount, setAmount] = useState(''), [date, setDate] = useState(today())
  const [mode, setMode] = useState('Bank transfer'), [reference, setReference] = useState(''), [message, setMessage] = useState('')
  const invoice = invoices.find((doc) => doc.id === invoiceId) || invoices[0]
  const balance = invoice ? Math.max(0, tot(invoice).total - (+invoice.paid || 0)) : 0
  const submit = () => {
    const value = +amount
    if (!invoice) return setMessage('Select an outstanding invoice first')
    if (!(value > 0)) return setMessage('Enter a payment amount greater than zero')
    if (value > balance + 0.005) return setMessage(`Payment exceeds the outstanding balance of ${invoice.cur} ${f2(balance)}`)
    const payment = {
      id: uid(), no: `PE-${date.slice(0, 4)}-${String((s.paymentEntries || []).length + 1).padStart(5, '0')}`,
      type: direction, partyType, party: invoice.party, invoiceType: docType, invoiceId: invoice.id,
      invoiceNo: invoice.no, costCenterId: invoice.costCenterId || '', projectId: invoice.projectId || '', date, currency: invoice.cur, amount: +value.toFixed(2),
      amountUSD: +(value * (invoice.rate || rt(s, invoice.cur))).toFixed(2), mode, reference,
      status: 'Submitted', by: user.name,
    }
    set((p) => {
      const docs = (p.docs || {})[docType] || []
      const current = docs.find((doc) => doc.id === invoice.id)
      if (!current || current.pay === 'paid') return {}
      const paid = +((+current.paid || 0) + payment.amount).toFixed(2)
      const settled = paid + 0.005 >= tot(current).total
      return {
        docs: { ...(p.docs || {}), [docType]: docs.map((doc) => doc.id === current.id ? { ...doc, paid, pay: settled ? 'paid' : 'credit' } : doc) },
        ...(docType === 'sinv' ? { sales: (p.sales || []).map((sale) => sale.ref === current.no ? { ...sale, paid: +((+sale.paid || 0) + payment.amountUSD).toFixed(2), status: settled ? 'paid' : 'credit', paidOn: date } : sale) } : {
          exps: (p.exps || []).map((expense) => expense.invoiceId === current.id || expense.ref === current.no || expense.desc === `Purchase invoice ${current.no}` ? { ...expense, paid: +((+expense.paid || 0) + payment.amountUSD).toFixed(2), status: settled ? 'paid' : 'credit', paidOn: date } : expense),
        }),
        paymentEntries: [payment, ...(p.paymentEntries || [])],
      }
    })
    setAmount(''); setReference(''); setMessage('Payment Entry submitted')
  }
  const entries = (s.paymentEntries || []).filter((payment) => payment.partyType === partyType)
  return <div className="page">
    <div className="card form-grid">
      <h3 style={{ gridColumn: '1/-1', marginTop: 0 }}>{direction === 'Receive' ? 'Receive payment from customer' : 'Pay supplier invoice'}</h3>
      <label>Invoice<select value={invoice?.id || ''} onChange={(e) => { setInvoiceId(e.target.value); setAmount(''); setMessage('') }}>
        <option value="">Select invoice</option>{invoices.map((doc) => <option key={doc.id} value={doc.id}>{doc.no} · {doc.party} · due {doc.cur} {f2(tot(doc).total - (+doc.paid || 0))}</option>)}
      </select></label>
      <label>Posting date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <label>Payment mode<select value={mode} onChange={(e) => setMode(e.target.value)}>{PM.map((methodName) => <option key={methodName}>{methodName}</option>)}</select></label>
      {invoice && <>
        <label>{partyType}<input value={invoice.party} readOnly /></label>
        <label>Outstanding balance ({invoice.cur})<input value={f2(balance)} readOnly /></label>
        <label>Payment amount ({invoice.cur})<input type="number" min="0.01" max={balance} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label>Reference<input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Bank or receipt reference" /></label>
        <p className="muted" style={{ gridColumn: '1/-1' }}>Accounting value: US${f2((+amount || 0) * (invoice.rate || rt(s, invoice.cur)))} · Posted to {direction === 'Receive' ? 'Cash (Dr) / Debtors (Cr)' : 'Creditors (Dr) / Cash (Cr)'}.</p>
      </>}
      {message && <p className="muted" style={{ gridColumn: '1/-1' }}>{message}</p>}
      <button className="btn primary" onClick={submit} disabled={!invoice}>Submit Payment Entry</button>
      {!invoices.length && <p className="muted" style={{ gridColumn: '1/-1' }}>No outstanding {docType === 'sinv' ? 'Sales' : 'Purchase'} Invoices.</p>}
    </div>
    <div className="card scroll" style={{ marginTop: 16 }}><h3>Payment Entries</h3><table className="tbl"><thead><tr><th>Entry</th><th>Date</th><th>Invoice</th><th>{partyType}</th><th>Mode</th><th>Amount</th><th>Reference</th></tr></thead><tbody>
      {entries.map((payment) => <tr key={payment.id}><td>{payment.no}</td><td>{payment.date}</td><td>{payment.invoiceNo}</td><td>{payment.party}</td><td>{payment.mode || '-'}</td><td>{payment.currency} {f2(payment.amount)}</td><td>{payment.reference || '-'}</td></tr>)}
    </tbody></table>{!entries.length && <p className="muted">No payment entries recorded.</p>}</div>
  </div>
}

function Settings({ mod, s, set, users }) {
  const E = cfgE(s), up = (patch) => set((p) => ({ cfg: { ...p.cfg, erp: { ...cfgE(p), ...patch } } })), U = users.filter((u) => u.role !== 'customer')
  return (<div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>{mod === 'stock' ? 'Stock' : mod === 'sales' ? 'Sales' : 'Purchases'} settings</h3>
    {mod === 'stock' && <>{[0, 1, 2].map((i) => <label key={i}>Approver {i + 1}<select value={E.appr[i]} onChange={(e) => up({ appr: E.appr.map((a, j) => (j === i ? e.target.value : a)) })}><option value="">Any user</option>{U.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>)}
      <label>Valuation method<select value={method(s)} onChange={(e) => set((p) => ({ cfg: { ...p.cfg, erp: { ...(p.cfg.erp || {}), valuation: e.target.value } } }))}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></label>
      {[['inv', 'Inventory account'], ['cogs', 'Cost of sales account'], ['dam', 'Damaged stock account'], ['exp', 'Expired stock account'], ['adj', 'Stock adjustment account']].map(([k, l]) => <label key={k}>{l} code<input value={E.acct[k]} onChange={(e) => up({ acct: { ...E.acct, [k]: e.target.value } })} /></label>)}</>}
    {mod !== 'stock' && <>{Object.keys(E.taxRates).map((category) => <label key={category}>{category} rate (%)<input type="number" min="0" step="0.1" value={E.taxRates[category]} onChange={(e) => up({ taxRates: { ...E.taxRates, [category]: +e.target.value }, ...(category === 'VAT' ? { vat: +e.target.value } : {}) })} /></label>)}<label>Default currency<select value={E.cur} onChange={(e) => up({ cur: e.target.value })}>{CUR.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label>ZiG per US$1<input type="number" step="0.01" value={s.cfg.zigRate || ''} onChange={(e) => set((p) => ({ cfg: { ...p.cfg, zigRate: +e.target.value } }))} /></label>{['ZAR'].map((c) => <label key={c}>1 {c} = US$<input type="number" step="0.0001" value={E.rates[c]} onChange={(e) => up({ rates: { ...E.rates, [c]: +e.target.value } })} /></label>)}</>}
    {mod === 'buy' && <><label>Expense approval workflow<select value={E.expFlow ? 'on' : 'off'} onChange={(e) => { const on = e.target.value === 'on'; up({ expFlow: on }) }}><option value="on">Active</option><option value="off">Off</option></select></label>
      <label>Approve expenses above (US$)<input type="number" value={s.cfg.approveOver} onChange={(e) => set((p) => ({ cfg: { ...p.cfg, approveOver: +e.target.value } }))} /></label></>}
    <p className="muted" style={{ gridColumn: '1/-1' }}>Rates are US$ per 1 unit of the currency. Check VAT and exchange rates against ZIMRA / RBZ.</p></div>)
}

const TABS = { stock: ['dash', 'items', 'grv', 'mreq', 'issue', 'damaged', 'expired', 'recon', 'rep', 'set'], sales: ['dash', 'quote', 'sorder', 'blanket', 'proforma', 'sinv', 'cnote', 'pay', 'rep', 'set'], buy: ['dash', 'pmreq', 'cmp', 'squote', 'po', 'pinv', 'pay', 'rep', 'set'] }
const NAME = { dash: 'Dashboard', items: 'Items & Stock Value', cmp: 'Supplier Comparison', pay: 'Payment Entry', rep: 'Reports', set: 'Settings & Accounting' }
export default function Erp({ mod, tab0, s, set, user, users }) {
  const [tab, setTab] = useState(tab0 || 'dash'), [seed, setSeed] = useState(null)
  const sw = (t, sd) => { setSeed(sd ? { ...sd, k: uid() } : null); setTab(t) }
  const all = Object.entries(s.docs || {}).filter(([t]) => D[t]?.m === mod).flatMap(([, v]) => v), pend = all.filter((d) => d.status === 'Pending approval').length
  const R = (t, ts = ['sinv', 'cnote']) => ((s.docs || {})[ts[0]] || []).concat((s.docs || {})[ts[1]] || []).filter((d) => live(d) && d.date >= t).reduce((a, d) => a + (D[d.type].sign || 1) * tot(d).total * (d.rate || 1), 0)
  const cards = { stock: [['Stock value US$', f2(sum(s.stock, (i) => i.qty * i.avg))], ['Items', s.stock.length], ['Low stock', s.stock.filter((i) => i.reorder > 0 && i.qty <= i.reorder).length], ['Expired', s.stock.filter((i) => i.expiry && i.expiry <= today() && i.qty > 0).length], ['Pending approvals', pend]],
    sales: [['Sales today US$', f2(R(today()))], ['This month US$', f2(R(today().slice(0, 7) + '-01'))], ['This year US$', f2(R(today().slice(0, 4) + '-01-01'))], ['Open quotes', ((s.docs || {}).quote || []).length], ['Customers owe US$', f2(sum(s.sales.filter((x) => x.status === 'credit'), (x) => x.qty * x.price))]],
    buy: [['Pending requests', pend], ['Quotes', ((s.docs || {}).squote || []).length], ['Open POs', ((s.docs || {}).po || []).length], ['Owed to suppliers US$', f2(sum(s.exps.filter((x) => x.status === 'credit'), (x) => x.amount))]] }[mod]
  return (
    <div className="page">{!D[tab] && <PageHead title={NAME[tab]} />}
      {tab === 'dash' && <NCards items={cards} />}
      {tab === 'dash' && <div className="card scroll"><h3>Recent transactions</h3><table className="tbl"><thead><tr><th>Type</th><th>No.</th><th>Date</th><th>Party</th><th>Amount</th><th>Status</th></tr></thead><tbody>{all.sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 10).map((d) => <tr key={d.id} className="clickable" onClick={() => sw(d.type)}><td>{D[d.type].l}</td><td>{d.no}</td><td>{d.date}</td><td>{d.party}</td><td>{D[d.type].money ? d.cur + ' ' + f2(tot(d).total) : d.lines.length + ' lines'}</td><td>{d.status}</td></tr>)}</tbody></table>{!all.length && <p className="muted">No transactions yet.</p>}</div>}
      {tab === 'items' && <Items s={s} set={set} />}
      {tab === 'cmp' && <Compare s={s} onSwitch={sw} />}
      {tab === 'pay' && <Payments mod={mod} s={s} set={set} user={user} />}
      {tab === 'rep' && <Reports mod={mod} s={s} />}
      {tab === 'set' && <Settings mod={mod} s={s} set={set} users={users} />}
      {D[tab] && <DocList key={tab + (seed?.k || '')} type={tab} s={s} set={set} user={user} users={users} seed={seed} onSwitch={sw} />}
    </div>
  )
}
