import { LISTINGS, fmtUSD } from '../data/seed.js'
import PriceBoard from './PriceBoard.jsx'

export default function Dashboard({ role, setPage }) {
  const totalTonnes = LISTINGS.reduce((s, l) => s + l.tonnes, 0)
  const avgMaize = Math.round(
    LISTINGS.filter((l) => l.crop === 'Maize').reduce((s, l) => s + l.price, 0) /
      Math.max(1, LISTINGS.filter((l) => l.crop === 'Maize').length)
  )

  return (
    <div className="page">
      <div className={role === 'farmer' ? 'hero farmer' : 'hero customer'}>
        <h1>
          {role === 'farmer'
            ? 'Get the real price for your crop — not the middleman price.'
            : 'Source directly from Zimbabwean farmers.'}
        </h1>
        <p>
          {role === 'farmer'
            ? 'Compare GMB floor prices, ZMX auction results and live farm-gate offers before you sell. Find the cheapest inputs near you.'
            : 'Browse farm-gate listings by crop, district and price. Know the GMB floor and ZMX market rate before you negotiate.'}
        </p>
        <div className="hero-actions">
          <button className="btn primary" onClick={() => setPage('marketplace')}>
            {role === 'farmer' ? 'Sell produce' : 'Browse produce'}
          </button>
          <button className="btn ghost light" onClick={() => setPage('calculator')}>
            Calculate my costs
          </button>
        </div>
      </div>

      <div className="stat-row">
        <div className="card stat"><span className="stat-num">{LISTINGS.length}</span><span className="muted">Active listings</span></div>
        <div className="card stat"><span className="stat-num">{totalTonnes} t</span><span className="muted">Produce listed</span></div>
        <div className="card stat"><span className="stat-num">{fmtUSD(avgMaize)}/t</span><span className="muted">Avg farm-gate maize</span></div>
        <div className="card stat"><span className="stat-num">US$364.75/t</span><span className="muted">GMB maize floor</span></div>
      </div>

      <PriceBoard />
    </div>
  )
}
