package com.rag.core.query;

import com.rag.core.types.ProcessedQuery;
import org.apache.lucene.analysis.Analyzer;
import org.apache.lucene.analysis.TokenStream;
import org.apache.lucene.analysis.tokenattributes.CharTermAttribute;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.StringReader;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Preprocesses a user query: tokenization, normalization, keyword extraction.
 * Uses Lucene's Analyzer for tokenization (supports Chinese via StandardAnalyzer for now).
 */
@Component
public class QueryProcessor {

    private static final Logger log = LoggerFactory.getLogger(QueryProcessor.class);
    private static final Pattern PUNCTUATION = Pattern.compile("[\\pP\\pZ\\pM]+");
    private static final int MAX_KEYWORDS = 10;
    private static final int MIN_TERM_LENGTH = 2;

    private final Analyzer analyzer;

    public QueryProcessor(Analyzer analyzer) {
        this.analyzer = analyzer;
    }

    public ProcessedQuery process(String rawQuery) {
        String normalized = normalize(rawQuery);
        List<String> tokens = tokenize(normalized);
        List<String> keywords = extractKeywords(tokens);
        log.debug("Processed query '{}' -> tokens={}, keywords={}", rawQuery, tokens.size(), keywords.size());
        return new ProcessedQuery(rawQuery, normalized, tokens, keywords);
    }

    public String normalize(String query) {
        return PUNCTUATION.matcher(query.trim()).replaceAll(" ").toLowerCase().replaceAll("\\s+", " ");
    }

    public List<String> tokenize(String text) {
        List<String> tokens = new ArrayList<>();
        try (TokenStream ts = analyzer.tokenStream("content", new StringReader(text))) {
            CharTermAttribute term = ts.addAttribute(CharTermAttribute.class);
            ts.reset();
            while (ts.incrementToken()) {
                String token = term.toString();
                if (token.length() >= MIN_TERM_LENGTH) {
                    tokens.add(token);
                }
            }
            ts.end();
        } catch (Exception e) {
            log.warn("Lucene tokenization failed, falling back to whitespace split", e);
            tokens = Arrays.stream(text.split("\\s+"))
                    .filter(t -> t.length() >= MIN_TERM_LENGTH)
                    .toList();
        }
        return tokens;
    }

    public List<String> extractKeywords(List<String> tokens) {
        Set<String> stopWords = Set.of(
                "的", "了", "在", "是", "我", "有", "和", "就", "不", "人",
                "the", "a", "an", "is", "are", "was", "were", "be", "been",
                "have", "has", "had", "do", "does", "did", "will", "would",
                "could", "should", "may", "might", "can", "this", "that",
                "and", "or", "but", "if", "then", "else", "when", "at",
                "from", "by", "for", "with", "about", "into", "through"
        );
        return tokens.stream()
                .filter(t -> !stopWords.contains(t.toLowerCase()))
                .distinct()
                .limit(MAX_KEYWORDS)
                .toList();
    }
}
