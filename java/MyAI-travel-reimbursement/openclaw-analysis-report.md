# OpenClaw 项目分析报告

> 仓库地址：https://github.com/openclaw/openclaw
> 报告时间：2026-06-17
> 数据来源：仓库 `main` 分支、版本 `openclaw 2026.6.8`（Latest, 2026-06-16）

---

## 1. 项目一句话定位

**OpenClaw**（原名 Clawdbot / Moltbot，开发者 Peter Steinberger）是一个 **本地优先的个人 AI 助手** —— 一个运行在你自己的设备上、跨 20+ 聊天平台（WhatsApp / Telegram / Discord / Slack / iMessage / 飞书 / 微信 / QQ 等）"统一收件箱"形态的 AI Gateway，代号🦞"the lobster way"。

| 指标 | 数值 |
| --- | --- |
| Stars | **379k+** |
| Forks | **79.3k+** |
| Commits | **59,651+** |
| Open Issues | 3.3k |
| Open PRs | 3k |
| 贡献者 | 数百人（含 steipete、vincentkoc 等核心维护者） |
| Release 通道 | `stable` / `beta` / `dev`（npm dist-tag） |
| 最新版本 | `2026.6.8`（按 CalVer 语义化日期版本） |
| 许可 | MIT |
| 主语言 | TypeScript **91.5%**（Swift 3.4%、Kotlin 1.0%、JS 2.8%、Shell 0.7%） |

---

## 2. 技术栈与运行时

### 2.1 运行时要求
- **Node.js ≥ 22.19**（推荐 Node 24）
- 包管理器：**pnpm 11.2.2**（monorepo workspace 强制）
- 模块系统：ESM（`"type": "module"`）
- TypeScript 版本：**6.0.3**（超前使用 TS 6）

### 2.2 核心依赖（节选自 `package.json`）

| 类别 | 关键依赖 |
| --- | --- |
| LLM SDK | `@anthropic-ai/sdk 0.100.1`、`openai 6.39.1`、`@google/genai 2.7.0`、`@mistralai/mistralai 2.2.5` |
| Agent 协议 | `@agentclientprotocol/sdk 0.22.1`（ACP）、`@modelcontextprotocol/sdk 1.29.0`（MCP） |
| Web/HTTP | `express 5.2.1`、`ws 8.21.0`、`undici 8.3.0`、`hono 4.12.25` |
| 渠道 SDK | `grammy 1.43.0`（Telegram）、`@grammyjs/runner` |
| 数据库 | `kysely 0.29.2`（类型安全 SQL Builder）、`sqlite-vec`（可选向量库） |
| TTS / 语音 | `node-edge-tts`、`@lydell/node-pty`、`libopus-wasm`、`libsignal` |
| 文件/媒体 | `jszip`、`tar`、`file-type 22.0.1`、`@mozilla/readability`、`playwright-core 1.60.0` |
| 工具 | `commander 14.0.3`、`chokidar 5.0.0`、`croner 10.0.1`、`zod 4.4.3`、`typebox 1.1.39` |
| TUI | `@earendil-works/pi-tui 0.78.0`、`@clack/prompts 1.4.0` |
| 前端 | `lit 3.3.3`、`@lit-labs/signals`、`@a2ui/lit`（A2UI = Agent-driven UI） |
| 构建/测试 | `tsdown 0.22.1`、`tsx 4.22.3`、`vitest 4.1.8`、`oxlint 1.67.0`、`oxfmt 0.52.0` |
| 工具链 | `esbuild 0.28.1`、`rolldown`、`@typescript/native-preview` |

### 2.3 渠道生态（来自 README 与 extensions/）
原生支持的聊天渠道超过 **20+**：
- 主流：WhatsApp（Baileys）、Telegram（grammY）、Slack、Discord、Signal、iMessage
- 企业：Microsoft Teams、Google Chat、Matrix、Feishu（飞书）、Mattermost、Nextcloud Talk
- 小众/社区：IRC、Nostr、Synology Chat、Tlon、Twitch、Zalo、Zalouser
- 国内：微信、QQ（qqbot 扩展）
- 本地：WebChat、macOS、iOS/Android 节点

