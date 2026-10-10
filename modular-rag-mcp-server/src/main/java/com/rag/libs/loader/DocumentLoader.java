package com.rag.libs.loader;

import com.rag.core.types.Document;
import java.io.InputStream;

/**
 * Pluggable document loader interface.
 */
public interface DocumentLoader {

    /**
     * Loads a document from an input stream and returns a raw Document.
     */
    Document load(InputStream inputStream, String fileName);

    /**
     * Returns the set of MIME types this loader supports, e.g. "application/pdf".
     */
    String[] supportedTypes();

    /**
     * Checks whether this loader can handle the given file name.
     */
    boolean supports(String fileName);
}
