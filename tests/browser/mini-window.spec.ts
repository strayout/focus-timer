import { test, expect } from '@playwright/test'

// The desktop shell opens /mini.html as its own window. Two pages of one browser context
// share localStorage the same way, so the synchronisation is verified here without the shell.
test('悬浮窗与主窗口双向同步，主窗口关闭后继续计时', async ({ context }) => {
  const main = await context.newPage(), mini = await context.newPage()
  await main.goto('/')
  await mini.goto('/mini.html')
  await main.getByLabel('5 分钟', { exact: true }).click()
  await expect(mini.getByRole('timer')).toHaveText('05:00')

  await main.getByRole('button', { name: '开始专注', exact: true }).click()
  await expect(mini.getByRole('button', { name: '暂停' })).toBeVisible()
  await expect(mini.getByRole('timer')).toHaveText(/04:5\d/)

  await mini.getByRole('button', { name: '暂停' }).click()
  await expect(main.getByRole('button', { name: '继续专注' })).toBeVisible()
  await expect(main.getByRole('timer')).toHaveText((await mini.getByRole('timer').textContent())!)

  await mini.getByRole('button', { name: '展开语录' }).click()
  await mini.getByRole('button', { name: '换一句语录' }).click()
  const quote = (await mini.locator('#mini-quote').textContent())!
  await expect(main.locator('.inspiration-panel')).toContainText(quote)

  await mini.getByRole('button', { name: '继续' }).click()
  await expect(main.getByRole('button', { name: '暂停一下' })).toBeVisible()
  await main.close()
  const before = await mini.getByRole('timer').textContent()
  await expect(mini.getByRole('timer')).not.toHaveText(before!, { timeout: 3000 })
  await expect(mini.getByRole('button', { name: '暂停' })).toBeVisible()

  await mini.getByRole('button', { name: '重置' }).click()
  const reopened = await context.newPage()
  await reopened.goto('/')
  await expect(reopened.getByRole('timer')).toHaveText('05:00')
  await expect(reopened.getByRole('button', { name: '开始专注', exact: true })).toBeVisible()
})
