import { useEffect, useState } from 'react'
import { GMB_PRICES, fmtUSD } from '../data/seed.js'
import { HOME } from '../data/auth.js'
import VoiceOver from './VoiceOver.jsx'

const SLIDES = [
  ['Zimbabwe\'s farm-to-buyer marketplace', 'Linking farmers and buyers in every province', 'marketplace', 'one'],
  ['Know the price before you sell', 'GMB floor prices and ZMX auction trends, side by side with live farm-gate listings', 'prices', 'two'],
  ['Run your whole farm in one place', 'Records, stock, costs and accounts, working even when the network drops', 'login', 'three'],
]
const FARM_IMAGES = [
  ['/green-maize.jpg', 'Green maize cobs growing in the field', 'Green maize'],
  ['/wheat-sunset.jpg', 'Wheat field in warm sunset light', 'Wheat'],
  ['/green-bananas.jpg', 'Bunches of green bananas growing on a tree', 'Bananas'],
  ['/cattle.jpg', 'Cattle and goats grazing together', 'Cattle'],
  ['/sheep-field.jpg', 'Sheep and lamb grazing in a field', 'Sheep'],
  ['/cattle-goats.jpg', 'Cattle and goats grazing together', 'Cattle & goatss'],
  ['/maize.jpg', 'Maize plants growing in a field', 'Maize'],
  ['/harvest.jpg', 'Growing maize in a field', 'Harvest'],
  ['/beans.jpg', 'Man in the beans field', 'Beans'],
  ['/sorghum.jpg', 'Cows grazing in a field', 'Sorghum'],
]

