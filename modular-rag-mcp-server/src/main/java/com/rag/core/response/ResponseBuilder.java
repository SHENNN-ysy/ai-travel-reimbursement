package com.rag.core.response;

import com.rag.core.types.RAGResponse;
import com.rag.core.types.RetrievalResult;
import com.rag.core.types.RetrievalResult.ScoredChunk;
import com.rag.core.types.Chunk;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Builds formatted responses (Markdown) with citations from retrieved chunks.
 */
@Component
public class ResponseBuilder {

    private static final Logger log = LoggerFactory.getLogger(ResponseBuilder.class);

    public String buildAnswer(String answer, List<Chunk> sourceChunks) {
        StringBuilder sb = new StringBuilder();
        sb.append(answer).append("\n\n");
        if (sourceChunks != null && !sourceChunks.isEmpty()) {
            sb.append("---\n**Sources:**\n");
            for (int i = 0; i < sourceChunks.size(); i++) {
                Chunk chunk = sourceChunks.get(i);
                String snippet = truncate(chunk.content(), 200);
                sb.append(String.format("%d. %s _(score: %.4f, source: %s)_%n",
                        i + 1, snippet, 0.0, chunk.metadata().getOrDefault("source", "unknown")));
            }
        }
        return sb.toString();
    }

    public RAGResponse build(String answer, List<Chunk> sourceChunks, RetrievalResult retrievalResult, long latencyMs) {
        String markdown = buildAnswer(answer, sourceChunks);
        return new RAGResponse(answer, markdown, retrievalResult, latencyMs);
    }

    private String truncate(String text, int maxLen) {
        if (text == null) return "";
        text = text.replace('\n', ' ').trim();
        return text.length() <= maxLen ? text : text.substring(0, maxLen) + "...";
    }
}
