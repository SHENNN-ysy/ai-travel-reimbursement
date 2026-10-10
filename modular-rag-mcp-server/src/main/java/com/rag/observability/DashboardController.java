package com.rag.observability;

import com.rag.config.AppConfig;
import com.rag.observability.trace.TraceLogService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * REST API for observability: traces, evaluation, system stats.
 */
@RestController
@RequestMapping("/api/observability")
public class DashboardController {

    private final TraceLogService traceLogService;
    private final EvaluationRunner evaluationRunner;
    private final AppConfig appConfig;

    public DashboardController(
            TraceLogService traceLogService,
            EvaluationRunner evaluationRunner,
            AppConfig appConfig) {
        this.traceLogService = traceLogService;
        this.evaluationRunner = evaluationRunner;
        this.appConfig = appConfig;
    }

    @GetMapping("/traces")
    public ResponseEntity<?> getTraces(@RequestParam(defaultValue = "100") int limit) {
        var traces = traceLogService.readTraces(appConfig.trace().outputDir(), limit);
        var stats = traceLogService.computeStats(traces);
        return ResponseEntity.ok(Map.of("traces", traces, "stats", stats));
    }

    @GetMapping("/evaluation")
    public ResponseEntity<?> evaluate(@RequestParam(defaultValue = "100") int limit) {
        var report = evaluationRunner.runFromTraces(appConfig.trace().outputDir(), limit);
        return ResponseEntity.ok(report);
    }

    @GetMapping("/stats")
    public ResponseEntity<?> stats() {
        var traces = traceLogService.readTraces(appConfig.trace().outputDir(), 10000);
        var computed = traceLogService.computeStats(traces);
        return ResponseEntity.ok(Map.of(
                "provider", "modular-rag-mcp-server",
                "version", "0.1.0-SNAPSHOT",
                "tracesAvailable", traces.size(),
                "avgLatencyMs", computed.avgTotalMs(),
                "avgRetrieveMs", computed.avgRetrieveMs(),
                "avgLlmMs", computed.avgLlmMs(),
                "traceDir", appConfig.trace().outputDir()
        ));
    }
}
