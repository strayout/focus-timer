import { useEffect, useState } from 'react'
import { Command as CommandIcon, Moon, Pause, PictureInPicture2, Play, RotateCcw, Shuffle, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from '@/components/ui/command'
import type { TimerStatus } from '@/lib/timer'

interface Props {
  status: TimerStatus; toggle: () => void; reset: () => void; next: () => void
  configure: (duration: number) => void; openPip: () => void; toggleTheme: () => void; custom: () => void
}
export function TimerCommands({ status, toggle, reset, next, configure, openPip, toggleTheme, custom }: Props) {
  const [open, setOpen] = useState(false)
  const busy = status === 'running' || status === 'paused'
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || (!event.ctrlKey && !event.metaKey) || event.isComposing || event.repeat) return
      // Do not take the shortcut away from a different modal or editable field.
      const target = event.target as HTMLElement | null
      if (!open && (document.querySelector('[role="dialog"]') || target?.closest('input, textarea, [contenteditable="true"]'))) return
      event.preventDefault(); setOpen(value => !value)
    }
    document.addEventListener('keydown', keydown)
    return () => document.removeEventListener('keydown', keydown)
  }, [open])
  function run(action: () => void) { setOpen(false); action() }
  const action = status === 'running' ? '暂停专注' : status === 'paused' ? '继续专注' : '开始专注'
  return <>
    <Button variant="ghost" className="command-trigger" aria-label="打开命令面板" title="命令面板（Ctrl / ⌘ K）" onClick={() => setOpen(true)}><CommandIcon data-icon="inline-start" /><span>快捷操作</span><kbd>⌘ K</kbd></Button>
    <CommandDialog open={open} onOpenChange={setOpen} title="专注快捷操作" description="搜索操作，使用方向键选择并按回车执行。">
      <CommandInput placeholder="想做什么？搜索时间、语录、主题…" />
      <CommandList><CommandEmpty>没有匹配的操作，试试“专注”或“分钟”。</CommandEmpty>
        <CommandGroup heading="此刻">
          <CommandItem onSelect={() => run(toggle)}>{status === 'running' ? <Pause /> : <Play />}{action}<CommandShortcut>↵</CommandShortcut></CommandItem>
          <CommandItem disabled={status === 'idle'} onSelect={() => run(reset)}><RotateCcw />重置本轮计时</CommandItem>
          <CommandItem onSelect={() => run(next)}><Shuffle />换一句语录</CommandItem>
          <CommandItem onSelect={() => run(openPip)}><PictureInPicture2 />打开桌面悬浮窗</CommandItem>
          <CommandItem onSelect={() => run(toggleTheme)}><Moon />切换深浅色主题</CommandItem>
        </CommandGroup><CommandSeparator />
        <CommandGroup heading={busy ? '结束或重置本轮后可调整时长' : '留一段时间'}>
          {[5, 15, 25, 45, 60].map(minutes => <CommandItem key={minutes} disabled={busy} onSelect={() => run(() => configure(minutes * 60000))}><Timer />{minutes} 分钟专注</CommandItem>)}
          <CommandItem disabled={busy} onSelect={() => run(custom)}><Timer />自定义时长</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  </>
}
