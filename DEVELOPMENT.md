# 开发文档

面向想要修改代码、理解实现或参与开发的人。产品说明和下载见 [README.md](README.md)。

## 技术栈

Vite、React、TypeScript、Tailwind CSS、shadcn/ui 构成网页版；桌面版在同一套前端外加 Tauri 2（Rust）窗口壳，位于 `src-tauri/`。没有后端，没有账号系统。

## 启动

推荐 Node.js 24 LTS（至少 24.12），npm 11。

```sh
npm install
npm run dev
```

打开终端给出的本地地址，默认 http://localhost:5173。预览生产构建：

```sh
npm run build
npm run preview
```

### 桌面版

额外需要 Rust（rustup，MSVC 工具链）、Visual Studio Build Tools 的 C++ 组件、WebView2。

```sh
npm run desktop:dev      # 开发：自动启动 Vite 并打开桌面窗口
npm run desktop:build    # 生成安装包（NSIS），位于 src-tauri/target/release/bundle/nsis/
```

Windows 下如果 `tauri build` 打包 NSIS 安装包时报“系统无法将文件移到不同的磁盘驱动器”，通常是某些沙盒化终端把 `%LOCALAPPDATA%`/`%TEMP%` 重定向到了另一个虚拟卷，导致跨卷改名失败。解决办法是在构建前把两者都指向同一个真实目录：

```powershell
$env:LOCALAPPDATA = "E:\tauri-cache"
$env:TEMP = "E:\tauri-cache\tmp"
$env:TMP = "E:\tauri-cache\tmp"
npm run desktop:build
```

## 架构

层次为 `lib/timer.ts` + `lib/progress.ts`（纯规则，可单测）→ `useTimer`（计时状态）→ 展示组件。计时器状态为 `{ status, durationMs, remainingMs, endsAt }`；运行中根据 `endsAt - Date.now()` 计算剩余时间，界面的 200ms interval 只触发重绘，不参与计时精度。刷新、切回标签页或窗口重新获得焦点后立即按时间戳校准；已完成的计时刷新后不会重复提醒。

视觉层（`components/visuals/*`）只读取 TimerState、进度和相位快照，不反向修改计时逻辑；每帧计算写 ref 或 Canvas，不写 React state。页面隐藏、元素离开视口或 `prefers-reduced-motion: reduce` 时停止动画，卸载时清理 RAF、观察器和监听器。Canvas 不可用或绘制异常时自动回退到基础 SVG 圆环，音频错误被反馈层隔离——核心计时不受视觉或音频故障影响。详细的动效触发条件、降级方式、分阶段提交和手动验收清单见 [MOTION.md](MOTION.md)。

### 跨窗口同步（桌面版）

桌面版的主窗口和悬浮窗（`mini.html` / `src/components/MiniWindow.tsx`）是两个独立、对等的窗口，各自运行同一套 `useTimer`/`useQuotes`，通过 `src/hooks/useLocalState.ts` 读写同一份 `localStorage` 并订阅浏览器的 `storage` 事件互相跟随，没有引入自定义的窗口间消息协议。完成提示音、系统通知和语录自动轮换用 `src/lib/locks.ts`（Web Locks）保证只由一个窗口触发一次。网页版打开多个标签页时同样会互相同步。

桌面壳（`src-tauri/src/main.rs`）只负责窗口生命周期（创建/聚焦窗口、托盘、单实例、窗口位置记忆、把原生 `Notification` 接到系统通知），不包含任何计时逻辑；前端的适配层在 `src/adapters/desktop.ts`，浏览器环境下这些调用全部退化为无操作。关闭主窗口会隐藏到系统托盘而不是退出进程，隐藏时会同步停止该窗口内部网页的渲染（而不只是隐藏操作系统窗口），这样背景动画不会在托盘里空转耗电，但计时仍按时间戳继续，到点仍会提醒。

## 语录数据

语录结构为 `{ id, text, author?, createdAt }`。清洗脚本见 `scripts/clean-quotes.mjs`，运行方式：

```sh
npm run quotes:clean
```

原始素材是两篇长文，提取规则、每一批次的收录/去重统计和未收录原因都写在生成的清洗报告（`src/data/quotes.cleaning-report.json`）里，原素材不修改。现有浏览器语录库只做一次性增量补入（按 ID 和去标点文本去重），保留用户的新增、改写和删除；已导入的批次记录在 `focus.quotes.imported.v1`，删除后刷新不会重新补回。

## 目录

```text
scripts/clean-quotes.mjs       素材短句提取、清洗与报告
src/components/               计时圆环、时间选择、语录管理、主/迷你计时器
src/components/ui/            shadcn CLI 添加的组件
src/components/visuals/       粒子环、数字过渡、语录动画等纯展示组件
src/hooks/                    useTimer、useQuotes、usePipWindow、useLocalState
src/adapters/desktop.ts       浏览器/桌面能力分流
src/lib/timer.ts              可单测的计时纯函数
src/lib/locks.ts              跨窗口的"只执行一次"协调（Web Locks）
src/lib/feedback.ts           Web Audio 提示音
src/lib/storage.ts            容错本地存储 + 跨窗口订阅
src/data/quotes.default.json  默认语录
src-tauri/                    桌面壳（Tauri 2 / Rust）
tests/                        纯函数和浏览器验收测试
```

## 检查

```sh
npm run build
npm run lint
npm test
npm run test:e2e
```

浏览器测试默认使用已安装的 Microsoft Edge（headless），自动启动本地 Vite。覆盖计时与刷新恢复、暂停继续、到期与重复提醒、预设持久化、语录管理、深色模式、移动布局、跨窗口（主窗口/悬浮窗）双向同步，以及浏览器支持时的真实 Document PiP 控制。截图位于 `test-results/`（已在 `.gitignore` 中忽略）。

性能采样：已有开发服务时运行 `node scripts/profile-motion.mjs` 采样实际 15 秒空闲与 15 秒运行；`--soak` 执行实际 5 分钟空闲与 25 分钟运行。结果位于 `test-results/`。

## 部署

网页版通过 Cloudflare Pages 的 Git 集成自动构建部署，细节、正式域名验收和回退流程见 [DEPLOY.md](DEPLOY.md)。桌面版通过 GitHub Release 分发安装包，不走应用商店，不做自动更新。

## 已知限制

- PiP（浏览器悬浮窗）顶部的网址栏、标题栏属于浏览器原生界面，无法用网页代码隐藏或设为半透明。
- Document Picture-in-Picture 需要支持该 API 的桌面 Chrome / Edge 116+，使用 localhost 或 HTTPS 并通过用户点击打开；不支持时显示升级提示，不影响基础计时。
- 应用完全退出（网页版关闭标签页、桌面版从托盘菜单退出）后没有后台进程，无法按时发声或发通知；再次打开时会按保存的结束时间校准。系统休眠期间，提醒可能延后，但恢复后的剩余时间按时间戳计算，不会算错。
- 通知和提示音受系统/浏览器权限、静音和自动播放策略限制；保留页面内完成提示作为后备。
- 清理站点数据（网页版）或卸载应用（桌面版）会清除本地保存的语录、预设和计时记录，没有云端备份。
- 桌面版目前只验收 Windows；macOS / Linux 未构建、未验收。未做代码签名、开机启动、全局快捷键、自动更新。
- 安卓等移动端尚未开始适配。

更完整的项目现状、决策记录和下一步计划见 [HANDOFF.md](HANDOFF.md)。
