import { useState } from 'react'
import { Adder } from './ui.jsx'
import { uid, today, sum, csv } from '../data/store.js'
import { accounts, depth, gl } from '../data/ledger.js'

const f2 = (n) => (+n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const T = ({ head, rows, bold }) => <div className="scroll"><table className="tbl"><thead><tr>{head.map((h, i) => <th key={i} style={i > 1 ? { textAlign: 'right' } : undefined}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i} style={bold?.(r) ? { fontWeight: 700 } : undefined}>{r.map((c, j) => <td key={j} style={j > 1 ? { textAlign: 'right' } : undefined}>{c}</td>)}</tr>)}</tbody></table></div>
const sign = (a) => (a.root === 'Asset' || a.root === 'Expense' ? 1 : -1)

export default function Accounts({ s, set, user, tab0 }) {
  const [tab, setTab] = useState(tab0 || 'dash'), [from, setFrom] = useState(today().slice(0, 4) + '-01-01'), [to, setTo] = useState(today()), [acc, setAcc] = useState(''), [party, setParty] = useState(''), [costCenterId, setCostCenterId] = useState(''), [projectId, setProjectId] = useState('')
  const A = accounts(s), G = gl(s), leaf = A.filter((a) => !a.group)
  const sub = (a) => A.filter((x) => x.no === a.no || (x.no.startsWith(a.no[0]) && desc(x, a)))
  const desc = (x, a) => { let p = x.parent; while (p) { if (p === a.no) return true; p = A.find((y) => y.no === p)?.parent } return false }
  const own = (a, f) => { const e = G.filter((g) => g.acct === a.no && f(g)); return [sum(e, (g) => g.dr), sum(e, (g) => g.cr)] }
  const roll = (a, f) => sub(a).filter((x) => !x.group).reduce((t, x) => { const [d, c] = own(x, f); return [t[0] + d, t[1] + c] }, [0, 0])
  const net = (a, f) => { const [d, c] = roll(a, f); return sign(a) * (d - c) }
  const costCenters = s.dt?.costcenter || [], projects = s.dt?.project || []
  const costCenterName = (id) => costCenters.find((center) => center.id === id)?.name || id || ''
  const projectName = (id) => projects.find((project) => project.id === id)?.name || id || ''
  const inP = (g) => g.date >= from && g.date <= to, upTo = (g) => g.date <= to
  const inDimensions = (g) => (!costCenterId || g.cc === costCenterId) && (!projectId || g.project === projectId)
  const sec = (root, f) => A.filter((a) => a.root === root).map((a) => [a.no, '\u00A0'.repeat(depth(a, A) * 4) + a.name, f2(net(a, f))])
  const inc = net(A.find((a) => a.no === '4000'), inP), exp = net(A.find((a) => a.no === '5000'), inP)
    const stockByWarehouse = Object.entries((s.stock || []).reduce((groups, item) => {
      const warehouse = item.wh || 'Unassigned'
      const row = groups[warehouse] || { items: 0, qty: 0, value: 0 }
      row.items++; row.qty += +item.qty || 0; row.value += (+item.qty || 0) * (+item.avg || 0)
      groups[warehouse] = row
      return groups
    }, {})).map(([warehouse, row]) => [warehouse, row.items, f2(row.qty), f2(row.value)])
    const stockValue = sum(s.stock || [], (item) => (+item.qty || 0) * (+item.avg || 0))
  const TABS = [['dash', 'Accounting Home'], ['coa', 'Chart of Accounts'], ['je', 'Journal Entry'], ['gl', 'General Ledger'], ['tb', 'Trial Balance'], ['pl', 'Profit and Loss'], ['bs', 'Balance Sheet'], ['basis', 'Cash vs Accrual']]
  const Flt = <div className="row"><label>From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label><label>To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label></div>
  return (
    <div className="page"><div className="page-head"><div><h1>{TABS.find((x) => x[0] === tab)?.[1] || 'Accounts'}</h1><p className="muted">Double-entry ledger · every sale, expense, stock movement and journal posts to the General Ledger · USD</p></div></div>
      {tab === 'dash' && <>
        <div className="stat-row">{[['Income (period)', inc], ['Expenses (period)', exp], ['Net profit', inc - exp], ['Cash', net(A.find((a) => a.no === '1110'), upTo)], ['Receivable', net(A.find((a) => a.no === '1120'), upTo)], ['Payable', net(A.find((a) => a.no === '2110'), upTo)], ['Stock value', stockValue]].map(([l, v]) => <div key={l} className="card stat"><span className="stat-num">US${f2(v)}</span><span className="muted">{l}</span></div>)}</div>
        <div className="card"><h3>Shortcuts</h3><div className="row">{TABS.slice(1).map(([k, l]) => <button key={k} className="btn" onClick={() => setTab(k)}>{l}</button>)}</div>{Flt}</div></>}
      {tab === 'dash' && <div className="card"><h3>Stock value by warehouse</h3><T head={['Warehouse / storage', 'Items', 'Quantity', 'Stock value (US$)']} rows={[...stockByWarehouse, ['Total', (s.stock || []).length, f2(sum(s.stock || [], (item) => +item.qty || 0)), f2(stockValue)]]} bold={(row) => row[0] === 'Total'} />{!stockByWarehouse.length && <p className="muted">No stock items recorded yet.</p>}</div>}
      {tab === 'coa' && <><CoA s={s} set={set} A={A} net={(a) => net(a, upTo)} /></>}
      {tab === 'je' && <JE s={s} set={set} leaf={leaf} user={user} />}
        {tab === 'gl' && <div className="card">{Flt}{(() => { const matches = (g) => inDimensions(g) && (!acc || g.acct === acc) && (!party || g.party.toLowerCase().includes(party.toLowerCase())), open = acc ? sum(G.filter((g) => g.acct === acc && g.date < from && inDimensions(g)), (g) => g.dr - g.cr) : 0, rows = G.filter((g) => inP(g) && matches(g)); let run = open
          const R = rows.map((g) => { run += g.dr - g.cr; return [g.date, g.vt + ' ' + g.vn, g.acct + ' ' + (A.find((a) => a.no === g.acct)?.name || ''), f2(g.dr), f2(g.cr), acc ? f2(run) : '', g.party, costCenterName(g.cc), projectName(g.project), g.remark] }); const H = ['Date', 'Voucher', 'Account', 'Debit', 'Credit', 'Balance', 'Party', 'Cost center', 'Project', 'Remarks']
          return <><div className="row"><label>Account<select value={acc} onChange={(e) => setAcc(e.target.value)}><option value="">All</option>{leaf.map((a) => <option key={a.no} value={a.no}>{a.no} {a.name}</option>)}</select></label><label>Party<input value={party} onChange={(e) => setParty(e.target.value)} /></label><label>Cost center<select value={costCenterId} onChange={(e) => { setCostCenterId(e.target.value); setProjectId('') }}><option value="">All cost centers</option>{costCenters.map((center) => <option key={center.id} value={center.id}>{center.farm ? center.farm + ' · ' : ''}{center.name}</option>)}</select></label><label>Project<select value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">All projects</option>{projects.filter((project) => !costCenterId || project.costCenter === costCenterId).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><button className="btn primary" onClick={() => csv(H, R, 'general-ledger')}>Export CSV</button></div><T head={H} rows={R} /><p className="muted">Opening balance {f2(open)} · {rows.length} entries</p></> })()}</div>}
      {tab === 'tb' && <div className="card">{Flt}{(() => { const R = A.map((a) => { const o = roll(a, (g) => g.date < from), p = roll(a, inP); return [a.no, '\u00A0'.repeat(depth(a, A) * 4) + a.name, f2(o[0] - o[1]), f2(p[0]), f2(p[1]), f2(o[0] - o[1] + p[0] - p[1]), a.group ? 1 : 0] }), H = ['No.', 'Account', 'Opening (Dr-Cr)', 'Debit', 'Credit', 'Closing (Dr-Cr)']
        const roots = A.filter((a) => !a.parent), dt = sum(roots, (a) => roll(a, inP)[0]), ct = sum(roots, (a) => roll(a, inP)[1])
        return <><button className="btn primary" onClick={() => csv(H, R.map((r) => r.slice(0, 6)), 'trial-balance')}>Export CSV</button><T head={H} rows={R.map((r) => r.slice(0, 6))} bold={(r) => R.find((x) => x[0] === r[0])[6]} /><p className={Math.abs(dt - ct) < 0.01 ? 'muted' : 'alert over'}>Total debit {f2(dt)} · Total credit {f2(ct)} {Math.abs(dt - ct) < 0.01 ? '✓ balanced' : '— out of balance'}</p></> })()}</div>}
      {tab === 'pl' && <div className="card">{Flt}<h3>Profit and Loss</h3><T head={['No.', 'Account', 'US$']} rows={[...sec('Income', inP), ['', 'Total Income', f2(inc)], ['', '  of which Other Income (grants, insurance, fair-value gains)', f2(net(A.find((a) => a.no === '4200'), inP))], ...sec('Expense', inP), ['', 'Total Expense', f2(exp)], ['', 'Net Profit / (Loss)', f2(inc - exp)]]} bold={(r) => !r[0]} /><button className="btn" onClick={() => csv(['No.', 'Account', 'US$'], [...sec('Income', inP), ...sec('Expense', inP)], 'profit-and-loss')}>Export CSV</button></div>}
      {tab === 'bs' && (() => { const pr = net(A.find((a) => a.no === '4000'), upTo) - net(A.find((a) => a.no === '5000'), upTo), as = net(A.find((a) => a.no === '1000'), upTo), li = net(A.find((a) => a.no === '2000'), upTo), eq = net(A.find((a) => a.no === '3000'), upTo)
        return <div className="card"><div className="row"><label>As at<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label></div><h3>Balance Sheet</h3>
          <T head={['No.', 'Account', 'US$']} rows={[...sec('Asset', upTo), ['', 'Total Asset (Debit)', f2(as)], ...sec('Liability', upTo), ['', 'Total Liability (Credit)', f2(li)], ...sec('Equity', upTo), ['', 'Provisional Profit / Loss (Credit)', f2(pr)], ['', 'Total Equity (Credit)', f2(eq + pr)], ['', 'Total (Liability + Equity)', f2(li + eq + pr)]]} bold={(r) => !r[0]} />
          <p className={Math.abs(as - li - eq - pr) < 0.01 ? 'muted' : 'alert over'}>{Math.abs(as - li - eq - pr) < 0.01 ? '✓ Assets equal Liabilities + Equity' : 'Out of balance by ' + f2(as - li - eq - pr)}</p></div> })()}
      {tab === 'basis' && <Basis A={A} G={G} from={from} to={to} net={net} inP={inP} upTo={upTo} Flt={Flt} />}
    </div>
  )
}

function CoA({ s, set, A, net }) {
  const [f, setF] = useState({ name: '', no: '', parent: '1100', type: 'Expense Account' })
  const add = () => { const p = A.find((a) => a.no === f.parent); if (!f.name || !f.no || A.some((a) => a.no === f.no)) return alert('Enter a unique number and a name'); set((q) => ({ coaX: [...(q.coaX || []), [f.no, f.name, f.parent, p.root, f.type, 0]] })); setF({ ...f, name: '', no: '' }) }
  return (<><Adder label="Account"><div className="card form-grid"><h3 style={{ gridColumn: '1/-1' }}>New account</h3><label>Account number<input value={f.no} onChange={(e) => setF({ ...f, no: e.target.value })} /></label><label>Account name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
    <label>Parent account<select value={f.parent} onChange={(e) => setF({ ...f, parent: e.target.value })}>{A.filter((a) => a.group).map((a) => <option key={a.no} value={a.no}>{a.no} {a.name}</option>)}</select></label>
    <label>Account type<select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{['Bank', 'Cash', 'Receivable', 'Payable', 'Stock', 'Fixed Asset', 'Tax', 'Income Account', 'Expense Account', 'Equity'].map((t) => <option key={t}>{t}</option>)}</select></label><button className="btn primary" onClick={add}>Add account</button></div></Adder>
    <div className="card"><T head={['No.', 'Account', 'Root type', 'Account type', 'Balance US$']} rows={A.map((a) => [a.no, '\u00A0'.repeat(depth(a, A) * 4) + (a.group ? '▸ ' : '') + a.name, a.root, a.type, f2(net(a))])} bold={(r) => !A.find((a) => a.no === r[0]).parent} /></div></>)
}

function JE({ s, set, leaf, user }) {
  const blank = { vt: 'Journal Entry', date: today(), remark: '', rows: [{ acct: '', party: '', dr: '', cr: '', cc: '', project: '' }, { acct: '', party: '', dr: '', cr: '', cc: '', project: '' }] }
  const costCenters = s.dt?.costcenter || [], projects = s.dt?.project || []
  const [f, setF] = useState(null), L = s.jes || [], dr = f ? sum(f.rows, (r) => +r.dr || 0) : 0, cr = f ? sum(f.rows, (r) => +r.cr || 0) : 0
  const up = (i, k, v) => setF({ ...f, rows: f.rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)) })
  const save = () => { const rows = f.rows.filter((r) => r.acct && (+r.dr || +r.cr)); if (rows.length < 2 || Math.abs(dr - cr) > 0.005) return alert('Debit and credit must balance'); set((p) => ({ jes: [{ ...f, rows, id: uid(), no: 'ACC-JV-' + f.date.slice(0, 4) + '-' + String((p.jes || []).length + 1).padStart(5, '0'), by: user.name }, ...(p.jes || [])] })); setF(null) }
  return (<><div className="row" style={{ justifyContent: 'space-between' }}><h3>Journal Entries ({L.length})</h3><button className="btn primary" onClick={() => setF(blank)}>+ New Journal Entry</button></div>
    {f && <div className="card form-grid"><label>Entry type<select value={f.vt} onChange={(e) => setF({ ...f, vt: e.target.value })}>{['Journal Entry', 'Bank Entry', 'Cash Entry', 'Opening Entry', 'Depreciation Entry'].map((t) => <option key={t}>{t}</option>)}</select></label><label>Posting date<input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label><label>Remark<input value={f.remark} onChange={(e) => setF({ ...f, remark: e.target.value })} /></label>
      <div style={{ gridColumn: '1/-1' }} className="scroll"><table className="tbl"><thead><tr><th>Account</th><th>Party</th><th>Cost center</th><th>Project</th><th>Debit</th><th>Credit</th><th /></tr></thead><tbody>{f.rows.map((r, i) => <tr key={i}><td><select value={r.acct} onChange={(e) => up(i, 'acct', e.target.value)}><option value="">—</option>{leaf.map((a) => <option key={a.no} value={a.no}>{a.no} {a.name}</option>)}</select></td><td><input value={r.party} onChange={(e) => up(i, 'party', e.target.value)} /></td><td><select value={r.cc || ''} onChange={(e) => setF({ ...f, rows: f.rows.map((row, j) => j === i ? { ...row, cc: e.target.value, project: '' } : row) })}><option value="">—</option>{costCenters.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}</select></td><td><select value={r.project || ''} onChange={(e) => up(i, 'project', e.target.value)}><option value="">—</option>{projects.filter((project) => !r.cc || project.costCenter === r.cc).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></td><td><input type="number" value={r.dr} onChange={(e) => up(i, 'dr', e.target.value)} /></td><td><input type="number" value={r.cr} onChange={(e) => up(i, 'cr', e.target.value)} /></td><td><button className="btn sm" onClick={() => setF({ ...f, rows: f.rows.filter((_, j) => j !== i) })}>✕</button></td></tr>)}</tbody></table><button className="btn sm" onClick={() => setF({ ...f, rows: [...f.rows, { acct: '', party: '', dr: '', cr: '', cc: '', project: '' }] })}>+ Row</button></div>
      <p style={{ gridColumn: '1/-1' }}>Total Debit <b>{f2(dr)}</b> · Total Credit <b>{f2(cr)}</b> · Difference <b className={Math.abs(dr - cr) > 0.005 ? 'red' : ''}>{f2(dr - cr)}</b></p><div className="row" style={{ gridColumn: '1/-1', justifyContent: 'flex-start' }}><button className="btn primary" onClick={save}>Submit</button><button className="btn" onClick={() => setF(null)}>Cancel</button></div></div>}
    <div className="card"><T head={['No.', 'Date', 'Type', 'Debit', 'Remark']} rows={L.map((j) => [j.no, j.date, j.vt, f2(sum(j.rows, (r) => +r.dr || 0)), j.remark])} />{!L.length && <p className="muted">No journal entries yet.</p>}</div></>)
}

// Dual-basis view: the same ledger shown on a cash basis (tax / owner view) and an accrual basis (lender / crop-year view).
function Basis({ A, G, from, to, net, inP, upTo, Flt }) {
  const cashIn = (g) => g.acct === '1110' && g.dr > 0 && (g.cd || g.date) >= from && (g.cd || g.date) <= to
  const cashOut = (g) => g.acct === '1110' && g.cr > 0 && (g.cd || g.date) >= from && (g.cd || g.date) <= to
  const rc = (ag) => sum(G.filter((g) => cashIn(g) && g.against === ag), (g) => g.dr)
  const pd = (f) => sum(G.filter((g) => cashOut(g) && f(g.against)), (g) => g.cr)
  const acc = (no) => net(A.find((a) => a.no === no), inP), cats = A.filter((a) => a.parent === '5100' && !a.group)
  const L = [
    ['Sales revenue', rc('1120'), acc('4100')],
    ['Grants, subsidies & insurance', rc('1160'), acc('4220') + acc('4230')],
    ['Fair-value gain on biological assets', 0, acc('4210')],
    ...cats.map((c) => ['  ' + c.name, -pd((x) => x === c.no), -acc(c.no)]),
    ['  Inputs: purchased (cash) / consumed & adjusted (accrual)', -pd((x) => x === '1130'), -acc('5200')],
  ]
  const tc = sum(L, (r) => r[1]), ta = sum(L, (r) => r[2]), H = ['Line', 'Cash basis', 'Accrual basis', 'Difference'], R = L.map((r) => [r[0], f2(r[1]), f2(r[2]), f2(r[2] - r[1])])
  const bal = (no) => net(A.find((a) => a.no === no), upTo)
  const T = [['Receivables (sales on credit)', bal('1120')], ['Grants & claims receivable', bal('1160')], ['Input stock on hand', bal('1130')], ['Produce / work in progress', bal('1140')], ['Biological assets at fair value', bal('1150')], ['Payables to suppliers', bal('2110')], ['Deferred grant & claim income', bal('2140')]]
  return (<div className="card">{Flt}<h3>Profit: cash basis vs accrual basis</h3>
    <T2 head={H} rows={[...R, ['Net profit / (loss)', f2(tc), f2(ta), f2(ta - tc)]]} />
    <p className="muted">Cash basis counts money actually received and paid (inputs are expensed when bought, depreciation and fair-value gains are ignored). Accrual basis matches income to the crop year that earned it: inputs are expensed when consumed, unsold produce stays in work in progress, and grants are released from deferred income. Cash dates use the date an item was marked paid or received; items marked before this update fall back to the invoice date. Manual journals appear on the accrual side only.</p>
    <h3>Balances that explain the difference (as at {to})</h3><T2 head={['Item', 'US$']} rows={T.map(([l, v]) => [l, f2(v)])} />
    <button className="btn" onClick={() => csv(H, R, 'cash-vs-accrual')}>Export CSV</button></div>)
}
const T2 = T
