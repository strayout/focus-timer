/**
 * Cross-window coordination through Web Locks, so that side effects shared by the main
 * and mini windows (quote rotation, completion sound) happen in exactly one of them.
 * Without the API every window simply acts on its own, as a single window always did.
 */
const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined

/** Runs `start` in one window at a time; another window takes over when the holder stops or closes. */
export function whileLeader(name: string, start: () => () => void) {
  if (!locks) return start()
  const controller = new AbortController()
  locks.request(name, { signal: controller.signal }, () => new Promise<void>(resolve => {
    const stop = start()
    controller.signal.addEventListener('abort', () => { stop(); resolve() })
  })).catch(() => { /* Aborted before the lock was granted. */ })
  return () => controller.abort()
}

/** Runs `effect` only in the first window that asks within `holdMs`. */
export function claimOnce(name: string, effect: () => void, holdMs = 3000) {
  if (!locks) { effect(); return }
  locks.request(name, { ifAvailable: true }, async lock => {
    if (!lock) return
    effect()
    await new Promise(resolve => setTimeout(resolve, holdMs))
  }).catch(() => { /* Optional feedback only. */ })
}
