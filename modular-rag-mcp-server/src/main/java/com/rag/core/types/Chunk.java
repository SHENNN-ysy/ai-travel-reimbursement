package com.rag.core.types;

import java.util.Map;
import java.util.Optional;

/**
 * Represents a text chunk split from a document.
 */
public record Chunk(
    String id,
    String content,
    int chunkIndex,
    String documentId,
    int startCharOffset,
    int endCharOffset,
    Map<String, Object> metadata
) {
    public Chunk(String content, int chunkIndex, String documentId) {
        this(null, content, chunkIndex, documentId, 0, content.length(), Map.of());
    }

    public Chunk withId(String newId) {
        return new Chunk(newId, content(), chunkIndex(), documentId(), startCharOffset(), endCharOffset(), metadata());
    }

    public Chunk withMetadata(Map<String, Object> additionalMetadata) {
        Map<String, Object> merged = new java.util.HashMap<>(metadata());
        merged.putAll(additionalMetadata);
        return new Chunk(id(), content(), chunkIndex(), documentId(), startCharOffset(), endCharOffset(), Map.copyOf(merged));
    }

    public Optional<String> optId() {
        return Optional.ofNullable(id);
    }
}
