package com.rag.ingestion;

import com.rag.core.types.Document;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class IntegrityCheckerTest {

    private final IntegrityChecker checker = new IntegrityChecker();

    @Test
    void testComputeHash() {
        Document doc1 = new Document("content A", "txt", "a.txt");
        Document doc2 = new Document("content A", "txt", "a.txt");
        Document doc3 = new Document("content B", "txt", "b.txt");
        assertEquals(checker.computeHash(doc1), checker.computeHash(doc2));
        assertNotEquals(checker.computeHash(doc1), checker.computeHash(doc3));
    }

    @Test
    void testIsNew() {
        Document doc = new Document("unique content", "txt", "unique.txt");
        assertTrue(checker.isNew(doc));
        assertFalse(checker.isNew(doc));
    }

    @Test
    void testClear() {
        Document doc = new Document("content", "txt", "c.txt");
        assertTrue(checker.isNew(doc));
        checker.clear();
        assertTrue(checker.isNew(doc));
    }

    @Test
    void testRecordHash() {
        String hash = "abc123def456";
        checker.recordHash(hash, "file.txt");
        assertFalse(checker.isNewByHash(hash));
        assertTrue(checker.isNewByHash("unknown-hash"));
    }
}
