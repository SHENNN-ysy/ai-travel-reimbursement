# 差旅报销 AI 助手

基于 Spring Boot 3.x + Java 21 + LangChain4j 的**智能差旅报销助手**后端服务。用户可通过自然语言与 AI 助手对话，完成从发票上传、AI 识别、报表明细生成到 Excel 导出报销单的全流程自动化操作。

---

## 核心功能

- **AI 智能助手对话**：内置 AI 助手（基于 LangChain4j），支持自然语言交互，可通过对话发起报销、查询项目、识别发票等操作
- **报销项目全生命周期管理**：创建、编辑、删除、导出报销项目
- **文件管理**：支持上传发票/截图/附件，按目录结构组织
- **AI OCR 发票识别**：对接多模态大模型（支持 Moonshot Kimi、阿里通义千问等），自动识别发票金额、日期、费用类型
- **报表明细自动生成**：识别完成后，一键批量确认，生成报表明细
- **Excel 报销单导出**：基于 EasyExcel 生成标准格式报销单
- **项目资料包打包下载**：将原始发票与报销单打包为 zip 下载
- **用户认证**：基于 JWT 的注册/登录认证体系
- **Docker 部署**：提供 Dockerfile，支持一键容器化部署

---

## 技术栈

| 分类 | 技术 | 说明 |
|------|------|------|
| 基础框架 | Spring Boot 3.5.14 + Java 21 | JDK 21 虚拟线程（预览）支持 |
| ORM | MyBatis-Plus 3.5.7 | 简化 CRUD，含逻辑删除支持 |
| 数据库 | MySQL 8.0 | 主数据存储 |
| AI 框架 | LangChain4j 1.13.0 | AI 能力抽象层 |
| 多模态识别 | Moonshot Kimi / 通义千问 | AI OCR 发票识别 |
| Excel 导出 | EasyExcel 4.0.3 | 高性能 Excel 读写 |
| API 文档 | Knife4j 4.5.0 + springdoc 2.8.8 | Swagger UI 增强版 |
| MCP 集成 | langchain4j-mcp | 通过 MCP 协议调用 Excel MCP 工具 |
| RAG 检索 | langchain4j embeddings (BGE) | 本地向量库，支持报销知识检索 |
| 用户认证 | JWT (jjwt 0.12.5) | Token 鉴权 |
| 工具库 | OkHttp 4.12.0, PDFBox 3.0.3 | HTTP 调用、PDF 渲染 |

---

## 项目结构

```
src/main/java/com/aidemo/myaitravelreimbursement/
├── MyAiTravelReimbursementApplication.java  # Spring Boot 启动类
├── agent/                                   # AI Agent 核心模块
│   ├── ReimbursementAgent.java              # LangChain4j AiServices，定义 Assistant 接口
│   ├── memory/                              # Agent 记忆管理（会话上下文）
│   ├── prompt/                              # 系统提示词
│   ├── RagConfig/                           # RAG 配置（向量检索）
│   └── tools/                               # AI 可调用工具
│       ├── ProjectTools.java                # T1 项目信息 / T10 打包导出
│       ├── FileTools.java                   # T2 文件列表 / T3 上传引导
│       ├── RecognitionTools.java            # T4-T6 发票识别 / 进度 / 结果
│       └── ReportTools.java                 # T7-T9 报表管理 / Excel 导出
├── controller/                             # REST 控制器层
│   ├── AuthController.java                 # 认证：注册 / 登录 / 当前用户
│   ├── ProjectController.java              # 项目管理 + 项目包导出
│   ├── ReportController.java               # 报表明细 + Excel 导出
│   └── FileController.java                 # 文件上传 / 下载 / 识别（见下方）
├── service/                                # 业务逻辑层
├── mapper/                                 # MyBatis-Plus Mapper
├── entity/                                 # 数据库实体
├── dto/                                    # DTO（请求/响应）
├── config/                                 # 配置类（CORS、JWT、存储等）
├── common/                                 # 统一响应、异常处理、用户上下文
├── util/                                   # 工具类
└── constant/                              # 常量定义

src/main/resources/
├── application.yml                         # 主配置文件
├── application-secrets.yml                # 敏感配置（密钥 / API Key）
├── db/schema.sql                          # MySQL 建表脚本
├── docs/AI报销助手使用指南.md              # RAG 知识库文档
└── skills/full/SKILL.md                  # LangChain4j Skill 定义文件
```

