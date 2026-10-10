package com.rag.core.query;

import com.rag.core.types.Chunk;
import com.rag.libs.reranker.RerankerProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Re-ranks retrieval results using a RerankerProvider (None or CrossEncoder).
 */
@Component
public class Reranker {

    private static final Logger log = LoggerFactory.getLogger(Reranker.class);
    private final RerankerProvider rerankerProvider;

    public Reranker(RerankerProvider rerankerProvider) {
        this.rerankerProvider = rerankerProvider;
    }

    public List<Chunk> rerank(String query, List<Chunk> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            return List.of();
        }
        long start = System.currentTimeMillis();
        List<Chunk> result = rerankerProvider.rerank(query, chunks);
        log.debug("Reranking {} chunks by '{}' took {}ms (provider={})",
                chunks.size(), query, System.currentTimeMillis() - start, rerankerProvider.providerName());
        return result;
    }

    public String providerName() {
        return rerankerProvider.providerName();
    }
}
