import { useCallback, useEffect, useState } from 'react'
import defaults from '@/data/quotes.default.json'
import { useLocalState } from './useLocalState'
export interface Quote { id: string; text: string; author?: string; createdAt: string }
const isQuotes = (v: unknown): v is Quote[] => Array.isArray(v) && v.every(q => q && typeof q.id === 'string' && typeof q.text === 'string' && q.text.trim().length > 0 && typeof q.createdAt === 'string' && (q.author === undefined || typeof q.author === 'string'))
export function useQuotes(running: boolean, intervalSeconds: number) {
  const [quotes, setQuotes, storageFailed] = useLocalState<Quote[]>('focus.quotes.v1', defaults, isQuotes)
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
