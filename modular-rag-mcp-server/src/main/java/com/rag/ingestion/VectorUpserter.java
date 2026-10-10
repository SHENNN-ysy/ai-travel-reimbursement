package com.rag.ingestion;

import com.rag.core.types.ChunkRecord;
import com.rag.libs.vectorstore.VectorStoreProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Writes chunk records into ChromaDB.
 */
@Component
public class VectorUpserter {

    private static final Logger log = LoggerFactory.getLogger(VectorUpserter.class);
    private final VectorStoreProvider vectorStore;

    public VectorUpserter(VectorStoreProvider vectorStore) {
        this.vectorStore = vectorStore;
    }

    public void upsert(List<ChunkRecord> records) {
        if (records == null || records.isEmpty()) {
            log.warn("No records to upsert");
            return;
        }
        vectorStore.upsert(records);
        log.info("Upserted {} records into vector store '{}'", records.size(), vectorStore.collectionName());
    }
}
