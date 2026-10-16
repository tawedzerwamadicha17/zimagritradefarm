import { GMB_PRICES, fmtUSD } from '../data/seed.js'
import PriceBoard from './PriceBoard.jsx'

// Public "Market Data" page: reference prices next to what farmers are asking on the marketplace.
export default function Prices({ s, go }) {
  const L = s.mk.filter((l) => l.tonnes > 0)
  const rows = GMB_PRICES.map((g) => {
    const r = L.filter((l) => l.crop === g.crop), t = r.reduce((a, l) => a + l.tonnes, 0), fg = r.length ? r.reduce((a, l) => a + l.price * l.tonnes, 0) / t : 0
    return { ...g, n: r.length, t, fg, d: fg ? ((fg - g.price) / g.price) * 100 : null }
  })
  return (
    <div className="page">
      <div className="card scroll"><h3>Reference prices vs farm-gate listings (US$ per tonne)</h3>
        <table className="tbl"><thead><tr><th>Commodity</th><th>GMB price</th><th>Season</th><th>Listings</th><th>Tonnes available</th><th>Farm-gate average</th><th>Difference</th><th>Note</th></tr></thead><tbody>
          {rows.map((r) => <tr key={r.crop}><td><b>{r.crop}</b></td><td>{fmtUSD(r.price)}</td><td>{r.season}</td><td>{r.n}</td><td>{r.t}</td><td>{r.fg ? fmtUSD(Math.round(r.fg)) : '-'}</td><td>{r.d === null ? '-' : <span className={r.d < 0 ? 'red' : ''}>{r.d >= 0 ? '+' : ''}{r.d.toFixed(1)}%</span>}</td><td className="muted">{r.note}</td></tr>)}</tbody></table>
        <p className="muted small" style={{ padding: '0 1rem 1rem' }}>Indicative data. Farm-gate average is weighted by tonnes listed on the marketplace.</p></div>
      <PriceBoard />
      <div className="zx-center"><button className="zx-btn dark" onClick={() => go('marketplace')}>Browse produce on the marketplace</button></div>
    </div>
  )
}
