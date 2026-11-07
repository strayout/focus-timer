import { test, expect } from '@playwright/test'

test('微交互只读计时，预设指示器跟随选择，减少动态效果关闭位移', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: '15 分钟', exact: true }).click()
  await expect(page.getByRole('timer')).toHaveText('15:00')
  await expect(page.locator('.presets')).toHaveAttribute('data-indicated', 'true')
  expect(await page.locator('.presets').evaluate(el => parseFloat(getComputedStyle(el).getPropertyValue('--preset-width')))).toBeGreaterThan(0)
  await page.getByRole('button', { name: '开始专注', exact: true }).click()
  await expect(page.locator('.app-shell')).toHaveAttribute('data-running', 'true')
  await page.getByRole('button', { name: '暂停一下' }).click()
  await expect(page.locator('.app-shell')).toHaveAttribute('data-running', 'false')
  expect(await page.locator('h1 > span').evaluate(el => getComputedStyle(el).animationName)).toBe('none')
  expect(await page.locator('.start-button').evaluate(el => getComputedStyle(el).translate)).toBe('none')
})
