package com.rag.core.query;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Reciprocal Rank Fusion: merges ranked result lists from multiple retrievers.
 * RRF score = sum(1 / (k + rank_i)) where k is a constant (default 60).
 */
@Component
public class RRFFusion {

    private static final Logger log = LoggerFactory.getLogger(RRFFusion.class);
    private final int k;

    public RRFFusion() {
        this(60);
    }

    public RRFFusion(int k) {
        this.k = k;
    }

    public <T> List<RRFScored<T>> fuse(Map<T, Double>... rankMaps) {
        Map<T, Double> fusedScores = new HashMap<>();
        Map<T, Integer> rankCount = new HashMap<>();

        for (Map<T, Double> rankMap : rankMaps) {
            List<Map.Entry<T, Double>> sorted = rankMap.entrySet().stream()
                    .sorted(Map.Entry.<T, Double>comparingByValue().reversed())
                    .toList();

            for (int rank = 0; rank < sorted.size(); rank++) {
                T id = sorted.get(rank).getKey();
                double rrfScore = 1.0 / (k + rank + 1);
                fusedScores.merge(id, rrfScore, Double::sum);
                rankCount.merge(id, 1, Integer::sum);
            }
        }

        List<RRFScored<T>> result = fusedScores.entrySet().stream()
                .map(e -> new RRFScored<>(e.getKey(), e.getValue(), rankCount.get(e.getKey())))
                .sorted(Comparator.comparingDouble(RRFScored::score).reversed())
                .toList();

        log.debug("RRF fused {} candidates into {} results", fusedScores.size(), result.size());
        return result;
    }

    public record RRFScored<T>(T id, double score, int retrievalSourceCount) {}
}
