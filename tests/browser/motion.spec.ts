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

test('粒子点火、暂停与一次性完成爆发，时间始终保留文本', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.getByRole('button', { name: '自定义时长' }).click()
  await page.getByRole('spinbutton', { name: '设置分' }).fill('0')
  await page.getByRole('spinbutton', { name: '设置秒' }).fill('3')
  await page.getByRole('button', { name: '仅使用本次' }).click()
  await page.getByRole('button', { name: '开始专注', exact: true }).click()
  await expect(page.locator('.particle-ring')).toHaveAttribute('data-effect', 'ignition')
  await page.getByRole('button', { name: '暂停一下' }).click()
  await expect(page.locator('.particle-ring')).toHaveAttribute('data-effect', 'paused')
  await expect(page.locator('.rolling-time > span')).toHaveCount(2)
  await page.getByRole('button', { name: '继续专注' }).click()
  await expect(page.locator('.particle-ring')).toHaveAttribute('data-effect', 'burst', { timeout: 6000 })
  await expect(page.getByRole('timer')).toHaveText('00:00')
  await expect(page.locator('.particle-ring')).toHaveAttribute('data-effect', 'completed')
  await page.reload()
  await expect(page.locator('.particle-ring')).toHaveAttribute('data-effect', 'completed')
})

test('标题与 favicon 按时间戳同步，完成反馈一次且刷新不重播', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => {
    let calls = 0
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: () => { calls++; sessionStorage.setItem('vibrations', String(calls)); return true } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: '自定义时长' }).click()
  await page.getByRole('spinbutton', { name: '设置分' }).fill('0')
  await page.getByRole('spinbutton', { name: '设置秒' }).fill('3')
  await page.getByRole('button', { name: '仅使用本次' }).click()
  await page.getByRole('button', { name: '开始专注', exact: true }).click()
  await expect(page).toHaveTitle(/00:0[1-3] · 专注中 — 一刻/)
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', /^data:image\/png/)
  await page.getByRole('button', { name: '暂停一下' }).click()
  await expect(page).toHaveTitle(/已暂停 — 一刻/)
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg')
  await page.getByRole('button', { name: '继续专注' }).click()
  await expect(page).toHaveTitle('00:00 · 专注完成 — 一刻', { timeout: 6000 })
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('vibrations'))).toBe('1')
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg')
  await page.reload()
  expect(await page.evaluate(() => sessionStorage.getItem('vibrations'))).toBe('1')
  expect(await page.locator('.completion-glow').evaluate(el => el.getAnimations().length)).toBe(0)
})

test('环境视差与语录过渡可关闭，后台暂停装饰动画', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.mouse.move(300, 300)
  await expect.poll(() => page.locator('.app-shell').evaluate(el => el.style.getPropertyValue('--grid-x'))).not.toBe('')
  const before = await page.locator('blockquote').getAttribute('aria-label')
  await page.getByRole('button', { name: '换一句', exact: true }).click()
  await expect(page.locator('blockquote')).not.toHaveAttribute('aria-label', before!)
  await expect.poll(() => page.locator('.quote-letters').evaluate(el => el.getAnimations({ subtree: true }).length)).toBeGreaterThan(0)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await page.locator('.quote-letters').evaluate(el => el.getAnimations({ subtree: true }).length)).toBe(0)
  expect(await page.locator('.environment-halos > span').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none')
  expect(await page.locator('.app-shell').evaluate(el => getComputedStyle(el, '::before').transform)).toBe('none')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.locator('.app-shell')).toHaveAttribute('data-hidden', 'true')
  expect(await page.locator('.environment-halos > span').first().evaluate(el => getComputedStyle(el).animationPlayState)).toBe('paused')
})

test('专注模式保留浅深色小字对比度，减少动态效果恢复默认图标', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '开始专注', exact: true }).click()
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg')
  const contrast = async () => page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d')!
    const rgb = (color: string) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3) }
    const luminance = (channels: number[]) => channels.map(c => { const n = c / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4 }).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0)
    const bg = rgb(getComputedStyle(document.documentElement).getPropertyValue('--background'))
    return ['.gentle-note p', '.page-intro p', '.tool-title p', '.local-note', '.quote-label'].map(selector => {
      const el = document.querySelector(selector)!, fg = rgb(getComputedStyle(el).color)
      let opacity = 1, ancestor: Element | null = el
      while (ancestor) { opacity *= Number(getComputedStyle(ancestor).opacity); ancestor = ancestor.parentElement }
      const ink = fg.map((c, i) => c * opacity + bg[i] * (1 - opacity))
      return (luminance(bg) + .05) / (luminance(ink) + .05)
    }).map(ratio => ratio < 1 ? 1 / ratio : ratio)
  })
  expect(Math.min(...await contrast())).toBeGreaterThanOrEqual(4.5)
  await page.getByRole('button', { name: '切换深色模式' }).click()
  expect(Math.min(...await contrast())).toBeGreaterThanOrEqual(4.5)
})

test('动画与观察器不可用时，基础计时与语录仍正常', async ({ page }) => {
  await page.addInitScript(() => {
    Element.prototype.animate = () => { throw new Error('Animations unavailable') }
    window.ResizeObserver = class { constructor() { throw new Error('Observer unavailable') } } as unknown as typeof ResizeObserver
    window.IntersectionObserver = class { constructor() { throw new Error('Observer unavailable') } } as unknown as typeof IntersectionObserver
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.getByRole('button', { name: '开始专注', exact: true }).click()
  await page.getByRole('button', { name: '换一句', exact: true }).click()
  await page.getByRole('button', { name: '暂停一下' }).click()
  await expect(page.getByRole('button', { name: '继续专注' })).toBeVisible()
  await expect(page.locator('.quote-letters')).not.toBeEmpty()
  await page.getByRole('button', { name: '重置', exact: true }).click()
  await expect(page.getByRole('timer')).toHaveText('25:00')
})
