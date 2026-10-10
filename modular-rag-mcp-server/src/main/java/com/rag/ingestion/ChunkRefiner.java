package com.rag.ingestion;

import com.rag.core.types.Chunk;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Optional refinement of chunk text — e.g. trimming whitespace, removing redundant newlines.
 * In a full implementation this could call an LLM for summarization / quality enhancement.
 */
@Component
public class ChunkRefiner {

    private static final Logger log = LoggerFactory.getLogger(ChunkRefiner.class);

    public List<Chunk> refine(List<Chunk> chunks) {
        return chunks.stream()
                .map(this::refineChunk)
                .toList();
    }

    public Chunk refineChunk(Chunk chunk) {
        String refined = chunk.content()
                .replaceAll("[ \\t]+", " ")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();
        if (refined.equals(chunk.content())) {
            return chunk;
        }
        return new Chunk(
                chunk.id(),
                refined,
                chunk.chunkIndex(),
                chunk.documentId(),
                chunk.startCharOffset(),
                chunk.endCharOffset(),
                chunk.metadata()
        );
    }
}
