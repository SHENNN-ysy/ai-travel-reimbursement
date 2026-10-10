package com.rag.core.types;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ChunkTest {

    @Test
    void testRecordCreation() {
        Chunk chunk = new Chunk("This is a test chunk", 0, "doc-1");
        assertEquals("This is a test chunk", chunk.content());
        assertEquals(0, chunk.chunkIndex());
        assertEquals("doc-1", chunk.documentId());
        assertEquals(0, chunk.startCharOffset());
        assertEquals(chunk.content().length(), chunk.endCharOffset());
    }

    @Test
    void testWithId() {
        Chunk chunk = new Chunk("content", 1, "doc-1");
        Chunk withId = chunk.withId("chunk-99");
        assertEquals("chunk-99", withId.id());
    }

    @Test
    void testWithMetadata() {
        Chunk chunk = new Chunk("text", 0, "doc-1");
        Chunk enriched = chunk.withMetadata(java.util.Map.of("page", 5));
        assertEquals(5, enriched.metadata().get("page"));
    }
}
