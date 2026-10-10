package com.rag.mcp;

import com.rag.config.AppConfig;
import com.rag.core.types.RAGResponse;
import com.rag.ingestion.IngestionPipeline;
import com.rag.mcp.tools.GetDocumentSummaryTool;
import com.rag.mcp.tools.ListCollectionsTool;
import com.rag.mcp.tools.QueryKnowledgeHubTool;
import com.rag.mcp.tools.QueryKnowledgeHubTool.QueryResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * REST controller exposing MCP Tools as HTTP endpoints.
 */
@RestController
@RequestMapping("/api/mcp")
public class MCPController {

    private static final Logger log = LoggerFactory.getLogger(MCPController.class);
    private final QueryKnowledgeHubTool queryTool;
    private final ListCollectionsTool listCollectionsTool;
    private final GetDocumentSummaryTool summaryTool;
    private final IngestionPipeline ingestionPipeline;

    public MCPController(
            QueryKnowledgeHubTool queryTool,
            ListCollectionsTool listCollectionsTool,
            GetDocumentSummaryTool summaryTool,
            IngestionPipeline ingestionPipeline) {
        this.queryTool = queryTool;
        this.listCollectionsTool = listCollectionsTool;
        this.summaryTool = summaryTool;
        this.ingestionPipeline = ingestionPipeline;
    }

    @PostMapping(value = "/query", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> query(@RequestBody QueryRequest request) {
        log.info("MCP query: {}", request.query());
        QueryResult result = queryTool.execute(request.query(), request.topK() > 0 ? request.topK() : 10);
        return ResponseEntity.ok(Map.of(
                "answer", result.answer(),
                "answerMarkdown", result.answerMarkdown() != null ? result.answerMarkdown() : "",
                "traceId", result.traceId()
        ));
    }

    @GetMapping("/collections")
    public ResponseEntity<?> listCollections() {
        return ResponseEntity.ok(listCollectionsTool.execute());
    }

    @GetMapping("/summary")
    public ResponseEntity<?> getSummary() {
        return ResponseEntity.ok(summaryTool.execute());
    }

    @PostMapping(value = "/ingest", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> ingest(@RequestParam("file") MultipartFile file) {
        log.info("MCP ingest: {}", file.getOriginalFilename());
        try {
            var result = ingestionPipeline.ingest(file.getInputStream(), file.getOriginalFilename());
            return ResponseEntity.ok(Map.of(
                    "fileName", file.getOriginalFilename(),
                    "chunkCount", result.chunkCount(),
                    "recordCount", result.recordCount(),
                    "elapsedMs", result.elapsedMs(),
                    "skippedDuplicate", result.skippedDuplicate()
            ));
        } catch (Exception e) {
            log.error("Ingest failed", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    public record QueryRequest(String query, int topK) {}
}
