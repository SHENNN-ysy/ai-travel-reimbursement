package com.rag.ingestion;

import com.rag.core.types.ChunkRecord;
import com.rag.core.types.EmbeddingResult;
import com.rag.libs.embedding.EmbeddingProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Batch-encodes chunks into vectors using the configured EmbeddingProvider.
 */
@Component
public class BatchEmbeddingProcessor {

    private static final Logger log = LoggerFactory.getLogger(BatchEmbeddingProcessor.class);
    private final EmbeddingProvider embeddingProvider;
    private static final int BATCH_SIZE = 20;

    public BatchEmbeddingProcessor(EmbeddingProvider embeddingProvider) {
        this.embeddingProvider = embeddingProvider;
    }

    public List<ChunkRecord> process(List<com.rag.core.types.Chunk> chunks) {
        List<ChunkRecord> records = new ArrayList<>();
        List<String> texts = chunks.stream().map(com.rag.core.types.Chunk::content).toList();

        for (int i = 0; i < texts.size(); i += BATCH_SIZE) {
            int end = Math.min(i + BATCH_SIZE, texts.size());
            List<String> batch = texts.subList(i, end);
            List<EmbeddingResult> embeddings = embeddingProvider.embedAll(batch);
            for (int j = 0; j < batch.size(); j++) {
                records.add(new ChunkRecord(chunks.get(i + j), embeddings.get(j).vector()));
            }
        }
        log.info("Embedded {} chunks (batch size: {})", records.size(), BATCH_SIZE);
        return records;
    }
}
