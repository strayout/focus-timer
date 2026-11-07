import { useEffect, useRef } from 'react'
import { formatTime } from '@/lib/timer'

export function TimerDigits({ remainingMs }: { remainingMs: number }) {
  const text = formatTime(remainingMs)
  const previous = useRef(text)
  const layer = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = layer.current, win = el?.ownerDocument.defaultView
    if (!el || !win) return
    const old = el.children[0] as HTMLElement, current = el.children[1] as HTMLElement
    old.textContent = previous.current
    const changed = previous.current !== text
    previous.current = text
    if (!changed || el.ownerDocument.hidden || win.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const animations: Animation[] = []
    try {
      animations.push(old.animate([{ opacity: .6, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-18%)' }], { duration: 180, easing: 'ease-out' }))
      animations.push(current.animate([{ opacity: .3, transform: 'translateY(18%)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing: 'ease-out' }))
    } catch { /* Ordinary DOM digits remain readable when animations are unavailable. */ }
    const media = win.matchMedia('(prefers-reduced-motion: reduce)')
    const cancel = () => { animations.forEach(animation => animation.cancel()) }
    const visibility = () => { if (el.ownerDocument.hidden) cancel() }
    media.addEventListener('change', cancel); el.ownerDocument.addEventListener('visibilitychange', visibility)
    return () => { cancel(); media.removeEventListener('change', cancel); el.ownerDocument.removeEventListener('visibilitychange', visibility) }
  }, [text])
  return <span className="timer-digits" data-hours={remainingMs >= 3600000}>
    <span role="timer" aria-label="剩余时间" className="sr-only">{text}</span>
    <span ref={layer} className="rolling-time" aria-hidden="true"><span className="rolling-previous" /><span>{text}</span></span>
  </span>
}
