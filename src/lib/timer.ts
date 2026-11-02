export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed'
export interface TimerState { status: TimerStatus; durationMs: number; remainingMs: number; endsAt: number | null }
export const MAX_DURATION = (99 * 3600 + 59 * 60 + 59) * 1000
export function idleTimer(durationMs = 25 * 60_000): TimerState { return { status: 'idle', durationMs, remainingMs: durationMs, endsAt: null } }
export function remainingAt(timer: TimerState, now: number) { return timer.status === 'running' && timer.endsAt !== null ? Math.max(0, timer.endsAt - now) : timer.remainingMs }
export function advanceTimer(timer: TimerState, now: number): TimerState {
  return timer.status === 'running' && remainingAt(timer, now) <= 0 ? { ...timer, status: 'completed', remainingMs: 0, endsAt: null } : timer
}
export function startTimer(timer: TimerState, now: number): TimerState {
  const remainingMs = timer.status === 'paused' ? timer.remainingMs : timer.durationMs
  return remainingMs > 0 ? { ...timer, status: 'running', remainingMs, endsAt: now + remainingMs } : timer
}
export function pauseTimer(timer: TimerState, now: number): TimerState {
  const current = advanceTimer(timer, now)
  return current.status === 'running' ? { ...current, status: 'paused', remainingMs: remainingAt(current, now), endsAt: null } : current
}
export function isTimer(value: unknown): value is TimerState {
  if (!value || typeof value !== 'object') return false
  const t = value as TimerState
  return ['idle', 'running', 'paused', 'completed'].includes(t.status) && Number.isFinite(t.durationMs) && t.durationMs > 0 && t.durationMs <= MAX_DURATION && Number.isFinite(t.remainingMs) && t.remainingMs >= 0 && t.remainingMs <= t.durationMs && (t.status === 'running' ? Number.isFinite(t.endsAt) : t.endsAt === null)
}
export function formatTime(ms: number) {
  const seconds = Math.ceil(Math.max(0, ms) / 1000), hours = Math.floor(seconds / 3600)
  const mm = String(Math.floor(seconds / 60) % 60).padStart(2, '0'), ss = String(seconds % 60).padStart(2, '0')
  return hours ? `${String(hours).padStart(2, '0')}:${mm}:${ss}` : `${mm}:${ss}`
}
