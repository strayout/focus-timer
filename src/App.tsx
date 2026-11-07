import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Timer, Moon, Sun, PictureInPicture2, ArrowUpRight, Play, Pause, RotateCcw, Plus, Shuffle, Quote as QuoteIcon, Bell, Volume2, Leaf, Check, Settings2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Toaster } from '@/components/ui/sonner'
import { useTimer } from '@/hooks/useTimer'
import { useQuotes } from '@/hooks/useQuotes'
import { usePipWindow } from '@/hooks/usePipWindow'
import { useLocalState } from '@/hooks/useLocalState'
import { useMotionSurface } from '@/hooks/useMotionSurface'
import { useTimerPresentation } from '@/hooks/useTimerPresentation'
import { prepareAudio, playCompletion, playInteraction } from '@/lib/feedback'
import { formatTime, MAX_DURATION } from '@/lib/timer'
import { phaseOf } from '@/lib/progress'
import { TimerCommands } from '@/components/TimerCommands'
import { TimerRing } from '@/components/TimerRing'
import { TimePicker } from '@/components/TimePicker'
import { QuoteManager } from '@/components/QuoteManager'
import { MiniTimer } from '@/components/MiniTimer'
import { AnimatedQuote } from '@/components/visuals/AnimatedQuote'

interface Settings { dark: boolean; sound: boolean; interval: number }
const validSettings = (v: unknown): v is Settings => !!v && typeof v === 'object' && typeof (v as Settings).dark === 'boolean' && typeof (v as Settings).sound === 'boolean' && Number.isInteger((v as Settings).interval) && (v as Settings).interval >= 5 && (v as Settings).interval <= 3600
const validPresets = (v: unknown): v is number[] => Array.isArray(v) && v.every(n => Number.isInteger(n) && n > 0 && n <= MAX_DURATION)
const basePresets = [5, 15, 25, 45, 60].map(n => n * 60000)
export default function App() {
  const [settings, setSettings, settingsFailed] = useLocalState<Settings>('focus.settings.v1', { dark: matchMedia('(prefers-color-scheme: dark)').matches, sound: true, interval: 60 }, validSettings)
  const [customPresets, setCustomPresets, presetsFailed] = useLocalState<number[]>('focus.presets.v1', [], validPresets)
  const [duration, setDuration] = useState(25 * 60000)
  const [customOpen, setCustomOpen] = useState(false)
  const [notification, setNotification] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const timer = useTimer(() => {
    if (settings.sound) playCompletion()
    toast.success('专注完成，给努力的自己一点掌声。', { duration: 10000 })
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification('一刻 · 专注完成', { body: '这一段时间属于你。起身活动一下，休息片刻吧。' }) } catch { /* 页面内提示已显示 */ }
    }
  })
  const { state, remainingMs } = timer
  const motionRoot = useMotionSurface(state.durationMs)
  const completionGlow = useTimerPresentation(state, settings.sound)
  const quotes = useQuotes(state.status === 'running', settings.interval)
  const pip = usePipWindow()
  const busy = state.status === 'running' || state.status === 'paused'
  useEffect(() => { document.documentElement.classList.toggle('dark', settings.dark) }, [settings.dark])
  useEffect(() => { document.documentElement.dataset.phase = phaseOf(state.status) }, [state.status])
  async function requestNotifications() {
    if (typeof Notification === 'undefined') { toast.info('当前浏览器不支持通知，将在页面内提醒。'); return }
    try {
      const permission = await Notification.requestPermission(); setNotification(permission)
      if (permission !== 'granted') toast.info('通知未开启，结束时会在页面内提醒。')
    } catch { toast.info('通知暂不可用，结束时会在页面内提醒。') }
  }
  function toggle() {
    if (state.status === 'running') { timer.pause(); if (settings.sound) playInteraction('pause'); return }
    prepareAudio()
    timer.start()
    if (settings.sound) playInteraction('start')
    if (notification === 'default') void requestNotifications()
  }
  function configure(value: number) { if (!busy && value > 0) timer.configure(value) }
  async function openPip() { try { await pip.open() } catch (error) { toast.info(error instanceof Error ? error.message : '暂时无法打开悬浮窗，请再试一次。') } }
  function applyCustom(save: boolean) {
    if (!duration || busy) return
    configure(duration)
    if (save && !basePresets.includes(duration) && !customPresets.includes(duration)) setCustomPresets([...customPresets, duration])
    setCustomOpen(false)
  }
  const storageFailed = settingsFailed || presetsFailed || timer.storageFailed || quotes.storageFailed
  return <div className="app-shell" ref={motionRoot} data-running={state.status === 'running'} data-status={state.status}>
    <div className="completion-glow" ref={completionGlow} aria-hidden="true" />
    <div className="environment-halos" aria-hidden="true"><span /><span /></div>
    <header className="topbar"><a className="brand" href="./" aria-label="一刻首页"><span className="brand-mark"><Timer /></span><strong>一刻<span>FOCUS TIMER</span></strong></a><nav aria-label="应用工具"><TimerCommands status={state.status} toggle={toggle} reset={timer.reset} next={quotes.next} configure={configure} openPip={() => void openPip()} toggleTheme={() => setSettings({ ...settings, dark: !settings.dark })} custom={() => { setDuration(state.durationMs); setCustomOpen(true) }} /><Button variant="ghost" size="icon" aria-label={settings.dark ? '切换浅色模式' : '切换深色模式'} onClick={() => setSettings({ ...settings, dark: !settings.dark })}>{settings.dark ? <Sun /> : <Moon />}</Button><Button variant="outline" onClick={() => void openPip()}><PictureInPicture2 data-icon="inline-start" />{pip.pipWindow ? (pip.preferences.locked ? '悬浮窗 · 防误触已锁定' : '查看悬浮窗') : (pip.preferences.locked ? '桌面悬浮窗 · 防误触已锁定' : '桌面悬浮窗')}<ArrowUpRight data-icon="inline-end" /></Button></nav></header>
    <main className="main-content"><div className="page-intro"><div><div className="eyebrow"><span />给专注，留一点空间</div><h1>把这一刻，交给自己<span>。</span></h1><p>不必等动力到来。从一个小小的开始，让行动慢慢发生。</p></div><span className="local-note"><span className="status-dot" />本地保存 · 安心专注</span></div>
    {storageFailed && <Alert variant="destructive"><AlertTitle>本地保存不可用</AlertTitle><AlertDescription>请检查浏览器的存储设置；当前会话仍可使用，刷新可能丢失修改。</AlertDescription></Alert>}
    <div className="workspace"><section className="timer-panel" aria-label="专注计时器"><div className="panel-heading"><span><Timer />专注计时</span><span className="section-caption">一次，只做一件事</span></div>
    <TimerRing remainingMs={remainingMs} snapshot={state} />
    <div className="preset-area"><p className="small-label">选择专注时长</p><ToggleGroup type="single" variant="outline" value={String(state.durationMs)} disabled={busy} onValueChange={value => { if (value) configure(Number(value)) }} className="presets">{basePresets.map(ms => <ToggleGroupItem key={ms} value={String(ms)} aria-label={`${ms / 60000} 分钟`}>{ms / 60000}<span>分钟</span></ToggleGroupItem>)}</ToggleGroup>
    <div className="custom-presets">{customPresets.map(ms => <div className="saved-preset" key={ms}><Button variant="secondary" size="sm" disabled={busy} onClick={() => configure(ms)}>{ms % 60000 ? formatTime(ms) : `${ms / 60000} 分钟`}</Button><Button variant="ghost" size="icon" aria-label={`删除预设 ${formatTime(ms)}`} onClick={() => setCustomPresets(customPresets.filter(n => n !== ms))}>×</Button></div>)}
    <Dialog open={customOpen} onOpenChange={open => { setCustomOpen(open); if (open) setDuration(state.durationMs) }}><DialogTrigger asChild><Button variant="ghost" size="sm" disabled={busy}><Plus data-icon="inline-start" />自定义时长</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>留给自己多少时间？</DialogTitle><DialogDescription>设置时、分、秒，也可以保存为常用预设。</DialogDescription></DialogHeader><TimePicker value={duration} onChange={setDuration} disabled={busy} /><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" disabled={!duration || busy} onClick={() => applyCustom(false)}>仅使用本次</Button><Button disabled={!duration || busy} onClick={() => applyCustom(true)}>保存并使用</Button></div></DialogContent></Dialog></div></div>
    <div className="timer-actions"><Button size="lg" variant="outline" onClick={timer.reset} disabled={state.status === 'idle'}><RotateCcw data-icon="inline-start" />重置</Button><Button size="lg" className="start-button" onClick={toggle}>{state.status === 'running' ? <Pause data-icon="inline-start" /> : <Play data-icon="inline-start" />}{state.status === 'running' ? '暂停一下' : state.status === 'paused' ? '继续专注' : state.status === 'completed' ? '再来一轮' : '开始专注'}</Button></div>
    <div className="timer-footnote"><Bell />结束时提醒你，安心投入眼前的事</div>
    {state.status === 'completed' && <Alert className="completion-alert"><Check /><AlertTitle>专注完成，辛苦了！</AlertTitle><AlertDescription>起身走走，给下一次专注留一点余地。</AlertDescription></Alert>}
    </section><aside className="side-column"><section className="inspiration-panel"><div className="panel-heading"><span><QuoteIcon />此刻的灵感</span><span className="quote-label">给前行中的你</span></div><div className="quote-symbol" aria-hidden="true">“</div><AnimatedQuote text={quotes.quote?.text ?? '给自己一句鼓励，从添加第一条语录开始。'} /><p className="quote-author">— {quotes.quote?.author ?? '给自己的话'}</p><div className="quote-bottom"><span><span className="status-dot" />专注时每 {settings.interval} 秒更新</span><Button variant="ghost" size="sm" onClick={quotes.next} disabled={quotes.quotes.length < 2}><Shuffle data-icon="inline-start" />换一句</Button></div></section>
    <section className="gentle-note"><span className="leaf-mark"><Leaf /></span><div><h2>先开始，再慢慢进入状态</h2><p>把手机放远一点，把任务缩小一点。<br />今天的进步，可以从这几分钟开始。</p></div></section>
    <section className="tools-panel"><div className="tool-row"><div className="tool-title"><BookOpen /><div><h2>把鼓励留在身边</h2><p>{quotes.quotes.length} 条语录，陪你一点点向前</p></div></div><QuoteManager quotes={quotes.quotes} setQuotes={quotes.setQuotes} restore={quotes.restore} /></div><div className="tool-row"><div className="tool-title"><Settings2 /><div><h2>按你的节奏来</h2><p>提示音、通知与语录切换</p></div></div><Dialog><DialogTrigger asChild><Button variant="ghost" size="sm">设置<ArrowUpRight data-icon="inline-end" /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>专注偏好</DialogTitle><DialogDescription>调整适合自己的提醒方式。</DialogDescription></DialogHeader><FieldGroup><Field orientation="horizontal"><FieldLabel htmlFor="sound"><Volume2 />结束提示音</FieldLabel><Switch id="sound" checked={settings.sound} onCheckedChange={sound => { prepareAudio(); setSettings({ ...settings, sound }) }} /></Field><Field><FieldLabel htmlFor="quote-interval">语录切换间隔（秒）</FieldLabel><Input id="quote-interval" type="number" min="5" max="3600" value={settings.interval} onChange={e => setSettings({ ...settings, interval: Math.max(5, Math.min(3600, Math.trunc(Number(e.target.value) || 5))) })} /><FieldDescription>专注期间自动切换，暂停时停止轮换。</FieldDescription></Field><Field><FieldLabel>浏览器通知</FieldLabel><FieldDescription>{notification === 'granted' ? '通知已开启' : notification === 'denied' ? '通知被拒绝，可在浏览器网站设置中开启；当前使用页面内提示。' : '未开启时，使用页面内提示。'}</FieldDescription><Button variant="outline" onClick={() => void requestNotifications()} disabled={notification === 'granted' || notification === 'denied' || notification === 'unsupported'}><Bell data-icon="inline-start" />开启完成通知</Button></Field></FieldGroup></DialogContent></Dialog></div></section>
    <Button variant="ghost" className="pip-link" onClick={() => void openPip()}><PictureInPicture2 data-icon="inline-start" />让专注悬浮在桌面上<ArrowUpRight data-icon="inline-end" /></Button>{!pip.supported && <p className="pip-support">悬浮窗请使用 Chrome / Edge 116+</p>}
    </aside></div><footer><span>一刻积累，一点进步。</span><span>无需账号 · 数据仅保存在当前浏览器</span></footer></main>
    {pip.pipWindow && createPortal(<MiniTimer durationMs={state.durationMs} expanded={pip.preferences.expanded} locked={pip.preferences.locked} toggleExpanded={pip.toggleExpanded} toggleLocked={pip.toggleLocked} storageFailed={pip.storageFailed} remainingMs={remainingMs} status={state.status} quote={quotes.quote} toggle={toggle} reset={timer.reset} next={quotes.next} />, pip.pipWindow.document.body)}
    <Toaster position="top-center" richColors theme={settings.dark ? 'dark' : 'light'} />
  </div>
}

