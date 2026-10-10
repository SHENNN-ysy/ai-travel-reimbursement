package com.rag.core.types;

import java.util.Map;
import java.util.Optional;

/**
 * Represents a raw document loaded from a source (PDF, TXT, etc.).
 */
public record Document(
    String id,
    String content,
    String source,
    String fileName,
    Map<String, Object> metadata
) {
    public Document(String content, String source, String fileName) {
        this(null, content, source, fileName, Map.of());
    }

    public Document withId(String newId) {
        return new Document(newId, content(), source(), fileName(), metadata());
    }

    public Document withMetadata(Map<String, Object> additionalMetadata) {
        Map<String, Object> merged = new java.util.HashMap<>(metadata());
        merged.putAll(additionalMetadata);
        return new Document(id(), content(), source(), fileName(), Map.copyOf(merged));
    }

    public Optional<String> optId() {
        return Optional.ofNullable(id);
    }
}
