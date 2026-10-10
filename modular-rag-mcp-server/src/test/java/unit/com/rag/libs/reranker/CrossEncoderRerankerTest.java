package com.rag.libs.reranker;

import com.rag.core.types.Chunk;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class CrossEncoderRerankerTest {

    private final CrossEncoderReranker reranker = new CrossEncoderReranker();

    @Test
    void testRerankOrdersByOverlap() {
        List<Chunk> chunks = List.of(
                new Chunk("c1", "Machine learning is great", 0, "d1"),
                new Chunk("c2", "Java programming language", 1, "d1"),
                new Chunk("c3", "ML and AI techniques", 2, "d1")
        );
        List<Chunk> result = reranker.rerank("machine learning", chunks);
        assertFalse(result.isEmpty());
        assertEquals(3, result.size());
        assertEquals("c1", result.get(0).id());
    }

    @Test
    void testRerankPreservesAll() {
        List<Chunk> chunks = List.of(
                new Chunk("id1", "content A", 0, "d1"),
                new Chunk("id2", "content B", 1, "d1"),
                new Chunk("id3", "content C", 2, "d1")
        );
        List<Chunk> result = reranker.rerank("query", chunks);
        assertEquals(3, result.size());
    }

    @Test
    void testProviderName() {
        assertEquals("cross-encoder", reranker.providerName());
    }
}
