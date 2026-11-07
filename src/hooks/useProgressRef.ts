import { useCallback, useEffect, useRef } from 'react'
import { progressOf } from '@/lib/progress'
import type { TimerState } from '@/lib/timer'

export function useProgressRef(snapshot: TimerState) {
  const latest = useRef(snapshot)
  const progress = useRef(0)
  useEffect(() => { latest.current = snapshot; progress.current = progressOf(snapshot, Date.now()) }, [snapshot])
  // The visual owns its RAF. No second loop, no per-frame React state updates.
  const sample = useCallback(() => {
    progress.current = progressOf(latest.current, Date.now())
    return progress.current
  }, [])
  return { progress, sample }
}
