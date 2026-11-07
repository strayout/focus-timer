export interface Quote { id: string; text: string; author?: string; createdAt: string }
export const QUOTES_KEY = 'focus.quotes.v1'
export const IMPORTS_KEY = 'focus.quotes.imported.v1'
export const isQuotes = (v: unknown): v is Quote[] => Array.isArray(v) && v.every(q => q && typeof q.id === 'string' && typeof q.text === 'string' && q.text.trim().length > 0 && typeof q.createdAt === 'string' && (q.author === undefined || typeof q.author === 'string'))
export const isIds = (v: unknown): v is string[] => Array.isArray(v) && v.every(id => typeof id === 'string')
const textKey = (text: string) => text.replace(/[\s，。；：、！？“”"'《》]/g, '')
export function mergeCuratedQuotes(saved: Quote[], defaults: Quote[], imported: string[]) {
  const seenText = new Set(saved.map(q => textKey(q.text)))
  const seenIds = new Set([...saved.map(q => q.id), ...imported])
  const additions = defaults.filter(q => {
    if (!q.id.startsWith('curated-') || seenIds.has(q.id) || seenText.has(textKey(q.text))) return false
    seenText.add(textKey(q.text)); seenIds.add(q.id); return true
  })
  // Correct only the untouched legacy attribution; never replace a user's edited record.
  const corrected = saved.map(q => q.id === 'default-f1f346a0a101' && q.text === '少成若天性，习惯成自然。' && q.author === '孔子家语'
    ? { ...q, author: defaults.find(d => d.id === q.id)?.author ?? q.author } : q)
  return [...corrected, ...additions]
}
