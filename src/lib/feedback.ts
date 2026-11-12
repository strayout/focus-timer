import { claimOnce } from './locks'
let context: AudioContext | undefined
export function prepareAudio() {
  try { context ??= new AudioContext(); void context.resume().catch(() => {}) } catch { /* 页面提示仍可用 */ }
}
function playNotes(notes: number[], volume: number, duration: number) {
  if (!context || context.state !== 'running') return
  try {
    const ctx = context
    notes.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain(), time = ctx.currentTime + index * .14
      oscillator.type = 'sine'; oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(.0001, time)
      gain.gain.exponentialRampToValueAtTime(volume, time + .02)
      gain.gain.exponentialRampToValueAtTime(.0001, time + duration)
      oscillator.connect(gain); gain.connect(ctx.destination)
      oscillator.onended = () => { oscillator.onended = null; oscillator.disconnect(); gain.disconnect() }
      oscillator.start(time); oscillator.stop(time + duration + .04)
    })
  } catch { /* 音频不可用时显示页面提示 */ }
}
export function playCompletion() { playNotes([523.25, 659.25, 783.99], .12, .65) }
export function audioReady() { return context?.state === 'running' }
/** Completion sound and system notice, issued by one window even when several are open. */
export function announceCompletion(sound: boolean) {
  if (sound && audioReady()) claimOnce('focus.completion.sound', playCompletion)
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') claimOnce('focus.completion.notice', () => {
    try { new Notification('一刻 · 专注完成', { body: '这一段时间属于你。起身活动一下，休息片刻吧。' }) } catch { /* 页面内提示已显示 */ }
  })
}
export function playInteraction(kind: 'start' | 'pause') { playNotes(kind === 'start' ? [392, 523.25] : [392], .035, .12) }
