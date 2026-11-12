import { useEffect, useRef, useState } from 'react'
import { readStored, saveStored, subscribeStored } from '@/lib/storage'
/** Persisted state that also follows writes made by other windows of the app. `validate` must be a stable reference. */
export function useLocalState<T>(key: string, fallback: T, validate: (value: unknown) => value is T) {
  const [value, setValue] = useState(() => readStored(key, fallback, validate))
  const [storageFailed, setStorageFailed] = useState(false)
  const remote = useRef<T | undefined>(undefined)
  useEffect(() => subscribeStored(key, validate, next => { remote.current = next; setValue(next) }), [key, validate])
  useEffect(() => {
    if (value === remote.current) return // Already stored by the window that produced it.
    const failed = !saveStored(key, value)
    queueMicrotask(() => setStorageFailed(failed))
  }, [key, value])
  return [value, setValue, storageFailed] as const
}
