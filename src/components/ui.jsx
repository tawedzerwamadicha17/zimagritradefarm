import { useState } from 'react'

// ---- ERPNext (Frappe v15) style building blocks shared across the desk ----
export const Ind = ({ k = 'warn', children }) => <span className={'badge ' + k}>{children}</span>

export function PageHead({ title, sub, children }) {
  return <div className="page-head"><div><h1>{title}</h1>{sub && <p className="muted">{sub}</p>}</div><div className="ph-actions">{children}</div></div>
}

// List page header: title left; List View pill, refresh, menu and primary "Add X" on the right.
export function ListHead({ title, addLabel, onAdd, children }) {
  const [k, setK] = useState(0)
  return <div className="page-head"><div><h1>{title}</h1></div>
    <div className="ph-actions">{children}<span className="pill">☰ List View ⌃</span><button className="btn icon" title="Refresh" onClick={() => setK(k + 1)}>⟳</button>{onAdd && <button className="btn primary" onClick={onAdd}>＋ Add {addLabel}</button>}</div></div>
}

export function Filters({ children, onClear }) {
  return <div className="filter-bar">{children}{onClear && <span className="fb-end"><button className="btn" onClick={onClear}>⛉ Filter <b>✕</b></button><span className="pill">⇅ Created On ⌄</span></span>}</div>
}

export function Empty({ label, hint, onCreate, extra }) {
  return <div className="empty"><div className="empty-ic">▤</div><b>No {label} created</b><p className="muted">{hint || 'Nothing here yet.'}</p>
    <div className="row" style={{ justifyContent: 'center' }}>{onCreate && <button className="btn" onClick={onCreate}>＋ Create</button>}{extra}</div></div>
}

export const Sec = ({ title, children, cols = 3 }) => <section className="fsec">{title && <h4 className="fsec-title">{title}</h4>}<div className="fcols" style={{ '--c': cols }}>{children}</div></section>
export const Wide = ({ children }) => <div style={{ gridColumn: '1/-1' }}>{children}</div>

// Form page: breadcrumb + status pill, tabs, Save. tabs = [[label, node], ...]
export function FormShell({ parent, title, status, statusKind = 'warn', tabs, onSave, saveLabel = 'Save', onClose, actions }) {
  const [t, setT] = useState(0), cur = tabs[Math.min(t, tabs.length - 1)]
  return <div className="formpage">
    <div className="page-head sticky"><div className="crumb2"><button className="link" onClick={onClose}>{parent}</button><span> / </span><b>{title}</b>{status && <Ind k={statusKind}>{status}</Ind>}</div>
      <div className="ph-actions">{actions}{onClose && <button className="btn" onClick={onClose}>Close</button>}{onSave && <button className="btn primary" onClick={onSave}>{saveLabel}</button>}</div></div>
    <div className="tabs">{tabs.map(([l], i) => <button key={l} className={'tab' + (i === t ? ' active' : '')} onClick={() => setT(i)}>{l}</button>)}</div>
    <div className="fbody">{cur[1]}</div></div>
}

// Collapsible "+ Add" panel so data-entry forms behave like ERPNext list → new form.
export function Adder({ label, children, start = false }) {
  const [open, setOpen] = useState(start)
  return <>
    <div className="ph-actions" style={{ justifyContent: 'flex-end' }}><button className={'btn' + (open ? '' : ' primary')} onClick={() => setOpen(!open)}>{open ? 'Close form' : '＋ Add ' + label}</button></div>
    {open && children}</>
}

export function NCards({ items, go }) {
  return <div className="ncards">{items.map(([l, v, p]) => <button key={l} className="ncard2" onClick={() => p && go && go(p)}><span className="nl">{l}</span><span className="nv">{v}</span></button>)}</div>
}

export function MiniChart({ title, sub, data, fmt = (v) => v.toFixed(0) }) {
  const max = Math.max(...data.map((d) => d[1]), 0)
  return <div className="card"><div className="card-head"><div><b>{title}</b><div className="muted small">{sub}</div></div></div>
    {max > 0 ? <div className="chart">{data.map(([l, v]) => <div key={l} className="bar-wrap" title={fmt(v)}><div className="bar" style={{ height: Math.max(4, (v / max) * 100) + '%' }} /><span className="bar-label">{l}</span></div>)}</div>
      : <div className="empty" style={{ padding: '2rem 0' }}><div className="empty-ic">◔</div><p className="muted">No data for this period yet.</p></div>}</div>
}

// ZMX-style inner-page banner for public pages.
export function PageBanner({ title, sub, go }) {
  return <section className="zx-banner"><div className="zx-wrap"><h1>{title}</h1><p><button className="link" onClick={() => go('home')}>Home</button> / {title}</p>{sub && <p className="zx-bsub">{sub}</p>}</div></section>
}
