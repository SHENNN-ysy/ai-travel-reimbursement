package com.rag.core.types;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class RetrievalResultTest {

    @Test
    void testCount() {
        RetrievalResult empty = new RetrievalResult(java.util.List.of());
        assertEquals(0, empty.count());

        var chunks = java.util.List.of(
                new RetrievalResult.ScoredChunk(new Chunk("c1", 0, "d1"), 0.9, 0.5, 0.7, 1),
                new RetrievalResult.ScoredChunk(new Chunk("c2", 1, "d1"), 0.8, 0.4, 0.6, 2)
        );
        RetrievalResult result = new RetrievalResult(chunks);
        assertEquals(2, result.count());
    }
}
