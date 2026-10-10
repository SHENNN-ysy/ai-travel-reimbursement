package com.rag.observability.trace;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.rag.core.trace.TraceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Service for reading and querying trace logs from traces.jsonl.
 */
@Service
public class TraceLogService {

    private static final Logger log = LoggerFactory.getLogger(TraceLogService.class);
    private final ObjectMapper objectMapper;

    public TraceLogService() {
        this.objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    public List<TraceContext> readTraces(String logDir, int limit) {
        Path traceFile = Path.of(logDir, "traces.jsonl");
        if (!Files.exists(traceFile)) {
            log.warn("Trace file not found: {}", traceFile);
            return List.of();
        }
        List<TraceContext> traces = new ArrayList<>();
        try {
            List<String> lines = Files.readAllLines(traceFile);
            int from = Math.max(0, lines.size() - limit);
            for (int i = from; i < lines.size(); i++) {
                try {
                    traces.add(objectMapper.readValue(lines.get(i), TraceContext.class));
                } catch (Exception e) {
                    log.warn("Failed to parse trace line {}: {}", i, e.getMessage());
                }
            }
        } catch (IOException e) {
            log.error("Failed to read traces", e);
        }
        return traces;
    }

    public TraceStats computeStats(List<TraceContext> traces) {
        if (traces.isEmpty()) return new TraceStats(0, 0, 0, 0, 0, 0);
        double avgTotal = traces.stream().mapToLong(TraceContext::totalMs).average().orElse(0);
        double avgRetrieve = traces.stream().mapToLong(TraceContext::retrieveMs).average().orElse(0);
        double avgLlm = traces.stream().mapToLong(TraceContext::llmMs).average().orElse(0);
        double avgRerank = traces.stream().mapToLong(TraceContext::rerankMs).average().orElse(0);
        double avgIngest = traces.stream().mapToLong(TraceContext::ingestMs).average().orElse(0);
        int totalRetrieved = traces.stream().mapToInt(TraceContext::retrievedCount).sum();
        return new TraceStats(traces.size(), (long) avgTotal, (long) avgRetrieve,
                (long) avgLlm, (long) avgRerank, (long) avgIngest);
    }

    public record TraceStats(
            int totalTraces,
            long avgTotalMs,
            long avgRetrieveMs,
            long avgLlmMs,
            long avgRerankMs,
            long avgIngestMs
    ) {}
}
