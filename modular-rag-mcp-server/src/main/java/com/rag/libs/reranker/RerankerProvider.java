package com.rag.libs.reranker;

import com.rag.core.types.Chunk;
import java.util.List;

/**
 * Pluggable reranker interface for reordering retrieval results.
 */
public interface RerankerProvider {

    /**
     * Re-ranks a list of chunks given a query. Returns chunks in descending relevance order.
     */
    List<Chunk> rerank(String query, List<Chunk> chunks);

    /**
     * Provider name, e.g. "cross-encoder", "none".
     */
    String providerName();
}
