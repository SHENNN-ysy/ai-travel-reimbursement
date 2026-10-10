package com.rag.core.types;

/**
 * Result of embedding a single text or a batch.
 */
public record EmbeddingResult(
    String text,
    float[] vector,
    String model
) {}
