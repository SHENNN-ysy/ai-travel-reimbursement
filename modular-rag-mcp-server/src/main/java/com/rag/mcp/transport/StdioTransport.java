package com.rag.mcp.transport;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Optional stdio transport for direct AI tool connection.
 * Allows AI clients like Cursor to communicate with this MCP server over stdin/stdout.
 * 
 * Note: This is a basic implementation. Full MCP stdio spec requires JSON-RPC
 * message handling. This provides the structural skeleton.
 */
@Component
public class StdioTransport {

    private static final Logger log = LoggerFactory.getLogger(StdioTransport.class);
    private final AtomicBoolean running = new AtomicBoolean(false);

    public void start() {
        if (running.getAndSet(true)) {
            log.warn("StdioTransport already running");
            return;
        }
        log.info("StdioTransport started on stdin/stdout");
        Thread readerThread = new Thread(this::readLoop, "stdio-reader");
        readerThread.setDaemon(true);
        readerThread.start();
    }

    private void readLoop() {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(System.in))) {
            String line;
            while ((line = reader.readLine()) != null && running.get()) {
                if (line.isBlank()) continue;
                log.debug("Stdio received: {}", line.length() > 100 ? line.substring(0, 100) + "..." : line);
                handleMessage(line);
            }
        } catch (Exception e) {
            if (running.get()) {
                log.error("StdioTransport error", e);
            }
        }
    }

    private void handleMessage(String message) {
        // JSON-RPC message handling would go here
        // For now, acknowledge receipt
        log.debug("StdioTransport received message (length={})", message.length());
    }

    public void stop() {
        running.set(false);
        log.info("StdioTransport stopped");
    }

    public boolean isRunning() {
        return running.get();
    }
}
