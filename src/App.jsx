import { useState } from 'react'
import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import Search from './components/Search.jsx'
import { PageBanner } from './components/ui.jsx'
import Prices from './components/Prices.jsx'
import Home from './components/Home.jsx'
import About from './components/About.jsx'
import Contact from './components/Contact.jsx'
import Auth from './components/Auth.jsx'
import Workspace from './components/Workspace.jsx'
import Doctype from './components/Doctype.jsx'
import Reports, { Activity } from './components/Reports.jsx'
import Dashboard from './components/Dashboard.jsx'
import Marketplace from './components/Marketplace.jsx'
import CostCalculator from './components/CostCalculator.jsx'
import DealerLocator from './components/DealerLocator.jsx'
import Farm from './components/Farm.jsx'
import Erp from './components/Erp.jsx'
import ModuleHome from './components/ModuleHome.jsx'
import Accounts from './components/Accounts.jsx'
import AgriAcc from './components/AgriAcc.jsx'
import FarmHome from './components/FarmHome.jsx'
import Trade from './components/Trade.jsx'
import Orders from './components/Orders.jsx'
import Weather from './components/Weather.jsx'
import Community from './components/Community.jsx'
import Learn from './components/Learn.jsx'
import Account from './components/Account.jsx'
import Admin from './components/Admin.jsx'
import Footer from './components/Footer.jsx'
import { useStore } from './data/store.js'
import { useAuth } from './data/auth.js'
import { DT, equipDue } from './data/doctypes.js'
import { find, MODULES, sideItems } from './data/modules.js'

// Public pages need no login. Everything else is limited to the listed roles.
const PUBLIC = ['home', 'marketplace', 'about', 'contact', 'login', 'prices']
const BANNER = { marketplace: 'Marketplace', about: 'About Us', contact: 'Contact Us', login: 'Sign In', prices: 'Market Data' }
const ALL = ['farmer', 'foreman', 'customer', 'admin'], FA = ['farmer', 'admin'], FCA = ['farmer', 'customer', 'admin']
const ACCESS = { workspace: ALL, mod: FA, dashboard: FCA, trade: FCA, orders: FCA, calculator: FA, dealers: FA, farm: ['farmer', 'foreman', 'admin'], erp: FA, acct: FA, agacc: FA, farmhome: FA, reports: FA, weather: ALL, community: ALL, learn: ALL, account: ALL, admin: ['admin'], activity: ['admin'] }
const base = (p) => p.split(':')[0]

export default function App() {
  const auth = useAuth()
  const [s, set] = useStore()
  const [nav, setNav] = useState({ page: 'home', q: '' }), [modSel, setModSel] = useState('')
  const { user } = auth
  const go = (page, q = '') => { setNav({ page, q }); window.scrollTo(0, 0) }
  const ok = PUBLIC.includes(nav.page) || (user && (nav.page.startsWith('dt:') ? !!DT[nav.page.slice(3)]?.access[user.role] : ACCESS[base(nav.page)]?.includes(user.role)))
  const cur = ok ? nav.page : 'login', role = user?.role

  const badges = user ? {
    orders: s.orders.filter((o) => (role === 'customer' ? o.buyerId === user.id && o.status === 'dispatched' : (role === 'admin' || o.sellerId === user.id) && o.status === 'pending')).length,
    'dt:task': (s.dt.task || []).filter((t) => t.status !== 'Done' && (role === 'foreman' ? t.assignee === user.id : true)).length,
    admin: s.msgs.filter((m) => !m.read).length, 'dt:equipment': equipDue(s).length,
  } : {}
  const crumb = user && find(cur)
  const modOf = cur.startsWith('mod:') ? cur.slice(4) : find(cur)?.[0]
  const mod = (modOf && sideItems(modOf, role || 'farmer').length ? modOf : modSel) || (user && MODULES.find(([g]) => sideItems(g, role).length)?.[0]) || 'Home'

  const content = (
    <>
      {cur === 'home' && <Home s={s} user={user} go={go} />}
      {cur === 'marketplace' && <Marketplace s={s} set={set} user={user} go={go} />}
      {cur === 'prices' && <Prices s={s} go={go} />}
      {cur === 'about' && <About go={go} />}
      {cur === 'contact' && <Contact s={s} set={set} user={user} />}
      {cur === 'login' && <Auth auth={auth} go={go} />}
      {cur.startsWith('mod:') && <ModuleHome mod={cur.slice(4)} s={s} go={go} />}
      {cur === 'workspace' && <Workspace s={s} user={user} users={auth.users} go={go} />}
      {cur.startsWith('dt:') && <Doctype key={cur + nav.q} type={cur.slice(3)} s={s} set={set} user={user} users={auth.users} q0={nav.q} />}
      {base(cur) === 'farm' && <Farm key={cur} tab0={cur.split(':')[1]} s={s} set={set} role={role} />}
      {base(cur) === 'erp' && <Erp key={cur} mod={cur.split(':')[1]} tab0={cur.split(':')[2]} s={s} set={set} user={user} users={auth.users} />}
      {cur === 'farmhome' && <FarmHome s={s} go={go} />}
      {base(cur) === 'agacc' && <AgriAcc key={cur} tab0={cur.split(':')[1]} s={s} set={set} />}
      {base(cur) === 'acct' && <Accounts key={cur} tab0={cur.split(':')[1]} s={s} set={set} user={user} />}
      {cur === 'reports' && <Reports s={s} user={user} users={auth.users} />}
      {cur === 'activity' && <Activity s={s} />}
      {cur === 'dashboard' && <Dashboard role={role === 'customer' ? 'customer' : 'farmer'} setPage={go} />}
      {cur === 'calculator' && <CostCalculator />}
      {cur === 'dealers' && <DealerLocator />}
      {cur === 'trade' && <Trade s={s} set={set} role={role === 'customer' ? 'buyer' : role} user={user} />}
      {cur === 'orders' && <Orders s={s} set={set} user={user} go={go} />}
      {cur === 'weather' && <Weather />}
      {cur === 'community' && <Community s={s} set={set} user={user} />}
      {cur === 'learn' && <Learn />}
      {cur === 'account' && <Account auth={auth} />}
      {cur === 'admin' && <Admin s={s} set={set} auth={auth} />}
    </>
  )
  return (
    <div className={'app' + (user ? ' desk-app' : '')}>
      {!user && <Header user={user} page={cur} go={go} logout={() => { auth.logout(); go('home') }} search={null} />}
      {user ? (
        <div className="shell">
          <Sidebar s={s} users={auth.users} user={user} page={cur} go={go} badges={badges} mod={mod} onMod={setModSel} logout={() => { auth.logout(); go('home') }} />
          <div className="desk">{content}</div>
        </div>
      ) : cur === 'home' ? content : <>{BANNER[cur] && <PageBanner title={BANNER[cur]} go={go} />}<main>{content}</main></>}
      {!user && <Footer go={go} />}
    </div>
  )
}
