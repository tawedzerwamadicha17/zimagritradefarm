import { useState } from 'react'
import { fmtUSD } from '../data/seed.js'
import { uid, today, sum } from '../data/store.js'
import { logAct } from '../data/doctypes.js'

const K = { pending: 'warn', confirmed: 'warn', dispatched: 'warn', delivered: 'ok', cancelled: 'over', declined: 'over' }
const NEXT = { pending: ['confirmed', 'Confirm'], confirmed: ['dispatched', 'Mark dispatched'], dispatched: ['delivered', 'Mark delivered'] }

export default function Orders({ s, set, user, go }) {
  const cust = user.role === 'customer'
  const cart = s.carts[user.id] || []
  const [f, setF] = useState({ address: '', phone: user.phone || '', pay: 'EcoCash', note: '' }), [err, setErr] = useState(''), [inv, setInv] = useState(null)
  const lines = cart.map((c) => ({ ...c, l: s.mk.find((x) => x.id === c.lid) }))
  const ok = lines.filter((x) => x.l)
  const total = sum(ok, (x) => x.qty * x.l.price)
  const setCart = (n) => set((p) => ({ carts: { ...p.carts, [user.id]: n } }))
  const qty = (lid, v) => setCart(cart.map((c) => (c.lid === lid ? { ...c, qty: +v } : c)))

  const place = () => {
    if (!ok.length) return setErr('Your cart is empty')
    if (!f.address.trim() || !f.phone.trim()) return setErr('Delivery address and phone are required')
    if (ok.some((x) => !(x.qty > 0) || x.qty > x.l.tonnes)) return setErr('Check quantities — some exceed what is available')
    setErr('')
    const by = {}
    ok.forEach((x) => { const k = x.l.owner || 'platform'; (by[k] = by[k] || []).push(x) })
    set((p) => ({
      orders: [...Object.values(by).map((g) => ({ id: uid(), date: today(), buyerId: user.id, buyer: user.name, sellerId: g[0].l.owner, seller: g[0].l.owner ? g[0].l.farmer : 'Platform listings', ...f, status: 'pending', lines: g.map((x) => ({ lid: x.lid, crop: x.l.crop, qty: x.qty, price: x.l.price })) })), ...p.orders],
      mk: p.mk.map((l) => { const x = ok.find((o) => o.lid === l.id); return x ? { ...l, tonnes: +(l.tonnes - x.qty).toFixed(2) } : l }),
      carts: { ...p.carts, [user.id]: [] },
    }))
    logAct(set, user, `Placed order worth ${fmtUSD(total)}`)
  }
  // cancelling / declining returns the stock to the listing
  const status0 = (o, st) => set((p) => ({
    orders: p.orders.map((x) => (x.id === o.id ? { ...x, status: st } : x)),
    mk: ['cancelled', 'declined'].includes(st) ? p.mk.map((l) => { const li = o.lines.find((z) => z.lid === l.id); return li ? { ...l, tonnes: +(l.tonnes + li.qty).toFixed(2) } : l }) : p.mk,
  }))
  const status = (o, st) => { status0(o, st); logAct(set, user, `Order ${o.id} → ${st}`) }
  const mine = s.orders.filter((o) => (cust ? o.buyerId === user.id : user.role === 'admin' ? true : o.sellerId === user.id))
  const tot = (o) => sum(o.lines, (l) => l.qty * l.price)
  const active = (o) => NEXT[o.status]

  return (
    <div className="page">
      <h1>{cust ? 'Cart & orders' : 'Incoming orders'}</h1>
      {cust && (
        <div className="card">
          <h3>My cart</h3>
          {!cart.length && <p className="muted">Your cart is empty. <button className="btn sm primary" onClick={() => go('marketplace')}>Browse marketplace</button></p>}
          {lines.map((x) => <div className="row" key={x.lid}>
            <span>{x.l ? <><b>{x.l.crop}</b> · {x.l.grade} · {fmtUSD(x.l.price)}/t · {x.l.district}</> : 'No longer available'}</span>
            <span>{x.l && <><input type="number" min="0.1" step="0.1" max={x.l.tonnes} value={x.qty} onChange={(e) => qty(x.lid, e.target.value)} style={{ width: 80 }} /> t = {fmtUSD(x.qty * x.l.price)} </>}<button className="btn sm" onClick={() => setCart(cart.filter((c) => c.lid !== x.lid))}>✕</button></span>
          </div>)}
          {!!ok.length && <>
            <p><b>Total: {fmtUSD(total)}</b></p>
            <div className="form-grid">
              <label>Delivery address<input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></label>
              <label>Phone<input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
              <label>Payment (arranged with seller)<select value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value })}>{['EcoCash', 'InnBucks', 'Cash on delivery', 'Bank transfer'].map((x) => <option key={x}>{x}</option>)}</select></label>
              <label>Note<input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
              <button className="btn primary" onClick={place}>Place order</button>
            </div>
            {err && <div className="alert over" style={{ marginTop: '.6rem' }}>{err}</div>}
            <p className="muted small">Orders are split per seller. No money moves through this app yet — you pay the seller using the method chosen.</p>
          </>}
        </div>
      )}
      {inv && <Invoice o={inv} total={tot(inv)} close={() => setInv(null)} />}
      <div className="card scroll">
        <h3>{cust ? 'My orders' : 'Orders'}</h3>
        {!mine.length && <p className="muted">No orders yet.</p>}
        {mine.map((o) => <div className="row" key={o.id}>
          <span><b>{o.lines.map((l) => `${l.qty} t ${l.crop}`).join(', ')}</b> — {fmtUSD(tot(o))}<br /><small className="muted">{o.date} · {cust ? 'from ' + o.seller : o.buyer + ' · ' + o.phone} · {o.address} · {o.pay}{o.note ? ' · ' + o.note : ''}</small></span>
          <span><span className={'badge ' + K[o.status]}>{o.status}</span>{' '}<button className="btn sm" onClick={() => setInv(o)}>Invoice</button>{' '}
            {!cust && active(o) && <button className="btn sm primary" onClick={() => status(o, NEXT[o.status][0])}>{NEXT[o.status][1]}</button>}{' '}
            {!cust && o.status === 'pending' && <button className="btn sm" onClick={() => status(o, 'declined')}>Decline</button>}
            {cust && o.status === 'pending' && <button className="btn sm" onClick={() => status(o, 'cancelled')}>Cancel</button>}
          </span>
        </div>)}
      </div>
    </div>
  )
}

function Invoice({ o, total, close }) {
  const print = () => { document.body.classList.add('print-inv'); window.print(); document.body.classList.remove('print-inv') }
  return (
    <div className="card invoice">
      <div className="row"><h3>Sales invoice INV-{o.id.toUpperCase()}</h3><span><button className="btn sm primary" onClick={print}>Print</button> <button className="btn sm" onClick={close}>Close</button></span></div>
      <p>Date: {o.date} · Status: {o.status}<br />Seller: {o.seller}<br />Buyer: {o.buyer} · {o.phone}<br />Deliver to: {o.address}</p>
      <table className="tbl"><thead><tr><th>Produce</th><th>Tonnes</th><th>Price / t</th><th>Amount</th></tr></thead><tbody>
        {o.lines.map((l, i) => <tr key={i}><td>{l.crop}</td><td>{l.qty}</td><td>{l.price.toFixed(2)}</td><td>{(l.qty * l.price).toFixed(2)}</td></tr>)}
        <tr><th colSpan="3">Total (US$)</th><th>{total.toFixed(2)}</th></tr></tbody></table>
      <p className="muted small">Payment method: {o.pay}. Payment is settled directly between buyer and seller.</p>
    </div>
  )
}
