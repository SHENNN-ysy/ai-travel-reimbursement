package com.rag.libs.splitter;

import com.rag.core.types.Chunk;
import com.rag.core.types.Document;
import com.rag.config.AppConfig;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class RecursiveTextSplitterTest {

    private final RecursiveTextSplitter splitter = new RecursiveTextSplitter(100, 20);

    @Test
    void testSplitTextShortText() {
        String text = "This is a short text.";
        List<String> chunks = splitter.splitText(text);
        assertEquals(1, chunks.size());
        assertEquals(text.trim(), chunks.get(0));
    }

    @Test
    void testSplitTextLongText() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 50; i++) {
            sb.append("Sentence ").append(i).append(". ");
        }
        String text = sb.toString();
        List<String> chunks = splitter.splitText(text);
        assertTrue(chunks.size() > 1);
        for (String chunk : chunks) {
            assertTrue(chunk.length() <= 100);
        }
    }

    @Test
    void testSplitDocument() {
        Document doc = new Document("doc-1", "Content of the document here.", "txt", "test.txt", java.util.Map.of());
        List<Chunk> chunks = splitter.split(doc);
        assertFalse(chunks.isEmpty());
        assertNotNull(chunks.get(0).documentId());
        assertNotNull(chunks.get(0).id());
        assertTrue(chunks.get(0).chunkIndex() >= 0);
    }

    @Test
    void testOverlap() {
        RecursiveTextSplitter s1 = new RecursiveTextSplitter(50, 10);
        RecursiveTextSplitter s2 = new RecursiveTextSplitter(50, 0);
        String text = "A".repeat(100);
        List<String> withOverlap = s1.splitText(text);
        List<String> noOverlap = s2.splitText(text);
        assertTrue(withOverlap.size() >= noOverlap.size());
    }
}
