import { useCallback, useEffect, useRef, useState } from 'react'
import defaults from '@/data/quotes.default.json'
import { readStored, saveStored, subscribeStored } from '@/lib/storage'
import { whileLeader } from '@/lib/locks'
import { IMPORTS_KEY, QUOTES_KEY, isIds, isQuotes, mergeCuratedQuotes, type Quote } from '@/lib/quoteLibrary'
import { useLocalState } from './useLocalState'
export type { Quote } from '@/lib/quoteLibrary'
const isId = (value: unknown): value is string => typeof value === 'string'
export function useQuotes(running: boolean, intervalSeconds: number) {
  const [imported] = useState(() => readStored(IMPORTS_KEY, [], isIds))
  const [quotes, setQuotes] = useState(() => mergeCuratedQuotes(readStored(QUOTES_KEY, defaults, isQuotes), defaults, imported))
  const [storageFailed, setStorageFailed] = useState(false)
  const remote = useRef<Quote[] | undefined>(undefined)
  useEffect(() => subscribeStored(QUOTES_KEY, isQuotes, next => { remote.current = next; setQuotes(next) }), [])
  useEffect(() => {
    if (quotes === remote.current) return // Edited and saved by another window.
    // Save quotes before acknowledging the batch, so failed writes can be retried on reload.
    const saved = saveStored(QUOTES_KEY, quotes)
    const acknowledged = saved && saveStored(IMPORTS_KEY, [...new Set([...imported, ...defaults.filter(q => q.id.startsWith('curated-')).map(q => q.id)])])
    queueMicrotask(() => setStorageFailed(!acknowledged))
  }, [quotes, imported])
  // The current quote is shared, so the main window and the floating window show the same line.
  const [firstId] = useState(() => quotes[Math.floor(Math.random() * quotes.length)]?.id ?? '')
  const [id, setId] = useLocalState('focus.quote.current.v1', firstId, isId)
  const next = useCallback(() => {
    const pool = quotes.filter(q => q.id !== id)
    if (pool.length) setId(pool[Math.floor(Math.random() * pool.length)].id)
  }, [quotes, id, setId])
  useEffect(() => {
    if (!running) return
    // Only one window rotates; the others follow through the shared id.
    return whileLeader('focus.quote-rotation', () => {
      const interval = window.setInterval(next, intervalSeconds * 1000)
      return () => clearInterval(interval)
    })
  }, [running, intervalSeconds, next])
  return { quotes, setQuotes, quote: quotes.find(q => q.id === id) ?? quotes[0], next, storageFailed, restore: () => setQuotes(defaults) }
}
