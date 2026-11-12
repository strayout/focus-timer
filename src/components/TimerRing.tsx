import type { TimerState } from '@/lib/timer'
import { TimerDigits } from '@/components/visuals/TimerDigits'
import { ParticleRing } from '@/components/visuals/ParticleRing'
const DIAL = 163, DIAL_LENGTH = 2 * Math.PI * DIAL, DIAL_STEP = DIAL_LENGTH / 60
export function TimerRing({ remainingMs, snapshot }: { remainingMs: number; snapshot: TimerState }) {
  const { durationMs, status } = snapshot
  const ratio = Math.max(0, Math.min(1, remainingMs / durationMs)), radius = 151, circumference = 2 * Math.PI * radius
  return <div className="timer-ring">
    <span className="sr-only" aria-live="polite" aria-atomic="true">{status === 'running' ? `专注中，剩余约 ${Math.ceil(remainingMs / 60000)} 分钟` : status === 'completed' ? '专注完成' : status === 'paused' ? '计时已暂停' : '计时准备就绪'}</span>
    <ParticleRing snapshot={snapshot} />
    <svg viewBox="0 0 340 340" aria-hidden="true">
      {/* 刻度: sixty engraved marks; the elapsed ones take the phase colour. */}
      <mask id="dial-marks"><g transform="rotate(-90 170 170)"><circle className="dial-mask-minor" cx="170" cy="170" r={DIAL} strokeDasharray={`0.9 ${DIAL_STEP - 0.9}`} strokeDashoffset="0.45" /><circle className="dial-mask-major" cx="170" cy="170" r={DIAL} strokeDasharray={`1.3 ${DIAL_STEP * 5 - 1.3}`} strokeDashoffset="0.65" /></g></mask>
      <g mask="url(#dial-marks)"><circle className="dial-marks" cx="170" cy="170" r={DIAL} /><circle className="dial-elapsed" cx="170" cy="170" r={DIAL} strokeDasharray={`${DIAL_LENGTH * (1 - ratio)} ${DIAL_LENGTH}`} transform="rotate(-90 170 170)" /></g>
      <circle className="ring-track" cx="170" cy="170" r={radius} /><circle className="ring-value" cx="170" cy="170" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - ratio)} transform="rotate(-90 170 170)" /></svg>
    <div className="ring-face"><span className="timer-eyebrow">{status === 'running' ? '心无旁骛，专注当下' : status === 'paused' ? '稍作停顿，随时继续' : status === 'completed' ? '这一刻，你做到了' : '留一段时间，给自己'}</span><TimerDigits remainingMs={remainingMs} /><span className="timer-caption"><span className={status === 'running' ? 'status-dot active' : 'status-dot'} />{status === 'running' ? '专注进行中' : status === 'paused' ? '已暂停' : status === 'completed' ? '专注已完成' : '准备好就开始'}</span></div>
  </div>
}

