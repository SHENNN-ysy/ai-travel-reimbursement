# Modular RAG MCP Server

基于 Spring Boot 3 + LangChain4j + ChromaDB + Lucene 的模块化 RAG MCP Server，支持混合检索（向量 + BM25）、MCP 协议接口和全链路追踪。

## 技术栈

| 组件 | 技术方案 |
|------|----------|
| 框架 | Spring Boot 3.3 |
| AI 集成 | LangChain4j 1.0 |
| 向量数据库 | ChromaDB（通过 LangChain4j） |
| BM25 检索 | Lucene 9（纯 Java） |
| 构建工具 | Maven |
| Web 框架 | Spring MVC |

## 功能特性

- **文档摄入管线**：PDF 加载 → SHA256 去重 → 文本分块 → 精炼 → 向量编码 → ChromaDB + Lucene BM25 双索引
- **混合检索**：Dense（向量相似度）+ Sparse（BM25 关键词）+ RRF 融合
- **可插拔 Provider**：支持 OpenAI / Azure / DeepSeek / Ollama（LLM + Embedding）
- **MCP 协议接口**：通过 REST API 暴露 MCP Tools（query_knowledge_hub、list_collections、get_document_summary）
- **全链路追踪**：所有请求写入 `logs/traces.jsonl`，含各阶段耗时
- **评估模块**：Hit Rate / MRR / Faithfulness 评估指标

## 项目结构

```
modular-rag-mcp-server/
├── pom.xml
├── src/main/java/com/rag/
│   ├── RAGApplication.java              # 启动入口
│   ├── config/                          # 配置层
│   ├── core/
│   │   ├── types/                       # 核心数据类型（record）
│   │   ├── query/                       # 查询引擎
│   │   ├── lucene/                      # Lucene BM25 实现
│   │   └── trace/                       # 追踪上下文
│   ├── libs/                            # 可插拔 Provider
│   │   ├── llm/                         # LLM Provider
│   │   ├── embedding/                   # Embedding Provider
│   │   ├── vectorstore/                 # ChromaDB 实现
│   │   ├── reranker/                    # 重排 Provider
│   │   ├── splitter/                    # 文本分块
│   │   └── loader/                      # 文档加载
│   ├── ingestion/                        # 文档摄入管线
│   ├── mcp/                             # MCP 协议层
│   └── observability/                   # 可观测性
├── src/main/resources/
│   └── application.yml
└── src/test/java/
```

## 快速开始

### 1. 环境要求

- JDK 17+
- Maven 3.8+
- ChromaDB（可选，用于向量存储）

### 2. 配置

修改 `src/main/resources/application.yml`：

```yaml
rag:
  chroma:
    host: localhost
    port: 8000
  llm:
    provider: openai          # openai | azure | deepseek | ollama
    base-url: https://api.openai.com/v1
    api-key: ${OPENAI_API_KEY:}
    model: gpt-4o-mini
  embedding:
    provider: openai
    model: text-embedding-3-small
    dimension: 1536
  lucene:
    index-dir: ./data/lucene-index
```

### 3. 构建与运行

```bash
mvn clean package -DskipTests
java -jar target/modular-rag-mcp-server-0.1.0-SNAPSHOT.jar
```

### 4. 启动 ChromaDB（可选）

```bash
docker run -p 8000:8000 chromadb/chroma
```

## API 接口

### 查询知识库

```bash
POST http://localhost:8080/api/mcp/query
Content-Type: application/json

{"query": "什么是 Spring Boot？", "topK": 5}
```

### 上传文档

```bash
POST http://localhost:8080/api/mcp/ingest
Content-Type: multipart/form-data

file: <your-document.pdf>
```

### 列出集合

```bash
GET http://localhost:8080/api/mcp/collections
```

### 查看追踪统计

```bash
GET http://localhost:8080/api/observability/stats
```

## 运行测试

```bash
mvn test
```

## License

MIT
