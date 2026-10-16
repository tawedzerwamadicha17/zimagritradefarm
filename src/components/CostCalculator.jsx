import { useMemo, useState } from 'react'
import { CROP_BUDGETS, gmbPrice, fmtUSD } from '../data/seed.js'

export default function CostCalculator() {
  const crops = Object.keys(CROP_BUDGETS)
  const [crop, setCrop] = useState('Maize')
  const [hectares, setHectares] = useState(1)
  const [expectedYield, setExpectedYield] = useState(3)
  const [prices, setPrices] = useState(() =>
    Object.fromEntries(
      Object.entries(CROP_BUDGETS).map(([c, items]) => [
        c,
        items.map((i) => i.unitPrice),
      ])
    )
  )

  const items = CROP_BUDGETS[crop]
  const unitPrices = prices[crop]

  const perHa = useMemo(
    () => items.reduce((sum, it, i) => sum + it.qty * unitPrices[i], 0),
    [items, unitPrices]
  )
  const total = perHa * hectares
  const floor = gmbPrice(crop)
  const breakevenYield = floor ? total / floor : null // tonnes needed to break even
  const revenue = floor ? expectedYield * hectares * floor : 0
  const profit = revenue - total

  const updatePrice = (idx, val) => {
    const next = [...unitPrices]
    next[idx] = Number(val) || 0
    setPrices({ ...prices, [crop]: next })
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Input Cost & Gross Margin Calculator</h1>
          <p className="muted">Know your cost per hectare and your breakeven yield before you plant — adjust prices to your local agro-dealer.</p>
        </div>
      </div>

      <div className="calc-grid">
        <section className="card">
          <h3>1 · Setup</h3>
          <label className="stack">Crop
            <select value={crop} onChange={(e) => setCrop(e.target.value)}>
              {crops.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="stack">Hectares
            <input type="number" min="0.1" step="0.1" value={hectares}
              onChange={(e) => setHectares(Math.max(0.1, Number(e.target.value)))} />
          </label>
          <label className="stack">Expected yield (tonnes/ha)
            <input type="number" min="0" step="0.1" value={expectedYield}
              onChange={(e) => setExpectedYield(Number(e.target.value))} />
          </label>

          <div className="results">
            <div className="result-row">
              <span>Cost per hectare</span>
              <strong>{fmtUSD(perHa)}</strong>
            </div>
            <div className="result-row">
              <span>Total cost ({hectares} ha)</span>
              <strong>{fmtUSD(total)}</strong>
            </div>
            {breakevenYield !== null && (
              <div className="result-row highlight">
                <span>Breakeven yield @ GMB floor</span>
                <strong>{breakevenYield.toFixed(2)} t/ha</strong>
              </div>
            )}
            {floor !== null && (
              <>
                <div className="result-row">
                  <span>Revenue @ GMB floor ({expectedYield} t/ha)</span>
                  <strong>{fmtUSD(revenue)}</strong>
                </div>
                <div className={profit >= 0 ? 'result-row profit' : 'result-row loss'}>
                  <span>{profit >= 0 ? 'Profit' : 'Loss'}</span>
                  <strong>{fmtUSD(Math.abs(profit))}</strong>
                </div>
              </>
            )}
          </div>
          {breakevenYield !== null && expectedYield > 0 && (
            <p className="muted small">
              {expectedYield >= breakevenYield
                ? '✅ At your expected yield you cover costs. Anything above the breakeven is margin.'
                : '⚠️ Your expected yield is below breakeven — cut input costs or target a higher yield.'}
            </p>
          )}
        </section>

        <section className="card">
          <h3>2 · Budget per hectare <span className="muted small">(edit unit prices)</span></h3>
          <table className="table">
            <thead>
              <tr><th>Input</th><th>Qty</th><th>Unit US$</th><th>Line total</th></tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={it.name}>
                  <td>{it.name}</td>
                  <td className="num">{it.qty} {it.unit}</td>
                  <td className="num">
                    <input
                      className="price-input"
                      type="number"
                      min="0"
                      value={unitPrices[i]}
                      onChange={(e) => updatePrice(i, e.target.value)}
                    />
                  </td>
                  <td className="num">{fmtUSD(it.qty * unitPrices[i])}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td colSpan="3"><strong>Total per hectare</strong></td>
                <td className="num"><strong>{fmtUSD(perHa)}</strong></td>
              </tr>
            </tbody>
          </table>
          <p className="muted small">
            Benchmark: a commercial maize hectare typically costs US$1,000–1,300 all-in,
            with breakeven around 3 t/ha at the GMB floor price.
          </p>
        </section>
      </div>
    </div>
  )
}
