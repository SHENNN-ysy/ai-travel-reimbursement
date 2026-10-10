package com.rag.core.types;

import java.util.List;
import java.util.Map;

/**
 * A Chunk enriched with its vector embedding and optional metadata.
 */
public record ChunkRecord(
    Chunk chunk,
    float[] embedding,
    Map<String, Object> enrichmentMetadata
) {
    public ChunkRecord(Chunk chunk, float[] embedding) {
        this(chunk, embedding, Map.of());
    }

    public String id() {
        return chunk.id();
    }

    public String content() {
        return chunk.content();
    }

    public int embeddingDimension() {
        return embedding != null ? embedding.length : 0;
    }
}
