export default function About({ go }) {
  return (
    <div className="page">
      <h1>About AgriTrade ZW</h1>
      <div className="card"><h3>Why we exist</h3><p>Zimbabwean farmers often sell without knowing the real market price, and buyers struggle to find reliable produce. AgriTrade ZW puts GMB floor prices, ZMX auction trends and live farm-gate listings side by side so both sides can trade with confidence.</p></div>
      <div className="two">
        <div className="card"><h3>For farmers & foremen</h3><p>List produce, receive orders and buyer requests, budget per enterprise, record expenses, and let your foreman capture daily work on their own login.</p></div>
        <div className="card"><h3>For customers</h3><p>Browse by crop and province, add produce to a cart, order directly from the farmer and follow the order through to delivery.</p></div>
      </div>
      <div className="card"><h3>Good to know</h3><p className="muted">Prices shown are indicative until live GMB/ZMX feeds are connected. Payments are arranged between buyer and seller for now; EcoCash/InnBucks escrow is planned.</p>
        <button className="btn primary" style={{ marginTop: '.8rem' }} onClick={() => go('contact')}>Get in touch</button></div>
    </div>
  )
}
