package com.rag.core.types;

import java.util.List;
import java.util.Map;

/**
 * A query that has been preprocessed: tokenized, keywords extracted, etc.
 */
public record ProcessedQuery(
    String rawQuery,
    String normalizedQuery,
    List<String> tokens,
    List<String> keywords,
    Map<String, Object> metadata
) {
    public ProcessedQuery(String rawQuery, String normalizedQuery, List<String> tokens, List<String> keywords) {
        this(rawQuery, normalizedQuery, tokens, keywords, Map.of());
    }
}
