package com.rag.ingestion;

import com.rag.core.types.Chunk;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class ChunkRefinerTest {

    private final ChunkRefiner refiner = new ChunkRefiner();

    @Test
    void testRefineTrimsWhitespace() {
        Chunk chunk = new Chunk("  Hello   world  \n\n\n  ", 0, "doc-1");
        Chunk refined = refiner.refineChunk(chunk);
        assertFalse(refined.content().contains("  "));
        assertTrue(refined.content().contains("\n\n"));
    }

    @Test
    void testRefineNoChange() {
        Chunk chunk = new Chunk("Clean text.", 0, "doc-1");
        Chunk refined = refiner.refineChunk(chunk);
        assertEquals(chunk.content(), refined.content());
    }

    @Test
    void testRefineList() {
        List<Chunk> chunks = List.of(
                new Chunk("  spaced  ", 0, "d1"),
                new Chunk("normal", 1, "d1")
        );
        List<Chunk> refined = refiner.refine(chunks);
        assertEquals(2, refined.size());
        assertFalse(refined.get(0).content().startsWith("  "));
    }
}
