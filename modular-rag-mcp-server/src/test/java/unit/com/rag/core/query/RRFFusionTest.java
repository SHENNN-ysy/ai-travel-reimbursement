package com.rag.core.query;

import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class RRFFusionTest {

    private final RRFFusion fusion = new RRFFusion(60);

    @Test
    void testFuseSingleSource() {
        Map<String, Double> ranks = Map.of("a", 1.0, "b", 0.5, "c", 0.2);
        List<RRFFusion.RRFScored<String>> result = fusion.fuse(ranks);
        assertFalse(result.isEmpty());
        assertEquals("a", result.get(0).id());
    }

    @Test
    void testFuseMultipleSources() {
        Map<String, Double> ranks1 = Map.of("a", 1.0, "b", 0.5);
        Map<String, Double> ranks2 = Map.of("b", 1.0, "c", 0.5);
        List<RRFFusion.RRFScored<String>> result = fusion.fuse(ranks1, ranks2);
        assertEquals(3, result.size());
        assertTrue(result.get(0).retrievalSourceCount() >= 1);
    }

    @Test
    void testFuseEmpty() {
        List<RRFFusion.RRFScored<String>> result = fusion.fuse(Map.of());
        assertTrue(result.isEmpty());
    }

    @Test
    void testSortedByScore() {
        Map<String, Double> ranks = Map.of("low", 0.1, "high", 0.9);
        List<RRFFusion.RRFScored<String>> result = fusion.fuse(ranks);
        assertTrue(result.get(0).score() >= result.get(1).score());
    }
}
