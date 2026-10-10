package com.rag.core.query;

import com.rag.core.lucene.LuceneBM25Indexer;
import com.rag.core.types.ProcessedQuery;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Sparse retriever using BM25 via Lucene.
 */
@Component
public class SparseRetriever {

    private static final Logger log = LoggerFactory.getLogger(SparseRetriever.class);
    private final LuceneBM25Indexer indexer;

    public SparseRetriever(LuceneBM25Indexer indexer) {
        this.indexer = indexer;
    }

    public Map<String, Double> retrieve(ProcessedQuery query, int topK) {
        long start = System.currentTimeMillis();
        List<LuceneBM25Indexer.BM25SearchResult> results = indexer.search(
                String.join(" ", query.tokens()), topK);

        Map<String, Double> scores = new HashMap<>();
        for (LuceneBM25Indexer.BM25SearchResult r : results) {
            scores.put(r.chunkId(), r.score());
        }
        log.debug("Sparse retrieval (BM25) for '{}' returned {} results in {}ms",
                query.rawQuery(), scores.size(), System.currentTimeMillis() - start);
        return scores;
    }
}