---

## 架构说明

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端 (Vue / SPA)                          │
│              HTTP REST API  +  SSE 流式对话                        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP / SSE
┌──────────────────────────▼──────────────────────────────────────┐
│                     Spring Boot 3.x 后端                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ REST API    │  │ Agent Controller │  │ AI Service (LangChain4j)│  │
│  │ Controller  │  │   (SSE 流式)    │  │                        │  │
│  └──────┬──────┘  └───────┬───────┘  └───────────┬────────────┘  │
│         │                  │                      │                │
│  ┌──────▼──────────────────▼──────────────────────▼────────────┐  │
│  │                     Service Layer                             │  │
│  │  ProjectService  FileService  RecognitionService  ReportService│ │
│  └──────────────────────────┬──────────────────────────────────┘  │
│                               │                                    │
│  ┌───────────────────────────▼──────────────────────────────────┐  │
│  │              MyBatis-Plus + MySQL 8.0                         │  │
│  └───────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
 ┌────────────┐   ┌──────────────┐   ┌────────────────┐
 │ Moonshot   │   │  Excel MCP   │   │  BGE Reranker  │
 │ Kimi API   │   │  (Node.js)   │   │   (ONNX)       │
 │ (AI OCR)   │   │              │   │                │
 └────────────┘   └──────────────┘   └────────────────┘
```

### 核心模块职责

| 模块 | 位置 | 职责 |
|------|------|------|
| `ReimbursementAgent` | `agent/ReimbursementAgent.java` | LangChain4j AiServices 构建器，定义 Assistant 接口，统一注入 ChatMemory、Tools、RAG |
| `AgentExecutorRunner` | `agent/AgentExecutorRunner.java` | SSE 流执行引擎，按三段式（reasoning → message → tool_call）推送事件 |
| `AgentChatController` | `agent/AgentChatController.java` | SSE 对话端点（`/agent/chat`），管理会话生命周期 |
| `AgentSystemPrompt` | `agent/prompt/AgentSystemPrompt.java` | System Prompt 定义 Agent 行为边界与交互原则 |
| `skills/full/SKILL.md` | `resources/skills/full/SKILL.md` | Full-skill 定义一键报销的步骤编排模板 |
| `LangChain4jConfig` | `config/LangChain4jConfig.java` | ChatModel（非流式）与 StreamingChatModel（流式）双 Bean 配置 |

### 三层 AI 能力抽象

```
用户对话输入
     │
     ▼
┌─────────────────────────────┐
│  LangChain4j AiServices    │  ← Assistant 接口（自动代理实现）
│  + StreamingChatModel     │  ← 流式模型（打字机效果）
│  + Tool Calling (T1~T10)   │  ← 10 个内置工具
│  + MCP Excel Tool Provider │  ← MCP 协议扩展 Excel 工具
│  + RetrievalAugmentor (RAG)│  ← Advanced RAG（Query路由 + 混合检索 + 重排序）
└────────────┬────────────────┘
             │ Tool Calls (function calling)
     ┌──────▼──────┐
     │ Tool 执行层  │
     │ ProjectTools │
     │ FileTools   │
     │ RecognitionTools │
     │ ReportTools │
     └─────────────┘
```

### RAG 检索管道（Advanced RAG）

```
用户 Query
    │
    ▼
EmbeddingDomainRouter（Query 路由，按领域分发到不同 Retriever）
    │
    ▼
HybridSearchContentRetriever（混合检索）
    ├── Dense Retriever  → BgeSmallZhV15EmbeddingModel（本地向量化）
    └── Sparse Retriever → BM25Indexer（词项权重检索）
    │
    ▼
