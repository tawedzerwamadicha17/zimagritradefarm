import { useState } from 'react'

// General guidance only. Always confirm local details with AGRITEX, Veterinary Services or your lender.
const A = [
  ['Crops', 'Conservation agriculture (Pfumvudza / Intwasa) basics', 'Prepare small, well-managed planting stations, keep the soil covered with mulch, and put fertiliser and manure where the plant needs it. Covering the soil and minimising tillage helps hold moisture and cuts erosion. Start on a plot you can manage well rather than a large area you cannot.'],
  ['Crops', 'Test your soil before buying fertiliser', 'A soil test shows pH and nutrient levels so you only buy what the field needs. Many sandy soils are acidic; if yours is, liming can make fertiliser work better. Ask your extension officer where to send samples.'],
  ['Crops', 'Rotate cereals with legumes', 'Following maize with soyabean, groundnuts or beans adds nitrogen to the soil and breaks pest and disease cycles. Keep a field-by-field record so you know what grew where each season.'],
  ['Crops', 'Safer grain storage', 'Dry grain well before storing (maize is commonly stored at about 12–13% moisture), clean the store, keep bags off the floor and away from walls, and use a registered grain protectant. Check regularly for weevils and damp.'],
  ['Livestock', 'Dipping and tick control', 'Follow the dipping schedule advised by your local Veterinary Services office and record every treatment. Report suspected notifiable diseases promptly.'],
  ['Livestock', 'Plan dry-season feed early', 'Veld quality drops in the dry season. Decide before it starts how much hay, silage or supplementary feed your herd needs, and budget for it so you are not buying at peak prices.'],
  ['Money', 'Price your produce properly', 'Check the GMB floor, recent ZMX results and farm-gate listings before agreeing a price, then add transport and handling to see what you really earn. Use the Cost Calculator to find your breakeven yield.'],
  ['Money', 'Keep records lenders and buyers trust', 'Record every expense and sale per enterprise in My Farm. Budgets, overrun alerts and reports make it easier to apply for finance and to see which enterprises make money. Support schemes and loans change each season — confirm eligibility and terms directly with the programme or lender.'],
  ['Machinery', 'Pre-season equipment checks', 'Before planting, check oil, filters, grease points, tyres and implement wear parts. Fixing a worn disc or tine in the workshop is far cheaper than a breakdown at planting time.'],
]
export default function Learn() {
  const [c, setC] = useState('All')
  return (
    <div className="page">
      <h1>Guides & tips</h1>
      <p className="muted">Short practical guides. They are general advice — confirm specifics with your AGRITEX officer, veterinarian or lender.</p>
      <div className="filters">{['All', 'Crops', 'Livestock', 'Money', 'Machinery'].map((x) => <button key={x} className={'btn sm' + (c === x ? ' primary' : '')} onClick={() => setC(x)}>{x}</button>)}</div>
      {A.filter((a) => c === 'All' || a[0] === c).map((a) => <details className="card" key={a[1]}><summary><b>{a[1]}</b> <span className="badge ok">{a[0]}</span></summary><p style={{ marginTop: '.6rem' }}>{a[2]}</p></details>)}
    </div>
  )
}
