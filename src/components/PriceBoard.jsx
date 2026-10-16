import { GMB_PRICES, ZMX_TREND, fmtUSD } from '../data/seed.js'

export default function PriceBoard() {
  const max = Math.max(...ZMX_TREND.values)
  const min = Math.min(...ZMX_TREND.values)

  return (
    <div className="board-grid">
      <section className="card">
        <div className="card-head">
          <h2>GMB Producer Prices</h2>
          <span className="badge">Floor prices · {GMB_PRICES[0].season}</span>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Crop</th>
              <th>US$ / tonne</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {GMB_PRICES.map((g) => (
              <tr key={g.crop}>
                <td><strong>{g.crop}</strong></td>
                <td className="num">{fmtUSD(g.price)}</td>
                <td className="muted">{g.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">
          GMB is the buyer of last resort — private buyers (ZMX auctions, millers, traders)
          often pay above or below these floor prices.
        </p>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>ZMX Auction Trend</h2>
          <span className="badge amber">{ZMX_TREND.crop}</span>
        </div>
        <div className="chart">
          {ZMX_TREND.values.map((v, i) => (
            <div className="bar-wrap" key={i} title={ZMX_TREND.labels[i] + ': ' + fmtUSD(v) + '/MT'}>
              <div
                className="bar"
                style={{ height: (40 + ((v - min) / (max - min)) * 60) + '%' }}
              ></div>
              <span className="bar-label">{ZMX_TREND.labels[i]}</span>
            </div>
          ))}
        </div>
        <div className="chart-foot">
          <span>Low: {fmtUSD(min)}/MT</span>
          <span className="muted">{ZMX_TREND.source}</span>
          <span>High: {fmtUSD(max)}/MT</span>
        </div>
        <p className="muted small">
          Sell signal: when farm-gate offers sit below the ZMX average, consider storing
          and selling later, or selling through the ZMX instead.
        </p>
      </section>
    </div>
  )
}
