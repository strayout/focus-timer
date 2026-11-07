import { remainingAt, type TimerState, type TimerStatus } from './timer.ts'

export type VisualPhase = 'idle' | 'focus' | 'paused' | 'done'
/** Read-only projection. Rendering never advances or mutates timer state. */
export function progressOf(snapshot: TimerState, now: number): number {
  if (!Number.isFinite(snapshot.durationMs) || snapshot.durationMs <= 0) return 0
  return Math.min(1, Math.max(0, 1 - remainingAt(snapshot, now) / snapshot.durationMs))
}
export function phaseOf(status: TimerStatus): VisualPhase {
  return status === 'running' ? 'focus' : status === 'completed' ? 'done' : status
}