ScoringRerankingAggregator（RRF 融合 + Cross-Encoder 重排序）
    │
    ▼
MarkdownContentInjector（将检索结果注入 Prompt）
    │
    ▼
LLM 回复
```

---

## 关键 Prompt 与 Vibe 思路

### System Prompt

```java
// AgentSystemPrompt.java
public static final String SYSTEM_PROMPT = """
    你是一位专业的出差报销AI助手。你的职责是帮助用户高效完成报销全流程。

    【能力边界】
    - 你可以调用工具完成文件上传、识别、报表生成等操作
    - 你会自动分析用户上传的发票/截图，提取金额、日期、费用类型
    - 你会智能分类整理文件到合适的归档文件夹
    - 你会生成符合格式的Excel报销单

    【交互原则】
    - 用户只需用自然语言描述需求，你自动完成剩余工作
    - 每一步操作完成后，主动汇报进度和结果
    - 发现问题时，用友好的方式引导用户修正
    - 所有金额必须使用 "¥" 符号表示
    """;
```

### Skill Prompt（一键报销步骤编排）

```markdown
// skills/full/SKILL.md
---
name: full-reimbursement
description: 执行完整的出差报销全流程：确认项目→获取文件→识别发票 → 生成报表 → 导出Excel与项目包
---

当用户请求完成报销全流程（如"一键报销"、"全流程报销"）时，按以下步骤执行：

1. 调用 `getProjectInfo(projectName)` 确认项目存在，读取项目基本信息。
2. 调用 `listFiles(projectName)` 获取所有待识别的文件列表（status=pending）。
3. 调用 `recognizeFiles(projectName, fileIds)` 批量提交 AI OCR 识别任务。
4. 调用 `getRecognitionTaskProgress(projectName)` 轮询识别进度，间隔 30 秒，最多轮询 6 次（约 180 秒）。
5. 识别完成后，调用 `getRecognitionResults(projectName)` 汇总所有发票的金额、日期、费用类型。
6. 调用 `batchConfirm(projectName)` 批量确认已识别文件，自动生成报表明细。
7. 调用 `exportExcel(projectName)` 生成标准 Excel 报销单文件，返回文件名和下载链接。
8. 调用 `exportPackage(projectName)` 将报销项目打包为 zip 文件并返回下载路径。
```

### Vibe 设计思路

| 维度 | 设计选择 | 说明 |
|------|----------|------|
| **"用户零门槛"** | 自然语言触发全流程 | 用户只需说"帮我报销"，AI 自动串联 T1~T10 全部工具 |
| **"所见即所得"** | SSE 流式推送三段式 | reasoning（思考）→ message（回复）→ tool_call（工具），前端实时展示执行过程 |
| **"容错友好"** | 超时中断 + 部分结果展示 | 识别超 150s 停止，但已完成部分仍可查看，不阻塞用户 |
| **"透明可溯"** | Tool 执行结果可见 | 每个工具执行完通过 SSE `tool_result` 事件推送结果，可隐藏敏感文件路径 |
| **"文档即知识库"** | Advanced RAG | 报销政策文档自动向量化，AI 回复时可注入最新制度说明 |

---

## AI 调用逻辑

### 调用链路总览

```
前端 POST /agent/chat
    │
    ▼
AgentChatController.chat()  ── 创建 SseEmitter ── 异步返回
    │                                          │
    ▼                                          ▼
AgentExecutorRunner.executeStreamAsync()   SSE 连接建立
    │（异步，@Async agentExecutor 线程池）        │
    │                                          │
    ▼                                          │
ReimbursementAgent.createAssistant(sessionId)
    │（每次创建 AiServices 代理实例，绑定 ChatMemory）
    ▼
assistant.chatStream(message)
    │（调用流式模型，返回 TokenStream）
    ▼
