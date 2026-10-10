package com.rag.core.lucene;

import com.rag.core.types.Chunk;
import org.apache.lucene.analysis.standard.StandardAnalyzer;
import org.junit.jupiter.api.*;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

class LuceneBM25IndexerTest implements AutoCloseable {

    private LuceneBM25Indexer indexer;
    private final String testDir = "./data/test-lucene-index";

    @BeforeEach
    void setUp() {
        indexer = new LuceneBM25Indexer(testDir, new StandardAnalyzer());
    }

    @AfterEach
    void tearDown() throws Exception {
        close();
    }

    @Override
    public void close() throws Exception {
        if (indexer != null) {
            indexer.close();
            indexer = null;
        }
    }

    @Test
    void testIndexAndSearch() {
        List<Chunk> chunks = List.of(
                new Chunk(UUID.randomUUID().toString(), "Java is a programming language", 0, "doc-1"),
                new Chunk(UUID.randomUUID().toString(), "Python is also a programming language", 1, "doc-1"),
                new Chunk(UUID.randomUUID().toString(), "Machine learning uses Python and Java", 2, "doc-1")
        );
        indexer.indexChunks(chunks);

        List<LuceneBM25Indexer.BM25SearchResult> results = indexer.search("Java programming", 3);
        assertFalse(results.isEmpty());
        assertTrue(results.stream().anyMatch(r -> r.score() > 0));
    }

    @Test
    void testSearchNoMatch() {
        List<Chunk> chunks = List.of(
                new Chunk(UUID.randomUUID().toString(), "Hello world", 0, "doc-1")
        );
        indexer.indexChunks(chunks);

        List<LuceneBM25Indexer.BM25SearchResult> results = indexer.search("xyz123 nonexistent term", 3);
        assertTrue(results.isEmpty() || results.stream().allMatch(r -> r.score() == 0));
    }

    @Test
    void testDeleteChunk() {
        String chunkId = UUID.randomUUID().toString();
        Chunk chunk = new Chunk(chunkId, "To be deleted", 0, "doc-1");
        indexer.indexChunk(chunk);
        indexer.deleteChunk(chunkId);
        indexer.commit();
        List<LuceneBM25Indexer.BM25SearchResult> results = indexer.search("deleted", 3);
        assertTrue(results.isEmpty());
    }
}
