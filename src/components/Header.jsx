import { useState } from 'react'

// ZMX-style public header: utility bar on top, logo + dropdown navigation below.
const NAV = [
  ['Home', 'home'],
  ['Marketplace', null, [['Browse Produce', 'marketplace'], ['Market Data', 'prices'], ['Sell My Produce', 'login']]],
  ['Trading', null, [['Market Place', 'marketplace'], ['Buyer Requests', 'login'], ['Floor Prices', 'prices']]],
  ['Market Data', 'prices'],
  ['Farm Tools', null, [['Farm Management', 'login'], ['Cost Calculator', 'login'], ['Weather & Advice', 'login']]],
  ['About Us', 'about'],
]

export default function Header({ page, go }) {
  const [open, setOpen] = useState(false), [dd, setDd] = useState('')
  const to = (p) => { go(p); setOpen(false); setDd('') }
  return (
    <header className="zx-head">
      <div className="zx-top"><div className="zx-wrap zx-top-in">
        <span className="zx-tag">Zimbabwe's farm-to-buyer marketplace</span>
        <nav><button onClick={() => to('contact')}>Contact Us</button><button onClick={() => to('about')}>About</button><button className="zx-signin" onClick={() => to('login')}>Sign In</button></nav>
      </div></div>
      <div className="zx-main"><div className="zx-wrap zx-main-in">
        <button className="zx-logo" onClick={() => to('home')}><span className="zx-mark">🌾</span><span><b>AgriTrade</b><i>ZW</i><small>Agricultural Marketplace</small></span></button>
        <button className="zx-burger" onClick={() => setOpen(!open)} aria-label="menu">☰</button>
        <nav className={'zx-nav' + (open ? ' open' : '')}>
          {NAV.map(([l, p, kids]) => kids
            ? <div key={l} className={'zx-dd' + (dd === l ? ' on' : '')} onMouseEnter={() => setDd(l)} onMouseLeave={() => setDd('')}>
                <button className="zx-link" onClick={() => setDd(dd === l ? '' : l)}>{l} ▾</button>
                <div className="zx-menu">{kids.map(([k, kp]) => <button key={k} onClick={() => to(kp)}>{k}</button>)}</div></div>
            : <button key={l} className={'zx-link' + (page === p ? ' active' : '')} onClick={() => to(p)}>{l}</button>)}
          <button className="zx-cta" onClick={() => to('login')}>Register / Log in</button>
        </nav>
      </div></div>
    </header>
  )
}
