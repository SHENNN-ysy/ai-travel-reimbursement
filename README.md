# AI 差旅报销助手（ai-travel-reimbursement）

基于 AI 大模型的智能差旅报销管理平台：上传发票/消费截图，AI 自动识别票据信息、生成报销明细并导出 Excel 报表，同时提供 Agent 对话式操作与 RAG 报销政策问答。

## 功能特性

- **票据智能识别**：上传发票 PDF/图片、消费截图，AI 自动提取发票号码、金额、销售方等信息
- **报销项目管理**：项目 → 文件夹 → 文件 三级归档管理
- **报表导出**：按项目一键导出 Excel 报销明细表
- **Agent 对话**：通过自然语言让 AI 操作报销数据（基于 LangChain4j + MCP 工具调用）
- **政策问答**：RAG 检索报销政策文档，回答报销标准问题
- **账号体系**：注册/登录（BCrypt 密码哈希 + JWT），支持一键临时账号登录

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 前端 | React 18 + TypeScript + Vite + Ant Design + Redux Toolkit |
| 后端 | Spring Boot 3 (Java 21) + MyBatis-Plus + MySQL 8 + JWT |
| AI | LangChain4j + Kimi（Moonshot，OpenAI 兼容接口） |
| 工具服务 | excel-mcp（Python/FastMCP，Excel 操作）、modular-rag-mcp-server（RAG 检索） |
| 部署 | Docker Compose（frontend / backend / mysql / excel-mcp 四容器） |

## 目录结构

```
├── travel-reimbursement-ai/     # 前端（React + Vite）
├── java/MyAI-travel-reimbursement/  # 后端（Spring Boot）
├── excel-mcp/                   # Excel MCP 工具服务（Python）
├── modular-rag-mcp-server/      # RAG MCP 检索服务（Java）
├── docs/                        # 报销政策等 RAG 文档
├── docker-compose.yml           # 一键部署编排
├── .env.example                 # 环境变量模板（真实值请放入 .env）
└── SPEC.md                      # 项目需求规格说明
```

> 以下目录不纳入仓库：用户上传文件（`travel-files/`）、向量重排序模型（`models/`）、本地备份（`备份/`）。

## 快速开始

### 前置要求

- Docker / Docker Compose
- 一个 Kimi（Moonshot）API Key（或任意 OpenAI 兼容接口）

### 启动

```bash
# 1. 配置环境变量（填入真实密钥）
cp .env.example .env

# 2. 构建并启动全部服务
docker compose up -d --build

# 3. 访问
#   前端:  http://localhost:8088
#   后端:  http://localhost:8080/api/v1  (接口文档: /api/v1/doc.html)
```

无需注册即可点击登录页的「一键登录」使用临时账号体验；也可以注册正式账号。

### 本地开发

- **后端**：`cd java/MyAI-travel-reimbursement && ./mvnw spring-boot:run`（需自行配置 `DB_PASSWORD` / `JWT_SECRET` / `AI_API_KEY` 环境变量，数据库连接见 `src/main/resources/application.yml`）
- **前端**：`cd travel-reimbursement-ai && npm install && npm run dev`（默认代理到 `localhost:8080`）

## 说明

- 敏感配置（数据库密码、JWT 密钥、AI API Key）统一放在根目录 `.env`，Compose 启动时自动注入，`.env` 已被 `.gitignore` 忽略
- RAG 重排序模型 `bge-reranker-base` 需单独下载放置于 `models/` 目录（可选功能，默认关闭）
- 用户上传的票据文件存储于 Docker 数据卷 `travel_files`
