export default function Footer({ go }) {
  const L = (l, p) => <li><button onClick={() => go(p)}>{l}</button></li>
  return (
    <footer className="zx-foot"><div className="zx-wrap">
      <div className="zx-fcols">
        <div><div className="zx-flogo"><span>🌾</span><b>AgriTrade</b><i>ZW</i></div><p>Linking Zimbabwean farmers and buyers with transparent prices, direct orders and farm management tools.</p></div>
        <div><h5>About AgriTrade</h5><ul>{L('About Us', 'about')}{L('Market Data', 'prices')}{L('Contact Us', 'contact')}</ul></div>
        <div><h5>Trade With Us</h5><ul>{L('Marketplace', 'marketplace')}{L('Log in', 'login')}{L('Create an account', 'login')}{L('Buyer requests', 'login')}</ul></div>
        <div><h5>Customer Service</h5><ul>{L('How it works', 'about')}{L('Contact Us', 'contact')}{L('Floor prices', 'prices')}</ul></div>
      </div>
      <p className="zx-note">Prices shown are indicative until live GMB and ZMX feeds are connected. Payments are arranged between buyer and seller.</p>
      <div className="zx-copy">AgriTrade ZW © 2026 / All Rights Reserved</div>
    </div></footer>
  )
}
