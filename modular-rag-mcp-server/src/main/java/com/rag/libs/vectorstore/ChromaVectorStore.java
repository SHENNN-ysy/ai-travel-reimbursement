package com.rag.libs.vectorstore;

import com.rag.config.AppConfig;
import com.rag.core.types.ChunkRecord;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.store.embedding.EmbeddingStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChromaVectorStore implements VectorStoreProvider {

    private static final Logger log = LoggerFactory.getLogger(ChromaVectorStore.class);
    private final EmbeddingStore<String> store;
    private final AppConfig appConfig;
    private final Map<String, String> idToContent = new ConcurrentHashMap<>();

    @Autowired
    public ChromaVectorStore(EmbeddingStore<String> embeddingStore, AppConfig appConfig) {
        this.store = embeddingStore;
        this.appConfig = appConfig;
        log.info("ChromaVectorStore initialized");
    }

    @Override
    public void upsert(List<ChunkRecord> records) {
        List<Embedding> embeddings = new ArrayList<>();
        List<String> ids = new ArrayList<>();
        for (ChunkRecord record : records) {
            Embedding embedding = new Embedding(record.embedding());
            String chunkId = record.chunk().id();
            embeddings.add(embedding);
            ids.add(chunkId);
            idToContent.put(chunkId, record.chunk().content());
        }
        store.addAll(embeddings, ids);
        log.info("Upserted {} records into Chroma", records.size());
    }

    @Override
    public List<String> similaritySearch(float[] queryEmbedding, int topK) {
        Embedding query = new Embedding(queryEmbedding);
        List<dev.langchain4j.store.embedding.EmbeddingMatch<String>> matches =
                store.findRelevant(query, topK);
        return matches.stream()
                .map(dev.langchain4j.store.embedding.EmbeddingMatch::embedded)
                .toList();
    }

    @Override
    public void delete(List<String> chunkIds) {
        for (String id : chunkIds) {
            idToContent.remove(id);
        }
        log.info("Delete requested for {} chunks", chunkIds.size());
    }

    public String getContent(String chunkId) {
        return idToContent.get(chunkId);
    }

    @Override
    public String collectionName() {
        return "default";
    }

    @Override
    public String providerName() {
        return "chroma";
    }
}
