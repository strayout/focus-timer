import { formatTime, type TimerState } from '@/lib/timer'
import { ParticleRing } from '@/components/visuals/ParticleRing'
export function TimerRing({ remainingMs, snapshot }: { remainingMs: number; snapshot: TimerState }) {
  const { durationMs, status } = snapshot
  const ratio = Math.max(0, Math.min(1, remainingMs / durationMs)), radius = 151, circumference = 2 * Math.PI * radius
  return <div className="timer-ring">
    <span className="sr-only" aria-live="polite" aria-atomic="true">{status === 'running' ? `专注中，剩余约 ${Math.ceil(remainingMs / 60000)} 分钟` : status === 'completed' ? '专注完成' : status === 'paused' ? '计时已暂停' : '计时准备就绪'}</span>
    <ParticleRing snapshot={snapshot} />
    <svg viewBox="0 0 340 340" aria-hidden="true"><circle className="ring-track" cx="170" cy="170" r={radius} /><circle className="ring-value" cx="170" cy="170" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - ratio)} transform="rotate(-90 170 170)" /></svg>
    <div className="ring-face"><span className="timer-eyebrow">{status === 'running' ? '心无旁骛，专注当下' : status === 'paused' ? '稍作停顿，随时继续' : status === 'completed' ? '这一刻，你做到了' : '留一段时间，给自己'}</span><span className="timer-digits" data-hours={remainingMs >= 3600000} role="timer" aria-label="剩余时间">{formatTime(remainingMs)}</span><span className="timer-caption"><span className={status === 'running' ? 'status-dot active' : 'status-dot'} />{status === 'running' ? '专注进行中' : status === 'paused' ? '已暂停' : status === 'completed' ? '专注已完成' : '准备好就开始'}</span></div>
  </div>
}
