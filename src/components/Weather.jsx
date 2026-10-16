import { useEffect, useState } from 'react'

// Free Open-Meteo forecast API (no key). City coordinates are approximate.
const PLACES = { Harare: [-17.83, 31.05], Bulawayo: [-20.15, 28.58], Mutare: [-18.97, 32.67], Gweru: [-19.45, 29.82], Masvingo: [-20.07, 30.83], Bindura: [-17.3, 31.33], Chinhoyi: [-17.36, 30.2], Kadoma: [-18.33, 29.91], Rusape: [-18.53, 32.13], Chegutu: [-18.13, 30.15] }
const icon = (mm) => (mm >= 5 ? '🌧️' : mm >= 1 ? '🌦️' : '☀️')

export default function Weather() {
  const [city, setCity] = useState('Harare'), [d, setD] = useState(null), [err, setErr] = useState('')
  useEffect(() => {
    const [la, lo] = PLACES[city]; setD(null); setErr('')
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`)
      .then((r) => (r.ok ? r.json() : Promise.reject())).then(setD).catch(() => setErr('Could not load the forecast. Check your internet connection and try again.'))
  }, [city])
  const rain = d ? d.daily.precipitation_sum : []
  return (
    <div className="page">
      <div className="page-head"><div><h1>Weather forecast</h1><p className="muted">7-day outlook by town (approximate, from Open-Meteo).</p></div>
        <select value={city} onChange={(e) => setCity(e.target.value)}>{Object.keys(PLACES).map((c) => <option key={c}>{c}</option>)}</select></div>
      {err && <div className="alert over">{err}</div>}
      {!d && !err && <p className="muted">Loading…</p>}
      {d && <>
        <div className="stat-row">
          <div className="card stat"><span className="stat-num">{Math.round(d.current.temperature_2m)}°C</span><span className="muted">Now in {city}</span></div>
          <div className="card stat"><span className="stat-num">{d.current.relative_humidity_2m}%</span><span className="muted">Humidity</span></div>
          <div className="card stat"><span className="stat-num">{d.current.wind_speed_10m} km/h</span><span className="muted">Wind</span></div>
          <div className="card stat"><span className="stat-num">{rain.reduce((a, b) => a + b, 0).toFixed(1)} mm</span><span className="muted">Rain, next 7 days</span></div>
        </div>
        <div className="days">{d.daily.time.map((t, i) => <div className="day" key={t}>
          <b>{new Date(t).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</b>
          <div style={{ fontSize: '1.6rem' }}>{icon(rain[i])}</div>
          <div>{Math.round(d.daily.temperature_2m_max[i])}° / {Math.round(d.daily.temperature_2m_min[i])}°</div>
          <small className="muted">{rain[i]} mm</small></div>)}</div>
      </>}
    </div>
  )
}
