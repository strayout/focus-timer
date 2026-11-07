import { useEffect, useRef } from 'react'
import { formatTime, remainingAt, type TimerState } from '@/lib/timer'
import { progressOf } from '@/lib/progress'

/** Browser chrome and optional completion decoration; never writes timer state. */
export function useTimerPresentation(snapshot: TimerState, sound: boolean) {
  const glow = useRef<HTMLDivElement>(null)
  const previous = useRef(snapshot.status)
  useEffect(() => {
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
    const originalHref = icon?.getAttribute('href'), originalType = icon?.getAttribute('type')
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    let failed = false, lastKey = ''
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32
    const restore = () => {
      if (!icon) return
      if (originalHref !== null && originalHref !== undefined) icon.setAttribute('href', originalHref)
      if (originalType !== null && originalType !== undefined) icon.setAttribute('type', originalType)
    }
    const update = () => {
      const now = Date.now(), remaining = remainingAt(snapshot, now)
      const label = snapshot.status === 'paused' ? '已暂停' : snapshot.status === 'completed' || (snapshot.status === 'running' && remaining <= 0) ? '专注完成' : '专注中'
      document.title = snapshot.status === 'idle' ? '一刻 · 激励学习计时器' : `${formatTime(remaining)} · ${label} — 一刻`
      if (snapshot.status !== 'running' || remaining <= 0 || media.matches) { restore(); lastKey = ''; return }
      if (!icon || failed) return
      const progress = progressOf(snapshot, now)
      const color = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
      const key = `${Math.ceil(remaining / 1000)}:${color}`
      if (key === lastKey) return
      lastKey = key
      try {
        const ctx = canvas.getContext('2d')
        if (!ctx) { failed = true; restore(); return }
        ctx.clearRect(0, 0, 32, 32)
        ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.globalAlpha = .2
        ctx.beginPath(); ctx.arc(16, 16, 12, 0, Math.PI * 2); ctx.stroke()
        ctx.globalAlpha = 1; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.arc(16, 16, 12, -Math.PI / 2 + progress * Math.PI * 2, Math.PI * 1.5); ctx.stroke()
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(16, 16, 2.5, 0, Math.PI * 2); ctx.fill()
        icon.type = 'image/png'; icon.href = canvas.toDataURL('image/png')
      } catch { failed = true; restore() }
    }
    update()
    // Browser timers may be throttled; every sample recalculates from the end timestamp.
    const interval = snapshot.status === 'running' ? window.setInterval(update, 1000) : undefined
    document.addEventListener('visibilitychange', update); window.addEventListener('focus', update)
    media.addEventListener('change', update)
    return () => {
      clearInterval(interval); document.removeEventListener('visibilitychange', update); window.removeEventListener('focus', update)
      media.removeEventListener('change', update); restore()
    }
  }, [snapshot])
  useEffect(() => {
    const wasRunning = previous.current === 'running'
    previous.current = snapshot.status
    if (!wasRunning || snapshot.status !== 'completed' || document.hidden) return
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) return
    let animation: Animation | undefined
    let dotAnimation: Animation | undefined
    try { animation = glow.current?.animate([{ opacity: 0 }, { opacity: .5, offset: .25 }, { opacity: 0 }], { duration: 1100, easing: 'ease-out' }) } catch { /* Completion UI remains available. */ }
    try { dotAnimation = document.querySelector('h1 > span')?.animate([{ scale: '1' }, { scale: '1.25', offset: .35 }, { scale: '1' }], { duration: 900, easing: 'ease-out' }) } catch { /* Status color remains visible. */ }
    try { if (sound) navigator.vibrate?.([30, 40, 30]) } catch { /* Optional device capability. */ }
    const cancel = () => { animation?.cancel(); dotAnimation?.cancel() }
    const visibility = () => { if (document.hidden) cancel() }
    media.addEventListener('change', cancel); document.addEventListener('visibilitychange', visibility)
    return () => { cancel(); media.removeEventListener('change', cancel); document.removeEventListener('visibilitychange', visibility) }
  }, [snapshot.status, sound])
  return glow
}
