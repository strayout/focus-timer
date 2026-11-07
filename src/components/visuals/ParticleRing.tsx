import { useEffect, useRef } from 'react'
import { useProgressRef } from '@/hooks/useProgressRef'
import type { TimerState } from '@/lib/timer'

/** Read-only decoration. Its owning document controls frames and visibility. */
export function ParticleRing({ snapshot }: { snapshot: TimerState }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const phase = useRef({ status: snapshot.status, previous: snapshot.status, at: -Infinity })
  const wake = useRef<() => void>(() => {})
  const { sample } = useProgressRef(snapshot)
  useEffect(() => {
    if (phase.current.status !== snapshot.status) {
      const win = canvas.current?.ownerDocument.defaultView
      phase.current = { status: snapshot.status, previous: phase.current.status, at: win?.performance.now() ?? 0 }
      wake.current()
    }
  }, [snapshot.status])
  useEffect(() => {
    const cv = canvas.current, doc = cv?.ownerDocument, win = doc?.defaultView
    if (!cv || !doc || !win) return
    let ctx: CanvasRenderingContext2D | null
    try { ctx = cv.getContext('2d') } catch { return }
    if (!ctx) return
    const context = ctx
    const media = win.matchMedia('(prefers-reduced-motion: reduce)')
    const fine = win.matchMedia('(hover: hover) and (pointer: fine)')
    const mini = doc.body.classList.contains('pip-body')
    const size = 340, count = 180, radius = 151
    const points = Array.from({ length: count }, (_, i) => {
      const angle = i / count * Math.PI * 2 - Math.PI / 2
      const ox = size / 2 + Math.cos(angle) * radius, oy = size / 2 + Math.sin(angle) * radius
      return { angle, ox, oy, x: ox, y: oy, vx: 0, vy: 0 }
    })
    let frame = 0, previous = 0, lastColor = 0, color = '', failed = false, visible = true
    let mx = -1000, my = -1000
    const stop = () => { win.cancelAnimationFrame(frame); frame = 0; previous = 0; cv.dataset.active = 'false' }
    const setup = () => {
      try {
        const dpr = Math.min(win.devicePixelRatio || 1, 2)
        cv.width = cv.height = size * dpr
        context.setTransform(dpr, 0, 0, dpr, 0, 0)
      } catch { failed = true; stop() }
    }
    const dot = (x: number, y: number, r: number, alpha: number) => {
      context.globalAlpha = alpha
      context.beginPath(); context.arc(x, y, r, 0, Math.PI * 2); context.fill()
    }
    const draw = (now: number) => {
      frame = 0
      if (failed || media.matches || doc.hidden || !visible) { stop(); return }
      try {
        const dt = previous ? Math.min(2, (now - previous) / 16.667) : 1
        previous = now
        if (!color || now - lastColor > 50) { color = win.getComputedStyle(cv).color; lastColor = now }
        const { status, previous: before, at } = phase.current
        const elapsed = now - at, progress = sample(), edge = progress * count
        const ignition = !mini && status === 'running' && before !== 'paused' && elapsed < 600
        const burst = !mini && status === 'completed' && before === 'running' && elapsed < 1100
        cv.dataset.effect = ignition ? 'ignition' : burst ? 'burst' : status
        context.clearRect(0, 0, size, size); context.fillStyle = color
        points.forEach((p, i) => {
          const breathing = status === 'idle' && !mini ? Math.sin(now / 1800 + p.angle * 2) * 1.4 : 0
          const dx = p.x - mx, dy = p.y - my, distance = Math.hypot(dx, dy)
          if (!mini && status === 'idle' && distance > .1 && distance < 58) {
            const force = (1 - distance / 58) ** 2 * 1.8 * dt
            p.vx += dx / distance * force; p.vy += dy / distance * force
          }
          p.vx = (p.vx + (p.ox + Math.cos(p.angle) * breathing - p.x) * .065 * dt) * Math.pow(.83, dt)
          p.vy = (p.vy + (p.oy + Math.sin(p.angle) * breathing - p.y) * .065 * dt) * Math.pow(.83, dt)
          p.x += p.vx * dt; p.y += p.vy * dt
          let alpha = status === 'completed' ? .85 : i >= edge ? .85 : .12
          if (status === 'paused') alpha *= .65
          if (ignition) alpha *= i / count < elapsed / 600 ? 1 : .18
          dot(p.x, p.y, i >= edge || status === 'completed' ? 1.65 : 1, alpha)
          // Glowing head/trail uses additive translucent circles, never shadowBlur.
          const tail = edge - i
          if (!mini && (status === 'running' || status === 'paused') && tail >= 0 && tail < 13) {
            const strength = (1 - tail / 13) * (status === 'paused' ? .35 : .9)
            context.globalCompositeOperation = 'lighter'
            dot(p.x, p.y, 5 - tail * .2, strength * .12)
            dot(p.x, p.y, 2.4, strength)
            context.globalCompositeOperation = 'source-over'
          }
          if (burst) {
            const t = Math.max(0, elapsed / 1100), travel = Math.sin(t * Math.PI / 2) * 18
            dot(p.ox + Math.cos(p.angle) * travel, p.oy + Math.sin(p.angle) * travel, 1.5 + (1 - t), (1 - t) * .8)
            const wave = Math.max(0, 1 - Math.abs(i / count - t) * 12)
            if (wave > 0) dot(p.ox, p.oy, 4, wave * .35)
          }
        })
        context.globalAlpha = 1; context.globalCompositeOperation = 'source-over'; cv.dataset.active = 'true'
        if (!mini && (status === 'idle' || status === 'running' || burst || (status === 'paused' && elapsed < 900))) frame = win.requestAnimationFrame(draw)
      } catch { failed = true; stop() }
    }
    const sync = () => {
      if (doc.hidden || media.matches || !visible || failed) { stop(); return }
      if (!frame) frame = win.requestAnimationFrame(draw)
    }
    const move = (event: PointerEvent) => {
      if (!fine.matches || media.matches || mini) return
      const rect = cv.getBoundingClientRect()
      mx = (event.clientX - rect.left) * size / rect.width; my = (event.clientY - rect.top) * size / rect.height
    }
    const leave = () => { mx = my = -1000 }
    const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; sync() })
    const resize = () => { setup(); color = ''; sync() }
    let themeTimeout = 0
    const themeObserver = new MutationObserver(() => {
      color = ''; sync(); win.clearTimeout(themeTimeout)
      themeTimeout = win.setTimeout(() => { color = ''; sync() }, 1000)
    })
    themeObserver.observe(doc.documentElement, { attributes: true, attributeFilter: ['class', 'data-phase'] })
    wake.current = sync
    setup(); observer.observe(cv); sync()
    cv.addEventListener('pointermove', move); cv.addEventListener('pointerleave', leave)
    media.addEventListener('change', sync); doc.addEventListener('visibilitychange', sync)
    win.addEventListener('resize', resize)
    return () => {
      wake.current = () => {}; stop(); observer.disconnect(); themeObserver.disconnect(); win.clearTimeout(themeTimeout)
      cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerleave', leave)
      media.removeEventListener('change', sync); doc.removeEventListener('visibilitychange', sync)
      win.removeEventListener('resize', resize)
    }
  }, [sample])
  // A configured duration can change without changing the status (including static mini views).
  useEffect(() => { wake.current() }, [snapshot.durationMs])
  return <canvas className="particle-ring" ref={canvas} aria-hidden="true" />
}
