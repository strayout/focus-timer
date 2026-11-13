# 一刻 Focus Timer 交接文档

更新日期：2026-11-13（Asia/Shanghai）

## 当前目标

一刻是本地优先的中文学习计时器，现已有网页版和 Windows 桌面版（Tauri 2）两种形态，核心计时规则共用同一套代码。桌面悬浮窗已从浏览器 Document Picture-in-Picture 升级为独立的原生置顶窗口，并补齐了托盘、单实例、原生通知。当前分支收尾后计划合并到 main；下一阶段目标是安卓适配。

## 当前分支与基线

- 当前分支：feat/tauri-floating-window
- 分支基线：ui-polish-v1 之上接续 feat/motion-ui 的五个动效提交（A–E）
- 已提交但尚未合并到 main：桌面悬浮窗原型、界面打磨（主页面与悬浮窗）、悬浮窗排版重做、桌面托盘/单实例/原生通知、托盘隐藏时的渲染与耗电修复
- 已在真实 Windows 桌面程序上实测（独立进程，而非仅 webview 内验证），安装包已打包并在本机与他人电脑上验证可正常安装运行
- 尚未推送到 GitHub/Cloudflare，尚未合并到 main

已有背景和使用说明见：

- README.md（含"桌面版（Tauri 2，原型）"一节）
- MOTION.md
- DEPLOY.md

## 已完成的改动

### 计时核心（未变）

- src/lib/timer.ts 使用 endsAt - Date.now() 计算运行中剩余时间，纯函数、有 Node 测试覆盖。
- src/hooks/useTimer.ts 对外行为保持一致；运行中 200ms interval 只触发界面刷新。
- 桌面壳未在 Rust 层重新实现任何计时逻辑；所有窗口读取同一份 localStorage 中的 TimerState。

### 跨窗口状态同步

- src/hooks/useLocalState.ts 通过 `storage` 事件跟随其他窗口的写入；useTimer、useQuotes、usePipWindow 偏好均已切换到这个共享实现。
- src/lib/locks.ts 用 Web Locks 保证完成提示音、系统通知、语录自动轮换只由一个窗口执行，避免多窗口重复触发。
- 主窗口与悬浮窗各自独立运行 useTimer/useQuotes，彼此是对等关系，不是谁控制谁。

### 视觉层（未变）与界面打磨（新增）

- 阶段 A–E 的入场动效、粒子环、环境光晕、完成仪式、降级与对比度验收保持不变，详见 MOTION.md。
- 新增一轮界面打磨：主色压深、背景改冷调瓷白；标题/品牌名/语录改用楷体，数字用更细的 Geist；表盘新增 60 道刻度；卡片去毛玻璃改实底+细描边+长柔影；时长选择合并为分段控件。
- 悬浮窗排版重做为"状态 / 时间 / 操作"三行，开始/暂停改为居中实心圆形主按钮。
- src/index.css 做过一轮基于 postcss 的死代码清理：移除了被后续图层（尤其是打磨阶段新增的 "F · 质感" 区块）在源码顺序上完全覆盖、永远不会生效的声明（主要是旧版 shadcn 默认主题色和若干响应式断点的旧值）。清理前后用无头浏览器对全部页面状态 × 宽度 × 明暗主题做了计算样式快照比对，确认零视觉差异（详见下方"CSS 清理方法"）。

### 悬浮窗：从浏览器 PiP 到原生窗口

- 浏览器版继续使用 src/hooks/usePipWindow.ts（Document Picture-in-Picture），未删除、未改变行为。
- 桌面版新增 mini.html + src/components/MiniWindow.tsx 作为独立入口，在 Tauri 中以 `mini` 窗口标签运行，和主窗口对等，共享同一份 localStorage。
- src/adapters/desktop.ts 是前端侧的桌面能力适配层：`isDesktop` 检测、`showWindow`（打开/聚焦主窗口或悬浮窗）、`resizeCurrentWindow`、`closeCurrentWindow`，在浏览器里全部退化为无操作或浏览器原生行为。
- src/components/MiniTimer.tsx 在桌面模式下多了 `windowControls`（打开主窗口 / 关闭悬浮窗），悬停才出现。

### 桌面壳（src-tauri/）

