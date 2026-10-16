import { fmtUSD } from '../data/seed.js'
import { compute, finance, sum, today, addDays, liveSales, receivables, payables } from '../data/store.js'
import { gl } from '../data/ledger.js'
import { equipDue } from '../data/doctypes.js'
import { carry } from '../data/agri.js'
import { HOMES } from '../data/modules.js'
import { PageHead, NCards, MiniChart } from './ui.jsx'

const months = (n) => Array.from({ length: n }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - (n - 1 - i)); return d.toISOString().slice(0, 7) })
const series = (rows, dateOf, valOf) => months(6).map((m) => [m.slice(5), sum(rows.filter((r) => (dateOf(r) || '').startsWith(m)), valOf)])

// ERPNext-style module workspace: number cards, an analysis chart and columns of links.
export default function ModuleHome({ mod, s, go }) {
  const dt = (k) => s.dt[k] || [], t = today(), ym = t.slice(0, 7), yr = t.slice(0, 4), docs = (k) => (s.docs || {})[k] || []
  const sales = liveSales(s), ok = s.exps.filter((x) => x.status !== 'pending' && x.status !== 'rejected' && !x.stock)
  const E = compute(s), F = finance(s, E), f2 = (n) => fmtUSD(n)
  let cards = [], chart = null
  if (mod === 'Selling') {
    cards = [['Sales this month', f2(sum(sales.filter((x) => x.date.startsWith(ym)), (x) => x.qty * x.price)), 'farm:sales'], ['Annual sales', f2(sum(sales.filter((x) => x.date.startsWith(yr)), (x) => x.qty * x.price)), 'farm:sales'], ['Customers owe', f2(sum(receivables(s), (x) => x.amount)), 'farm:fin'], ['Open quotations', docs('quote').length, 'erp:sales:quote'], ['Orders to action', s.orders.filter((o) => o.status === 'pending').length, 'orders']]
    chart = <MiniChart title="Sales (last 6 months)" sub="Approved sales, US$" data={series(sales, (x) => x.date, (x) => x.qty * x.price)} />
  } else if (mod === 'Buying') {
    cards = [['Spend this month', f2(sum(ok.filter((x) => x.date.startsWith(ym)), (x) => x.amount)), 'farm:exp'], ['Owed to suppliers', f2(sum(payables(s), (x) => x.amount)), 'farm:fin'], ['Open purchase orders', docs('po').length, 'erp:buy:po'], ['Pending requests', docs('pmreq').filter((d) => d.status === 'Pending approval').length, 'erp:buy:pmreq'], ['Suppliers', dt('supplier').length, 'dt:supplier']]
    chart = <MiniChart title="Purchases & expenses (last 6 months)" sub="Approved costs, US$" data={series(ok, (x) => x.date, (x) => x.amount)} />
  } else if (mod === 'Stock') {
    cards = [['Stock value', f2(sum(s.stock, (i) => i.qty * i.avg)), 'erp:stock:items'], ['Items', s.stock.length, 'erp:stock:items'], ['Low stock', s.stock.filter((i) => i.reorder > 0 && i.qty <= i.reorder).length, 'farm:stock'], ['Expired', s.stock.filter((i) => i.expiry && i.expiry <= t && i.qty > 0).length, 'erp:stock:expired'], ['Pending approvals', Object.entries(s.docs || {}).filter(([k]) => ['grv', 'mreq', 'issue', 'damaged', 'expired', 'recon'].includes(k)).flatMap(([, v]) => v).filter((d) => d.status === 'Pending approval').length, 'erp:stock:dash']]
  } else if (mod === 'Crops') {
    cards = [['Fields', dt('field').length, 'dt:field'], ['Area (ha)', sum(dt('field'), (f) => +f.area || 0), 'dt:field'], ['Active crop cycles', dt('crop').filter((c) => ['Planted', 'Growing'].includes(c.status)).length, 'dt:crop'], ['Harvest records', dt('harvest').length, 'dt:harvest'], ['Field operations', dt('operation').length, 'dt:operation']]
  } else if (mod === 'Livestock') {
    cards = [['Animals on hand', sum(dt('animal').filter((a) => a.status === 'Active'), (a) => +a.head || 1), 'dt:animal'], ['Treatments due (14 d)', dt('health').filter((h) => h.next && h.next <= addDays(t, 14)).length, 'dt:health'], ['Production records', dt('production').length, 'dt:production'], ['Biological assets', f2(sum(s.bio, carry)), 'farm:bio'], ['Grants & claims', (s.grants || []).length, 'agacc:grants']]
  } else if (mod === 'Farm Operations') {
    cards = [['Farm workers', s.workers.length, 'farm'], ['Attendance this month', s.att.filter((x) => (x.date || '').startsWith(ym)).length, 'farm']]
  } else if (mod === 'Assets') {
    cards = [['Fixed assets (book)', f2(F.nbv), 'farm:assets'], ['Equipment', dt('equipment').length, 'dt:equipment'], ['Service due', equipDue(s).length, 'dt:equipment'], ['Fuel this month (L)', sum(dt('fuel').filter((x) => (x.date || '').startsWith(ym)), (x) => +x.litres || 0), 'dt:fuel']]
  } else if (mod === 'Accounting') {
    const G = gl(s), inc = sum(G.filter((g) => g.acct.startsWith('4')), (g) => g.cr - g.dr), exp = sum(G.filter((g) => g.acct.startsWith('5')), (g) => g.dr - g.cr), bal = (a) => sum(G.filter((g) => g.acct === a), (g) => g.dr - g.cr)
    cards = [['Net profit (to date)', f2(inc - exp), 'acct:pl'], ['Cash', f2(bal('1110')), 'acct:gl'], ['Receivable', f2(bal('1120')), 'farm:fin'], ['Payable', f2(-bal('2110')), 'farm:fin'], ['Deferred grant income', f2(-bal('2140')), 'agacc:grants']]
  } else if (mod === 'Projects') {
    cards = [['Open tasks', dt('task').filter((x) => x.status !== 'Done').length, 'dt:task'], ['Done', dt('task').filter((x) => x.status === 'Done').length, 'dt:task']]
  }
  return (
    <div className="page mhome"><PageHead title={mod} />
      <NCards items={cards} go={go} />{chart}
      <div className="links3">{(HOMES[mod] || []).map(([h, links]) => <div key={h}><h4>{h}</h4>{links.map(([l, p]) => <button key={l} onClick={() => go(p)}>{l}</button>)}</div>)}</div>
    </div>
  )
}
