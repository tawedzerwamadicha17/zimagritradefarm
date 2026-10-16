import { fmtUSD } from '../data/seed.js'
import { compute, finance, sum } from '../data/store.js'
import { MODULES } from '../data/modules.js'
import { equipDue, sk } from '../data/doctypes.js'

// ERPNext-style workspace: number cards, shortcuts, my tasks and recent activity.
export default function Workspace({ s, user, users, go }) {
  const r = user.role, dt = (t) => s.dt[t] || []
  const tasks = dt('task').filter((t) => t.status !== 'Done' && (r === 'foreman' ? t.assignee === user.id : true))
  const orders = s.orders.filter((o) => (r === 'customer' ? o.buyerId === user.id : r === 'admin' || o.sellerId === user.id))
  const act = orders.filter((o) => ['pending', 'confirmed', 'dispatched'].includes(o.status)).length
  const live = s.mk.filter((l) => l.tonnes > 0), reqs = s.reqs.filter((x) => ['open', 'quoted'].includes(x.status))
  const F = r === 'farmer' || r === 'admin' ? finance(s, compute(s)) : null
  const low = s.stock.filter((i) => i.reorder > 0 && i.qty <= i.reorder).length
  const cards = {
    farmer: [['Active listings', live.filter((l) => l.owner === user.id).length, 'marketplace'], ['Orders to action', act, 'orders'], ['Open buyer requests', reqs.length, 'trade'], ['Open tasks', tasks.length, 'dt:task'], ['Field area (ha)', sum(dt('field'), (f) => +f.area || 0), 'dt:field'], ['Low stock items', low, 'farm:stock'], ['Receivables', F && fmtUSD(F.ar), 'farm:fin'], ['Equipment service due', equipDue(s).length, 'dt:equipment']],
    admin: [['Users', users.length, 'admin'], ['Unread messages', s.msgs.filter((m) => !m.read).length, 'admin'], ['Orders to action', act, 'orders'], ['Active listings', live.length, 'marketplace'], ['Community posts', s.posts.length, 'community'], ['Open tasks', tasks.length, 'dt:task'], ['Open buyer requests', reqs.length, 'trade'], ['Equipment service due', equipDue(s).length, 'dt:equipment']],
    foreman: [['My open tasks', tasks.length, 'dt:task'], ['Fields', dt('field').length, 'dt:field'], ['Harvest records', dt('harvest').length, 'dt:harvest'], ['Inspections', dt('inspection').length, 'dt:inspection']],
    customer: [['Cart lines', (s.carts[user.id] || []).length, 'orders'], ['Active orders', act, 'orders'], ['My open requests', s.reqs.filter((x) => x.buyer === user.name && !['fulfilled', 'declined'].includes(x.status)).length, 'trade'], ['Produce available', live.length, 'marketplace']],
  }[r]
  const short = MODULES.flatMap(([, it]) => it).filter((i) => i[3].includes(r) && i[0] !== 'workspace').slice(0, 10)
  return (
    <div className="page">
      <h1>Welcome, {user.name.split(' ')[0]}</h1>
      <div className="cards">{cards.map(([l, v, p]) => <button key={l} className="card ncard" onClick={() => go(p)}><span className="stat-num">{v}</span><span className="muted">{l}</span></button>)}</div>
      <div className="card"><h3>Shortcuts</h3><div className="filters">{short.map((i) => <button key={i[0]} className="btn" onClick={() => go(i[0])}>{i[2]} {r === 'customer' && i[4] ? i[4] : i[1]}</button>)}</div></div>
      <div className="two">
        {r !== 'customer' && <div className="card"><h3>{r === 'foreman' ? 'My tasks' : 'Open tasks'}</h3>
          {tasks.slice(0, 6).map((t) => <div key={t.id} className="row"><span>{t.title}{t.due && <small className="muted"> · due {t.due}</small>}</span><span className={'badge ' + sk(t.status)}>{t.status}</span></div>)}
          {!tasks.length && <p className="muted">No open tasks.</p>}<button className="btn sm" onClick={() => go('dt:task')}>All tasks →</button></div>}
        {(r === 'farmer' || r === 'admin') && <div className="card"><h3>Recent activity</h3>
          {(s.log || []).slice(0, 8).map((a) => <div key={a.id} className="row"><span>{a.text}<small className="muted"> · {a.who}</small></span><small className="muted">{a.ts.slice(5, 16).replace('T', ' ')}</small></div>)}
          {!(s.log || []).length && <p className="muted">Activity will appear here as records are created or updated.</p>}</div>}
      </div>
    </div>
  )
}
