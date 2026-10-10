package com.rag.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(AppConfig.class)
public class LuceneConfig {

    private final AppConfig appConfig;

    public LuceneConfig(AppConfig appConfig) {
        this.appConfig = appConfig;
    }

    @Bean
    public org.apache.lucene.analysis.Analyzer luceneAnalyzer() {
        String analyzerType = appConfig.lucene().analyzer();
        if ("IK".equalsIgnoreCase(analyzerType)) {
            return new org.apache.lucene.analysis.standard.StandardAnalyzer();
        }
        return new org.apache.lucene.analysis.standard.StandardAnalyzer();
    }

    @Bean
    public com.rag.core.lucene.LuceneBM25Indexer luceneBM25Indexer(
            org.apache.lucene.analysis.Analyzer analyzer) {
        return new com.rag.core.lucene.LuceneBM25Indexer(
                appConfig.lucene().indexDir(),
                analyzer
        );
    }
}
