package com.rag.core.types;

import java.util.List;
import java.util.Map;

/**
 * Result returned after hybrid retrieval.
 */
public record RetrievalResult(
    List<ScoredChunk> chunks,
    Map<String, Object> queryMetadata
) {
    public RetrievalResult(List<ScoredChunk> chunks) {
        this(chunks, Map.of());
    }

    public int count() {
        return chunks != null ? chunks.size() : 0;
    }

    public record ScoredChunk(
        Chunk chunk,
        double vectorScore,
        double bm25Score,
        double fusedScore,
        double rank
    ) {}
}
