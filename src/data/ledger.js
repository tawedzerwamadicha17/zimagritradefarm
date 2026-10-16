import { sum, today, CATS, compute } from './store.js'
import { bioEvents, grantEvents } from './agri.js'
// ERPNext-style chart of accounts: [number, name, parent, root_type, account_type, is_group]
const B = [['1000', 'Assets', null, 'Asset', '', 1], ['1100', 'Current Assets', '1000', 'Asset', '', 1], ['1110', 'Cash', '1100', 'Asset', 'Cash'], ['1120', 'Debtors', '1100', 'Asset', 'Receivable'], ['1130', 'Stock In Hand', '1100', 'Asset', 'Stock'], ['1140', 'Produce / Work In Progress', '1100', 'Asset', 'Stock'], ['1150', 'Biological Assets (Fair Value)', '1100', 'Asset', 'Stock'], ['1160', 'Grants & Claims Receivable', '1100', 'Asset', 'Receivable'], ['1170', 'Input VAT Recoverable', '1100', 'Asset', 'Tax'], ['1200', 'Fixed Assets', '1000', 'Asset', '', 1], ['1210', 'Plant & Equipment', '1200', 'Asset', 'Fixed Asset'], ['1220', 'Accumulated Depreciation', '1200', 'Asset', 'Accumulated Depreciation'],
  ['2000', 'Liabilities', null, 'Liability', '', 1], ['2100', 'Current Liabilities', '2000', 'Liability', '', 1], ['2110', 'Creditors', '2100', 'Liability', 'Payable'], ['2130', 'Stock Received But Not Billed', '2100', 'Liability', 'Stock Received But Not Billed'], ['2140', 'Deferred Grant & Claim Income', '2100', 'Liability', ''], ['2170', 'Output VAT Payable', '2100', 'Liability', 'Tax'],
  ['3000', 'Equity', null, 'Equity', '', 1], ['3100', "Owner's Capital", '3000', 'Equity', 'Equity'], ['3200', 'Retained Earnings', '3000', 'Equity', 'Equity'],
  ['4000', 'Income', null, 'Income', '', 1], ['4100', 'Sales', '4000', 'Income', 'Income Account'], ['4200', 'Other Income (non-operating)', '4000', 'Income', '', 1], ['4210', 'Fair Value Gain - Biological Assets', '4200', 'Income', 'Income Account'], ['4220', 'Grants & Subsidies', '4200', 'Income', 'Income Account'], ['4230', 'Insurance Claims', '4200', 'Income', 'Income Account'],
  ['5000', 'Expenses', null, 'Expense', '', 1], ['5100', 'Direct Expenses', '5000', 'Expense', '', 1],
  ...CATS.map((c, i) => [String(5101 + i), c, '5100', 'Expense', c === 'Depreciation' ? 'Depreciation' : 'Expense Account']),
  ['5200', 'Stock Adjustments', '5000', 'Expense', '', 1], ['5210', 'Stock Adjustment', '5200', 'Expense', 'Stock Adjustment'], ['5220', 'Stock Consumed', '5200', 'Expense', 'Expense Account'], ['5230', 'Damaged Stock Written Off', '5200', 'Expense', 'Expense Account'], ['5240', 'Expired Stock Written Off', '5200', 'Expense', 'Expense Account'], ['5250', 'Change in Produce / WIP', '5200', 'Expense', 'Expense Account']]
export const accounts = (s) => [...B, ...(s.coaX || [])].map(([no, name, parent, root, type, group]) => ({ no, name, parent, root, type, group: !!group }))
export const depth = (a, all) => { let d = 0, p = a.parent; while (p) { d++; p = all.find((x) => x.no === p)?.parent } return d }
const cat = (c) => String(5101 + Math.max(0, CATS.indexOf(c) < 0 ? CATS.length - 1 : CATS.indexOf(c)))
const MV = { GRV: ['1130', '2130'], 'Opening stock': ['1130', '2130'], 'Material Request': ['5220', '1130'], 'Stock Issue': ['5220', '1130'], 'Damaged Stock': ['5230', '1130'], 'Expired Stock': ['5240', '1130'], 'Stock Reconciliation': ['1130', '5210'] }

