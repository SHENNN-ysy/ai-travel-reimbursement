package com.rag.mcp;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * MCP server health and info endpoint.
 */
@RestController
@RequestMapping("/api")
public class MCPServer {

    private static final Logger log = LoggerFactory.getLogger(MCPServer.class);

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }

    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> info() {
        return ResponseEntity.ok(Map.of(
                "name", "modular-rag-mcp-server",
                "version", "0.1.0-SNAPSHOT",
                "protocol", "MCP 1.0 via REST",
                "status", "running"
        ));
    }
}
