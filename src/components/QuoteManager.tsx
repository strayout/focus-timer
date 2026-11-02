import { useState } from 'react'
import { Plus, Pencil, Trash2, RotateCcw, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldLabel, FieldGroup } from '@/components/ui/field'
import type { Quote } from '@/hooks/useQuotes'
export function QuoteManager({ quotes, setQuotes, restore }: { quotes: Quote[]; setQuotes: (quotes: Quote[]) => void; restore: () => void }) {
  const [text, setText] = useState(''), [author, setAuthor] = useState(''), [editing, setEditing] = useState<string | null>(null), [confirmRestore, setConfirmRestore] = useState(false)
  function clear() { setText(''); setAuthor(''); setEditing(null) }
  function save() {
    if (!text.trim()) return
    if (editing) setQuotes(quotes.map(q => q.id === editing ? { ...q, text: text.trim(), author: author.trim() || undefined } : q))
    else setQuotes([{ id: crypto.randomUUID(), text: text.trim(), ...(author.trim() ? { author: author.trim() } : {}), createdAt: new Date().toISOString() }, ...quotes])
    clear()
  }
  return <Dialog onOpenChange={() => setConfirmRestore(false)}><DialogTrigger asChild><Button variant="ghost" size="sm"><Pencil data-icon="inline-start" />管理语录</Button></DialogTrigger><DialogContent className="quote-dialog"><DialogHeader><DialogTitle>你的灵感语录库</DialogTitle><DialogDescription>留住让你愿意再向前一步的话。共 {quotes.length} 条，自动保存在此浏览器。</DialogDescription></DialogHeader>
    <form onSubmit={e => { e.preventDefault(); save() }}><FieldGroup><Field><FieldLabel htmlFor="quote-text">{editing ? '编辑语录' : '添加一句鼓励'}</FieldLabel><Textarea id="quote-text" placeholder="写下此刻想对自己说的话…" maxLength={500} required value={text} onChange={e => setText(e.target.value)} /></Field><Field><FieldLabel htmlFor="quote-author">作者 / 出处（选填）</FieldLabel><Input id="quote-author" maxLength={100} value={author} onChange={e => setAuthor(e.target.value)} /></Field><div className="flex gap-2"><Button type="submit" disabled={!text.trim()}>{editing ? <Check data-icon="inline-start" /> : <Plus data-icon="inline-start" />}{editing ? '保存修改' : '添加语录'}</Button>{editing && <Button variant="ghost" type="button" onClick={clear}>取消编辑</Button>}</div></FieldGroup></form>
    <div className="quote-list">{quotes.length === 0 && <p className="muted">还没有语录，从上方添加第一句吧。</p>}{quotes.map(q => <div className="quote-row" key={q.id}><div><p>{q.text}</p><small>{q.author || '给自己的话'}</small></div><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label={`编辑：${q.text}`} onClick={() => { setEditing(q.id); setText(q.text); setAuthor(q.author ?? '') }}><Pencil /></Button><Button variant="ghost" size="icon" aria-label={`删除：${q.text}`} onClick={() => { setQuotes(quotes.filter(item => item.id !== q.id)); if (editing === q.id) clear() }}><Trash2 /></Button></div></div>)}</div>
    <div className="restore-row"><Button variant="outline" onClick={() => { if (confirmRestore) { restore(); clear(); setConfirmRestore(false) } else setConfirmRestore(true) }}><RotateCcw data-icon="inline-start" />{confirmRestore ? '确认恢复（将替换全部语录）' : '恢复默认语录'}</Button>{confirmRestore && <Button variant="ghost" onClick={() => setConfirmRestore(false)}>取消</Button>}</div>
  </DialogContent></Dialog>
}
