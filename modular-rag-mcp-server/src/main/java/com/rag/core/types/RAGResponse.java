package com.rag.core.types;

/**
 * Represents a response built from retrieval results.
 */
public record RAGResponse(
    String answer,
    String answerInMarkdown,
    RetrievalResult retrievalResult,
    long totalLatencyMs
) {}
