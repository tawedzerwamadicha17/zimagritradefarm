import { useMemo, useState } from 'react'
import { DEALERS, PROVINCES, fmtUSD } from '../data/seed.js'

export default function DealerLocator() {
  const [province, setProvince] = useState('All')

  const allInputs = useMemo(
    () => [...new Set(DEALERS.flatMap((d) => d.inputs.map((i) => i.name)))],
    []
  )

  const cheapest = useMemo(() => {
    const map = {}
    DEALERS.forEach((d) =>
      d.inputs.forEach((i) => {
        if (!map[i.name] || i.price < map[i.name].price) map[i.name] = { price: i.price, dealer: d.name }
      })
    )
    return map
  }, [])

  const dealers = province === 'All' ? DEALERS : DEALERS.filter((d) => d.province === province)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Find Cheap Farm Inputs</h1>
          <p className="muted">Agro-dealer prices reported by the community — highlighted rows show the cheapest source per product.</p>
        </div>
        <select value={province} onChange={(e) => setProvince(e.target.value)}>
          <option>All</option>
          {PROVINCES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>

      <div className="dealers-grid">
        {dealers.map((d) => (
          <div className="card dealer" key={d.id}>
            <div className="dealer-head">
              <strong>{d.name}</strong>
              {d.verified && <span className="badge green">✓ verified</span>}
            </div>
            <div className="muted small">📍 {d.district}, {d.province} · {d.phone}</div>
            <table className="table tight">
              <tbody>
                {d.inputs.map((i) => {
                  const isCheapest = cheapest[i.name] && cheapest[i.name].dealer === d.name
                  return (
                    <tr key={i.name} className={isCheapest ? 'cheapest' : ''}>
                      <td>{i.name}</td>
                      <td className="num">{fmtUSD(i.price)}</td>
                      {isCheapest && <td className="badge green">cheapest</td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="listing-actions">
              <a className="btn ghost" href={'tel:' + d.phone.replace(/\s/g, '')}>Call dealer</a>
            </div>
          </div>
        ))}
      </div>

      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Price comparison across dealers</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              {DEALERS.map((d) => <th key={d.id}>{d.name.split(' ')[0]}</th>)}
              <th>Cheapest</th>
            </tr>
          </thead>
          <tbody>
            {allInputs.map((name) => {
              const best = cheapest[name]
              return (
                <tr key={name}>
                  <td>{name}</td>
                  {DEALERS.map((d) => {
                    const row = d.inputs.find((i) => i.name === name)
                    const isMin = best && best.dealer === d.name
                    return (
                      <td key={d.id} className={isMin ? 'num cell-best' : 'num'}>
                        {row ? fmtUSD(row.price) : '—'}
                      </td>
                    )
                  })}
                  <td className="muted small">{best ? best.dealer + ' · ' + fmtUSD(best.price) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
