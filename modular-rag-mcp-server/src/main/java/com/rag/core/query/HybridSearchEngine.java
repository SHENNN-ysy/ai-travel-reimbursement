package com.rag.core.query;

import com.rag.core.types.ProcessedQuery;
import com.rag.core.types.RetrievalResult;
import com.rag.core.types.RetrievalResult.ScoredChunk;
import com.rag.core.types.Chunk;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Orchestrates hybrid retrieval: concurrent Dense + Sparse search, RRF fusion, optional reranking.
 */
@Component
public class HybridSearchEngine {

    private static final Logger log = LoggerFactory.getLogger(HybridSearchEngine.class);
    private final DenseRetriever denseRetriever;
    private final SparseRetriever sparseRetriever;
    private final RRFFusion rrfFusion;
    private final Reranker reranker;
    private final ExecutorService executor;

    public HybridSearchEngine(
            DenseRetriever denseRetriever,
            SparseRetriever sparseRetriever,
            RRFFusion rrfFusion,
            Reranker reranker) {
        this.denseRetriever = denseRetriever;
        this.sparseRetriever = sparseRetriever;
        this.rrfFusion = rrfFusion;
        this.reranker = reranker;
        this.executor = Executors.newFixedThreadPool(2);
        log.info("HybridSearchEngine initialized");
    }

    public RetrievalResult search(ProcessedQuery query, int topK) {
        long start = System.currentTimeMillis();

        CompletableFuture<Map<String, Double>> denseFuture =
                CompletableFuture.supplyAsync(() -> denseRetriever.retrieve(query, topK * 2), executor);
        CompletableFuture<Map<String, Double>> sparseFuture =
                CompletableFuture.supplyAsync(() -> sparseRetriever.retrieve(query, topK * 2), executor);

        Map<String, Double> denseScores = denseFuture.join();
        Map<String, Double> sparseScores = sparseFuture.join();

        List<RRFFusion.RRFScored<String>> fused = rrfFusion.fuse(denseScores, sparseScores);

        List<ScoredChunk> scoredChunks = new ArrayList<>();
        int rank = 0;
        for (RRFFusion.RRFScored<String> rrf : fused) {
            if (rank >= topK) break;
            double dense = denseScores.getOrDefault(rrf.id(), 0.0);
            double sparse = sparseScores.getOrDefault(rrf.id(), 0.0);
            scoredChunks.add(new ScoredChunk(null, dense, sparse, rrf.score(), rank + 1));
            rank++;
        }

        Map<String, Object> meta = Map.of(
                "denseCount", denseScores.size(),
                "sparseCount", sparseScores.size(),
                "totalLatencyMs", System.currentTimeMillis() - start
        );
        log.info("Hybrid search for '{}': {} results in {}ms",
                query.rawQuery(), scoredChunks.size(), System.currentTimeMillis() - start);
        return new RetrievalResult(scoredChunks, meta);
    }

    public void shutdown() {
        executor.shutdown();
    }
}
