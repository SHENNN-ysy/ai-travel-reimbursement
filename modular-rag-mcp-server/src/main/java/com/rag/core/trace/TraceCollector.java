package com.rag.core.trace;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.rag.config.AppConfig;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Queue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

/**
 * Asynchronously collects and writes trace records to traces.jsonl.
 */
@Component
public class TraceCollector {

    private static final Logger log = LoggerFactory.getLogger(TraceCollector.class);
    private final AppConfig appConfig;
    private final ObjectMapper objectMapper;
    private final BlockingQueue<TraceContext> queue;
    private final Thread writerThread;
    private volatile boolean running = true;

    public TraceCollector(AppConfig appConfig) {
        this.appConfig = appConfig;
        this.objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        this.queue = new LinkedBlockingQueue<>(10000);
        this.writerThread = new Thread(this::writeLoop, "trace-writer");
    }

    @PostConstruct
    public void init() {
        if (!appConfig.trace().enabled()) {
            log.info("Tracing is disabled");
            return;
        }
        Path outputDir = Path.of(appConfig.trace().outputDir());
        try {
            Files.createDirectories(outputDir);
        } catch (IOException e) {
            log.warn("Could not create trace output directory: {}", e.getMessage());
        }
        writerThread.start();
        log.info("TraceCollector started, output dir: {}", appConfig.trace().outputDir());
    }

    public void record(TraceContext context) {
        if (!appConfig.trace().enabled()) return;
        if (!queue.offer(context)) {
            log.warn("Trace queue full, dropping trace: {}", context.traceId());
        }
    }

    private void writeLoop() {
        Path traceFile = Path.of(appConfig.trace().outputDir(), "traces.jsonl");
        while (running) {
            try {
                TraceContext ctx = queue.poll(1, java.util.concurrent.TimeUnit.SECONDS);
                if (ctx != null) {
                    String line = objectMapper.writeValueAsString(ctx) + "\n";
                    Files.writeString(traceFile, line, java.nio.file.StandardOpenOption.CREATE, java.nio.file.StandardOpenOption.APPEND);
                }
            } catch (Exception e) {
                log.error("Error writing trace", e);
            }
        }
    }

    @PreDestroy
    public void shutdown() {
        running = false;
        writerThread.interrupt();
        log.info("TraceCollector shut down");
    }
}
