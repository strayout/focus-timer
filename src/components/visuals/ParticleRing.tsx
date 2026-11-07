import { useEffect, useRef } from 'react'
import { useProgressRef } from '@/hooks/useProgressRef'
import type { TimerState } from '@/lib/timer'

/** Optional decoration: no timer actions, persistence, or audio dependencies. */
export function ParticleRing({ snapshot }: { snapshot: TimerState }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const { sample } = useProgressRef(snapshot)
  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    let ctx: CanvasRenderingContext2D | null
    try { ctx = cv.getContext('2d') } catch { return }
    if (!ctx) return
    const context = ctx
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    const fine = matchMedia('(hover: hover) and (pointer: fine)')
    const size = 340, count = 180, radius = 151
    const points = Array.from({ length: count }, (_, i) => {
      const angle = i / count * Math.PI * 2 - Math.PI / 2
      const ox = size / 2 + Math.cos(angle) * radius, oy = size / 2 + Math.sin(angle) * radius
      return { ox, oy, x: ox, y: oy, vx: 0, vy: 0 }
    })
    let frame = 0, previous = 0, lastColor = 0, color = '', failed = false, visible = true
    let mx = -1000, my = -1000
    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = cv.height = size * dpr
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const stop = () => { cancelAnimationFrame(frame); frame = 0; previous = 0; cv.dataset.active = 'false' }
    const draw = (now: number) => {
      frame = 0
      if (failed || media.matches || document.hidden || !visible) { stop(); return }
      try {
        const dt = previous ? Math.min(2, (now - previous) / 16.667) : 1
        previous = now
        if (!color || now - lastColor > 50) { color = getComputedStyle(cv).color; lastColor = now }
        const alive = Math.round(count * (1 - sample()))
        context.clearRect(0, 0, size, size)
        context.fillStyle = color
        points.forEach((p, i) => {
          const dx = p.x - mx, dy = p.y - my, distance = Math.hypot(dx, dy)
          if (distance > .1 && distance < 58) {
            const force = (1 - distance / 58) ** 2 * 1.8 * dt
            p.vx += dx / distance * force; p.vy += dy / distance * force
          }
          p.vx = (p.vx + (p.ox - p.x) * .065 * dt) * Math.pow(.83, dt)
          p.vy = (p.vy + (p.oy - p.y) * .065 * dt) * Math.pow(.83, dt)
          p.x += p.vx * dt; p.y += p.vy * dt
          context.globalAlpha = i < alive ? .9 : .13
          context.beginPath(); context.arc(p.x, p.y, i < alive ? 1.65 : 1, 0, Math.PI * 2); context.fill()
        })
        context.globalAlpha = 1
        cv.dataset.active = 'true'
        frame = requestAnimationFrame(draw)
      } catch { failed = true; stop() }
    }
    const sync = () => {
      if (document.hidden || media.matches || !visible || failed) { stop(); return }
      if (!frame) frame = requestAnimationFrame(draw)
    }
    const move = (event: PointerEvent) => {
      if (!fine.matches || media.matches) return
      const rect = cv.getBoundingClientRect()
      mx = (event.clientX - rect.left) * size / rect.width
      my = (event.clientY - rect.top) * size / rect.height
    }
    const leave = () => { mx = my = -1000 }
    const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; sync() })
    setup(); observer.observe(cv); sync()
    cv.addEventListener('pointermove', move); cv.addEventListener('pointerleave', leave)
    media.addEventListener('change', sync); document.addEventListener('visibilitychange', sync)
    window.addEventListener('resize', setup)
    return () => {
      stop(); observer.disconnect()
      cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerleave', leave)
      media.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('resize', setup)
    }
  }, [sample])
  return <canvas className="particle-ring" ref={canvas} aria-hidden="true" />
}
