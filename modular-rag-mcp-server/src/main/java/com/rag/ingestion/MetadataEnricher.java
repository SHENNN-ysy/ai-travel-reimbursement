package com.rag.ingestion;

import com.rag.core.types.Chunk;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Enriches chunks with metadata: ingestion timestamp, source, word count, etc.
 */
@Component
public class MetadataEnricher {

    private static final Logger log = LoggerFactory.getLogger(MetadataEnricher.class);

    public List<Chunk> enrich(List<Chunk> chunks) {
        return chunks.stream()
                .map(this::enrichChunk)
                .toList();
    }

    public Chunk enrichChunk(Chunk chunk) {
        Map<String, Object> additional = Map.of(
                "ingestedAt", LocalDateTime.now().toString(),
                "wordCount", chunk.content().split("\\s+").length,
                "charCount", chunk.content().length()
        );
        return chunk.withMetadata(additional);
    }
}
