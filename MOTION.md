# 动效验收与回滚

基线：`ui-polish-v1`（`94f2126`）。动效位于 `feat/motion-ui`，每阶段独立提交。撤销单阶段使用 `git revert <hash>`；返回基线使用 `git switch main`（先保存未提交改动）。

## A：氛围与微交互

- 首次挂载错落入场、卡片聚光、测量式预设指示器、开始按钮磁吸／按压／扫光、状态圆点、命令面板复用 Radix 开关动画。
- 专注时降低标题与侧栏装饰的强度；保留侧栏文字对比度。悬停与键盘聚焦恢复强调。
- 手动：刷新查看入场；切换 5／60 分钟并缩放浏览器；鼠标移动到卡片与开始按钮；开始后悬停侧栏，再用 Tab 导航；Ctrl/⌘+K 打开关闭面板；开启系统减少动态效果核对无位移。
- 验证：lint、build、4 项 Node 测试、16 项 Playwright 通过。

## B：粒子环与数字

- 空闲 1.4px 呼吸；开始 600ms 顺时针点火；进度前缘 13 点彗星尾迹；暂停琥珀、衰减后静止；完成 1100ms 径向扩散与环上光波，之后静态高亮。
- Canvas 仅用所属窗口 rAF，DPR ≤ 2；隐藏、离屏、reduce 时停止；重新打开已完成页面不重播爆发；PiP 继续使用原有轻量 DOM／CSS 进度。
- 数字仅两个视觉子节点，180ms 微幅过渡；完整 `role=timer` 文本与每分钟读屏提示保留。
- 手动：设置 10 秒后开始／暂停／继续，查看点火、彗星与完成；完成后刷新不重播；暂停时缩放与切换主题；系统 reduce 开关热切换。
- 验证：lint、build、4 项 Node、17 项 Playwright 通过。

## D：完成仪式与浏览器标签

- 完成状态同时驱动原有和弦、粒子爆发与 1100ms 边缘柔光；声音开关控制音效与可选震动。音频失败不影响视觉，reduce 关闭爆发／柔光／震动／动态图标。
- 标题以结束时间戳每秒校准；暂停／完成显示对应文字。favicon 使用 32×32 Canvas，每秒至多更新一次；暂停／空闲／完成／reduce 恢复默认；Canvas 失败也恢复默认。
- 系统后台节流期间无法保证标签每秒获得绘制机会；恢复可见／聚焦时立即按时间戳校准。刷新已完成页面不重复仪式。
- 手动：设置 5 秒，观察标签标题、favicon 与完成；关闭声音后重试；开启 reduce 后重试；切换后台再返回；已完成状态刷新。
- 验证：lint、build、4 项 Node、18 项 Playwright 通过。

## C：环境层与语录

- 网格视差限制 ±6px；两处相位光晕以 28／36 秒漂移，运行时放慢至 56 秒；深色略增强，浅色保持低透明度。
- 换语录时旧句 120ms 淡出、新句逐字 18ms 错落（长句封顶），总时长 ≤ 680ms；按钮图标轻旋转。完整语义文本与装饰层分离，PiP 同步测试保持原断言。
- 手动：移动鼠标观察背景与卡片；切换语录；运行与暂停对比环境强度；切换 reduce；后台返回时确认没有补播语录动画。
- 验证：lint、build、4 项 Node、19 项 Playwright 通过。

## E：验收与降级

- lint、build、原有 4 项 Node 规则测试及 22 项 Playwright 全部通过。原有测试语义和 PiP 语录断言保持不变。
- `src/lib/timer.ts`、`src/hooks/useTimer.ts` 与基线完全一致，未新增运行时依赖。
- `prefers-reduced-motion` 支持热切换：关闭 Canvas、位移、缩放、逐字过渡、柔光、震动及动态 favicon；完整数字、语录、SVG 进度、主题色与按钮仍可使用。
- 页面隐藏：Canvas 与 CSS 动画暂停，数字／语录／完成的 Web Animations 取消；计时和标签标题继续使用时间戳，恢复可见立即校准。
- 浅色正文 muted token 从 `#717486` 调整为 `#626679`，在基础背景上的对比度从约 4.21:1 提升到 5.17:1；专注模式标题区域的小字使用正文色，浅深色均自动检查 ≥ 4.5:1。实际玻璃叠层与系统字体渲染仍建议在目标屏幕观察。
- Canvas、AudioContext、Web Animations 与可选观察器抛错时均验证基础计时可用；音频节点结束后清除事件处理器并断开连接。
- 虚拟时间检查覆盖 5 分钟空闲、25 分钟运行以及两轮各 25 次开始／暂停／重置；第二轮监听器与 DOM 数量稳定，完成后粒子 rAF 为 0。该检查使用时间跳跃，不代表真实持续帧性能。
- 开发模式堆差回归采用 4MiB 预算，容纳并行测试下 React／Vite／V8 缓存的波动；监听器、DOM 和 rAF 分别检查，真实生产长跑作为独立证据，不用单次堆大小断言证明“绝对无泄漏”。

### 复现实机性能采样

先启动开发服务；持续采样建议使用 `npm run build` 后的 `npm run preview`，避免 HMR 中断。在另一个终端执行：