- src-tauri/src/main.rs：
  - `show_window` 命令：聚焦已存在的窗口，或按 tauri.conf.json 里的配置重新创建；必须异步执行，同步调用会在 Windows 上死锁。
  - 单实例：再次启动只会唤起已运行的主窗口，不会产生第二个进程。
  - 托盘：左键打开/聚焦主窗口；右键菜单可打开主窗口、打开悬浮窗、退出一刻。
  - 关闭主窗口的默认行为改为隐藏到托盘而不是退出进程，这样运行中的计时和到点提醒不会因为"关掉窗口"而中断；真正退出走托盘菜单的"退出一刻"。
  - 隐藏到托盘时**同时隐藏该窗口内部的 WebView2**（不只是隐藏操作系统窗口），并通过 `window.__shellHidden` 通知前端；src/adapters/desktop.ts 的 `followShellVisibility()` 据此让 `document.hidden`/`visibilitychange` 如实反映隐藏状态，使原有的画布动画、环境光晕暂停逻辑无需改动即可在托盘隐藏时真正停止渲染。修复前隐藏到托盘仍会持续渲染装饰动画，整机占用约 1/3 个核心；修复后降到约 1–2%。
  - 原生通知：接入 tauri-plugin-notification，网页代码里的 `Notification` API 由插件透明接管，不需要改业务代码。
  - 窗口位置记忆：tauri-plugin-window-state，只记忆位置（`StateFlags::POSITION`），不记忆尺寸（尺寸由配置和悬浮窗自身的展开/收起逻辑决定）。
- src-tauri/tauri.conf.json：主窗口 1180×860（可调整），悬浮窗 240×120、无边框、始终置顶、不可调整大小；NSIS 安装包按当前用户安装、简体中文界面、自动补装 WebView2、显示名"一刻"。
- src-tauri/capabilities/default.json：窗口控制 + 通知权限，不含文件、shell、网络访问。

### 部署准备

- 网页版：Vite 静态构建配置可用于 Cloudflare Pages，未连接或发布到任何账号（未变）。
- 桌面版：`npm run desktop:build` 可在系统终端打出 NSIS 安装包；**已实测**：打包、安装、在本机和他人电脑上运行均正常。未签名，安装时会有 Windows SmartScreen 警告。

## 关键决策

1. 计时规则保持单一来源（延续自动效阶段）：任何窗口、任何语言的壳层都不重新实现倒计时。
2. 跨窗口同步走存储层，不走消息传递：两个窗口各自订阅同一份 localStorage 并响应 `storage` 事件，没有引入 timer:snapshot / timer:command 这类自定义窄接口。原因：Tauri 的多窗口本来就能共享同一个 WebView2 用户数据目录下的 localStorage，复用已有的 useLocalState 抽象比新增一层 IPC 协议更省代码、也更不容易让两个窗口的状态出现分叉。
3. 托盘隐藏 = 真正不渲染，不是"看不见但仍在跑"。隐藏窗口时连同 WebView 一起隐藏，并用一个全局钩子让页面的 visibility API 如实反映，而不是去逐一修改每处动画代码的隐藏判断逻辑。
4. 浏览器版与桌面版的悬浮窗入口做了检测分流（`isDesktop` 判断走原生窗口还是 Document PiP），而不是用条件编译裁出两份代码；两者共享 MiniTimer 展示组件。
5. CSS 清理只删除"被源码顺序上后出现的同选择器同属性覆盖、因而永远不生效"的声明，不做任何合并、重写或语义调整；用程序化的计算样式快照比对而非人工审查来确认零视觉回归。

## 未解决的问题

### 合并前的收尾

- 分支尚未合并到 main，也未打标签。
- 建议合并前确认：本节下方"CSS 清理方法"描述的快照比对已通过（零真实差异）。
- 托盘左键点击、右键菜单三个条目尚未由人工在真机上逐一点击确认（已通过脚本间接验证它们调用的底层逻辑）。

### 测试与真机验收遗留

承接自上一版 HANDOFF 的遗留项，均未变化：

- 尚未完成真实 Android 震动、Firefox/Safari、4× CPU 降速、真实后台 10 分钟、物理休眠唤醒和 200% 缩放验收。
- Playwright 自动启动 Vite 时 Windows teardown 偶尔等待超时的问题未排查（复用已启动服务时测试可正常退出，不影响结果正确性）。

### 桌面版新增的遗留项

- 未做代码签名、开机启动、自动更新、全局快捷键。
- 仅验收了 Windows；macOS / Linux 未构建、未验收。
- 窗口**可见且空闲**时仍占约 1/3 个核心（主要是背景光晕和圆环动画的持续重绘），这与托盘隐藏无关，是另一个尚待优化的性能点。
- 安装包未签名，安装时会触发 SmartScreen 警告；是否购买签名证书、走微软商店，还是接受警告，需要产品决策。

