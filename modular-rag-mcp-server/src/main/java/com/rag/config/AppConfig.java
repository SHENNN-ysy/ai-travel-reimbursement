package com.rag.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "rag")
public record AppConfig(
    ChromaProperties chroma,
    LlmProperties llm,
    EmbeddingProperties embedding,
    LuceneProperties lucene,
    IngestionProperties ingestion,
    RetrievalProperties retrieval,
    TraceProperties trace
) {
    public AppConfig {
        if (chroma == null) chroma = new ChromaProperties();
        if (llm == null) llm = new LlmProperties();
        if (embedding == null) embedding = new EmbeddingProperties();
        if (lucene == null) lucene = new LuceneProperties();
        if (ingestion == null) ingestion = new IngestionProperties();
        if (retrieval == null) retrieval = new RetrievalProperties();
        if (trace == null) trace = new TraceProperties();
    }

    public record ChromaProperties(
        String host,
        int port,
        String tenant,
        String database
    ) {
        public ChromaProperties {
            if (host == null) host = "localhost";
            if (port == 0) port = 8000;
            if (tenant == null) tenant = "default_tenant";
            if (database == null) database = "default_database";
        }
    }

    public record LlmProperties(
        String provider,
        String baseUrl,
        String apiKey,
        String model,
        double temperature
    ) {
        public LlmProperties {
            if (provider == null) provider = "openai";
            if (baseUrl == null) baseUrl = "https://api.openai.com/v1";
            if (model == null) model = "gpt-4o-mini";
            if (temperature == 0) temperature = 0.7;
        }
    }

    public record EmbeddingProperties(
        String provider,
        String baseUrl,
        String apiKey,
        String model,
        int dimension
    ) {
        public EmbeddingProperties {
            if (provider == null) provider = "openai";
            if (baseUrl == null) baseUrl = "https://api.openai.com/v1";
            if (model == null) model = "text-embedding-3-small";
            if (dimension == 0) dimension = 1536;
        }
    }

    public record LuceneProperties(
        String indexDir,
        String analyzer
    ) {
        public LuceneProperties {
            if (indexDir == null) indexDir = "./data/lucene-index";
            if (analyzer == null) analyzer = "IK";
        }
    }

    public record IngestionProperties(
        int chunkSize,
        int chunkOverlap
    ) {
        public IngestionProperties {
            if (chunkSize == 0) chunkSize = 500;
            if (chunkOverlap == 0) chunkOverlap = 50;
        }
    }

    public record RetrievalProperties(
        int topK,
        int rrfK
    ) {
        public RetrievalProperties {
            if (topK == 0) topK = 10;
            if (rrfK == 0) rrfK = 60;
        }
    }

    public record TraceProperties(
        boolean enabled,
        String outputDir
    ) {
        public TraceProperties {
            if (outputDir == null) outputDir = "./logs";
            if (!enabled) enabled = true;
        }
    }
}
