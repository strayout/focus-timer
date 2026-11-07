import { test, expect } from '@playwright/test'
import defaults from '../../src/data/quotes.default.json' with { type: 'json' }

test('已导入旧批次的用户获得全部成长箴言，删除后刷新不补回', async ({ page }) => {
  const oldBatch = defaults.filter(q => q.id.startsWith('curated-20261103-'))
  const growth = defaults.filter(q => q.id.startsWith('curated-20261105-'))
  expect(growth).toHaveLength(30)
  await page.goto('/')
  await page.evaluate(({ oldBatch }) => {
    localStorage.setItem('focus.quotes.v1', JSON.stringify(oldBatch))
    localStorage.setItem('focus.quotes.imported.v1', JSON.stringify(oldBatch.map(q => q.id)))
  }, { oldBatch })
  await page.reload()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('focus.quotes.v1')!))).toEqual([...oldBatch, ...growth])
  await page.getByRole('button', { name: '管理语录' }).click()
  await page.getByRole('button', { name: `删除：${growth[0].text}`, exact: true }).click()
  await page.reload()
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('focus.quotes.v1')!))).toEqual([...oldBatch, ...growth.slice(1)])
})

test('精选批次只补充一次，保留个人修改、避免文字重复，删除后不重加', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.removeItem('focus.quotes.imported.v1')
    localStorage.setItem('focus.quotes.v1', JSON.stringify([
      { id: 'personal', text: '这是我自己写的提醒。', author: '自己', createdAt: '2026-11-02T00:00:00.000Z' },
      { id: 'default-977a6ec654cd', text: '我改写后的学习提醒。', author: '我', createdAt: '2026-11-02T00:00:00.000Z' },
      { id: 'my-crown', text: '冠冕是暂时的光辉，是永恒的束缚', author: '我收藏的句子', createdAt: '2026-11-02T00:00:00.000Z' },
      { id: 'default-f1f346a0a101', text: '少成若天性，习惯成自然。', author: '孔子家语', createdAt: '2026-11-02T00:00:00.000Z' },
    ]))
  })
  await page.reload()
  const batchSize = defaults.filter(q => q.id.startsWith('curated-')).length
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('focus.quotes.v1')!).length)).toBe(4 + batchSize - 1)
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('focus.quotes.v1')!))
  expect(saved.find((q: { id: string }) => q.id === 'personal').text).toBe('这是我自己写的提醒。')
  expect(saved.find((q: { id: string }) => q.id === 'default-977a6ec654cd').text).toBe('我改写后的学习提醒。')
  expect(saved.find((q: { id: string }) => q.id === 'default-f1f346a0a101').author).toContain('大戴礼记')
  expect(saved.filter((q: { text: string }) => q.text.includes('冠冕是暂时的光辉'))).toHaveLength(1)
  // Deleted old defaults are not restored by the new batch.
  expect(saved.some((q: { id: string }) => q.id === 'default-55b25eb42891')).toBe(false)
  await page.getByRole('button', { name: '管理语录' }).click()
  await page.getByRole('button', { name: '删除：成为你自己。', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: '管理语录' }).click()
  await expect(page.getByRole('button', { name: '删除：成为你自己。', exact: true })).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('focus.quotes.v1')!).length)).toBe(4 + batchSize - 2)
})
