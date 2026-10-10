package com.rag.mcp.tools;

import com.rag.core.query.HybridSearchEngine;
import com.rag.core.query.QueryProcessor;
import com.rag.core.response.ResponseBuilder;
import com.rag.core.trace.TraceCollector;
import com.rag.core.trace.TraceContext;
import com.rag.core.types.ProcessedQuery;
import com.rag.core.types.RAGResponse;
import com.rag.core.types.RetrievalResult;
import com.rag.libs.llm.LLMProvider;
import com.rag.libs.vectorstore.VectorStoreProvider;
import com.rag.libs.embedding.EmbeddingProvider;
import com.rag.config.AppConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Core MCP tool: query the knowledge hub with a question.
 */
@Component
public class QueryKnowledgeHubTool {

    private static final Logger log = LoggerFactory.getLogger(QueryKnowledgeHubTool.class);
    private static final String SYSTEM_PROMPT = """
            You are a helpful assistant. Answer the question based ONLY on the provided context.
            If the context does not contain the answer, say you don't know. Do not make up information.
            Always cite your sources using [1], [2], etc.
            """;

    private final HybridSearchEngine searchEngine;
    private final QueryProcessor queryProcessor;
    private final LLMProvider llmProvider;
    private final VectorStoreProvider vectorStoreProvider;
    private final EmbeddingProvider embeddingProvider;
    private final ResponseBuilder responseBuilder;
    private final TraceCollector traceCollector;
    private final AppConfig appConfig;

    @Autowired
    public QueryKnowledgeHubTool(
            HybridSearchEngine searchEngine,
            QueryProcessor queryProcessor,
            @Autowired(required = false) LLMProvider llmProvider,
            @Autowired(required = false) VectorStoreProvider vectorStoreProvider,
            @Autowired(required = false) EmbeddingProvider embeddingProvider,
            ResponseBuilder responseBuilder,
            TraceCollector traceCollector,
            AppConfig appConfig) {
        this.searchEngine = searchEngine;
        this.queryProcessor = queryProcessor;
        this.llmProvider = llmProvider;
        this.vectorStoreProvider = vectorStoreProvider;
        this.embeddingProvider = embeddingProvider;
        this.responseBuilder = responseBuilder;
        this.traceCollector = traceCollector;
        this.appConfig = appConfig;
    }

    public QueryResult execute(String query, int topK) {
        String traceId = UUID.randomUUID().toString();
        long totalStart = System.currentTimeMillis();
        TraceContext trace = TraceContext.start(traceId, query);

        try {
            ProcessedQuery processed = queryProcessor.process(query);
            trace = trace.withCollection(
                    vectorStoreProvider != null ? vectorStoreProvider.collectionName() : "unknown");

            long retrieveStart = System.currentTimeMillis();
            RetrievalResult retrievalResult = searchEngine.search(processed, topK > 0 ? topK : appConfig.retrieval().topK());
            trace = trace.withRetrieveMs(
                    System.currentTimeMillis() - retrieveStart, retrievalResult.count());

            String context = buildContext(retrievalResult);
            String answer;
            long llmStart = System.currentTimeMillis();
            if (llmProvider != null && llmProvider.isAvailable()) {
                var llmResponse = llmProvider.chatWithContext(SYSTEM_PROMPT, query, context);
                answer = llmResponse.content();
                trace = trace.withLlmMs(llmResponse.latencyMs(), llmProvider.providerName());
            } else {
                answer = "LLM not configured or unavailable. Retrieved context:\n" + context;
                trace = trace.withLlmMs(0, "none");
            }

            RAGResponse ragResponse = responseBuilder.build(
                    answer, null, retrievalResult, System.currentTimeMillis() - totalStart);
            trace = trace
                    .withTotalMs(System.currentTimeMillis() - totalStart)
                    .withProviders(
                            llmProvider != null ? llmProvider.providerName() : "none",
                            embeddingProvider != null ? embeddingProvider.providerName() : "none",
                            vectorStoreProvider != null ? vectorStoreProvider.providerName() : "none");
            traceCollector.record(trace);

            return new QueryResult(answer, ragResponse.answerInMarkdown(), traceId, retrievalResult);
        } catch (Exception e) {
            log.error("QueryKnowledgeHubTool error", e);
            trace = trace.withTotalMs(System.currentTimeMillis() - totalStart);
            traceCollector.record(trace);
            return new QueryResult("Error: " + e.getMessage(), null, traceId, null);
        }
    }

    private String buildContext(RetrievalResult result) {
        if (result == null || result.chunks() == null) return "";
        StringBuilder sb = new StringBuilder();
        int i = 1;
        for (var scored : result.chunks()) {
            sb.append("[").append(i++).append("] ")
              .append(scored.chunk() != null ? scored.chunk().content() : "")
              .append("\n\n");
        }
        return sb.toString().trim();
    }

    public record QueryResult(
            String answer,
            String answerMarkdown,
            String traceId,
            RetrievalResult retrievalResult
    ) {}
}
