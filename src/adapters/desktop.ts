/**
 * Desktop (Tauri) window control. The shell only owns windows: timer rules stay in
 * src/lib/timer.ts and state travels between windows through shared localStorage.
 * Everything here is a no-op or a rejection in the browser build.
 */
export type DesktopWindow = 'main' | 'mini'
export const isDesktop = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/** Focuses the window, creating it from src-tauri/tauri.conf.json when it is closed. */
export async function showWindow(label: DesktopWindow) {
  if (!isDesktop) throw new Error('仅桌面版支持独立悬浮窗。')
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('show_window', { label })
}
export async function resizeCurrentWindow(width: number, height: number) {
  if (!isDesktop) return
  const { getCurrentWindow, LogicalSize } = await import('@tauri-apps/api/window')
  await getCurrentWindow().setSize(new LogicalSize(width, height))
}
export async function closeCurrentWindow() {
  if (!isDesktop) { window.close(); return }
  const { getCurrentWindow } = await import('@tauri-apps/api/window')
  await getCurrentWindow().close()
}

/**
 * Hiding the main window to the tray stops painting, but WebView2 leaves `document.hidden`
 * false. The shell calls `window.__shellHidden` instead, and this makes the page's ordinary
 * visibility API reflect it, so everything already keyed on `document.hidden` and
 * `visibilitychange` (decorative animations, the canvas, the tick rate) reacts unchanged.
 */
export function followShellVisibility() {
  if (!isDesktop) return
  const native = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden')?.get
  if (!native) return
  let shellHidden = false
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => shellHidden || native.call(document) })
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (document.hidden ? 'hidden' : 'visible') })
  ;(window as Window & { __shellHidden?: (hidden: boolean) => void }).__shellHidden = hidden => {
    if (hidden === shellHidden) return
    shellHidden = hidden
    document.dispatchEvent(new Event('visibilitychange'))
  }
}
