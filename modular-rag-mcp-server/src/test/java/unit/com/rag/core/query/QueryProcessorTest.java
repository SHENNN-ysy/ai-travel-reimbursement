package com.rag.core.query;

import org.junit.jupiter.api.Test;
import org.apache.lucene.analysis.standard.StandardAnalyzer;
import com.rag.core.types.ProcessedQuery;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class QueryProcessorTest {

    private final QueryProcessor processor = new QueryProcessor(new StandardAnalyzer());

    @Test
    void testNormalize() {
        assertEquals("hello world", processor.normalize("  Hello,  World!  "));
        assertEquals("test query", processor.normalize("Test【】Query"));
    }

    @Test
    void testTokenize() {
        List<String> tokens = processor.tokenize("The quick brown fox jumps");
        assertFalse(tokens.isEmpty());
        assertTrue(tokens.contains("quick") || tokens.contains("QUICK"));
    }

    @Test
    void testExtractKeywords() {
        List<String> tokens = List.of("java", "spring", "boot", "the", "is", "a");
        List<String> keywords = processor.extractKeywords(tokens);
        assertFalse(keywords.contains("the"));
        assertFalse(keywords.contains("is"));
        assertFalse(keywords.contains("a"));
        assertTrue(keywords.contains("java"));
        assertTrue(keywords.contains("spring"));
    }

    @Test
    void testProcess() {
        ProcessedQuery result = processor.process("What is Spring Boot framework?");
        assertEquals("What is Spring Boot framework?", result.rawQuery());
        assertNotNull(result.normalizedQuery());
        assertNotNull(result.tokens());
        assertNotNull(result.keywords());
    }
}
