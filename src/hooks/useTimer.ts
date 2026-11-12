import { useEffect, useRef, useState } from 'react'
import { advanceTimer, idleTimer, isTimer, pauseTimer, remainingAt, startTimer } from '@/lib/timer'
import { useLocalState } from './useLocalState'
const initial = idleTimer()
/** Every window runs this hook on the same stored TimerState; commands from any of them reach all. */
export function useTimer(onComplete: () => void) {
  const [state, setState, storageFailed] = useLocalState('focus.timer.v1', initial, isTimer)
  const [now, setNow] = useState(Date.now)
  const complete = useRef(onComplete)
  useEffect(() => { complete.current = onComplete }, [onComplete])
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
  }, [state, setState])
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