---

## 3. 仓库整体结构

```
openclaw/
├── apps/              # 跨端原生应用
├── packages/          # 内部可复用的 npm workspace 包（核心库）
├── extensions/        # 插件生态（渠道/provider/工具/诊断）
├── src/               # Gateway 与 CLI 主运行时源码
├── ui/                # Control UI（基于 Lit + Vite 的前端）
├── skills/            # 捆绑的 Agent Skills
├── config/            # 全局 lint/format 配置
├── scripts/           # 构建/发布/检查脚本
├── docs/              # 官方文档（mint 框架，MDX + i18n）
├── deploy/            # 部署相关
├── security/          # 安全策略（含 opengrep 规则）
├── test/              # 跨包测试基础设施
├── qa/                # QA 子项目
├── patches/           # pnpm patch 目录
├── .agents/           # 给 AI Agent 看的元数据
├── .github/           # GitHub Actions & Issue 模板
├── .vscode/           # VSCode 配置
├── openclaw.mjs       # CLI 启动引导器（Node 版本检查 + compile cache respawn）
├── pnpm-workspace.yaml
├── package.json
├── tsconfig*.json     # 多套 TS 配置（core / extensions / plugin-sdk）
└── Dockerfile / docker-compose.yml / fly.toml / render.yaml
```

总规模：**~60k commits、Language 以 TS 为主**，是一个非常活跃的大型 monorepo。

---

## 4. 分层架构（4 层 + 1 控制平面）

OpenClaw 官方架构文档（`docs/concepts/architecture.md`）明确划分为一个 **Gateway 控制平面** 加多类连接端：

```
                ┌────────────────────────────────────┐
                │       Gateway (控制平面 Daemon)      │
                │  ┌──────────────────────────────┐  │
                │  │ WebSocket 18789 (TypeBox)    │  │
                │  │  ├─ Clients (Operator)       │  │
                │  │  ├─ Nodes (设备节点)           │  │
                │  │  └─ Canvas Host              │  │
                │  └──────────────────────────────┘  │
                │                                    │
                │  Provider 适配层 (Baileys/grammY/…)  │
                │  Channel 路由 / Pairing / Queue     │
                │  Agent Runtime / Session / Skills   │
                └────────────────────────────────────┘
                       ▲              ▲           ▲
       ┌───────────────┘              │           └──────────────┐
       │                              │                          │
  ┌────┴─────┐                ┌───────┴──────┐            ┌──────┴──────┐
  │  Apps    │                │  UI          │            │ Extensions  │
  │ (macOS/  │                │ (Control UI) │            │ (plugin-sdk)│
  │ iOS/     │                │  Lit + Vite  │            │             │
  │ Android/ │                │              │            │             │
  │ Windows) │                └──────────────┘            └─────────────┘
  └──────────┘
```

**核心要点：**
- **唯一 Gateway**：一台主机只跑一个 Gateway 进程，**唯一**持有 WhatsApp（Baileys）会话。
- **WebSocket 协议**：`ws://127.0.0.1:18789`，TypeBox 模式校验，JSON Schema 自动生成。
- **Canvas Host**：在同一 HTTP 端口下挂载 `/__openclaw__/canvas/` 与 `/__openclaw__/a2ui/`，让 Agent 可以直接渲染 A2UI（Agent-to-UI）。
- **远程访问**：Tailscale（首选）、SSH 隧道（`ssh -N -L 18789:...`）、可选 TLS+Pinning。
- **Pairing**：所有 WS 客户端 + 节点都用 `device identity` 握手，需要配对审批；本地 loopback 可自动审批。

---