### 安卓（尚未开始）

- 尚未安装 Android Studio / SDK，尚未验证 Tauri 2 在安卓上的可行性。
- 关键风险点：安卓后台计时——应用进后台后 WebView 会被系统冻结，到点不会响，需要在开始计时时用系统闹钟/AlarmManager 预约一次性通知，暂停或重置时取消；这是安卓能否复用 Tauri 壳的决定性验证项。
- 安卓没有系统级悬浮窗能力，Tauri 在安卓上只有一个窗口；第一版应隐藏"桌面悬浮窗"入口，真正的悬浮窗需要另写原生插件，建议后置。
- 楷体在安卓和部分电脑上不存在，会回退到黑体；建议后续内置一款开源楷体（如霞鹜文楷）按需分片加载，保持三端观感一致。
- 较新的 CSS（`color-mix`、`:has` 等）大约需要 Chromium 111+；需要给旧版系统 WebView 加启动检测和降级样式。

## 下一步建议（按优先级）

1. **收尾本分支**：确认下方快照比对结果，补充人工点击验证托盘菜单，合并到 main 并打一个桌面版里程碑标签。
2. **可见态性能优化**：降低空闲/运行时背景光晕与圆环动画的持续重绘成本（例如降低帧率、减少同时绘制的层数），目标是窗口可见但无人交互时的占用明显低于当前的约 1/3 核心。
3. **安卓最小验证**（半天到一天）：安装 Android Studio + SDK，跑通一个空的 Tauri 安卓壳，只验证一件事——锁屏十分钟后，用 AlarmManager 预约的通知能否准时弹出。结果决定安卓继续用 Tauri 2 还是改用 Capacitor。
4. **安卓适配**：验证通过后，接入定时通知到计时流程、处理手机安全区/返回键/常亮、安卓 13+ 的通知权限、内置楷体、旧 WebView 降级。
5. **发布准备**：图标与启动图、版本号、安装包/APK 签名、隐私政策（如需上架）、真机验收清单。

## CSS 清理方法（供复核）

清理用一个基于 postcss 的脚本完成：解析 src/index.css 的 AST，对每条声明检查"是否存在一条源码顺序更靠后、选择器文本完全相同、位于无条件（非 @media）顶层规则里的同属性声明，且重要性不低于当前声明"；满足则判定为永远被覆盖的死代码并删除，随后清理变空的规则和 @media 块。`@keyframes`/`@layer`/`@theme`/`@property`/`@font-face` 内部不touch。

验证方式：用无头浏览器遍历 8 种计时器状态（idle/running/paused/completed × 明暗主题）× 4 种主页面宽度 + 悬浮窗收起/展开两种尺寸，共 48 种场景，对每个元素（含 ::before/::after）的全部计算样式属性做哈希快照；清理前取两次独立快照互相比对以确定"随机噪音"基线（字体加载时序等导致的、与代码无关的微小差异），再与清理后的快照比较，确认"真实差异"为 0。方法论上的一个坑：`getComputedStyle` 返回对象的 `for...of` 迭代顺序在不同页面加载之间不保证稳定，必须先把属性名排序后再序列化做哈希，否则会把纯粹的顺序差异误判为内容差异（第一次尝试就踩到了这个坑，噪音率一度高达 87%，排序后降到约 0.2%）。

## 建议技能

- code-review：合并前审查窗口生命周期、托盘事件处理、通信和资源清理。
- webapp-testing：验证网页版与桌面版交互回归。
- diagnosing-bugs：排查 Windows Playwright/Vite teardown 进程问题；若要继续排查可见态性能，建议从这里入手定位具体是哪层动画在消耗。
- prototype：安卓最小验证阶段，先搭一个空壳单独确认通知时机问题。

## 重要约束

- 不上传密钥、个人语录导出、浏览器数据或本地环境文件。
- 不擅自连接 GitHub、Cloudflare、Microsoft 账号。
- 不修改计时规则来适配视觉、窗口或平台效果；src/lib/timer.ts 和 useTimer 的对外语义是唯一真源。
- 桌面/移动壳新增依赖前先确认体积、平台范围和维护成本。
- 保持 prefers-reduced-motion、Canvas/音频失败降级和 PiP 不支持时的网页提示；新增的 followShellVisibility 同样遵循"壳层失败不影响核心计时"的原则（找不到 `__TAURI_INTERNALS__` 或原生属性描述符时直接跳过，不抛错）。