TokenStream.start()
    │
    ├── onPartialThinking()  ──► SSE event: "reasoning"（模型思考内容）
    ├── onPartialResponse()  ──► SSE event: "message"（打字机回复，50ms 批量发送）
    ├── onPartialToolCall() ──► SSE event: "tool_call"（工具名 + 批次索引）
    ├── onToolExecuted()     ──► SSE event: "tool_result"（工具返回结果）
    ├── onCompleteResponse()───► SSE event: "done" + emitter.complete()
    └── onError()            ──► SSE event: "error" + emitter.completeWithError()
```

### 两种 AI 调用模式

#### 模式一：流式对话（Agent 对话）

- **触发接口**：`POST /agent/chat`
- **传输方式**：SSE（Server-Sent Events），流式推送
- **模型**：StreamingChatModel（`OpenAiStreamingChatModel`）
- **特点**：打字机效果、三段式推送（reasoning + message + tool_call）
- **对话记忆**：`AgentChatMemoryManager` 按 sessionId 管理 ChatMemory，支持多轮上下文

#### 模式二：非流式调用（AI OCR 识别）

- **触发方式**：Service 层直接调用 `ChatModel.send(...)`
- **传输方式**：HTTP 单次请求/响应
- **模型**：ChatModel（`OpenAiChatModel`）
- **特点**：等待完整响应，用于发票内容提取、报告汇总等需要原子结果的场景
- **超时配置**：`ai.timeout: 120` 秒

### Function Calling（工具调用）

LangChain4j AiServices 自动处理 Tool Call 循环，无需手动编排：

```java
// ReimbursementAgent.java
AiServices<Assistant> builder = AiServices.builder(Assistant.class)
    .streamingChatModel(chatStreamModel)        // 流式模型
    .chatMemory(memoryManager.getMemory(sessionId)) // 会话记忆
    .retrievalAugmentor(retrievalAugmentor)    // Advanced RAG
    .tools(projectTools, fileTools,
           recognitionTools, reportTools)       // 10 个内置工具
    .toolProvider(skills.toolProvider())       // Skill 工具（通过 activate_skill 激活）
    .toolProvider(excelMcpToolProvider)        // MCP Excel 工具
    .systemMessage(AgentSystemPrompt.SYSTEM_PROMPT);
```

**工具分类**：

| 分类 | 工具 | 说明 |
|------|------|------|
| 项目管理 | `getProjectInfo` | T1，查询项目基本信息 |
| 文件管理 | `listFiles` / `uploadFile` | T2/T3，文件列表与上传引导 |
| 发票识别 | `recognizeFiles` / `getRecognitionTaskProgress` / `getRecognitionResults` | T4/T5/T6，异步 OCR |
| 报表明细 | `createReportItem` / `batchConfirm` / `exportExcel` | T7/T8/T9，报表操作 |
| 导出 | `exportPackage` | T10，zip 打包下载 |
| MCP 扩展 | `excel-mcp-*` | 通过 MCP 协议调用外部 Excel 工具 |

### MCP 集成（Excel 操作扩展）

```
Spring Boot                    Node.js MCP Server
┌──────────────────┐          ┌────────────────────────┐
│ DefaultMcpClient │ ──HTTP──►│ excel-mcp-server       │
│ (StreamableHttp)  │          │ (uvx excel-mcp-server) │
└──────────────────┘          └────────────────────────┘
     │                               │
     └── MCP Tool Provider ── 注入到 AiServices
             │
             └── AI 可直接调用 Excel 操作工具
