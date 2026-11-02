import { useEffect, useRef, useState } from 'react'
import { advanceTimer, idleTimer, isTimer, pauseTimer, remainingAt, startTimer } from '@/lib/timer'
import { readStored, saveStored } from '@/lib/storage'
export function useTimer(onComplete: () => void) {
  const [state, setState] = useState(() => readStored('focus.timer.v1', idleTimer(), isTimer))
  const [now, setNow] = useState(Date.now)
  const [storageFailed, setStorageFailed] = useState(false)
  const complete = useRef(onComplete)
  useEffect(() => { complete.current = onComplete }, [onComplete])
  useEffect(() => {
    const failed = !saveStored('focus.timer.v1', state)
    queueMicrotask(() => setStorageFailed(failed))
  }, [state])
  useEffect(() => {
    if (state.status !== 'running') return
    const tick = () => {
      const time = Date.now(); setNow(time)
      const next = advanceTimer(state, time)
      if (next !== state) setState(next)
    }
    tick()
    const interval = window.setInterval(tick, 200)
    document.addEventListener('visibilitychange', tick); window.addEventListener('focus', tick)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', tick); window.removeEventListener('focus', tick) }
  }, [state])
  const notified = useRef(state.status === 'completed')
  useEffect(() => {
    if (state.status !== 'completed') { notified.current = false; return }
    if (!notified.current) { notified.current = true; complete.current() }
  }, [state.status])
  return { state, remainingMs: remainingAt(state, now), storageFailed,
    start: () => { const time = Date.now(); setNow(time); setState(s => startTimer(s, time)) },
    pause: () => setState(s => pauseTimer(s, Date.now())),
    reset: () => setState(s => idleTimer(s.durationMs)),
    configure: (duration: number) => setState(idleTimer(duration)),
  }
}
