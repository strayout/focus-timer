import { Pause, Play, RotateCcw, Shuffle, ChevronDown, ChevronUp, LockKeyhole, LockKeyholeOpen, AppWindow, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatTime } from '@/lib/timer'
import type { Quote } from '@/hooks/useQuotes'
interface MiniTimerProps {
  remainingMs: number; durationMs: number; status: string; quote?: Quote
  toggle: () => void; reset: () => void; next: () => void
  expanded: boolean; locked: boolean; toggleExpanded: () => void; toggleLocked: () => void; storageFailed: boolean
  /** Frameless desktop window only: replaces the native title bar buttons. */
  windowControls?: { openMain: () => void; close: () => void }
}
export function MiniTimer({ remainingMs, durationMs, status, quote, toggle, reset, next, expanded, locked, toggleExpanded, toggleLocked, storageFailed, windowControls }: MiniTimerProps) {
  const action = status === 'running' ? '暂停' : status === 'paused' ? '继续' : '开始'
  const statusLabel = status === 'completed' ? '专注完成' : status === 'running' ? '正在专注' : status === 'paused' ? '已暂停' : '准备开始'
  const quoteLabel = expanded ? '收起语录' : '展开语录'
  const lockLabel = locked ? '解锁防误触' : '开启防误触锁'
  const text = quote?.text ?? '从一个小小的行动开始。'
  // data-tauri-drag-region lets the frameless desktop window be dragged by its body; browsers ignore it.
  return <main className="mini-timer" data-locked={locked} data-expanded={expanded} data-tauri-drag-region>
    {windowControls && <div className="mini-window-controls">
      <button type="button" aria-label="打开主窗口" title="打开主窗口" onClick={windowControls.openMain}><AppWindow /></button>
      <button type="button" aria-label="关闭悬浮窗" title="关闭悬浮窗" disabled={locked} onClick={windowControls.close}><X /></button>
    </div>}
    <div className="mini-heading" title={statusLabel} data-tauri-drag-region>
      <span className="mini-status" data-tauri-drag-region><span className={status === 'running' ? 'status-dot active' : 'status-dot'} role="img" aria-label={statusLabel} /><span aria-hidden="true" data-tauri-drag-region>{statusLabel}</span></span>
      <span className="mini-time" data-tauri-drag-region data-hours={remainingMs >= 3600000} role="timer" aria-label="剩余时间">{formatTime(remainingMs)}</span>
    </div>
    <div className="mini-controls" role="group" aria-label={locked ? '防误触已锁定，仅可解锁' : '悬浮窗控制'}>
      <Button size="icon" variant="ghost" aria-label="重置" title="重置" disabled={locked} onClick={() => { if (!locked) reset() }}><RotateCcw /></Button>
      <Button size="icon" variant="ghost" aria-label="换一句语录" title="换一句语录" disabled={locked} onClick={() => { if (!locked) next() }}><Shuffle /></Button>
      <Button className="mini-primary" size="icon" variant="ghost" aria-label={action} title={action} disabled={locked} onClick={() => { if (!locked) toggle() }}>{status === 'running' ? <Pause /> : <Play />}</Button>
      <Button size="icon" variant="ghost" aria-label={quoteLabel} title={quoteLabel} aria-expanded={expanded} aria-controls="mini-quote" disabled={locked} onClick={toggleExpanded}>{expanded ? <ChevronUp /> : <ChevronDown />}</Button>
      <Button size="icon" variant="ghost" aria-label={lockLabel} title={`${lockLabel}（仅防误触，不锁定窗口位置）`} aria-pressed={locked} onClick={toggleLocked}>{locked ? <LockKeyhole /> : <LockKeyholeOpen />}</Button>
    </div>
    <p id="mini-quote" className="mini-quote" data-tauri-drag-region hidden={!expanded} title={quote?.author ? `${text} — ${quote.author}` : text}>{text}</p>
    <span className="sr-only" role="status">{locked ? '防误触已锁定，点击解锁图标恢复操作。' : '防误触已解锁。'}{storageFailed ? '悬浮窗偏好保存失败，重新打开可能无法恢复。' : ''}</span>
    <div className="mini-progress" role="progressbar" aria-label="本轮专注进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.max(0, Math.min(1, 1 - remainingMs / durationMs)) * 100)}><span style={{ width: `${Math.max(0, Math.min(1, 1 - remainingMs / durationMs)) * 100}%` }} /></div>
  </main>
}
