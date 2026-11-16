/**
 * Android-only shell integration. The WebView is frozen once the app is backgrounded or the
 * screen locks, so the completion notice cannot come from page code there. Instead every
 * run is mirrored into one exact AlarmManager notification at `endsAt`; the timer rules
 * themselves still live only in src/lib/timer.ts.
 */
import type { TimerState } from '@/lib/timer'
import { isAndroid } from './desktop'

const ALARM_ID = 7301
const CHANNEL_ID = 'focus-complete'
const SCHEDULED_KEY = 'focus.alarm.v2'
// 0.1.0 scheduled its alarms ~34 hours late (see the note in sync()); the first run of a
// fixed build cancels whatever it left pending, once.
const CLEANED_KEY = 'focus.alarm.cleaned.v1'

let channelReady: Promise<void> | undefined
let queue: Promise<void> = Promise.resolve()

async function ensureChannel(api: typeof import('@tauri-apps/plugin-notification')) {
  channelReady ??= api.createChannel({
    id: CHANNEL_ID, name: '专注完成提醒', description: '一段专注计时结束时提醒你',
    importance: api.Importance.High, vibration: true, visibility: api.Visibility.Public,
  }).catch(() => { channelReady = undefined })
  await channelReady
}

function readScheduled(): number | null {
  try { const value = Number(localStorage.getItem(SCHEDULED_KEY)); return Number.isFinite(value) && value > 0 ? value : null } catch { return null }
}
function needsCleanup() {
  try { return localStorage.getItem(CLEANED_KEY) === null } catch { return false }
}
function writeScheduled(endsAt: number | null) {
  try { if (endsAt) localStorage.setItem(SCHEDULED_KEY, String(endsAt)); else localStorage.removeItem(SCHEDULED_KEY) } catch { /* Rescheduling simply happens again. */ }
}

async function sync(state: TimerState) {
  const api = await import('@tauri-apps/plugin-notification')
  if (needsCleanup()) {
    // A running timer has no v2 record yet, so it is rescheduled correctly below.
    await api.cancel([ALARM_ID])
    try { localStorage.setItem(CLEANED_KEY, '1'); localStorage.removeItem('focus.alarm.v1') } catch { /* Cancelling again is harmless. */ }
  }
  const scheduled = readScheduled()
  if (state.status === 'running' && state.endsAt !== null && state.endsAt > Date.now()) {
    if (scheduled === state.endsAt) return
    let granted = await api.isPermissionGranted()
    if (!granted) granted = (await api.requestPermission()) === 'granted'
    if (!granted) return
    await ensureChannel(api)
    if (scheduled !== null) await api.cancel([ALARM_ID])
    api.sendNotification({
      id: ALARM_ID, channelId: CHANNEL_ID, autoCancel: true,
      title: '一刻 · 专注完成', body: '这一段时间属于你。起身活动一下，休息片刻吧。',
      // Whole seconds only: the plugin hands the date to Android as `…:00.123000000Z`, which its
      // `ss.SSS` pattern reads as 123,000,000 ms and so fires about 34 hours late.
      schedule: api.Schedule.at(new Date(Math.ceil(state.endsAt / 1000) * 1000), false, true),
    })
    writeScheduled(state.endsAt)
    return
  }
  // A completed run keeps its notification: cancelling would also dismiss one already shown.
  if (state.status === 'completed') { writeScheduled(null); return }
  if (scheduled !== null) { await api.cancel([ALARM_ID]); writeScheduled(null) }
}

/** Keeps the pending completion alarm in step with the timer: start/resume schedules, pause/reset cancels. */
export function syncCompletionAlarm(state: TimerState) {
  if (!isAndroid) return
  queue = queue.then(() => sync(state)).catch(() => { /* The in-app reminder still works. */ })
}

interface ShellBridge { setBars?: (color: string, dark: boolean) => void }
/** Paints the status/navigation bar strips (left free by MainActivity) in the page background. */
export function syncSystemBars(dark: boolean) {
  if (!isAndroid) return
  const bridge = (window as Window & { YikeShell?: ShellBridge }).YikeShell
  if (!bridge?.setBars) return
  requestAnimationFrame(() => {
    const color = getComputedStyle(document.body).backgroundColor
    const hex = toHex(color)
    if (hex) try { bridge.setBars?.(hex, dark) } catch { /* Bars keep the theme colour. */ }
  })
}

function toHex(color: string) {
  const m = color.match(/\d+(\.\d+)?/g)
  if (!m || m.length < 3) return null
  return '#' + m.slice(0, 3).map(n => Math.round(Number(n)).toString(16).padStart(2, '0')).join('')
}
