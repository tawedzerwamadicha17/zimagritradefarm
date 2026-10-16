import { today, addDays, sum } from '../data/store.js'
import { equipDue } from '../data/doctypes.js'

export default function FarmHome({ s, go }) {
  const d = (k) => s.dt[k] || [], t0 = today(), in14 = addDays(t0, 14), in30 = addDays(t0, 30), in90 = addDays(t0, 90), mo = t0.slice(0, 7)
  const ha = sum(d('field'), (f) => +f.area || 0), cyc = d('crop').filter((c) => ['Planted', 'Growing'].includes(c.status)), an = d('animal').filter((a) => a.status === 'Active')
  const sp = Object.entries(an.reduce((m, a) => { m[a.species] = (m[a.species] || 0) + (+a.head || 1); return m }, {}))
  const rain = sum(d('weather').filter((w) => w.date?.startsWith(mo)), (w) => +w.rain || 0)
  const vac = d('health').filter((h) => h.next && h.next <= in14).sort((a, b) => a.next.localeCompare(b.next))
  const od = d('task').filter((x) => x.status !== 'Done' && x.due && x.due < t0)
  const exp = [...d('field').filter((f) => f.lease && f.lease <= in90).map((f) => `Lease for ${f.name} expires ${f.lease}`), ...d('equipment').flatMap((e) => [e.ins && e.ins <= in30 && `Insurance for ${e.name} expires ${e.ins}`, e.lic && e.lic <= in30 && `Licence for ${e.name} expires ${e.lic}`]).filter(Boolean), ...d('supplier').filter((x) => x.clearance && x.clearance <= in30).map((x) => `${x.name}: tax clearance expires ${x.clearance}`)]
  const K = (n, l, to) => <div className="card stat" style={to ? { cursor: 'pointer' } : undefined} onClick={() => to && go(to)}><span className="stat-num">{n}</span><span className="muted">{l}</span></div>
  const L = (title, rows, to) => <div className="card"><h3>{title}</h3>{rows.length ? rows.slice(0, 8).map((r, i) => <div key={i} className="row"><span>{r}</span></div>) : <p className="muted">Nothing to show.</p>}{to && <button className="btn sm" onClick={() => go(to)}>Open</button>}</div>
  return (
    <div className="page"><div className="page-head"><div><h1>{s.cfg.farm} — Overview</h1><p className="muted">Today across fields, crops, livestock, equipment and contracts</p></div></div>
      <div className="stat-row">{K(d('field').length + ' · ' + ha.toFixed(1) + ' ha', 'Fields', 'dt:field')}{K(cyc.length, 'Active crop cycles', 'dt:crop')}{K(an.length ? sum(an, (a) => +a.head || 1) : 0, 'Livestock on hand', 'dt:animal')}{K(rain.toFixed(0) + ' mm', 'Rain this month', 'dt:weather')}{K(od.length, 'Overdue tasks', 'dt:task')}{K(sum(d('contract').filter((c) => c.status === 'Active'), (c) => (+c.qty || 0) - (+c.delivered || 0)), 'Contract qty still to deliver', 'dt:contract')}</div>
      <div className="two">
        {L('Growing now', cyc.map((c) => `${c.name} — ${c.crop}${c.harvest ? ', harvest ' + c.harvest + ' (' + Math.ceil((new Date(c.harvest) - new Date()) / 864e5) + ' days)' : ''}`), 'dt:crop')}
        {L('Livestock by species', sp.map(([k, v]) => `${k}: ${v} head`), 'dt:animal')}
        {L('Vaccinations / treatments due (14 days)', vac.map((h) => `${h.next} · ${h.kind} · ${h.product || ''}`), 'dt:health')}
        {L('Service due', equipDue(s).map((x) => `${x.e.name} — ${x.next}`), 'dt:equipment')}
        {L('Storage fill', d('storage').map((u) => `${u.name}: ${u.cap ? Math.round(((+u.qty || 0) / u.cap) * 100) : 0}% of ${u.cap || 0} t (${u.crop || 'empty'})`), 'dt:storage')}
        {L('Expiries to renew', exp)}
      </div>
    </div>
  )
}
