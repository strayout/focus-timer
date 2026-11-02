import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

const lines = readFileSync(new URL('../语录原始素材.txt', import.meta.url), 'utf8').split(/\r?\n/)
const quotes = [], discarded = [], seen = new Set()
let section = ''
for (const [index, raw] of lines.entries()) {
  let text = raw.trim().replace(/^\*+|\*+$/g, '').replace(/^\d+[.、．]\s*/, '')
  if (/^[一二三四五六七八九十]+、/.test(text)) section = text
  const reject = reason => discarded.push({ line: index + 1, reason, text: raw })
  if (!text) { reject('空行'); continue }
  let author
  const attributed = text.match(/^(.+?)。?——(.+)$/)
  const named = text.match(/^([^：]{1,8})：["“](.+)["”]。?$/)
  if (attributed) { text = attributed[1]; author = attributed[2] }
  else if (named) { author = named[1]; text = named[2] }
  else if (text.startsWith('威廉·詹姆斯：通过调节')) { author = '威廉·詹姆斯（素材转述）'; text = text.split('：')[1] }
  else if (!((section.includes('综合') && /^\d+[.、．]/.test(raw.trim())) || /^(能力是做出来的|真正的高手|系统的意义)/.test(text))) { reject('标题、表格或说明性长文，未作为短句收录'); continue }
  text = text.replace(/^["“]|["”]$/g, '').replace(/\*\*/g, '').trim()
  if (!text || text.length > 180) { reject('空内容或长度超过 180 字'); continue }
  const key = text.replace(/[\s，。；：、！？“”"'《》]/g, '')
  if (seen.has(key)) { reject('重复短句'); continue }
  seen.add(key)
  quotes.push({ id: 'default-' + createHash('sha256').update(key).digest('hex').slice(0, 12), text, ...(author ? { author } : {}), createdAt: '2026-11-02T00:00:00.000Z' })
}
mkdirSync(new URL('../src/data/', import.meta.url), { recursive: true })
writeFileSync(new URL('../src/data/quotes.default.json', import.meta.url), JSON.stringify(quotes, null, 2) + '\n')
const report = { totalLines: lines.length, quotes: quotes.length, discardedLines: discarded.length, blankLines: discarded.filter(x => x.reason === '空行').length, discarded }
writeFileSync(new URL('../src/data/quotes.cleaning-report.json', import.meta.url), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ totalLines: report.totalLines, quotes: quotes.length, discardedLines: discarded.length, blankLines: report.blankLines, duplicateLines: discarded.filter(x => x.reason === '重复短句').length }, null, 2))
