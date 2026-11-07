import { chromium } from '@playwright/test'
import { writeFile, mkdir } from 'node:fs/promises'

// Prefer npm run preview during a soak so HMR cannot interrupt the recording.
const soak = process.argv.includes('--soak')
const idleDuration = soak ? 5 * 60_000 : 15_000
const runningDuration = soak ? 25 * 60_000 + 1500 : 15_000
const browser = await chromium.launch({ channel: 'msedge', headless: true })
let heartbeat
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, reducedMotion: 'no-preference' })
  await page.goto(process.env.TIMER_PROFILE_URL || 'http://localhost:5173/')
  await page.waitForLoadState('networkidle')
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')
  await page.evaluate(() => {
    const original = window.requestAnimationFrame.bind(window)
    // Fixed histograms avoid making the profiler itself grow with session length.
    const make = () => ({ samples: 0, total: 0, max: 0, histogram: Array(201).fill(0) })
    let durations = make(), intervals = make(), last = 0
    const record = (stats, value) => {
      stats.samples++; stats.total += value; stats.max = Math.max(stats.max, value)
      stats.histogram[Math.min(200, Math.floor(value * 10))]++
    }
    window.requestAnimationFrame = cb => original(time => {
      if (last) record(intervals, time - last)
      last = time
      const start = performance.now(); cb(time); record(durations, performance.now() - start)
    })
    Object.defineProperty(window, '__profile', { get: () => ({ durations, intervals }) })
    Object.defineProperty(window, '__resetProfile', { value: () => { durations = make(); intervals = make(); last = 0 } })
  })
  const resources = []
  const started = Date.now()
  let phase = 'idle'
  const sample = async () => {
    await cdp.send('HeapProfiler.collectGarbage')
    const { metrics } = await cdp.send('Performance.getMetrics')
    const values = Object.fromEntries(metrics.map(({ name, value }) => [name, value]))
    const entry = { elapsedSeconds: Math.round((Date.now() - started) / 1000), phase, heapBytes: values.JSHeapUsedSize, nodes: values.Nodes, listeners: values.JSEventListeners }
    resources.push(entry); console.log('RESOURCE', JSON.stringify(entry))
  }
  await sample()
  heartbeat = setInterval(() => { void sample().catch(error => console.error(error.message)) }, 60_000)
  console.log(`Sampling idle for ${idleDuration / 1000}s`)
  await new Promise(resolve => setTimeout(resolve, idleDuration))
  const idle = await page.evaluate(() => Object.getOwnPropertyDescriptor(window, '__profile').get())
  await sample()
  await page.evaluate(() => Object.getOwnPropertyDescriptor(window, '__resetProfile').value())
  await page.getByRole('button', { name: '开始专注', exact: true }).click()
  phase = 'running'
  console.log(`Sampling running for ${runningDuration / 1000}s`)
  await new Promise(resolve => setTimeout(resolve, runningDuration))
  const running = await page.evaluate(() => Object.getOwnPropertyDescriptor(window, '__profile').get())
  await sample()
  const summarize = stats => {
    let count = 0, p95 = 0
    for (let bucket = 0; bucket < stats.histogram.length; bucket++) {
      count += stats.histogram[bucket]
      if (count >= stats.samples * .95) { p95 = bucket / 10; break }
    }
    return { samples: stats.samples, meanMs: stats.total / Math.max(1, stats.samples), p95ApproxMs: p95, maxMs: stats.max }
  }
  const report = {
    mode: soak ? 'real headless Edge, 5m idle + 25m running' : 'real headless Edge, 15s idle + 15s running',
    idle: { callbacks: summarize(idle.durations), frameIntervals: summarize(idle.intervals) },
    running: { callbacks: summarize(running.durations), frameIntervals: summarize(running.intervals) },
    resources, finalTitle: await page.title(), finalTimer: await page.getByRole('timer').textContent(),
  }
  await mkdir('test-results', { recursive: true })
  await page.screenshot({ path: `test-results/motion-${soak ? 'soak-completed' : 'focus'}.png`, fullPage: true, animations: 'disabled' })
  const output = `test-results/motion-${soak ? 'soak' : 'performance'}.json`
  await writeFile(output, JSON.stringify(report, null, 2))
  if (soak && !report.finalTitle.includes('专注完成')) throw new Error('Soak session did not complete')
  console.log('PROFILE', JSON.stringify(report))
} finally { clearInterval(heartbeat); await browser.close() }
