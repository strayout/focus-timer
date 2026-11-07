import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
export function TimePicker({ value, onChange, disabled }: { value: number; onChange: (value: number) => void; disabled: boolean }) {
  const values = [Math.floor(value / 3600000), Math.floor(value / 60000) % 60, Math.floor(value / 1000) % 60]
  return <><FieldGroup className="time-picker">{['时', '分', '秒'].map((label, index) => <Field key={label}><Input id={`time-${index}`} type="number" min="0" max={index ? 59 : 99} value={String(values[index]).padStart(2, '0')} disabled={disabled} onChange={e => { const next = [...values]; next[index] = Math.max(0, Math.min(index ? 59 : 99, Math.trunc(Number(e.target.value) || 0))); onChange((next[0] * 3600 + next[1] * 60 + next[2]) * 1000) }} aria-label={`设置${label}`} /><FieldLabel htmlFor={`time-${index}`}>{label}</FieldLabel></Field>)}</FieldGroup><div className="duration-slider"><div className="duration-slider-caption"><span>滑动选择分钟</span><span>1–120 分钟</span></div><Slider aria-label="专注分钟数" min={1} max={120} step={1} value={[Math.max(1, Math.min(120, Math.round(value / 60000)))]} disabled={disabled} onValueChange={values => onChange(values[0] * 60000)} /><p className="muted">更长时长或精确到秒，可直接编辑上方数字。</p></div></>
}
