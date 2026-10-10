package com.rag.mcp.tools;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * MCP tool: returns a summary of the knowledge hub (stats, status).
 */
@Component
public class GetDocumentSummaryTool {

    private static final Logger log = LoggerFactory.getLogger(GetDocumentSummaryTool.class);

    public SummaryResult execute() {
        log.debug("Getting document summary");
        return new SummaryResult(
                "modular-rag-mcp-server",
                "1.0.0-SNAPSHOT",
                Map.of("status", "operational", "features", "hybrid_search,dense_retrieval,sparse_retrieval,bm25,reranking"),
                "The knowledge hub is operational."
        );
    }

    public record SummaryResult(
            String serviceName,
            String version,
            Map<String, String> metadata,
            String description
    ) {}
}
