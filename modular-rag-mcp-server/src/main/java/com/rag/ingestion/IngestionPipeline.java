package com.rag.ingestion;

import com.rag.core.types.Chunk;
import com.rag.core.types.ChunkRecord;
import com.rag.core.types.Document;
import com.rag.libs.loader.DocumentLoader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Orchestrates the full document ingestion pipeline:
 * load -> deduplicate -> chunk -> refine -> enrich -> embed -> store (Chroma + BM25).
 */
@Component
public class IngestionPipeline {

    private static final Logger log = LoggerFactory.getLogger(IngestionPipeline.class);

    private final List<DocumentLoader> loaders;
    private final IntegrityChecker integrityChecker;
    private final DocumentChunker chunker;
    private final ChunkRefiner refiner;
    private final MetadataEnricher enricher;
    private final BatchEmbeddingProcessor embeddingProcessor;
    private final VectorUpserter vectorUpserter;
    private final BM25Indexer bm25Indexer;

    public IngestionPipeline(
            List<DocumentLoader> loaders,
            IntegrityChecker integrityChecker,
            DocumentChunker chunker,
            ChunkRefiner refiner,
            MetadataEnricher enricher,
            BatchEmbeddingProcessor embeddingProcessor,
            VectorUpserter vectorUpserter,
            BM25Indexer bm25Indexer) {
        this.loaders = loaders;
        this.integrityChecker = integrityChecker;
        this.chunker = chunker;
        this.refiner = refiner;
        this.enricher = enricher;
        this.embeddingProcessor = embeddingProcessor;
        this.vectorUpserter = vectorUpserter;
        this.bm25Indexer = bm25Indexer;
        log.info("IngestionPipeline initialized with {} loaders", loaders.size());
    }

    public IngestionResult ingest(InputStream inputStream, String fileName) {
        long start = System.currentTimeMillis();
        DocumentLoader loader = loaders.stream()
                .filter(l -> l.supports(fileName))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No loader found for: " + fileName));

        Document document = loader.load(inputStream, fileName);
        if (!integrityChecker.isNew(document)) {
            log.info("Skipping duplicate document: {}", fileName);
            return new IngestionResult(0, 0, 0, true, System.currentTimeMillis() - start);
        }

        List<Chunk> chunks = chunker.chunk(document);
        chunks = refiner.refine(chunks);
        chunks = enricher.enrich(chunks);

        List<ChunkRecord> records = embeddingProcessor.process(chunks);
        vectorUpserter.upsert(records);
        bm25Indexer.indexChunks(chunks);

        long elapsed = System.currentTimeMillis() - start;
        log.info("Ingested '{}' in {}ms: {} chunks, {} records",
                fileName, elapsed, chunks.size(), records.size());
        return new IngestionResult(chunks.size(), records.size(), elapsed, false, 0);
    }

    public record IngestionResult(
            int chunkCount,
            int recordCount,
            long elapsedMs,
            boolean skippedDuplicate,
            long skippedTimeMs
    ) {}
}
