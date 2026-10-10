package com.rag.libs.reranker;

import com.rag.core.types.Chunk;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;

/**
 * Simple keyword-overlap reranker as a stand-in for CrossEncoder.
 * A real CrossEncoder would score (query, document) pairs via a fine-tuned model.
 */
@Component
public class CrossEncoderReranker implements RerankerProvider {

    private static final Logger log = LoggerFactory.getLogger(CrossEncoderReranker.class);

    @Override
    public List<Chunk> rerank(String query, List<Chunk> chunks) {
        String[] queryTerms = query.toLowerCase().split("\\s+");
        List<Chunk> reranked = chunks.stream()
                .sorted(Comparator.comparingDouble((Chunk c) -> {
                    String content = c.content().toLowerCase();
                    long matches = 0;
                    for (String term : queryTerms) {
                        if (content.contains(term)) matches++;
                    }
                    return -(double) matches / queryTerms.length;
                }))
                .toList();
        log.debug("CrossEncoderReranker reranked {} chunks", reranked.size());
        return reranked;
    }

    @Override
    public String providerName() {
        return "cross-encoder";
    }
}
