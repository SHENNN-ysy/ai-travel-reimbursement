package com.rag.mcp.tools;

import com.rag.libs.vectorstore.VectorStoreProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * MCP tool: lists available collections (vector stores).
 */
@Component
public class ListCollectionsTool {

    private static final Logger log = LoggerFactory.getLogger(ListCollectionsTool.class);
    private final VectorStoreProvider vectorStoreProvider;

    public ListCollectionsTool(VectorStoreProvider vectorStoreProvider) {
        this.vectorStoreProvider = vectorStoreProvider;
    }

    public CollectionsResult execute() {
        log.debug("Listing collections");
        return new CollectionsResult(
                vectorStoreProvider != null ? vectorStoreProvider.providerName() : "none",
                vectorStoreProvider != null ? vectorStoreProvider.collectionName() : "N/A",
                "available"
        );
    }

    public record CollectionsResult(String provider, String collectionName, String status) {}
}
