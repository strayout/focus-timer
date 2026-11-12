export function readStored<T>(key: string, fallback: T, validate: (value: unknown) => value is T): T {
  try { const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null'); return validate(value) ? value : fallback } catch { return fallback }
}
export function saveStored(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true } catch { return false }
}
/**
 * Calls back when another same-origin window (browser tab, desktop main or mini window)
 * writes the key. The writing window itself is never notified. Callers must not write a
 * received value back, or two windows with changes in flight would echo each other forever.
 */
export function subscribeStored<T>(key: string, validate: (value: unknown) => value is T, onChange: (value: T) => void) {
  const listener = (event: StorageEvent) => {
    if (event.key !== key || event.newValue === null) return
    try { const value: unknown = JSON.parse(event.newValue); if (validate(value)) onChange(value) } catch { /* Ignore malformed writes. */ }
  }
  window.addEventListener('storage', listener)
  return () => window.removeEventListener('storage', listener)
}
