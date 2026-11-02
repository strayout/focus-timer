# Cloudflare Pages 部署

本项目是纯静态 Vite 前端，发布目录为 `dist`，部署在域名根路径 `/`。通过 Cloudflare Pages 原生 GitHub 集成自动构建，无需 Wrangler、Workers、GitHub Actions 或部署密钥。本文只是操作说明，尚未连接账号、初始化本地 Git 仓库或发布网站。

## 1. 本地验证和推送 GitHub

使用 Node.js **24.15.0**（已写入 `.node-version`；`package.json` 要求 24.12+、低于 25）。保留并提交 `package-lock.json`。

依赖锁文件中的下载地址已统一到 npm 官方源，与 `.npmrc` 一致；未改变依赖版本或完整性校验。运行 `npm ci` 前关闭本项目的 Vite 开发/预览进程，避免 Windows 原生依赖被占用。

```powershell
cd E:\timer
npm ci
npm run lint
npm test
npm run build
npm run test:e2e

# 额外验收生产构建，关闭后清除该环境变量
$env:E2E_PREVIEW = '1'
npm run test:e2e
Remove-Item Env:E2E_PREVIEW
```

浏览器测试使用本机 Microsoft Edge。Cloudflare 构建不运行浏览器测试，不需要安装 Edge。`npm run preview` 仅用于本地验收，不是生产服务。

在 GitHub 手动创建空仓库（可选私有），不要预先添加 README。当前目录尚未初始化 Git；在本机手动执行以下命令，将占位地址替换成自己的仓库地址：

