package com.rag.libs.vectorstore;

import com.rag.core.types.ChunkRecord;
import java.util.List;

/**
 * Pluggable vector store provider interface.
 */
public interface VectorStoreProvider {

    /**
     * Upserts a list of chunk records (embedding + text) into the vector store.
     */
    void upsert(List<ChunkRecord> records);

    /**
     * Performs a similarity search and returns the IDs of the top-k nearest chunks.
     */
    List<String> similaritySearch(float[] queryEmbedding, int topK);

    /**
     * Deletes chunks by their IDs.
     */
    void delete(List<String> chunkIds);

    /**
     * Collection / index name in use.
     */
    String collectionName();

    /**
     * Provider name, e.g. "chroma".
     */
    String providerName();
}
