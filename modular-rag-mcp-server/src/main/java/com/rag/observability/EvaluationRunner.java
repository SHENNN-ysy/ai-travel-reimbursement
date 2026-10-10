package com.rag.observability;

import com.rag.core.trace.TraceContext;
import com.rag.observability.trace.TraceLogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Runs evaluation metrics on retrieval results: Hit Rate, MRR, Faithfulness.
 */
@Component
public class EvaluationRunner {

    private static final Logger log = LoggerFactory.getLogger(EvaluationRunner.class);
    private final TraceLogService traceLogService;

    public EvaluationRunner(TraceLogService traceLogService) {
        this.traceLogService = traceLogService;
    }

    public EvaluationResult evaluateHitRate(List<String> groundTruthQueries, List<String> retrievedQueries) {
        if (groundTruthQueries == null || retrievedQueries == null) {
            return new EvaluationResult(0.0, 0.0, 0.0, 0);
        }
        int hits = 0;
        for (int i = 0; i < Math.min(groundTruthQueries.size(), retrievedQueries.size()); i++) {
            if (retrievedQueries.get(i).equalsIgnoreCase(groundTruthQueries.get(i))) {
                hits++;
            }
        }
        double hitRate = (double) hits / groundTruthQueries.size();
        return new EvaluationResult(hitRate, 0.0, 0.0, groundTruthQueries.size());
    }

    public EvaluationResult evaluateMRR(List<List<String>> relevantDocs, List<List<String>> retrievedDocs) {
        if (relevantDocs == null || retrievedDocs == null) return new EvaluationResult(0.0, 0.0, 0.0, 0);
        double mrr = 0.0;
        for (int i = 0; i < Math.min(relevantDocs.size(), retrievedDocs.size()); i++) {
            List<String> rel = relevantDocs.get(i);
            List<String> ret = retrievedDocs.get(i);
            for (int j = 0; j < ret.size(); j++) {
                if (rel.contains(ret.get(j))) {
                    mrr += 1.0 / (j + 1);
                    break;
                }
            }
        }
        mrr /= relevantDocs.size();
        return new EvaluationResult(0.0, mrr, 0.0, relevantDocs.size());
    }

    public double evaluateFaithfulness(String answer, List<String> citedChunks) {
        if (answer == null || citedChunks == null || citedChunks.isEmpty()) return 0.0;
        int supportedClaims = 0;
        for (String chunk : citedChunks) {
            if (answer.contains(extractKeyPhrase(chunk))) {
                supportedClaims++;
            }
        }
        return (double) supportedClaims / citedChunks.size();
    }

    public EvaluationReport runFromTraces(String logDir, int limit) {
        List<TraceContext> traces = traceLogService.readTraces(logDir, limit);
        var stats = traceLogService.computeStats(traces);
        List<String> queries = traces.stream().map(TraceContext::query).toList();
        return new EvaluationReport(traces.size(), stats, evaluateHitRate(queries, queries), List.of());
    }

    private String extractKeyPhrase(String text) {
        if (text == null || text.isBlank()) return "";
        String[] words = text.split("\\s+");
        if (words.length <= 3) return text;
        return String.join(" ", words[0], words[1], words[2]);
    }

    public record EvaluationResult(double hitRate, double mrr, double faithfulness, int sampleSize) {}
    public record EvaluationReport(int traceCount, TraceLogService.TraceStats stats, EvaluationResult overall, List<String> notes) {}
}