```

启动命令：
```bash
EXCEL_FILES_PATH=/opt/travel-reimbursement/files \
FASTMCP_PORT=8017 \
uvx excel-mcp-server streamable-http --host 0.0.0.0
```

---

## 部署步骤说明（含 DNS / HTTPS）

### 方式一：Docker Compose 部署（推荐）

#### 目录结构

```
deploy/
├── docker-compose.yml        # MySQL + 应用 + Excel MCP 一体化编排
├── Dockerfile                # 应用镜像构建
└── nginx.conf               # HTTPS 反向代理配置
```

#### docker-compose.yml 参考

```yaml
version: "3.8"
services:
  travel-mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: travel_db
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - travel-net

  excel-mcp:
    image: ghcr.io/aidemo/excel-mcp-server:latest
    environment:
      EXCEL_FILES_PATH: /opt/travel-reimbursement/files
      FASTMCP_PORT: 8017
    networks:
      - travel-net

  app:
    build: .
    depends_on:
      - travel-mysql
      - excel-mcp
    environment:
      DB_HOST: travel-mysql
      DB_PASSWORD: ${DB_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      AI_API_KEY: ${AI_API_KEY}
      AI_BASE_URL: ${AI_BASE_URL}
      AI_MODEL: ${AI_MODEL}
    volumes:
      - travel_files:/opt/travel-reimbursement
      - travel_docs:/opt/travel-reimbursement/docs
      - travel_models:/opt/travel-reimbursement/models
    networks:
      - travel-net

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app
    networks:
      - travel-net

volumes:
  mysql_data:
  travel_files:
  travel_docs:
  travel_models:

networks:
  travel-net:
```

#### 环境变量文件 `.env`

```bash
# 数据库
DB_PASSWORD=your_secure_db_password

# JWT
JWT_SECRET=your_very_long_jwt_secret_key_at_least_32_chars

# AI
AI_API_KEY=your_moonshot_or_qwen_api_key
AI_BASE_URL=https://api.moonshot.cn/v1
AI_MODEL=kimi-k2.5
```

### 方式二：直接 JAR 部署

```bash
# 1. 打包
./mvnw package -DskipTests

# 2. 运行（通过环境变量注入配置）
java -jar target/MyAI-travel-reimbursement-0.0.1-SNAPSHOT.jar \
  --spring.datasource.url=jdbc:mysql://your-mysql-host:3306/travel_db \
  --spring.datasource.username=root \
  --spring.datasource.password=your_password \
  --jwt.secret=your_jwt_secret \
  --ai.base-url=https://api.moonshot.cn/v1 \
  --ai.api-key=your_api_key \
  --ai.model=kimi-k2.5 \
  --storage.base-path=/opt/travel-reimbursement/travel-files \
  --rag.docs-path=/opt/travel-reimbursement/docs \
  --app.base-url=https://your-domain.com/api/v1 \
  --excel-mcp.url=http://excel-mcp:8017/mcp
```

### DNS 配置

1. **域名解析**：在域名服务商（如阿里云 DNS、Cloudflare）添加 A 记录指向服务器 IP：
   ```
   A记录  travel.aibillservice.help  →  你的服务器公网IP
   ```
2. **CORS 白名单**：在 `application.yml` 中配置允许的域名：
   ```yaml
   cors:
     allowed-origins:
       - http://localhost:*
       - http://127.0.0.1:*
       - http://8.134.36.221:*       # 直接 IP 访问
       - http://*.aibillservice.help  # 域名泛解析
   ```

### HTTPS 配置（Nginx 反向代理）

#### 申请 SSL 证书（Let's Encrypt 免费）

```bash
# 安装 certbot
apt-get install -y certbot python3-certbot-nginx

# 申请证书（自动续期）
certbot --nginx -d travel.aibillservice.help
```

#### nginx.conf 参考配置

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # SSE 长连接优化
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
    proxy_buffering off;
    chunked_transfer_encoding on;

    upstream backend {
        server app:8080;
    }

    server {
        listen 80;
        server_name travel.aibillservice.help;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl;
        server_name travel.aibillservice.help;

        ssl_certificate     /etc/nginx/certs/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/privkey.pem;
        ssl_protocols        TLSv1.2 TLSv1.3;
        ssl_ciphers          HIGH:!aNULL:!MD5;

        # 前端静态资源
        location / {
            root /usr/share/nginx/html;
            index index.html;
            try_files $uri $uri/ /index.html;
        }

        # API 代理
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # SSE 流式代理
        location /agent/chat {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Connection '';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 3600s;
            proxy_send_timeout 3600s;
            proxy_buffering off;
            chunked_transfer_encoding on;
        }
    }
}
```

### 部署检查清单

```bash
# 1. 确认端口未被占用
netstat -tlnp | grep -E '80|443|3306|8080|8017'

# 2. 检查 MySQL 连接
mysql -h travel-mysql -u root -p -e "SHOW DATABASES;"

# 3. 检查 AI API 连通性
curl -s https://api.moonshot.cn/v1/models \
  -H "Authorization: Bearer $AI_API_KEY" | head -c 200

# 4. 检查 Excel MCP 连通性
curl -s http://excel-mcp:8017/mcp \
  -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# 5. 查看应用日志
docker logs <container_id> --tail 100

# 6. 访问健康检查
curl -s https://your-domain.com/api/v1/doc.html | grep -o '<title>.*</title>'
```

---

## 快速开始

- JDK 21+
- Maven 3.8+
- MySQL 8.0+

### 1. 数据库初始化

```bash
mysql -u root -p
source src/main/resources/db/schema.sql
```

### 2. 配置文件

将 `src/main/resources/application-secrets.yml`（或环境变量）中的占位符替换为真实值：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/travel_db?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai&createDatabaseIfNotExist=true
    username: root
    password: your_password

jwt:
  secret: your_jwt_secret_key_here

app:
  base-url: http://localhost:8080/api/v1

storage:
  base-path: D:/myAI-tool/travel-files

ai:
  base-url: https://api.moonshot.cn/v1
  api-key: your_moonshot_api_key
  model: kimi-k2.5

excel-mcp:
  url: http://localhost:8017/mcp

rag:
  docs-path: D:/myAI-tool/docs
```

**环境变量覆盖方式**（推荐生产部署使用）：

| 环境变量 | 说明 |
|----------|------|
| `DB_USERNAME` | 数据库用户名 |
| `DB_PASSWORD` | 数据库密码 |
| `JWT_SECRET` | JWT 签名密钥 |
| `AI_BASE_URL` | AI API 地址 |
| `AI_API_KEY` | AI API 密钥 |
| `AI_MODEL` | AI 模型名称 |

### 3. 运行

```bash
# 开发环境
./mvnw spring-boot:run

# 打包运行
./mvnw package -DskipTests
java -jar target/MyAI-travel-reimbursement-0.0.1-SNAPSHOT.jar
```

### 4. 访问服务

| 地址 | 说明 |
|------|------|
| `http://localhost:8080/api/v1` | API 根路径 |
| `http://localhost:8080/api/v1/doc.html` | Knife4j API 文档（推荐） |
| `http://localhost:8080/api/v1/swagger-ui.html` | Swagger UI |

---

## API 概览

### 认证 `/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/register` | 用户注册 |
| POST | `/auth/login` | 登录（返回 JWT） |
| GET | `/auth/me` | 获取当前用户信息 |

### 项目管理 `/projects`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/projects` | 创建报销项目 |
| GET | `/projects` | 分页查询项目列表 |
| GET | `/projects/{id}` | 获取项目详情（含文件统计） |
| PUT | `/projects/{id}` | 更新项目 |
| DELETE | `/projects/{id}` | 删除项目（逻辑删除） |
| GET | `/projects/{id}/export-package` | 打包下载项目所有文件（zip） |

### 文件管理 `/projects/{projectId}/files`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/projects/{projectId}/files` | 获取文件列表（分目录） |
| POST | `/projects/{projectId}/files/upload` | 上传文件（发票/截图/附件） |
| GET | `/projects/{projectId}/files/tree` | 获取项目文件目录树 |
| POST | `/projects/{projectId}/files` | 创建文件夹 |
| PUT | `/projects/{projectId}/files/{fileId}` | 更新文件/文件夹 |
| DELETE | `/projects/{projectId}/files/{fileId}` | 删除文件/文件夹 |
| GET | `/projects/{projectId}/files/{fileId}` | 获取文件详情 |
| GET | `/projects/{projectId}/files/{fileId}/download` | 下载文件 |
| POST | `/projects/{projectId}/files/{fileId}/recognize` | 单文件 AI 识别 |
| POST | `/projects/{projectId}/files/batch/recognize` | 批量识别（异步，轮询进度） |
| POST | `/projects/{projectId}/files/batch/confirm` | 批量确认，生成报表明细 |

### 报表明细 `/projects/{projectId}/reports`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/projects/{projectId}/reports/items` | 分页获取报表明细 |
| GET | `/projects/{projectId}/reports/items/all` | 获取全部报表明细（不分页） |
| POST | `/projects/{projectId}/reports/items` | 手动添加报表明细 |
| PUT | `/projects/{projectId}/reports/items/{itemId}` | 更新报表明细 |
| DELETE | `/projects/{projectId}/reports/items/{itemId}` | 删除报表明细 |
| GET | `/projects/{projectId}/reports/summary` | 获取项目费用汇总 |
| GET | `/projects/{projectId}/reports/export` | 导出 Excel 报销单 |

### AI 对话 `/projects/{projectId}/chat`（可选插件）

支持通过 WebSocket 或 SSE 流式对话与 AI 助手交互，执行报销全流程。

---

## 统一响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": { ... }
}
```

| code | 说明 |
|------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 报销全流程

### 方式一：AI 一键报销（全自动）

在 AI 对话中发送以下任一指令：

- "帮我报销"
- "一键报销"
- "全流程报销"

AI 将自动串联以下步骤：

```
确认项目信息 → 获取待识别文件 → 批量 OCR 识别 → 轮询进度
    → 汇总识别结果 → 批量确认生成报表明细 → 导出 Excel 报销单
    → 打包下载完整资料包
