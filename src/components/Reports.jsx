import { useState } from 'react'
import { AGEH, compute, receivables, payables, age, sum, csv } from '../data/store.js'
import { equipDue } from '../data/doctypes.js'
import { ROLES } from '../data/auth.js'
import { accounts, gl } from '../data/ledger.js'

const m2 = (n) => (+n || 0).toFixed(2)
export default function Reports({ s, user, users }) {
  const dt = (t) => s.dt[t] || [], name = (t, id) => dt(t).find((x) => x.id === id)?.name || '-'
  const docList = (type) => ((s.docs || {})[type] || []).filter((d) => ['Posted', 'Approved'].includes(d.status))
  const docTotal = (d) => {
    const gross = sum(d.lines || [], (line) => (+line.qty || 0) * (+line.price || 0))
    const discount = sum(d.lines || [], (line) => (+line.qty || 0) * (+line.price || 0) * (+line.disc || 0) / 100)
    return (gross - discount + (gross - discount) * (+d.vat || 0) / 100 + (+d.freight || 0)) * (d.rate || 1)
  }
  const agingRows = (documents) => age(documents.filter((d) => d.pay !== 'paid').map((d) => ({ party: d.party || 'Unknown', amount: Math.max(0, docTotal(d) - (+d.paid || 0) * (d.rate || 1)), due: d.due || d.date })).filter((d) => d.amount > 0))
  const entName = (id) => s.ents.find((e) => e.id === id)?.name || 'Unassigned'
  const coa = accounts(s), ledger = gl(s)
  const accountNet = (account) => sum(ledger.filter((entry) => {
    let current = coa.find((item) => item.no === entry.acct)
    while (current) {
      if (current.no === account.no) return true
      current = coa.find((item) => item.no === current.parent)
    }
    return false
  }), (entry) => entry.dr - entry.cr)
  const leafAccounts = coa.filter((account) => !account.group)
  const accountTotal = (root) => sum(leafAccounts.filter((account) => account.root === root), accountNet)
  const sectionRows = (root, reverse = false) => leafAccounts.filter((account) => account.root === root).map((account) => [account.name, m2((reverse ? -1 : 1) * accountNet(account))]).filter((row) => +row[1])
  const R = {
    'Sales Analytics': () => {
      const m = {}
      ;[...docList('sinv'), ...docList('cnote')].forEach((d) => (d.lines || []).forEach((line) => {
        const item = line.desc || s.stock.find((i) => i.id === line.item)?.name || 'Unspecified'
        const row = (m[item] = m[item] || [0, 0, 0])
        const sign = d.type === 'cnote' ? -1 : 1
        row[0] += sign * (+line.qty || 0)
        row[1] += sign * (+line.qty || 0) * (+line.price || 0) * (1 - (+line.disc || 0) / 100) * (d.rate || 1)
        row[2]++
      }))
      return [['Item', 'Qty', 'Net sales (US$)', 'Lines'], Object.entries(m).map(([item, v]) => [item, m2(v[0]), m2(v[1]), v[2]])]
    },
    'Sales Register': () => [['Date', 'Invoice', 'Customer', 'Currency', 'Total (US$)', 'Status'], [...docList('sinv'), ...docList('cnote')].map((d) => [d.date || '-', d.no || '-', d.party || '-', d.cur || 'USD', m2((d.type === 'cnote' ? -1 : 1) * docTotal(d)), d.status])],
    'Sales Order Trends': () => {
      const m = {}
      docList('sorder').forEach((d) => { const period = (d.date || '').slice(0, 7); const row = (m[period] = m[period] || [0, 0]); row[0]++; row[1] += docTotal(d) })
      return [['Period', 'Sales Orders', 'Order value (US$)'], Object.entries(m).sort(([a], [b]) => a.localeCompare(b)).map(([period, v]) => [period || '-', v[0], m2(v[1])])]
    },
    'Enterprise profitability': () => [['Enterprise', 'Revenue', 'Cost of sales', 'Profit', 'Margin'], compute(s).filter((e) => e.type !== 'overhead').map((e) => [e.name, m2(e.rev), m2(e.cogs), m2(e.profit), e.rev ? Math.round((e.profit / e.rev) * 100) + '%' : '-'])],
    'Gross Profit': () => [['Enterprise', 'Revenue', 'Cost of sales', 'Gross profit', 'Margin'], compute(s).filter((e) => e.type !== 'overhead').map((e) => [e.name, m2(e.rev), m2(e.cogs), m2(e.rev - e.cogs), e.rev ? Math.round(((e.rev - e.cogs) / e.rev) * 100) + '%' : '-'])],
    'Income & Expenditure': () => {
      const sales = sum(s.sales, (x) => (x.qty || 0) * (x.price || 0))
      const expenses = sum(s.exps.filter((x) => x.status !== 'pending' && x.status !== 'rejected'), (x) => +x.amount || 0)
      return [['Category', 'US$'], ['Income', m2(sales)], ['Expenses', m2(expenses)], ['Net', m2(sales - expenses)]]
    },
    'Expenses by category': () => { const m = {}; s.exps.filter((x) => x.status !== 'pending' && x.status !== 'rejected').forEach((x) => { const k = x.cat || 'Other'; m[k] = (m[k] || 0) + (+x.amount || 0) }); return [['Category', 'Total cost (US$)'], Object.entries(m).map(([k, v]) => [k, m2(v)])] },
    'Expenses by enterprise': () => { const m = {}; s.exps.filter((x) => x.status !== 'pending' && x.status !== 'rejected').forEach((x) => { const k = entName(x.ent); m[k] = (m[k] || 0) + (+x.amount || 0) }); return [['Enterprise', 'Total cost (US$)'], Object.entries(m).map(([k, v]) => [k, m2(v)])] },
    'Expenses by Cost Center': () => {
      const m = Object.fromEntries((s.dt.costcenter || []).map((center) => [center.id, { name: (center.farm ? center.farm + ' · ' : '') + center.name, count: 0, amount: 0 }]))
      s.exps.filter((x) => x.status !== 'pending' && x.status !== 'rejected').forEach((x) => {
        const key = x.costCenterId || 'unassigned', row = (m[key] = m[key] || { name: key === 'unassigned' ? 'Unassigned' : key, count: 0, amount: 0 })
        row.count++; row.amount += +x.amount || 0
      })
      return [['Cost center', 'Expenses', 'Total cost (US$)'], Object.values(m).map((row) => [row.name, row.count, m2(row.amount)])]
    },
    'Expenses by Project': () => {
      const m = Object.fromEntries((s.dt.project || []).map((project) => [project.id, { name: project.name, count: 0, amount: 0 }]))
      s.exps.filter((x) => x.status !== 'pending' && x.status !== 'rejected').forEach((x) => {
        const key = x.projectId || 'unassigned', row = (m[key] = m[key] || { name: key === 'unassigned' ? 'Unassigned' : key, count: 0, amount: 0 })
        row.count++; row.amount += +x.amount || 0
      })
      return [['Project', 'Expenses', 'Total cost (US$)'], Object.values(m).map((row) => [row.name, row.count, m2(row.amount)])]
    },
    'Cash Flow': () => {
      const sales = sum(s.sales, (x) => (x.qty || 0) * (x.price || 0))
      const expenses = sum(s.exps.filter((x) => x.status !== 'pending' && x.status !== 'rejected'), (x) => +x.amount || 0)
      const stock = sum(s.stock, (x) => (x.qty || 0) * (x.avg || 0))
      const receivablesTotal = sum(receivables(s), (x) => x.amount)
      const payablesTotal = sum(payables(s), (x) => x.amount)
      return [['Item', 'US$'], ['Sales income', m2(sales)], ['Operating expenses', m2(expenses)], ['Stock value', m2(stock)], ['Receivables', m2(receivablesTotal)], ['Payables', m2(payablesTotal)], ['Net position', m2(sales - expenses)]]
    },
    'Trial Balance': () => {
      const rows = leafAccounts.map((account) => { const balance = accountNet(account); return [account.no + ' ' + account.name, m2(Math.max(0, balance)), m2(Math.max(0, -balance))] }).filter((row) => +row[1] || +row[2])
      return [['Account', 'Debit', 'Credit'], ...rows, ['Total', m2(sum(rows, (row) => +row[1])), m2(sum(rows, (row) => +row[2]))]]
    }
    ,
    'Balance Sheet': () => {
      const assets = accountTotal('Asset'), liabilities = -accountTotal('Liability'), equity = -accountTotal('Equity'), profit = -accountTotal('Income') - accountTotal('Expense')
      return [['Item', 'US$'], ['Assets', ''], ...sectionRows('Asset'), ['Total assets', m2(assets)], ['Liabilities', ''], ...sectionRows('Liability', true), ['Total liabilities', m2(liabilities)], ['Equity', ''], ...sectionRows('Equity', true), ['Profit / loss', m2(profit)], ['Net worth', m2(liabilities + equity + profit)]]
    },
    'Profit and Loss Statement': () => {
      const income = sectionRows('Income', true), expenses = sectionRows('Expense')
      const totalIncome = -accountTotal('Income'), totalExpenses = accountTotal('Expense')
      return [['Account', 'US$'], ['Income', ''], ...income, ['Total income', m2(totalIncome)], ['Expenses', ''], ...expenses, ['Total expenses', m2(totalExpenses)], ['Net profit / (loss)', m2(totalIncome - totalExpenses)]]
    },
    'Budget Variance Report': () => [['Enterprise', 'Budget', 'Actual', 'Variance'], compute(s).filter((e) => e.type !== 'overhead').map((e) => [e.name, m2(e.budget), m2(e.direct), m2(e.budget - e.direct)])],
    'Farm management overview': () => [['Enterprise', 'Budget', 'Spent', 'Status', 'Profit'], compute(s).filter((e) => e.type !== 'overhead').map((e) => [e.name, m2(e.budget), m2(e.direct), e.st.label, m2(e.profit)])],
    'Purchase Analytics': () => {
      const m = {}
      docList('pinv').forEach((d) => { const supplier = d.party || 'Unknown'; const row = (m[supplier] = m[supplier] || [0, 0]); row[0]++; row[1] += docTotal(d) })
      return [['Supplier', 'Purchase Invoices', 'Purchase value (US$)'], Object.entries(m).sort((a, b) => b[1][1] - a[1][1]).map(([supplier, v]) => [supplier, v[0], m2(v[1])])]
    },
    'Purchase Register': () => [['Date', 'Invoice', 'Supplier', 'Currency', 'Total (US$)', 'Status'], docList('pinv').map((d) => [d.date || '-', d.no || '-', d.party || '-', d.cur || 'USD', m2(docTotal(d)), d.status])],
    'Livestock management summary': () => {
      const herd = s.herd.reduce((m, x) => { const key = x.type || 'Movement'; m[key] = (m[key] || 0) + (+x.head || 0); return m }, {})
      const bio = sum(s.bio, (x) => (x.qty || 0) * (x.fv || 0) * (1 - (x.cts || 0) / 100) - (x.cost || 0))
      return [['Report', 'Value / Qty'], ['Herd movements', Object.keys(herd).length ? Object.entries(herd).map(([k, v]) => `${k}: ${v}`).join(' | ') : 'No livestock movement data'], ['Biological assets value', m2(bio)]]
    },
    'Livestock production & health': () => {
      const animalName = (id) => dt('animal').find((a) => a.id === id)?.name || '-'
      const prod = dt('production').map((x) => [x.date || '-', animalName(x.animal), x.kind || 'Production', x.qty || 0, x.notes || '-'])
      const health = dt('health').map((x) => [x.date || '-', animalName(x.animal), x.kind || '-', x.cost ? m2(x.cost) : '-', x.notes || '-'])
      return [['Date', 'Animal', 'Type / Vet', 'Qty / Status', 'Detail'], ...prod.slice(0, 12), ...health.slice(0, 12)]
    },
    'Accounts Receivable': () => [AGEH, agingRows(docList('sinv')).map((r) => r.map((v, i) => (i ? m2(v) : v)))],
    'Accounts Payable': () => [AGEH, agingRows(docList('pinv')).map((r) => r.map((v, i) => (i ? m2(v) : v)))],
    'Stock Balance': () => [['Item', 'Qty', 'Avg cost', 'Value', 'Reorder level'], s.stock.map((i) => [i.name, i.qty, m2(i.avg), m2(i.qty * i.avg), i.reorder || '-'])],
    'Yield by field': () => [['Field', 'Area (ha)', 'Harvested', 'Yield per ha'], dt('field').map((f) => { const q = sum(dt('harvest').filter((h) => h.field === f.id), (h) => +h.qty || 0); return [f.name, f.area || '-', q, f.area ? m2(q / f.area) : '-'] })],
    'Tasks by assignee': () => { const m = {}; dt('task').forEach((t) => { const k = users.find((u) => u.id === t.assignee)?.name || 'Unassigned'; (m[k] = m[k] || { Open: 0, 'In progress': 0, Done: 0 })[t.status]++ }); return [['Assignee', 'Open', 'In progress', 'Done'], Object.entries(m).map(([k, v]) => [k, v.Open, v['In progress'], v.Done])] },
    'Equipment service due': () => [['Equipment', 'Next service', 'Status'], equipDue(s).map((x) => [x.e.name, x.next, x.e.status])],
    'Maintenance cost by equipment': () => { const m = {}; dt('maintenance').forEach((x) => (m[name('equipment', x.equipment)] = (m[name('equipment', x.equipment)] || 0) + (+x.cost || 0))); return [['Equipment', 'Total cost (US$)'], Object.entries(m).map(([k, v]) => [k, m2(v)])] },
    ...(user.role === 'admin' ? { 'Users by role': () => { const m = {}; users.forEach((u) => (m[ROLES[u.role]] = (m[ROLES[u.role]] || 0) + 1)); return [['Role', 'Users'], Object.entries(m)] } } : {}),
  }
  const keys = Object.keys(R)
  const [k, setK] = useState(keys[0])
  const [head, rows] = R[k]()
  const reportSources = {
    'Sales Analytics': 'Sales Invoice, Credit Note', 'Sales Register': 'Sales Invoice, Credit Note', 'Sales Order Trends': 'Sales Order', 'Enterprise profitability': 'Enterprise, Farm Sales & Expense ledger',
    'Gross Profit': 'Farm Sales & Expense ledger', 'Income & Expenditure': 'Farm Sales & Expense ledger', 'Expenses by category': 'Farm Expense ledger',
    'Expenses by enterprise': 'Farm Expense ledger, Enterprise', 'Cash Flow': 'Farm Sales, Expense & Stock ledgers', 'Trial Balance': 'Farm accounting ledger',
    'Balance Sheet': 'Farm accounting ledger, Stock, Fixed Assets', 'Profit and Loss Statement': 'Farm accounting ledger', 'Budget Variance Report': 'Enterprise, Farm Expense ledger',
    'Farm management overview': 'Enterprise, Farm Expense ledger', 'Expenses by Cost Center': 'Cost Center, Farm Expense ledger', 'Expenses by Project': 'Project, Farm Expense ledger', 'Purchase Analytics': 'Purchase Invoice', 'Purchase Register': 'Purchase Invoice',
    'Livestock management summary': 'Animal, Herd Movement, Biological Asset', 'Livestock production & health': 'Production Record, Health Record',
    'Accounts Receivable': 'Sales Invoice', 'Accounts Payable': 'Purchase Invoice', 'Stock Balance': 'Stock Item', 'Yield by field': 'Field, Harvest Record',
    'Tasks by assignee': 'Task', 'Equipment service due': 'Equipment, Maintenance Log', 'Maintenance cost by equipment': 'Maintenance Log',
    'Users by role': 'User',
  }
  const reportGroups = [
    { title: 'Accounting', items: ['Trial Balance', 'Balance Sheet', 'Profit and Loss Statement', 'Accounts Receivable', 'Accounts Payable', 'Cash Flow', 'Gross Profit', 'Income & Expenditure', 'Expenses by Cost Center', 'Expenses by Project'] },
    { title: 'Selling', items: ['Sales Analytics', 'Sales Register', 'Sales Order Trends'] },
    { title: 'Buying', items: ['Purchase Analytics', 'Purchase Register', 'Expenses by category', 'Expenses by enterprise'] },
    { title: 'Stock', items: ['Stock Balance'] },
    { title: 'Agriculture', items: ['Enterprise profitability', 'Farm management overview', 'Budget Variance Report', 'Yield by field', 'Livestock management summary', 'Livestock production & health'] },
    { title: 'Operations', items: ['Tasks by assignee', 'Equipment service due', 'Maintenance cost by equipment', ...(user.role === 'admin' ? ['Users by role'] : [])] },
  ].map((group) => ({ ...group, items: group.items.filter((item) => Object.prototype.hasOwnProperty.call(R, item)) })).filter((group) => group.items.length)
  return (
    <div className="page">
      <div className="page-head"><div><h1>Reports</h1><p className="muted">Select a report to preview it, then export or print.</p></div>
        <div className="filters"><button className="btn" onClick={() => csv(head, rows, k.replace(/\W+/g, '-').toLowerCase())}>Export CSV</button><button className="btn" onClick={() => window.print()}>Print</button></div></div>
      {reportGroups.map((group) => <section className="report-group" key={group.title}>
        <h2>{group.title}</h2>
        <div className="report-grid">{group.items.map((item) => <button key={item} type="button" className={'report-card' + (k === item ? ' active' : '')} onClick={() => setK(item)} aria-pressed={k === item}>
          <strong>{item}</strong><span>{reportSources[item] || 'Farm records'}</span>
        </button>)}</div>
      </section>)}
      <div className="card scroll"><h3>{k}</h3><table className="tbl"><thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>
        {!rows.length && <p className="muted">No data for this report yet.</p>}</div>
    </div>
  )
}

export function Activity({ s }) {
  return (
    <div className="page"><h1>Activity log</h1>
      <div className="card scroll"><table className="tbl"><thead><tr><th>When</th><th>Who</th><th>What</th></tr></thead><tbody>
        {(s.log || []).map((a) => <tr key={a.id}><td>{a.ts.slice(0, 16).replace('T', ' ')}</td><td>{a.who}</td><td>{a.text}</td></tr>)}</tbody></table>
        {!(s.log || []).length && <p className="muted">Nothing logged yet.</p>}</div></div>
  )
}
