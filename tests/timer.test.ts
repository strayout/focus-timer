import { test } from 'node:test'
import assert from 'node:assert/strict'
import { progressOf, phaseOf } from '../src/lib/progress.ts'
import { idleTimer, startTimer, remainingAt, pauseTimer, advanceTimer, formatTime, isTimer } from '../src/lib/timer.ts'
test('后台长时间不触发 tick，仍根据时间戳计算', () => {
  const state = startTimer(idleTimer(60000), 1000)
  assert.equal(remainingAt(state, 46000), 15000)
  assert.equal(advanceTimer(state, 65000).status, 'completed')
})
test('暂停冻结，继续从剩余时间计时，过期暂停直接完成', () => {
  const state = startTimer(idleTimer(60000), 1000), paused = pauseTimer(state, 11000)
  assert.equal(remainingAt(paused, 999999), 50000)
  assert.equal(startTimer(paused, 100000).endsAt, 150000)
  assert.equal(pauseTimer(state, 61000).status, 'completed')
})
test('序列化恢复与格式化、非法数据验证', () => {
  const state = startTimer(idleTimer(), 1000), restored = JSON.parse(JSON.stringify(state))
  assert.equal(isTimer(restored), true)
  assert.equal(remainingAt(restored, 61000), 24 * 60000)
  assert.equal(formatTime(1), '00:01')
  assert.equal(formatTime(3600000), '01:00:00')
  assert.equal(formatTime(-100), '00:00')
  assert.equal(isTimer({ ...state, endsAt: null }), false)
  assert.equal(isTimer({ ...state, durationMs: -1 }), false)
  assert.equal(isTimer(null), false)
})
test('视觉进度只读取计时快照，暂停冻结且边界夹紧', () => {
  const running = startTimer(idleTimer(60000), 1000)
  const original = JSON.stringify(running)
  assert.equal(progressOf(running, 31000), .5)
  assert.equal(progressOf(running, -1000), 0)
  assert.equal(progressOf(running, 999999), 1)
  assert.equal(JSON.stringify(running), original)
  const paused = pauseTimer(running, 31000)
  assert.equal(progressOf(paused, 999999), .5)
  assert.equal(progressOf(idleTimer(0), 1000), 0)
  assert.equal(phaseOf('paused'), 'paused')
  assert.equal(phaseOf('running'), 'focus')
  assert.equal(phaseOf('completed'), 'done')
})