## 5. 各目录详解

### 5.1 `apps/` — 跨端原生应用（Swift / Kotlin）

| 子目录 | 技术栈 | 角色 |
| --- | --- | --- |
| `apps/macos` | Swift（菜单栏 app） | 菜单栏控制 Gateway、Voice Wake、PTT、WebChat、远程 SSH 控制 |
| `apps/ios` | Swift | 节点模式（iOS node），Canvas、语音触发 |
| `apps/android` | Kotlin（Gradle） | 节点模式，Camera / Screen / Canvas / Android 命令家族 |
| `apps/macos-mlx-tts` | Swift | macOS 本地 MLX TTS 引擎 |
| `apps/swabble` | Swift | Wake word / 语音唤醒相关 |
| `apps/shared` | 共享 | 跨 app 复用的资源/模块 |

> 语言分布：Swift 3.4% + Kotlin 1.0% 的来源就在这里。

### 5.2 `packages/` — 内部可复用核心库（22 个）

按职责分组：

**核心运行时**
- `agent-core` — Agent 抽象（与具体 LLM 解耦）
- `llm-core` — 通用 LLM 协议层
- `llm-runtime` — LLM 调用实现（Provider 路由、流式、错误重试）
- `gateway-client` — Gateway WS 客户端 SDK
- `gateway-protocol` — TypeBox 模式 + JSON Schema 单一事实源
- `acp-core` — Agent Client Protocol 实现
- `sdk` — 对外暴露的 SDK（公共 API）

**能力包**
- `media-core` / `media-understanding-common` / `media-generation-core` — 媒体理解 / 生成抽象
- `markdown-core` — Markdown 解析与渲染
- `speech-core` — TTS/STT 抽象
- `web-content-core` — 网页抓取/抽取
- `memory-host-sdk` — 记忆系统 host SDK

**工具与基础设施**
- `plugin-sdk` / `plugin-package-contract` — 插件开发工具包
- `model-catalog-core` — 模型目录与能力元数据
- `normalization-core` — 文本/MIME/路径归一化
- `net-policy` — 网络出口策略（SSRF/allowlist/denylist）
- `tool-call-repair` — LLM tool call 错误修复
- `terminal-core` — PTY/终端抽象
- `media-understanding-common` — 媒体理解通用接口

每个子包都是 **独立可发布的 workspace 包**，使用 `workspace:*` 协议互相引用。

### 5.3 `extensions/` — 插件生态（~110 个）

这是项目最庞大的目录。`pnpm-workspace.yaml` 把每个 extension 当作独立 workspace，开发模式下直接通过 `extensions/*` 加载本地代码。分类如下：

