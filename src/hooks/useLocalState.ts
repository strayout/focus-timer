import { useEffect, useState } from 'react'
import { readStored, saveStored } from '@/lib/storage'
export function useLocalState<T>(key: string, fallback: T, validate: (value: unknown) => value is T) {
  const [value, setValue] = useState(() => readStored(key, fallback, validate))
  const [storageFailed, setStorageFailed] = useState(false)
  useEffect(() => {
    const failed = !saveStored(key, value)
    queueMicrotask(() => setStorageFailed(failed))
  }, [key, value])
  return [value, setValue, storageFailed] as const
}
