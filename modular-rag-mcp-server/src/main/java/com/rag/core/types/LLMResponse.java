package com.rag.core.types;

/**
 * Result returned after LLM generates a response.
 */
public record LLMResponse(
    String content,
    String model,
    long latencyMs,
    String finishReason
) {}
