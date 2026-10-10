package com.rag.core.trace;

import java.time.LocalDateTime;

/**
 * Holds trace context for a single request through the full RAG pipeline.
 */
public record TraceContext(
    String traceId,
    String query,
    String collection,
    LocalDateTime startedAt,
    long ingestMs,
    long retrieveMs,
    long rerankMs,
    long llmMs,
    long totalMs,
    String llmProvider,
    String embeddingProvider,
    String vectorStoreProvider,
    int retrievedCount,
    int rerankedCount
) {
    public static TraceContext start(String traceId, String query) {
        return new TraceContext(
                traceId, query, null, LocalDateTime.now(),
                0, 0, 0, 0, 0, null, null, null, 0, 0);
    }

    public TraceContext withCollection(String collection) {
        return new TraceContext(traceId, query, collection, startedAt,
                ingestMs, retrieveMs, rerankMs, llmMs, totalMs,
                llmProvider, embeddingProvider, vectorStoreProvider,
                retrievedCount, rerankedCount);
    }

    public TraceContext withRetrieveMs(long ms, int count) {
        return new TraceContext(traceId, query, collection, startedAt,
                ingestMs, ms, rerankMs, llmMs, totalMs,
                llmProvider, embeddingProvider, vectorStoreProvider,
                count, rerankedCount);
    }

    public TraceContext withRerankMs(long ms, int count) {
        return new TraceContext(traceId, query, collection, startedAt,
                ingestMs, retrieveMs, ms, llmMs, totalMs,
                llmProvider, embeddingProvider, vectorStoreProvider,
                retrievedCount, count);
    }

    public TraceContext withLlmMs(long ms, String provider) {
        return new TraceContext(traceId, query, collection, startedAt,
                ingestMs, retrieveMs, rerankMs, ms, totalMs,
                provider, embeddingProvider, vectorStoreProvider,
                retrievedCount, rerankedCount);
    }

    public TraceContext withTotalMs(long ms) {
        return new TraceContext(traceId, query, collection, startedAt,
                ingestMs, retrieveMs, rerankMs, llmMs, ms,
                llmProvider, embeddingProvider, vectorStoreProvider,
                retrievedCount, rerankedCount);
    }

    public TraceContext withProviders(String llm, String embedding, String vectorStore) {
        return new TraceContext(traceId, query, collection, startedAt,
                ingestMs, retrieveMs, rerankMs, llmMs, totalMs,
                llm, embedding, vectorStore, retrievedCount, rerankedCount);
    }

    public TraceContext withIngestMs(long ms) {
        return new TraceContext(traceId, query, collection, startedAt,
                ms, retrieveMs, rerankMs, llmMs, totalMs,
                llmProvider, embeddingProvider, vectorStoreProvider,
                retrievedCount, rerankedCount);
    }
}
