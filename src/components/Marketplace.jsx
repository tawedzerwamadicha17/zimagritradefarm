import { useMemo, useState } from 'react'
import { PROVINCES, gmbPrice, fmtUSD } from '../data/seed.js'
import { uid, today } from '../data/store.js'

export default function Marketplace({ s, set, user, go }) {
  const [crop, setCrop] = useState('All'), [prov, setProv] = useState('All'), [sort, setSort] = useState('price-asc'), [show, setShow] = useState(false), [msg, setMsg] = useState('')
  const L = s.mk.filter((l) => l.tonnes > 0)
  const crops = ['All', ...new Set(L.map((l) => l.crop))]
  const rows = useMemo(() => {
    const r = L.filter((l) => (crop === 'All' || l.crop === crop) && (prov === 'All' || l.province === prov))
    return sort === 'price-asc' ? r.sort((a, b) => a.price - b.price) : sort === 'price-desc' ? r.sort((a, b) => b.price - a.price) : r.sort((a, b) => b.tonnes - a.tonnes)
  }, [s.mk, crop, prov, sort])

  const add = (l) => {
    const q = parseFloat(window.prompt(`How many tonnes of ${l.crop}? (max ${l.tonnes})`, Math.min(1, l.tonnes)))
    if (!q || q <= 0 || q > l.tonnes) return
    set((p) => {
      const c = p.carts[user.id] || [], ex = c.find((x) => x.lid === l.id)
      return { carts: { ...p.carts, [user.id]: ex ? c.map((x) => (x.lid === l.id ? { ...x, qty: Math.min(l.tonnes, +(x.qty + q).toFixed(2)) } : x)) : [...c, { lid: l.id, qty: q }] } }
    })
    setMsg(`${q} t of ${l.crop} added to your cart.`)
  }
  const publish = (e) => {
    e.preventDefault()
    const d = Object.fromEntries(new FormData(e.target))
    set((p) => ({ mk: [{ id: uid(), crop: d.crop, tonnes: +d.tonnes, grade: d.grade, district: d.district, province: d.province, farmer: user.name, phone: d.phone, price: +d.price, date: today(), owner: user.id }, ...p.mk] }))
    setShow(false)
  }
  const remove = (l) => window.confirm('Remove this listing?') && set((p) => ({ mk: p.mk.filter((x) => x.id !== l.id) }))
  const canSell = user?.role === 'farmer'

  return (
    <div className="page">
      <div className="page-head">
        <div><h1>Produce Marketplace</h1><p className="muted">Farm-gate listings across Zimbabwe — compare against GMB & ZMX before you buy or sell.</p></div>
        {canSell && <button className="btn primary" onClick={() => setShow(!show)}>{show ? 'Close' : '+ Sell produce'}</button>}
      </div>
      {!user && <div className="alert warn">Browsing is open to everyone. <button className="btn sm primary" onClick={() => go('login')}>Log in</button> to see seller contacts and place orders.</div>}
      {msg && <div className="alert warn">{msg} <button className="btn sm" onClick={() => go('orders')}>View cart</button></div>}

      {show && (
        <form className="card form-grid" onSubmit={publish}>
          <h3>New listing</h3>
          <label>Crop<select name="crop">{['Maize', 'Soyabean', 'Sunflower', 'Wheat', 'Sugar beans', 'Groundnuts'].map((c) => <option key={c}>{c}</option>)}</select></label>
          <label>Tonnes<input name="tonnes" type="number" min="0.5" step="0.5" required /></label>
          <label>Grade<input name="grade" placeholder="Grade A" required /></label>
          <label>District<input name="district" required /></label>
          <label>Province<select name="province" defaultValue={user.location}>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></label>
          <label>Phone<input name="phone" defaultValue={user.phone} required /></label>
          <label>Asking price (US$/tonne)<input name="price" type="number" min="1" required /></label>
          <div className="form-actions"><button className="btn primary">Publish listing</button></div>
        </form>
      )}

      <div className="filters">
        <select value={crop} onChange={(e) => setCrop(e.target.value)}>{crops.map((c) => <option key={c}>{c}</option>)}</select>
        <select value={prov} onChange={(e) => setProv(e.target.value)}><option>All</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="price-asc">Cheapest first</option><option value="price-desc">Most expensive first</option><option value="qty-desc">Largest quantity first</option></select>
        <span className="muted">{rows.length} listings</span>
      </div>

      <div className="listing-grid">
        {rows.map((l) => {
          const ref = gmbPrice(l.crop), diff = ref ? ((l.price - ref) / ref) * 100 : null
          return (
            <div className="card listing" key={l.id}>
              <div className="listing-top"><span className="crop-tag">{l.crop}</span><span className="muted small">{l.date}</span></div>
              <div className="listing-price">{fmtUSD(l.price)}<small>/tonne</small></div>
              {diff !== null && <div className={diff >= 0 ? 'diff up' : 'diff down'}>{diff >= 0 ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}% vs GMB floor ({fmtUSD(ref)})</div>}
              <ul className="listing-meta">
                <li>📦 {l.tonnes} tonnes · {l.grade}</li>
                <li>📍 {l.district}, {l.province}</li>
                <li>{user ? <>👤 {l.farmer} · {l.phone}</> : '👤 Log in to see seller details'}</li>
              </ul>
              <div className="listing-actions">
                {!user && <button className="btn primary" onClick={() => go('login')}>Log in to order</button>}
                {user?.role === 'customer' && <><button className="btn primary" onClick={() => add(l)}>Add to cart</button><a className="btn ghost" href={'tel:' + l.phone.replace(/\s/g, '')}>Call</a></>}
                {user && user.role !== 'customer' && <a className="btn ghost" href={'tel:' + l.phone.replace(/\s/g, '')}>Contact seller</a>}
                {(user?.role === 'admin' || (user && l.owner === user.id)) && <button className="btn ghost" onClick={() => remove(l)}>Remove</button>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
