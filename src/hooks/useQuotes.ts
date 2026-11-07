import { useCallback, useEffect, useState } from 'react'
import defaults from '@/data/quotes.default.json'
import { readStored, saveStored } from '@/lib/storage'
import { IMPORTS_KEY, QUOTES_KEY, isIds, isQuotes, mergeCuratedQuotes } from '@/lib/quoteLibrary'
export type { Quote } from '@/lib/quoteLibrary'
export function useQuotes(running: boolean, intervalSeconds: number) {
  const [imported] = useState(() => readStored(IMPORTS_KEY, [], isIds))
  const [quotes, setQuotes] = useState(() => mergeCuratedQuotes(readStored(QUOTES_KEY, defaults, isQuotes), defaults, imported))
  const [storageFailed, setStorageFailed] = useState(false)
  useEffect(() => {
    // Save quotes before acknowledging the batch, so failed writes can be retried on reload.
    const saved = saveStored(QUOTES_KEY, quotes)
    const acknowledged = saved && saveStored(IMPORTS_KEY, [...new Set([...imported, ...defaults.filter(q => q.id.startsWith('curated-')).map(q => q.id)])])
    queueMicrotask(() => setStorageFailed(!acknowledged))
  }, [quotes, imported])
  const [id, setId] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]?.id)
  const next = useCallback(() => {
    const pool = quotes.filter(q => q.id !== id)
    if (pool.length) setId(pool[Math.floor(Math.random() * pool.length)].id)
  }, [quotes, id])
  useEffect(() => {
    if (!running) return
    const interval = window.setInterval(next, intervalSeconds * 1000)
    return () => clearInterval(interval)
  }, [running, intervalSeconds, next])
  return { quotes, setQuotes, quote: quotes.find(q => q.id === id) ?? quotes[0], next, storageFailed, restore: () => setQuotes(defaults) }
}
