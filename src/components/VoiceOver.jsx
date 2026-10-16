import { useEffect, useRef, useState } from 'react'

const SRC = '/Fields_to_Market.mp3', KEY = 'agri-voiceover-off', START_AT = 60, VOL = 0.9

// Voice-over for the public home page. Starts when the visitor begins scrolling.
// Browsers do not treat scrolling as a permission gesture, so if playback is blocked
// it starts on the visitor's first click, tap or key press instead.
export default function VoiceOver() {
  const a = useRef(null), off = useRef(false), done = useRef(false)
  const [st, setSt] = useState('idle') // idle | playing | paused | blocked | ended

  useEffect(() => {
    const el = new Audio(SRC); el.preload = 'auto'; el.volume = VOL; a.current = el
    try { off.current = localStorage.getItem(KEY) === '1' } catch { /* ignore */ }
    if (off.current) setSt('paused')
    const play = () => {
      if (off.current || done.current) return
      el.play().then(() => setSt('playing')).catch(() => setSt('blocked'))
    }
    const onScroll = () => { if (window.scrollY > START_AT && el.paused && !el.currentTime) play() }
    const onGesture = () => { if (el.paused && !done.current && !off.current && (window.scrollY > START_AT || el.currentTime)) play() }
    const onEnd = () => { done.current = true; setSt('ended') }
    const onVis = () => { if (document.hidden && !el.paused) { el.pause(); setSt('paused') } }
    el.addEventListener('ended', onEnd)
    window.addEventListener('scroll', onScroll, { passive: true })
    ;['pointerdown', 'keydown', 'touchend'].forEach((e) => window.addEventListener(e, onGesture, { passive: true }))
    document.addEventListener('visibilitychange', onVis)
    return () => {
      el.pause(); el.removeEventListener('ended', onEnd)
      window.removeEventListener('scroll', onScroll)
      ;['pointerdown', 'keydown', 'touchend'].forEach((e) => window.removeEventListener(e, onGesture))
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  const toggle = () => {
    const el = a.current; if (!el) return
    if (st === 'playing') { el.pause(); off.current = true; setSt('paused'); try { localStorage.setItem(KEY, '1') } catch { /* ignore */ } return }
    off.current = false; done.current = false; try { localStorage.removeItem(KEY) } catch { /* ignore */ }
    if (st === 'ended') el.currentTime = 0
    el.play().then(() => setSt('playing')).catch(() => setSt('blocked'))
  }

  if (st === 'idle') return null
  const label = { playing: 'Pause voice-over', paused: 'Play voice-over', blocked: 'Tap to hear voice-over', ended: 'Replay voice-over' }[st]
  return (
    <button className={'zx-vo ' + st} onClick={toggle} aria-label={label} title={label}>
      <span className="zx-vo-ic" aria-hidden="true">{st === 'playing' ? '❚❚' : '▶'}</span>
      <span className="zx-vo-bars" aria-hidden="true"><i /><i /><i /><i /></span>
      <span className="zx-vo-t">{label}</span>
    </button>
  )
}
