let context: AudioContext | undefined
export function prepareAudio() {
  try { context ??= new AudioContext(); void context.resume().catch(() => {}) } catch { /* 页面提示仍可用 */ }
}
export function playCompletion() {
  if (!context) return
  try {
    const ctx = context
    for (let i = 0; i < 3; i++) {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain(), time = ctx.currentTime + i * .45
      oscillator.frequency.value = i === 2 ? 880 : 660
      gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(.18, time + .02); gain.gain.exponentialRampToValueAtTime(.001, time + .4)
      oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(time); oscillator.stop(time + .42)
    }
  } catch { /* 音频不可用时显示页面提示 */ }
}
