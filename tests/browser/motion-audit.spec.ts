import { test, expect } from '@playwright/test'

test('虚拟时间跳跃覆盖 5 分钟空闲与 25 分钟运行并检查资源边界', async ({ page }, testInfo) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.clock.install()
  await page.clock.pauseAt(new Date(Date.now() + 1000))
  await page.evaluate(() => {
    const request = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window)
    const pending = new Set<number>()
    let frames = 0, peak = 0
    window.requestAnimationFrame = callback => {
      const id = request(time => { pending.delete(id); frames++; callback(time) })
      pending.add(id); peak = Math.max(peak, pending.size); return id
    }
    window.cancelAnimationFrame = id => { pending.delete(id); cancel(id) }
    Object.defineProperty(window, '__motionAudit', { get: () => ({ frames, pending: pending.size, peak }) })
  })
  await page.clock.runFor(2000)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')
  const sample = async () => {
    await cdp.send('HeapProfiler.collectGarbage')
    const metrics = await cdp.send('Performance.getMetrics')
    const values = Object.fromEntries(metrics.metrics.map(({ name, value }) => [name, value]))
    const frames = await page.evaluate(() => Object.getOwnPropertyDescriptor(window, '__motionAudit')!.get!())
    return { heap: values.JSHeapUsedSize, nodes: values.Nodes, listeners: values.JSEventListeners, frames }
  }
  const baseline = await sample()
  await page.clock.fastForward(5 * 60_000)
  await page.clock.runFor(1000)
  const idle = await sample()
  await page.getByRole('button', { name: '开始专注', exact: true }).click({ force: true })
  // Keep rendering short windows between 15-second jumps. This verifies timer
  // calibration and bounded resources, not 30 minutes of real frame throughput.
  for (let minute = 0; minute < 100; minute++) {
    await page.clock.fastForward(14_900)
    await page.clock.runFor(100)
  }
  await page.clock.runFor(1500)
  const completed = await sample()
  await expect(page.getByRole('timer')).toHaveText('00:00')
  await expect(page).toHaveTitle('00:00 · 专注完成 — 一刻')
  // A completion toast has its own temporary listeners. Compare equal idle
  // states after its lifetime instead of treating active UI as a leak.
  await page.clock.fastForward(12000)
  await page.clock.runFor(1000)
  await page.getByRole('button', { name: '重置', exact: true }).click({ force: true })
  await page.clock.runFor(2000)
  const settled = await sample()
  // First interaction initializes optional audio/browser feedback. Check for
  // cumulative leaks against this warmed state with 25 more start/pause/reset cycles.
  const cycleControls = async () => {
    for (let cycle = 0; cycle < 25; cycle++) {
      await page.locator('.start-button').evaluate(el => (el as HTMLButtonElement).click())
      await page.clock.runFor(32)
      await page.locator('.start-button').evaluate(el => (el as HTMLButtonElement).click())
      await page.getByRole('button', { name: '重置', exact: true }).evaluate(el => (el as HTMLButtonElement).click())
      await page.clock.runFor(32)
    }
    await page.clock.runFor(2000)
    // AudioContext uses its own real clock, not Playwright's virtual clock.
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  await cycleControls()
  const repeated = await sample()
  await cycleControls()
  const repeatedAgain = await sample()
  const report = { mode: 'virtual-time jumps with short rendering windows; not a real-time 30-minute performance recording', baseline, idle, completed, settled, repeated, repeatedAgain }
  await testInfo.attach('motion-resource-audit', { body: JSON.stringify(report, null, 2), contentType: 'application/json' })
  console.log('MOTION_AUDIT', JSON.stringify(report))
  expect(idle.heap - baseline.heap).toBeLessThan(5 * 1024 * 1024)
  expect(completed.heap - baseline.heap).toBeLessThan(5 * 1024 * 1024)
  expect(repeatedAgain.listeners - repeated.listeners).toBeLessThan(5)
  expect(repeatedAgain.nodes - repeated.nodes).toBeLessThan(40)
  // Development React/Vite and V8 caches vary under parallel browser load.
  // Keep a bounded heap budget; exact zero growth is asserted for neither GC
  // nor JIT caches. Listener/node counts and the production soak are separate evidence.
  expect(repeatedAgain.heap - repeated.heap).toBeLessThan(4 * 1024 * 1024)
  expect(idle.frames.pending).toBeLessThanOrEqual(2)
  expect(completed.frames.pending).toBe(0)
  await cdp.detach()
})
