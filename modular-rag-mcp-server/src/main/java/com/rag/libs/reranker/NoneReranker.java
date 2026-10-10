package com.rag.libs.reranker;

import com.rag.core.types.Chunk;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;

@Component
public class NoneReranker implements RerankerProvider {

    private static final Logger log = LoggerFactory.getLogger(NoneReranker.class);

    @Override
    public List<Chunk> rerank(String query, List<Chunk> chunks) {
        log.debug("NoneReranker: returning chunks in original order");
        return chunks;
    }

    @Override
    public String providerName() {
        return "none";
    }
}
