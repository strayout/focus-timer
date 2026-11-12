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
