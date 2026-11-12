import { useEffect, useRef, useState } from 'react'
import { useLocalState } from './useLocalState'
export interface PipPreferences { expanded: boolean; locked: boolean }
export const PIP_KEY = 'focus.pip.v1'
export const PIP_SIZE = { width: 240, collapsed: 120, expanded: 170 }
export const defaultPipPreferences: PipPreferences = { expanded: false, locked: false }
export const isPipPreferences = (value: unknown): value is PipPreferences => !!value && typeof value === 'object' && typeof (value as PipPreferences).expanded === 'boolean' && typeof (value as PipPreferences).locked === 'boolean'
interface PipAPI { requestWindow: (options: { width: number; height: number }) => Promise<Window> }
export function usePipWindow() {
  const [preferences, setPreferences, storageFailed] = useLocalState(PIP_KEY, defaultPipPreferences, isPipPreferences)
  const [pipWindow, setPipWindow] = useState<Window | null>(null)
  const active = useRef<Window | null>(null)
  const pending = useRef(false), mounted = useRef(true)
  const api = (window as Window & { documentPictureInPicture?: PipAPI }).documentPictureInPicture
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; active.current?.close() } }, [])
  async function open() {
    if (!api) throw new Error('请使用 Chrome / Edge 116+ 打开桌面悬浮窗。')
    if (active.current && !active.current.closed) { active.current.focus(); return }
    if (pending.current) return
    pending.current = true
    try {
      const pip = await api.requestWindow({ width: PIP_SIZE.width, height: preferences.expanded ? PIP_SIZE.expanded : PIP_SIZE.collapsed })
      if (!mounted.current) { pip.close(); return }
      pip.document.title = '一刻 · 专注中'
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach(node => pip.document.head.appendChild(node.cloneNode(true)))
      pip.document.documentElement.lang = 'zh-CN'
      const syncTheme = () => {
        pip.document.documentElement.classList.toggle('dark', document.documentElement.classList.contains('dark'))
        pip.document.documentElement.dataset.phase = document.documentElement.dataset.phase ?? 'idle'
      }
      syncTheme()
      const observer = new MutationObserver(syncTheme)
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-phase'] })
      pip.document.body.className = 'pip-body'
      active.current = pip; setPipWindow(pip)
      pip.addEventListener('pagehide', () => { observer.disconnect(); active.current = null; if (mounted.current) setPipWindow(null) }, { once: true })
    } finally { pending.current = false }
  }
  function toggleExpanded() {
    if (preferences.locked) return
    const expanded = !preferences.expanded
    const pip = active.current
    // resizeTo takes outer dimensions; account for the browser's native chrome.
    // Keep this synchronous with the click, because PiP resizing needs user activation.
    if (pip && !pip.closed) {
      try { pip.resizeTo(PIP_SIZE.width + Math.max(0, pip.outerWidth - pip.innerWidth), (expanded ? PIP_SIZE.expanded : PIP_SIZE.collapsed) + Math.max(0, pip.outerHeight - pip.innerHeight)) } catch { /* Browser minimum sizes/policies may prevent resizing; content still collapses. */ }
    }
    setPreferences({ ...preferences, expanded })
  }
  return { pipWindow, open, supported: !!api, close: () => active.current?.close(), preferences, storageFailed,
    toggleExpanded, toggleLocked: () => setPreferences(p => ({ ...p, locked: !p.locked })),
  }
}