// Derive the General Ledger (GL Entry list) from every transaction, as ERPNext does on submit.
export function gl(s) {
  const out = [], yr = today().slice(0, 4)
  const pair = (date, dr, cr, amt, vt, vn, party = '', cc = '', remark = '', cd = '', project = '') => { amt = +(+amt).toFixed(2); if (!amt) return; if (amt < 0) { [dr, cr] = [cr, dr]; amt = -amt }
    out.push({ date, cd: cd || date, acct: dr, party, dr: amt, cr: 0, vt, vn, cc, project, remark, against: cr }, { date, cd: cd || date, acct: cr, party, dr: 0, cr: amt, vt, vn, cc, project, remark, against: dr }) }
  pair(yr + '-01-01', '1110', '3100', s.cfg.capital || 0, 'Journal Entry', 'OPENING-CAPITAL', '', '', 'Owner capital introduced')
  const no = (pre, x, i) => x.ref || `ACC-${pre}-${(x.date || yr).slice(0, 4)}-${String(i + 1).padStart(5, '0')}`
  const paymentFor = (invoiceNo) => (s.paymentEntries || []).some((payment) => payment.invoiceNo === invoiceNo)
  s.sales.filter((x) => x.approval !== 'pending' && x.approval !== 'rejected').forEach((x, i) => { const v = no('SINV', x, i), a = x.qty * x.price
    if (x.invoiceId) {
      pair(x.date, '1120', '4100', a + (+x.freight || 0), 'Sales Invoice', v, x.cust, x.costCenterId || '', 'Sale to ' + (x.cust || ''), '', x.projectId || '')
      pair(x.date, '1120', '2170', x.vat || 0, 'Sales Invoice', v, x.cust, x.costCenterId || '', 'Output VAT', '', x.projectId || '')
    } else {
      pair(x.date, '1120', '4100', a, 'Sales Invoice', v, x.cust, x.costCenterId || '', 'Sale to ' + (x.cust || ''), '', x.projectId || '')
      if (x.status !== 'credit' && !paymentFor(x.ref)) pair(x.date, '1110', '1120', a, 'Payment Entry', v.replace('SINV', 'PE'), x.cust, x.costCenterId || '', 'Received', x.paidOn, x.projectId || '')
    }
  })
  s.exps.filter((x) => x.status !== 'pending' && x.status !== 'rejected' && !x.stock).forEach((x, i) => { const v = no('PINV', x, i)
    if (x.invoiceId || paymentFor(x.ref || (x.desc || '').replace(/^Purchase invoice /, ''))) {
      pair(x.date, cat(x.cat), '2110', x.amount, 'Purchase Invoice', v, x.supplier, x.costCenterId || '', x.desc, '', x.projectId || '')
      pair(x.date, '1170', '2110', x.vat || 0, 'Purchase Invoice', v, x.supplier, x.costCenterId || '', 'Input VAT', '', x.projectId || '')
    } else {
      const c = x.status === 'issued' ? '1130' : x.status === 'noncash' ? '1220' : x.status === 'credit' ? '2110' : '1110'
      pair(x.date, cat(x.cat), c, x.amount, x.status === 'issued' ? 'Stock Entry' : x.status === 'noncash' ? 'Journal Entry' : 'Purchase Invoice', v, x.supplier, x.costCenterId || '', x.desc, x.paidOn, x.projectId || '')
    }
  })
  ;(s.paymentEntries || []).filter((payment) => payment.status === 'Submitted').forEach((payment) => {
    const amount = payment.amountUSD ?? payment.amount, reference = [payment.mode, payment.reference].filter(Boolean).join(' · ')
    if (payment.type === 'Receive') pair(payment.date, '1110', '1120', amount, 'Payment Entry', payment.no, payment.party, payment.costCenterId || '', reference || `Received against ${payment.invoiceNo}`, '', payment.projectId || '')
    if (payment.type === 'Pay') pair(payment.date, '2110', '1110', amount, 'Payment Entry', payment.no, payment.party, payment.costCenterId || '', reference || `Paid against ${payment.invoiceNo}`, '', payment.projectId || '')
  })
  s.buys.forEach((x, i) => pair(x.date, '1130', x.status === 'credit' ? '2110' : '1110', x.cost, 'Purchase Receipt', `ACC-PREC-${x.date.slice(0, 4)}-${String(i + 1).padStart(5, '0')}`, x.supplier, x.costCenterId || '', x.item, x.paidOn, x.projectId || ''))
  s.assets.forEach((x, i) => pair(x.date, '1210', x.status === 'credit' ? '2110' : '1110', x.cost, 'Asset', `ACC-ASSET-${String(i + 1).padStart(5, '0')}`, x.supplier, '', x.name))
  ;(s.moves || []).forEach((m) => { const r = MV[m.type]; if (!r) return; const v = Math.abs(m.value), sg = r[0] === '1130' ? m.value : -m.value, rm = m.type + ': ' + m.name; sg >= 0 ? pair(m.date, r[0], r[1], v, 'Stock Entry', m.ref, '', m.costCenterId || '', rm, '', m.projectId || '') : pair(m.date, r[1], r[0], v, 'Stock Entry', m.ref, '', m.costCenterId || '', rm, '', m.projectId || '') })
  ;(s.jes || []).forEach((j) => j.rows.forEach((r) => out.push({ date: j.date, cd: j.date, acct: r.acct, party: r.party || '', dr: +r.dr || 0, cr: +r.cr || 0, vt: j.vt, vn: j.no, cc: r.cc || '', project: r.project || '', remark: j.remark || '', against: '' })))
  bioEvents(s).forEach((e, i) => pair(e.date, '1150', '4210', e.amt, 'Journal Entry', `ACC-BIO-${String(i + 1).padStart(5, '0')}`, '', e.bioEnt || '', `${e.type}: ${e.name}`))
  grantEvents(s).forEach((e) => pair(e.date, e.dr, e.cr, e.amt, 'Journal Entry', e.vn, '', '', e.remark, e.cd))
  pair(today(), '1140', '5250', sum(compute(s), (e) => e.wip), 'Journal Entry', 'WIP-CLOSING', '', '', 'Unsold produce carried as work in progress')
  return out.sort((a, b) => a.date.localeCompare(b.date))
}
