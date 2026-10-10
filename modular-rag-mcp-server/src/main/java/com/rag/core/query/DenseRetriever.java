package com.rag.core.query;

import com.rag.core.types.ProcessedQuery;
import com.rag.libs.embedding.EmbeddingProvider;
import com.rag.libs.vectorstore.VectorStoreProvider;
import com.rag.core.types.Chunk;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Dense retriever using vector similarity search via the VectorStoreProvider (ChromaDB).
 */
@Component
public class DenseRetriever {

    private static final Logger log = LoggerFactory.getLogger(DenseRetriever.class);
    private final VectorStoreProvider vectorStore;
    private final EmbeddingProvider embeddingProvider;

    public DenseRetriever(VectorStoreProvider vectorStore, EmbeddingProvider embeddingProvider) {
        this.vectorStore = vectorStore;
        this.embeddingProvider = embeddingProvider;
    }

    public Map<String, Double> retrieve(ProcessedQuery query, int topK) {
        long start = System.currentTimeMillis();
        float[] queryEmbedding = embeddingProvider.embed(query.normalizedQuery()).vector();
        List<String> chunkIds = vectorStore.similaritySearch(queryEmbedding, topK);
        log.debug("Dense retrieval for '{}' returned {} results in {}ms",
                query.rawQuery(), chunkIds.size(), System.currentTimeMillis() - start);
        Map<String, Double> scores = new HashMap<>();
        for (int i = 0; i < chunkIds.size(); i++) {
            double score = 1.0 / (i + 1.0);
            scores.put(chunkIds.get(i), score);
        }
        return scores;
    }
}
