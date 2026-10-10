package com.rag.ingestion;

import com.rag.core.lucene.LuceneBM25Indexer;
import com.rag.core.types.Chunk;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Wrapper around LuceneBM25Indexer integrated into the ingestion pipeline.
 */
@Component
public class BM25Indexer {

    private static final Logger log = LoggerFactory.getLogger(BM25Indexer.class);
    private final LuceneBM25Indexer indexer;

    public BM25Indexer(LuceneBM25Indexer indexer) {
        this.indexer = indexer;
    }

    public void indexChunks(List<Chunk> chunks) {
        if (chunks == null || chunks.isEmpty()) {
            log.warn("No chunks to index in BM25");
            return;
        }
        indexer.indexChunks(chunks);
        log.info("Indexed {} chunks in BM25 index", chunks.size());
    }

    public void indexChunk(Chunk chunk) {
        indexer.indexChunk(chunk);
        indexer.commit();
    }

    public void deleteChunk(String chunkId) {
        indexer.deleteChunk(chunkId);
        indexer.commit();
    }
}
