package com.rag.ingestion;

import com.rag.core.types.Chunk;
import com.rag.core.types.Document;
import com.rag.libs.splitter.TextSplitter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Splits a document into chunks using the configured TextSplitter.
 */
@Component
public class DocumentChunker {

    private static final Logger log = LoggerFactory.getLogger(DocumentChunker.class);
    private final TextSplitter splitter;

    public DocumentChunker(TextSplitter splitter) {
        this.splitter = splitter;
    }

    public List<Chunk> chunk(Document document) {
        List<Chunk> chunks = splitter.split(document);
        log.info("Chunked document '{}' into {} chunks", document.fileName(), chunks.size());
        return chunks;
    }
}