| 类别 | 代表 | 说明 |
| --- | --- | --- |
| **Provider（LLM）** | `anthropic` / `openai` / `google` / `mistral` / `deepseek` / `groq` / `xai` / `alibaba` / `moonshot` / `kimi-coding` / `qwen` / `bytedance` / `stepfun` / `tencent` / `volcengine` / `minimax` / `xiaomi` / `zai` / `huggingface` / `ollama` / `lmstudio` / `llama-cpp` / `litellm` / `vercel-ai-gateway` / `cloudflare-ai-gateway` / `github-copilot` / `copilot` / `copilot-proxy` / `codex` / `codex-supervisor` / `amazon-bedrock` / `amazon-bedrock-mantle` / `anthropic-vertex` / `azure-speech` / `microsoft` / `microsoft-foundry` / `inworld` / `arcee` / `cerebras` / `chutes` / `deepinfra` / `fal` / `fireworks` / `novita` / `nvidia` / `openrouter` / `parallel` / `perplexity` / `qianfan` / `sglang` / `together` / `venice` / `voyage` / `vllm` / `vydra` / `kilocode` / `opencode` / `opencode-go` / `synthetic` / `gmi` / `gog` | 几乎覆盖所有主流 LLM 提供商 |
| **Channel（聊天渠道）** | `discord` / `slack` / `telegram` / `whatsapp` / `signal` / `imessage` / `msteams` / `feishu` / `googlechat` / `google-meet` / `matrix` / `irc` / `line` / `mattermost` / `nextcloud-talk` / `nostr` / `synology-chat` / `tlon` / `twitch` / `zalo` / `zalouser` / `qqbot` / `sms` / `voice-call` | 聊天平台适配器 |
| **工具** | `browser` / `canvas` / `webhooks` / `web-readability` / `file-transfer` / `bonjour` / `device-pair` / `phone-control` / `thread-ownership` / `oc-path` | 内部工具 |
| **诊断/可观测性** | `diagnostics-otel` / `diagnostics-prometheus` | OpenTelemetry / Prometheus 导出 |
| **记忆/数据** | `memory-core` / `memory-lancedb` / `memory-wiki` / `active-memory` | 长期记忆后端 |
| **媒体/语音/视频** | `tts-local-cli` / `azure-speech` / `deepgram` / `elevenlabs` / `gradium` / `senseaudio` / `talk-voice` / `sherpa-onnx-tts` / `image-generation-core` / `video-generation-core` / `media-understanding-core` / `document-extract` / `pixverse` / `runway` / `comfy` / `music-generation-providers` / `llm-task` | 媒体生成/理解 |
| **搜索/网络** | `brave` / `duckduckgo` / `searxng` / `tavily` / `firecrawl` / `exa` / `web-search`(core 内) | 搜索 provider |
| **代码/开发** | `open-prose` / `codex-supervisor` / `diffs` / `diffs-language-pack` / `acpx` | Agent 编程相关 |
| **安全/沙箱** | `openshell` / `policy` | 沙箱与策略 |
| **系统/运维** | `admin-http-rpc` / `lobster` / `migrate-claude` / `migrate-hermes` / `test-support` / `qa-channel` / `qa-lab` / `qa-matrix` / `tokenjuice` / `sms` | 运维、迁移、QA、内部工具 |
| **打包管理** | `tsconfig.package-boundary.base.json` / `tsconfig.package-boundary.paths.json` | 边界配置 |

每个 extension 都是独立 npm 包，可在 `dist/extensions/*` 中独立发布，主包 `files` 字段排除大多数以加速安装。

### 5.4 `src/` — Gateway 主运行时源码

`src/` 是 `pnpm openclaw ...` / `node openclaw.mjs` 实际执行的代码（约 60+ 子模块），是项目的"主仓"：

**核心域**
- `gateway/` — WS 服务器、路由、方法表（`server-methods/`, `methods/`, `server/`）
- `agents/` — Agent 运行时（session、loop、queue、compaction、hooks）
- `channels/` — 渠道抽象基类与 registry
- `cli/` — `openclaw` 命令树（`agent`、`gateway`、`message`、`pairing`、`nodes`、`secrets`、`onboard` 等）
- `commands/` — 用户可见的聊天命令（`/new`, `/reset`, `/status`, `/think` …）
- `config/` — 配置加载、校验、schema 生成
- `sessions/` — 会话存储、transcript 写入锁
- `state/` — 持久化运行时状态
- `memory/` / `memory-host-sdk/` — 记忆系统
- `skills/` — 技能加载与快照
- `secrets/` — 凭据/Token 管理
- `security/` — DM pairing、policy、sandbox 策略
- `pairing/` — 设备/节点配对
- `daemon/` — launchd/systemd 守护进程

