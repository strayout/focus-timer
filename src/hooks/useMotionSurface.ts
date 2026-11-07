import { useEffect, useRef } from 'react'

/** Presentation only: one delegated pointer listener, one coalesced frame. */
export function useMotionSurface(durationMs: number) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = root.current
    const win = el?.ownerDocument.defaultView
    if (!el || !win) return
    const doc = el.ownerDocument
    const media = win.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
    let frame = 0, x = 0, y = 0, target: Element | null = null
    let lastButton: HTMLElement | null = null
    const resetButton = () => { lastButton?.style.removeProperty('--mag-x'); lastButton?.style.removeProperty('--mag-y'); lastButton = null }
    const cancel = () => { win.cancelAnimationFrame(frame); frame = 0; resetButton() }
    const pointer = (event: PointerEvent) => {
      if (!media.matches || doc.hidden) return
      x = event.clientX; y = event.clientY; target = event.target as Element
      if (frame) return
      frame = win.requestAnimationFrame(() => {
        frame = 0
        const card = target?.closest<HTMLElement>('.timer-panel, .inspiration-panel, .gentle-note, .tools-panel')
        if (card) {
          const rect = card.getBoundingClientRect()
          card.style.setProperty('--mx', `${x - rect.left}px`); card.style.setProperty('--my', `${y - rect.top}px`)
        }
        const button = target?.closest<HTMLElement>('.start-button')
        if (button !== lastButton) resetButton()
        if (button) {
          const rect = button.getBoundingClientRect()
          button.style.setProperty('--mag-x', `${Math.max(-3, Math.min(3, (x - rect.left - rect.width / 2) * .035))}px`)
          button.style.setProperty('--mag-y', `${Math.max(-2, Math.min(2, (y - rect.top - rect.height / 2) * .06))}px`)
          lastButton = button
        }
      })
    }
    const visibility = () => { el.dataset.hidden = String(doc.hidden); if (doc.hidden) cancel() }
    el.addEventListener('pointermove', pointer, { passive: true })
    el.addEventListener('pointerleave', cancel)
    doc.addEventListener('visibilitychange', visibility); media.addEventListener('change', cancel)
    visibility()
    return () => {
      cancel(); el.removeEventListener('pointermove', pointer); el.removeEventListener('pointerleave', cancel)
      doc.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', cancel)
    }
  }, [])
  useEffect(() => {
    const group = root.current?.querySelector<HTMLElement>('.presets')
    if (!group) return
    const measure = () => {
      const selected = group.querySelector<HTMLElement>('[data-state="on"]')
      group.dataset.indicated = String(!!selected)
      if (!selected) return
      group.style.setProperty('--preset-x', `${selected.offsetLeft}px`)
      group.style.setProperty('--preset-width', `${selected.offsetWidth}px`)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(group); measure()
    return () => observer.disconnect()
  }, [durationMs])
  return root
}