```powershell
# 持续采样用的服务（独立终端）
npm run build
npm run preview -- --host 127.0.0.1

# 实际 15 秒空闲 + 15 秒运行，输出固定大小直方图统计
# 若采样 preview，先设置下方 TIMER_PROFILE_URL；不设置时默认访问开发端口 5173
node scripts/profile-motion.mjs

# 实际 5 分钟空闲 + 25 分钟运行，约 30 分钟
$env:TIMER_PROFILE_URL = 'http://127.0.0.1:4173/'
node scripts/profile-motion.mjs --soak
Remove-Item Env:TIMER_PROFILE_URL
```

使用独立的 headless Edge 浏览器上下文，不读取个人浏览器数据。每分钟采样 GC 后 JS 堆、DOM 与监听器；采样器使用固定大小直方图，避免自身数据随时间累积。回调耗时只反映 JS 动画回调，不包括 GPU 合成、屏幕功耗或所有设备上的帧率。

输出 `test-results/motion-performance.json` 或 `motion-soak.json`，以及对应截图。这些产物被 `.gitignore` 排除，重新运行 Playwright 可能清理它们。

2026-11-07 已完成生产预览的真实 **5 分钟空闲 + 25 分钟运行**。空闲阶段监听器 175 个，运行初始化后稳定为 194 个；运行中 GC 后 JS 堆约 5.3–5.5MiB，DOM 数量随语录长短波动，未观察到持续增长。空闲／运行的 JS 动画回调 P95 均约 0.2ms；运行时最大帧间隔约 292ms（包含采样与环境扰动），不宣称零掉帧。最终标题为“00:00 · 专注完成 — 一刻”，DOM 时间为“00:00”。完整报告与截图另存至忽略提交的 `output/motion-ui/soak-2026-11-07.json`、`soak-completed-2026-11-07.png`。长跑后仅补充了两处小字颜色／透明度修正，并重新执行全部质量门禁。

### 动效清单

| 动效 | 触发／状态 | 降级方式 | 文件 |
| --- | --- | --- | --- |
| 60–90ms 错落入场 | 首次页面挂载，830ms 内结束 | reduce 静态；结束释放 opacity 控制 | `src/index.css` |
| 卡片聚光、按钮磁吸 | 精细指针移动，委托监听与单帧合并 | reduce／触屏禁用，隐藏时清理帧 | `src/hooks/useMotionSurface.ts`、`src/index.css` |
| 预设滑动指示器 | 原有时长选中项改变／尺寸改变 | reduce 即时定位；观察器失败保留选中样式 | `useMotionSurface.ts`、`index.css` |
| 按压与扫光 | 按下／悬停开始按钮 | reduce 静态 | `index.css` |
| 专注降噪 | 原状态 running；hover／focus-within 恢复 | 文字保留对比度，不阻止交互 | `src/App.tsx`、`index.css` |
| 标题状态点 | idle 呼吸、running 轻脉冲；完成过渡一次 | reduce 静态；刷新 completed 不重播 | `useTimerPresentation.ts`、`index.css` |
| 命令面板开合／高亮 | 原有 Radix 打开、关闭和选择 | reduce 关闭缩放和位移，保留键盘操作 | `index.css`、原有 `ui/dialog.tsx` |
| 粒子呼吸、点火、彗星、爆发 | 只读状态／进度；完成爆发一次 | reduce／Canvas 故障使用 SVG；隐藏／离屏停帧 | `src/components/visuals/ParticleRing.tsx`、`src/hooks/useProgressRef.ts` |
| 双层数字滚动 | 格式化秒数变化，180ms | reduce／隐藏／动画失败用 DOM 文本 | `src/components/visuals/TimerDigits.tsx` |
| 完成边缘柔光、震动 | running → completed，仅一次 | reduce／隐藏跳过；声音关闭禁用震动；无 API 时静默 | `src/hooks/useTimerPresentation.ts` |
| 标签标题／favicon | running 每秒采样；可见／聚焦即时校准 | reduce／Canvas 失败／非运行恢复默认 favicon | `useTimerPresentation.ts` |
| 网格视差、相位光晕 | 精细指针；idle 漂移 ≥28s、running 放慢 | reduce 静态；隐藏暂停；PiP 不挂载环境层 | `useMotionSurface.ts`、`index.css` |
| 语录逐字与换句图标旋转 | 语录文本变化，≤680ms | reduce／隐藏／动画失败保留完整文本 | `src/components/visuals/AnimatedQuote.tsx` |

### 手动验收顺序

1. 空闲时移动鼠标、切换预设、打开命令面板；键盘 Tab 检查焦点。
2. 设置 10 秒，开始／暂停／继续，观察数字和环；运行时悬停右栏。
3. 等待完成，观察一次和弦、光波和柔光；刷新不重复。震动需支持该能力的设备实测。
4. 浅深色、390px／320px 窄屏与系统 reduce 热切换。
5. 打开 PiP，后台主页面后在 PiP 暂停／继续／换句；再返回主页面检查时间、标题和语录一致。
6. 分别用声音关闭、通知拒绝和系统静音重试；页面内完成提示始终保留。
