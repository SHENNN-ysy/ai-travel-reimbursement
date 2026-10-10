package com.rag.libs.embedding;

import com.rag.core.types.EmbeddingResult;
import java.util.List;

/**
 * Pluggable embedding provider interface.
 */
public interface EmbeddingProvider {

    /**
     * Embeds a single text into a vector.
     */
    EmbeddingResult embed(String text);

    /**
     * Embeds a batch of texts.
     */
    List<EmbeddingResult> embedAll(List<String> texts);

    /**
     * Returns the embedding dimension for this provider.
     */
    int dimension();

    /**
     * Provider name, e.g. "openai", "ollama".
     */
    String providerName();

    boolean isAvailable();
}