export default function Home({ s, user, go }) {
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 6500); return () => clearInterval(t) }, [])
  const L = s.mk.filter((l) => l.tonnes > 0), tonnes = L.reduce((a, l) => a + l.tonnes, 0)
  const fg = (crop) => { const r = L.filter((l) => l.crop === crop); return r.length ? r.reduce((a, l) => a + l.price, 0) / r.length : 0 }
  const tick = GMB_PRICES.map((g) => ({ ...g, fg: fg(g.crop), d: fg(g.crop) ? ((fg(g.crop) - g.price) / g.price) * 100 : 0 }))
  const maize = fg('Maize'), me = user ? () => go(HOME[user.role]) : () => go('login')
  const SERV = [['Marketplace', 'Browse produce by crop and province and order direct from the farmer.', 'Browse produce', 'marketplace', '🛒'], ['Buyer Requests', 'Post what you need and let farmers quote you.', 'Take the first step', user ? 'trade' : 'login', '📨'], ['Market Data', 'GMB floor prices, ZMX auction trend and farm-gate averages in one view.', 'Find out more', 'prices', '📈'], ['Farm Management', 'Fields, crops, livestock, stock, operating costs and accounts for your farm.', 'Learn more', user ? 'farmhome' : 'login', '🚜']]
  const STEPS = [['Register', 'login'], ['List My Produce', user ? 'marketplace' : 'login'], ['Buy Produce', 'marketplace'], ['Track My Order', user ? 'orders' : 'login'], ['Check Market Prices', 'prices']]
  const [t, h, p, k] = SLIDES[i]
  return (
    <div className="zx-home">
      <VoiceOver />
      <section className={'zx-hero ' + k}><img className="zx-hero-photo" src="/farm-family-sunset.jpg" alt="A mother and son together in a sorghum field at sunset" /><div className="zx-wrap zx-hero-in" key={i}>
        <h2>{t}</h2><p className="zx-sub">{h}</p><p className="zx-lead">{k === 'one' ? 'Fair prices for farmers, direct sourcing for buyers.' : k === 'two' ? 'Sell at the right price, buy with confidence.' : 'From planting records to the general ledger.'}</p>
        <button className="zx-btn" onClick={() => go(p)}>Find out more</button></div>
        <button className="zx-arrow l" onClick={() => setI((i + SLIDES.length - 1) % SLIDES.length)} aria-label="previous">‹</button><button className="zx-arrow r" onClick={() => setI((i + 1) % SLIDES.length)} aria-label="next">›</button>
        <div className="zx-dots">{SLIDES.map((_, n) => <button key={n} className={n === i ? 'on' : ''} onClick={() => setI(n)} aria-label={'slide ' + (n + 1)} />)}</div></section>

      <div className="zx-ticker"><div className="zx-track">{[0, 1].map((r) => <div key={r} className="zx-tick-set">{tick.map((x) => <span key={x.crop + r}><b>{x.crop.toUpperCase()}</b> GMB {fmtUSD(x.price)} / t{x.fg ? <> · farm-gate {fmtUSD(Math.round(x.fg))} <em className={x.d < 0 ? 'dn' : 'up'}>{x.d >= 0 ? '▲' : '▼'} {Math.abs(x.d).toFixed(1)}%</em></> : null}</span>)}</div>)}</div></div>

      <section className="zx-farm-life" aria-label="Farm crops and livestock"><div className="zx-wrap"><h3>Fields and livestock</h3><div className="zx-farm-grid">
        {FARM_IMAGES.map(([src, alt, label]) => <figure key={src}><img src={src} alt={alt} loading="lazy" /><figcaption>{label}</figcaption></figure>)}
      </div></div></section>

      <section className="zx-sec"><div className="zx-wrap"><h3 className="zx-h">Presenting products and services that are right for you</h3>
        <div className="zx-cards">{SERV.map(([a, b, c, pg, ic]) => <article key={a} className="zx-card"><span className="zx-ic">{ic}</span><h4>{a}</h4><p>{b}</p><button className="zx-more" onClick={() => go(pg)}>{c} →</button></article>)}</div></div></section>

      <section className="zx-sec alt"><div className="zx-wrap zx-how">
        <div><h3 className="zx-h left">How do I do it?</h3><ul className="zx-steps">{STEPS.map(([l, pg], n) => <li key={l}><button onClick={() => go(pg)}><span>{n + 1}</span>{l}</button></li>)}</ul></div>
        <div className="zx-stats"><div><b>{L.length}</b><span>Active listings</span></div><div><b>{tonnes} t</b><span>Produce available</span></div><div><b>{maize ? fmtUSD(Math.round(maize)) : '-'}</b><span>Avg farm-gate maize / t</span></div><div><b>{fmtUSD(GMB_PRICES[0].price)}</b><span>GMB maize floor / t</span></div></div></div></section>

      <section className="zx-sec zx-app"><div className="zx-wrap zx-app-in"><div><small>WORKS ON YOUR PHONE</small><h3 className="zx-h left light">Stay connected, enjoy peace of mind</h3>
        <p>Open AgriTrade in your phone's browser and choose “Add to home screen”. It keeps working offline in the field and syncs your records when the network returns.</p><button className="zx-btn" onClick={me}>{user ? 'Go to my portal' : 'Get started'}</button></div>
        <div className="zx-phone" aria-hidden="true"><i /><b>AgriTrade</b><span>Maize · US$340/t</span><span>Soyabean · US$560/t</span><span>Sugar beans · US$1,850/t</span></div></div></section>

      <section className="zx-sec"><div className="zx-wrap"><h3 className="zx-h">Your market information</h3>
        <div className="zx-news">{[...L].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map((l) => <article key={l.id} className="zx-post" onClick={() => go('marketplace')}><div className="zx-thumb">{l.crop}</div><div className="zx-pbody"><h4>{l.tonnes} t of {l.crop} available in {l.district}</h4><p>{l.grade} · {fmtUSD(l.price)}/t · {l.province}</p><small>{l.date}</small></div></article>)}
          {!L.length && <p className="muted">No listings yet. Farmers can list produce after signing in.</p>}</div>
        <div className="zx-center"><button className="zx-btn dark" onClick={() => go('marketplace')}>View all listings</button></div></div></section>
    </div>
  )
}
