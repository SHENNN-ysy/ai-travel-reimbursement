package com.rag.core.types;

import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

class DocumentTest {

    @Test
    void testRecordCreation() {
        Document doc = new Document("Hello world", "pdf", "test.pdf");
        assertEquals("Hello world", doc.content());
        assertEquals("pdf", doc.source());
        assertEquals("test.pdf", doc.fileName());
        assertNull(doc.id());
        assertTrue(doc.metadata().isEmpty());
    }

    @Test
    void testWithId() {
        Document doc = new Document("content", "txt", "a.txt");
        Document withId = doc.withId("abc-123");
        assertEquals("abc-123", withId.id());
        assertEquals("content", withId.content());
    }

    @Test
    void testWithMetadata() {
        Document doc = new Document("content", "txt", "a.txt");
        Document enriched = doc.withMetadata(Map.of("author", "Alice"));
        assertEquals("Alice", enriched.metadata().get("author"));
        assertTrue(enriched.metadata().containsKey("author"));
    }

    @Test
    void testOptId() {
        assertTrue(new Document("c", "s", "f").optId().isEmpty());
        assertTrue(new Document("id", "c", "s", "f", Map.of()).optId().isPresent());
    }
}