```

### 方式二：手动分步操作

1. **新建项目**：填写项目名称、地点、人员、日期、预算
2. **上传发票**：将发票/截图分区上传（支持 PDF、JPG、PNG 等）
3. **提交识别**：单张识别或批量识别，系统自动 OCR
4. **核对结果**：逐张查看识别结果，有误可手动修正
5. **批量确认**：确认无误后一键生成报表明细
6. **导出文件**：导出 Excel 报销单 + zip 资料包

---

## 费用类型

| type | 说明 |
|------|------|
| `transport` | 交通费 |
| `catering` | 餐饮费 |
| `accommodation` | 住宿费 |
| `purchase` | 采购费 |

---

## AI 工具能力（10 个内置工具）

| 编号 | 工具 | 功能 |
|------|------|------|
| T1 | `getProjectInfo` | 查询项目基本信息、文件统计 |
| T2 | `listFiles` | 列出项目下所有文件及识别状态 |
| T3 | `uploadFile` | 获取文件上传预签名信息 |
| T4 | `recognizeFiles` | 提交 AI OCR 识别任务（异步） |
| T5 | `getRecognitionTaskProgress` | 查询识别进度（每次阻塞约 30 秒） |
| T6 | `getRecognitionResults` | 获取识别结果汇总（金额、日期、费用类型） |
| T7 | `createReportItem` | 手动新增一条报表明细 |
| T8 | `batchConfirm` | 批量确认已识别文件，自动生成报表明细 |
| T9 | `exportExcel` | 导出标准格式 Excel 报销单 |
| T10 | `exportPackage` | 打包下载完整项目资料包（zip） |

---

## 数据表结构

| 表名 | 说明 |
|------|------|
| `t_user` | 用户表 |
| `t_project` | 报销项目表 |
| `t_folder` | 文件夹目录表（树形结构） |
| `t_upload_file` | 上传文件表（含识别状态） |
| `t_recognition_result` | AI 识别结果表 |
| `t_report_item` | 报表明细表 |
| `t_batch_recognize_task` | 批量识别任务表 |
| `t_settings` | 全局设置表 |
| `t_agent_session` | AI 对话会话表 |
| `t_agent_task_log` | AI 任务执行日志表 |

---

## 许可证

MIT
