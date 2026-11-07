import { useEffect, useRef } from 'react'

export function AnimatedQuote({ text }: { text: string }) {
  const root = useRef<HTMLDivElement>(null)
  const previous = useRef(text)
  useEffect(() => {
    const el = root.current, win = el?.ownerDocument.defaultView
    if (!el || !win) return
    const old = el.querySelector<HTMLElement>('.quote-outgoing')
    if (!old) return
    const changed = previous.current !== text
    old.textContent = previous.current; previous.current = text
    const media = win.matchMedia('(prefers-reduced-motion: reduce)')
    if (!changed || media.matches || el.ownerDocument.hidden) return
    const animations: Animation[] = []
    try {
      animations.push(old.animate([{ opacity: .6, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-4px)' }], { duration: 120 }))
      el.querySelectorAll('.quote-letters > span').forEach((letter, index) => {
        animations.push(letter.animate([{ opacity: 0, filter: 'blur(3px)', transform: 'translateY(3px)' }, { opacity: 1, filter: 'blur(0)', transform: 'translateY(0)' }], { duration: 180, delay: 100 + Math.min(index * 18, 400), fill: 'backwards', easing: 'ease-out' }))
      })
      const icon = el.closest('.inspiration-panel')?.querySelector('.quote-bottom button svg')
      if (icon) animations.push(icon.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(180deg)' }], { duration: 480, easing: 'ease-out' }))
    } catch { /* All content is already present as ordinary text. */ }
    const cancel = () => { animations.forEach(animation => animation.cancel()) }
    const visibility = () => { if (el.ownerDocument.hidden) cancel() }
    media.addEventListener('change', cancel); el.ownerDocument.addEventListener('visibilitychange', visibility)
    return () => { cancel(); media.removeEventListener('change', cancel); el.ownerDocument.removeEventListener('visibilitychange', visibility) }
  }, [text])
  return <div className="quote-transition" ref={root}>
    <blockquote className="sr-only" aria-label={text}>{text}</blockquote>
    <div className="quote-letters" aria-hidden="true">{Array.from(text).map((letter, index) => <span key={index}>{letter}</span>)}</div>
    <div className="quote-outgoing" aria-hidden="true" />
  </div>
}
