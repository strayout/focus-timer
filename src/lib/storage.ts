export function readStored<T>(key: string, fallback: T, validate: (value: unknown) => value is T): T {
  try { const value: unknown = JSON.parse(localStorage.getItem(key) ?? 'null'); return validate(value) ? value : fallback } catch { return fallback }
}
export function saveStored(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true } catch { return false }
}