```powershell
git init -b main
git add .
git diff --cached --stat
git diff --cached --name-only
# 确认暂存文件没有密钥、环境文件、个人导出或浏览器数据后再继续
git commit -m "Prepare focus timer for Cloudflare Pages"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

`.gitignore` 排除了依赖、构建产物、缓存、`.env*`（示例文件除外）、常见密钥、测试报告、浏览器资料、`exports/`、`backups/`、语录原始素材与逐行清洗报告。忽略规则不会移除已跟踪文件，推送前仍需检查暂存清单。不要把个人备份放进 `src/` 或 `public/`。

**`src/data/quotes.default.json` 是公开发布内容**，会打包进网页，即使 GitHub 仓库为私有也能被访问者读取。请人工确认默认语录的公开范围及署名。用户在网页中新增的语录、计时和设置只在浏览器 localStorage，不会进入构建。原始素材保留在本机；新克隆仓库无需运行 `quotes:clean`，直接使用已提交的默认 JSON 即可。

## 2. Cloudflare Pages 配置

进入 Cloudflare 的 Workers & Pages → Create application → Pages → Import an existing Git repository，手动授权 GitHub，仅授予目标仓库权限，选中该仓库。

| 配置项 | 值 |
| --- | --- |
| Framework preset | React (Vite)，或 Vite 对应预设 |
| Production branch | `main` |
| Root directory | 仓库根目录，留空；不是本机 `E:\timer` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Build system | 当前受支持的构建镜像，使用 `.node-version` 指定版本 |
| 环境变量 / Secrets | 应用不需要；如需手动指定 Node，设 `NODE_VERSION=24.15.0`，Production 与 Preview 保持一致 |

不要设置 `NODE_ENV=production` 来省略构建依赖；TypeScript、Vite、Tailwind 都是构建所需的 devDependencies。不要添加 `CLOUDFLARE_API_TOKEN` 或 GitHub token 到源码。任何未来的 `VITE_*` 值都视为公开前端配置，不能保存密钥。

保存并部署，检查日志显示 Node 24.15.0、依赖安装成功、`tsc`/Vite 构建成功，并且发布目录是 `dist`。Cloudflare 负责 HTTPS 静态托管。无需手动上传 `dist`，无需修改 Vite 的 `base` 为 GitHub 仓库名；这里不是 GitHub Pages。

Pages 在没有根目录 `404.html` 时提供默认 SPA 回退。本项目没有路径路由，不额外添加 `_redirects`。`public/_headers` 会复制到 `dist`：HTML 重新验证缓存，带内容哈希的 `/assets/*` 长期缓存，附带基本响应头；没有添加会限制 PiP、内联进度样式或音频的 CSP/Permissions-Policy。

## 3. 正式域名验收

- 在桌面 Chrome / Edge 的正式 HTTPS 页面直接打开应用，确认脚本、CSS、字体、favicon 无 404 或混合内容，刷新页面正常。查看实际响应头是否应用 `_headers`；本地 Vite preview 不解析 Cloudflare 的该文件。
- 点击开始，分别测试允许和拒绝通知。通知需要 HTTPS、用户点击和权限，部分移动浏览器不支持当前 `new Notification()` 形式；当前代码捕获失败并保留页面内提示，没有 Service Worker 推送。
- 提示音依赖用户点击解锁 AudioContext、浏览器自动播放策略与系统音量。刷新/重开后音频上下文不会持久化，因此自动恢复的计时不能保证响铃；页面提示仍保留。
- 打开 PiP，检查样式/字体、深浅色同步、暂停/继续、语录、展开缩放与防误触记忆。需要支持 Document PiP 的桌面浏览器、顶层页面与用户点击；不支持或策略禁止时显示提示。浏览器原生网址栏/标题栏无法隐藏或透明。
- 开始短计时，切到其他标签页后返回、刷新、关闭页面后重新打开。运行时按 `endsAt - Date.now()` 校准；离开期间到期会在重新打开时完成，已完成后刷新不会重复提醒。暂停后的计时保持暂停。关页/休眠期间没有后台提醒保证，修改系统时间会影响计时。
- localStorage 受浏览器策略、空间和隐私模式影响。禁用存储时应显示保存失败提示。数据和通知权限按来源隔离：localhost、不同端口、预览域名、`pages.dev`、自定义域名互不迁移；首次正式上线不会带入本机个人数据。同一个正式域名更新版本会沿用本地数据键。

## 4. 更新与回退

修改后先跑上述检查，再 `git add`、检查暂存内容、`git commit`、`git push`。推送 `main` 后 Pages 自动构建并更新正式站点；其他分支/PR 是否生成预览由 Pages 的分支部署设置决定。检查部署日志及正式地址后再验收。

需要自定义域名时在 Pages 项目的 Custom domains 中添加，并按控制台提示配置 DNS、等待证书生效；不要只在外部添加 DNS 而跳过 Pages 域名绑定。选定正式域名后尽量保持稳定，避免本地存储因来源变更不可见。

需要回退时在 Pages 的 Deployments 中选择之前成功的生产部署进行 Rollback，再用 Git revert 提交修复代码，避免下一次推送重新发布问题版本。未在真实 Cloudflare 环境验证响应头、证书和权限前，本地通过不代表线上验收完成。

## 本次准备的验证结果（2026-11-02）

- `npm ci` 全新安装成功；build、lint、3 项计时单元测试通过。
- 开发服务器与生产构建 preview 各 9 项浏览器测试通过，包括真实 PiP、资源/字体加载、语录编辑、暂停/刷新/关闭后重开恢复。Windows 沙箱下自动清理测试服务器曾阻塞，手动停止本项目 Vite 测试进程后两次测试均以退出码 0 完成。
- `.gitignore` 已用隔离临时 Git 仓库验证：环境文件、密钥、个人资料示例路径被忽略；lockfile、默认语录、部署配置可提交。项目根目录未创建 `.git`。
- 未连接 GitHub/Cloudflare、未推送、未实际部署。Cloudflare 的 Linux 构建、HTTPS 域名、响应头及系统通知/声音仍需按上方步骤在线验收。

参考（Cloudflare 官方）：
- https://developers.cloudflare.com/pages/configuration/build-configuration/
- https://developers.cloudflare.com/pages/configuration/build-image/
- https://developers.cloudflare.com/pages/configuration/git-integration/
- https://developers.cloudflare.com/pages/configuration/headers/
- https://developers.cloudflare.com/pages/configuration/serving-pages/

浏览器 API 官方说明：
- https://developer.chrome.com/docs/web-platform/document-picture-in-picture
- https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
