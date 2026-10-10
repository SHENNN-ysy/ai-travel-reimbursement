package com.rag.libs.splitter;

import com.rag.core.types.Chunk;
import com.rag.core.types.Document;
import java.util.List;

/**
 * Pluggable text splitter interface.
 */
public interface TextSplitter {

    /**
     * Splits a document into chunks.
     */
    List<Chunk> split(Document document);

    /**
     * Splits a single text string into chunks.
     */
    List<String> splitText(String text);
}
