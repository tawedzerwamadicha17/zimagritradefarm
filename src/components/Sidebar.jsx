import { useState } from 'react'
import { MODULES, HOMES, sideItems } from '../data/modules.js'
import Search from './Search.jsx'

export default function Sidebar({ s, users, user, page, go, badges, mod, onMod, logout }) {
  const [open, setOpen] = useState(false), [menu, setMenu] = useState(false)
  const mods = MODULES.filter(([g]) => sideItems(g, user.role, user.role === 'customer').length)
  const hasHome = (g) => HOMES[g] && ['farmer', 'admin'].includes(user.role)
  const items = sideItems(mod, user.role, user.role === 'customer'), notif = Object.values(badges).reduce((a, b) => a + (b || 0), 0)
  const pick = (g) => { setMenu(false); onMod(g); const f = hasHome(g) ? 'mod:' + g : sideItems(g, user.role)[0]?.id; go(f) }
  const nav = (id) => { go(id); setOpen(false) }
  return (
    <aside className={'sidebar' + (open ? ' open' : '')}>
      <button className="side-toggle" onClick={() => setOpen(!open)}>☰ {mod}</button>
      <div className="side-list">
        <div className="sw"><button className="sw-btn" onClick={() => setMenu(!menu)}><span>{mod}</span><span>⌄</span></button>
          {menu && <div className="sw-menu">
            <button onClick={() => { setMenu(false); go('workspace') }}>Home</button><hr />
            {mods.map(([g]) => <button key={g} className={g === mod ? 'on' : ''} onClick={() => pick(g)}>{g}</button>)}<hr />
            <button onClick={() => { setMenu(false); go('account') }}>My account · {user.name.split(' ')[0]}</button>
            <button onClick={() => { setMenu(false); logout() }}>Log out</button></div>}</div>
        <Search s={s} users={users} user={user} go={go} />
        <button className="side-item" onClick={() => nav('workspace')}><span className="ic">♢</span><span>Notification</span>{notif > 0 && <b className="count">{notif}</b>}</button>
        <hr className="side-sep" />
        {hasHome(mod) && <button className={'side-item' + (page === 'mod:' + mod ? ' active' : '')} onClick={() => nav('mod:' + mod)}><span className="ic">⌂</span><span>Home</span></button>}
        {items.map((i) => <button key={i.id} className={'side-item' + (page === i.id ? ' active' : '')} onClick={() => nav(i.id)}><span className="ic">{i.ic}</span><span>{i.label}</span>{badges[i.id] > 0 && <b className="count">{badges[i.id]}</b>}</button>)}
      </div>
    </aside>
  )
}