**能力子模块**
- `llm/` / `provider-runtime/` — Provider 调用与容错
- `mcp/` — Model Context Protocol server + client
- `acp/` — Agent Client Protocol
- `tts/` / `media/` / `image-generation/` / `media-generation/` / `media-understanding/` / `video-generation/` / `music-generation/` / `talk/` / `realtime-transcription/` — 媒体/语音
- `web/` / `web-fetch/` / `web-search/` — Web 抓取/搜索
- `routing/` — 渠道 → Agent 的多 agent 路由
- `context-engine/` — 上下文工程（bootstrap / system prompt 装配）
- `plugin-sdk/` — 内部 plugin SDK（也作为 npm 子路径导出，见下文）
- `plugin-state/` — 插件状态机
- `flows/` — 流程编排
- `tasks/` / `cron/` / `commitments/` — 调度与任务
- `node-host/` / `node-inspect-debugger/` — 设备节点 host
- `transcripts/` — 会话 transcript 管理
- `trajectory/` — Agent 轨迹回放
- `proxy-capture/` — 代理与流量捕获
- `tui/` — 终端 UI（pi-tui 集成）
- `wizard/` — onboarding 向导
- `hooks/` — Gateway 内部 hooks
- `i18n/` — 国际化
- `interactive/` — 交互模式

**支撑**
- `bootstrap/` — 启动/插件加载
- `compat/` — 兼容性垫片
- `infra/` — 基础设施（HTTP、WS、logger、metrics）
- `shared/` — 共享工具
- `utils/` — 通用 util
- `types/` — 全局类型
- `test-helpers/` / `test-utils/` — 测试工具
- `scripts/` — 子脚本
- `docs/` — 代码内文档
- `status/` — 健康/状态端点
- `bindings/` — 原生绑定
- `auto-reply/` — 自动回复
- `chat/` — 聊天抽象
- `crestodian/` — 看护/清理
- `bindings/` / `link-understanding/` — 链接理解
- `model-catalog/` — 模型目录

### 5.5 `ui/` — Control UI（Web 管理界面）

| 路径 | 说明 |
| --- | --- |
| `ui/index.html` | 单页应用入口 |
| `ui/src/main.ts` | 前端主入口 |
| `ui/src/ui/` | Lit Web Components 组件 |
| `ui/src/styles/` + `styles.css` | 样式 |
| `ui/src/i18n/` | 国际化文案 |
| `ui/src/types/` | 类型 |
| `ui/src/test-helpers/` | 浏览器端测试工具 |
| `ui/public/` | 静态资源 |
| `ui/config/` | 工具配置 |
| `ui/vite.config.ts` / `vitest.config.ts` / `vitest.node.config.ts` | 构建/测试配置 |
| `ui/package.json` | `openclaw-control-ui`，独立 workspace 包 |

**技术栈**：`lit 3.3.3`（Web Components）+ `markdown-it` + `marked` + `highlight.js` + `dompurify`，构建工具 `vite 8.0.16`，测试 `vitest 4.1.8` + `@vitest/browser-playwright`（Playwright 跑浏览器测试）。

### 5.6 `skills/` — Agent Skills 捆绑集

60+ 个 skill，按主题分组（精选）：
- **生产力**：1password、apple-notes、apple-reminders、bear-notes、notion、obsidian、things-mac、trello、taskflow、taskflow-inbox-triage
- **开发**：coding-agent、github、gh-issues、tmux、python-debugpy、node-connect、node-inspect-debugger、peekaboo、oracle、sag、session-logs
- **媒体**：gifgrep、meme-maker、sherpa-onnx-tts、songsee、video-frames、openai-whisper、openai-whisper-api、voice-call
- **通讯**：discord、slack、wacli、xurl、himalaya
- **生活**：blucli、camsnap、healthcheck、weather、spotify-player、sonoscli、openhue、eightctl
- **AI/平台**：canvas、clawhub、gemini、blogwatcher、summarize、diagram-maker、model-usage、skill-creator

每个 skill 目录都遵循 `SKILL.md` 规范（与 Anthropic Agent Skills 兼容）。

### 5.7 其他重要顶层目录

