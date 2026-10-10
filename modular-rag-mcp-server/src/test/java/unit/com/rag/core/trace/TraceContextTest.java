package com.rag.core.trace;

import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import static org.junit.jupiter.api.Assertions.*;

class TraceContextTest {

    @Test
    void testStart() {
        TraceContext ctx = TraceContext.start("trace-1", "What is AI?");
        assertEquals("trace-1", ctx.traceId());
        assertEquals("What is AI?", ctx.query());
        assertNotNull(ctx.startedAt());
        assertEquals(0, ctx.totalMs());
    }

    @Test
    void testWithRetrieveMs() {
        TraceContext ctx = TraceContext.start("t1", "q1")
                .withRetrieveMs(150, 5);
        assertEquals(150, ctx.retrieveMs());
        assertEquals(5, ctx.retrievedCount());
    }

    @Test
    void testWithLlmMs() {
        TraceContext ctx = TraceContext.start("t1", "q1")
                .withLlmMs(300, "openai");
        assertEquals(300, ctx.llmMs());
        assertEquals("openai", ctx.llmProvider());
    }

    @Test
    void testWithProviders() {
        TraceContext ctx = TraceContext.start("t1", "q1")
                .withProviders("openai", "openai", "chroma");
        assertEquals("openai", ctx.llmProvider());
        assertEquals("openai", ctx.embeddingProvider());
        assertEquals("chroma", ctx.vectorStoreProvider());
    }

    @Test
    void testWithTotalMs() {
        TraceContext ctx = TraceContext.start("t1", "q1")
                .withTotalMs(500);
        assertEquals(500, ctx.totalMs());
    }

    @Test
    void testWithCollection() {
        TraceContext ctx = TraceContext.start("t1", "q1")
                .withCollection("my-collection");
        assertEquals("my-collection", ctx.collection());
    }
}