| 目录 | 说明 |
| --- | --- |
| `docs/` | 基于 [mint](https://mintlify.com/) 的官方文档（MDX + i18n） |
| `config/` | knip、markdownlint、shellcheck、swiftformat、swiftlint、tsconfig 共享 |
| `scripts/` | `pnpm` scripts 对应的 Node 脚本（`build-all.mjs`、`verify.mjs`、`audit-seams.mjs` 等） |
| `security/` | 安全策略 + opengrep 规则 |
| `test/` | 跨包共享测试（vitest live config 等） |
| `qa/` | 内部 QA 项目 |
| `patches/` | `pnpm patch` 输出（如 `@agentclientprotocol/claude-agent-acp@0.39.0`） |
| `git-hooks/` | 预提交钩子 |
| `deploy/` | 部署清单 |
| `.github/` | CI workflows、Issue 模板、PR 模板 |

---

## 6. `package.json` 关键设计

### 6.1 `bin` 与入口
```json
{
  "bin": { "openclaw": "openclaw.mjs" },
  "main": "dist/index.js",
  "type": "module"
}
```
- `openclaw.mjs` 是一个轻量 **启动引导器**：校验 Node ≥ 22.19、配置 `NODE_COMPILE_CACHE`、转发到 `dist/entry.js`。
- 主入口在 `dist/index.js`，`pnpm build`（即 `tsdown`）产出。

### 6.2 大量子路径导出（plugin-sdk）
`package.json` 中 `"exports"` 声明了 **80+ 个子路径**，全部指向 `dist/plugin-sdk/*.js` + `*.d.ts`，把 plugin SDK 按职责拆分到细粒度 API 表面，例如：
- `./plugin-sdk`（聚合）
- `./plugin-sdk/core`、`./plugin-sdk/runtime`、`./plugin-sdk/sandbox`
- `./plugin-sdk/setup`、`./plugin-sdk/setup-runtime`、`./plugin-sdk/setup-tools`
- `./plugin-sdk/channel-streaming`、`./plugin-sdk/channel-runtime-context`
- `./plugin-sdk/approval-*`（一整组审批运行时，10+ 个细分）
- `./plugin-sdk/config-runtime`、`./plugin-sdk/config-contracts`、`./plugin-sdk/config-types`
- `./plugin-sdk/lmstudio`、`./plugin-sdk/lmstudio-runtime`
- …

这是 **"core 精瘦、扩展点丰富"** 哲学的直接体现，第三方 plugin 只能 import 暴露的子路径。

### 6.3 关键 `scripts`
- `build` / `build:ci-artifacts` — `scripts/build-all.mjs`
- `gateway:watch` — 开发模式热重载
- `ui:build` / `ui:dev` — 前端构建/开发
- `deadcode:*` — 死代码检测（knip / ts-prune / ts-unused-exports）
- `check:architecture` — 架构守护（import 循环、依赖层次）
- `db:kysely:check` / `db:kysely:gen` — 数据库类型生成
- `plugins:assets:build` — 插件资源构建
- `release:status` / `release:publish` — 发布流程

---

## 7. pnpm-workspace 配置亮点

```yaml
packages:
  - .
  - ui
  - packages/*
  - extensions/*

minimumReleaseAge: 2880          # 48h 新包延迟（防供应链攻击）
nodeLinker: hoisted              # 兼容老式依赖
allowBuilds:                     # 白名单允许运行 install scripts 的包
  "@openclaw/fs-safe": true
  "baileys": true
  "node-llama-cpp": true
  ...
overrides:                       # 强制版本覆盖
  "@anthropic-ai/sdk": 0.100.1
  axios: 1.16.0
  ...
patchedDependencies:
  "@agentclientprotocol/claude-agent-acp@0.39.0": patches/...
```

**安全特性**：`minimumReleaseAge: 2880`（所有新发布的 npm 包必须 ≥48 小时）以及详尽的 `allowBuilds` 白名单是项目应对 npm 供应链攻击的重要防御措施。

---

## 8. 核心运行机制

### 8.1 Gateway 协议
- **传输**：WebSocket（默认 `127.0.0.1:18789`）
- **首帧必须**：`{type:"req", method:"connect", params:{...}}` → `{type:"res", ok, payload:{hello-ok}}`
- **后续帧**：
  - 请求：`{type:"req", id, method, params}` → `{type:"res", id, ok, payload|error}`
  - 事件：`{type:"event", event, payload, seq?, stateVersion?}`
- **类型化**：TypeBox schema → JSON Schema → Swift models（macOS app 用）
- **认证**：
  - `connect.params.auth.token` / `connect.params.auth.password`
  - Tailscale Serve 模式（`gateway.auth.allowTailscale: true`）从 header 取身份
  - `gateway.auth.mode: "none"` 仅限受信内网
- **幂等性**：副作用方法（`send` / `agent`）必须带 idempotency key，server 有短期去重缓存
- **节点握手**：`role: "node"` + caps/commands/permissions

### 8.2 Agent Loop 生命周期

```
intake → context assembly → model inference → tool execution → streaming replies → persistence
```

详细阶段（来自 `docs/concepts/agent-loop.md`）：
1. `agent` RPC 校验参数、解析 session、持久化元数据，立即返回 `{runId, acceptedAt}`
2. `agentCommand` 解析 model/thinking/verbose 默认值，加载 skills 快照
3. `runEmbeddedAgent` 串行化执行（per-session + global queue），解析 model + auth profile
4. `subscribeEmbeddedAgentSession` 把 runtime 事件桥接为 `lifecycle` / `assistant` / `tool` 三路 stream
5. `agent.wait` 等到 `lifecycle end/error` 后返回最终结果

**关键不变量**：
- 单 session 串行化 + 全局 lane
- transcript 写锁（文件级、跨进程）
- 默认 timeout：runtime 48h、`agent.wait` 30s

### 8.3 Hook 系统（双层）
- **Internal hooks (Gateway)**：事件驱动脚本，命令/生命周期事件触发（`agent:bootstrap`、`/new`、`/reset`、`/stop`…）
- **Plugin hooks**：嵌入 agent/tool 生命周期：`before_model_resolve` / `before_prompt_build` / `before_tool_call` / `after_tool_call` / `message_received` / `session_start` / `gateway_start`…

---

## 9. 关键设计哲学（来自 VISION.md）

1. **Core stays lean, optional capability ships as plugins** —— 主仓只放核心，新能力优先做插件
2. **Plugin 两种风格**：
   - **Code plugin**：运行时扩展（hooks、providers、channels、tools）
   - **Bundle plugin**：打包稳定的外部面（skills、MCP servers、config）
3. **优先 bundle plugin**，更稳定、攻击面更小
4. **Plugin 走 npm 分发**，本地 `extensions/*` 仅开发模式
5. **Skills 走 ClawHub**，主仓只保留基础 UX 必需的 bundled skills
6. **配置零兼容**：runtime 只读当前 schema，旧 key 走 `openclaw doctor --fix` 迁移
7. **TypeScript 是有意的选择** ——"hackable by default"
8. **终端优先 onboarding**，不藏安全决策

---

## 10. 安全模型

- **DM pairing**：`dmPolicy="pairing"` 默认开启，未知发送者收到短配对码，机器人**不**处理其消息
- **白名单**：`openclaw pairing approve <channel> <code>`
- **Public DM**：必须显式 `dmPolicy="open"` + `allowFrom: ["*"]`
- **沙箱默认**：非 main session 在 sandbox 内运行，Docker（默认）/ SSH / OpenShell 后端
- **典型 sandbox 规则**：
  - **允许**：`bash`、`process`、`read`、`write`、`edit`、`sessions_*`
  - **拒绝**：`browser`、`canvas`、`nodes`、`cron`、`discord`、`gateway`
- **TLS + 设备 pairing**：所有 WS 连接都需 device identity + challenge nonce 签名（v3 还绑定 `platform` + `deviceFamily`）
- **依赖安全**：`minimumReleaseAge: 2880` 分钟 + 大量 `overrides` 锁定版本 + `allowBuilds` 白名单

---

## 11. CI / 质量保障

从 `scripts/` 和 `package.json scripts` 可看到非常完整的工程化体系：
- **静态检查**：`oxlint` + `tsgo`（TS 6 原生编译器）+ `eslint`-like 检查
- **死代码**：`knip` / `ts-prune` / `ts-unused-exports`
- **依赖治理**：`deps:shrinkwrap:check` / `deps:vuln:gate` / `deps:root-ownership` / `transitive-manifest-risk-report`
- **架构守护**：`check:import-cycles` / `check:madge-import-cycles` / `check:deprecated-api-usage` / `check:loc`（500 行限制）
- **格式**：`oxfmt` + `swiftformat` + `markdownlint`
- **测试**：`vitest 4.1.8`（多 config：unit、live、playwright、android）
- **SQL**：`db:kysely:gen` 自动生成 TS 类型
- **配置生成**：`config:schema:gen` / `config:channels:gen` / `config:docs:gen` / `taxonomy.yaml`
- **多 release channel**：`openclaw update --channel stable|beta|dev`

---

## 12. 总结：项目框架结构的核心特征

| 特征 | 体现 |
| --- | --- |
| **Monorepo + Workspace 严格分层** | `apps/` `packages/` `extensions/` `ui/` 4 个独立 workspace |
| **Core / Plugin 双层架构** | 主仓提供 plugin-sdk（80+ 子路径），extensions 独立开发 |
| **多端统一控制平面** | 单一 Gateway 通过 WS 协议服务 CLI/UI/Apps/Nodes |
| **超多渠道适配** | 20+ 聊天平台通过 Provider/Channel 抽象集成 |
| **超多 LLM Provider** | 50+ 厂商（公有云 + 自托管）通过统一 LLM 抽象 |
| **本地优先 + 安全默认** | DM pairing + sandbox + 设备身份 + 依赖延迟发布 |
| **超大规模工程化** | 60k commits、knip/madge/oxlint/deadcode/CI 全套 |
| **TS 优先** | 91.5% TypeScript、ESM、`tsdown` 构建 |
| **强类型协议** | TypeBox → JSON Schema → Swift codegen |
| **活跃的 Skill 生态** | 60+ bundled skills + ClawHub 第三方发布 |
| **完善的 release 流程** | CalVer 版本、3 个 npm dist-tag 通道、`scripts/full-release-validation-at-sha.mjs` |
| **MIT + 强社区** | 379k stars，数百位贡献者，企业赞助（OpenAI、GitHub、NVIDIA、Vercel…） |

---

## 附录 A：项目核心元数据

| 字段 | 值 |
| --- | --- |
| 仓库 | https://github.com/openclaw/openclaw |
| 官网 | https://openclaw.ai |
| 最新版本 | `2026.6.8`（2026-06-16） |
| 文档站 | https://docs.openclaw.ai（Mintlify） |
| 协议 | MIT |
| 创始人 | Peter Steinberger (@steipete) |
| 名片 | 🦞 "Molty, a space lobster AI assistant" |
| Node 要求 | ≥ 22.19（推荐 24） |
| pnpm | 11.2.2 |

## 附录 B：延伸阅读

- 架构：`docs/concepts/architecture.md`
- Agent Loop：`docs/concepts/agent-loop.md`
- 协议：`docs/gateway/protocol.md`
- 插件：`docs/concepts/plugins.md`
- ClawHub：https://clawhub.ai/
- Vision：`VISION.md`
- Contributing：`CONTRIBUTING.md`
- Security：`SECURITY.md` + `security/opengrep/`
