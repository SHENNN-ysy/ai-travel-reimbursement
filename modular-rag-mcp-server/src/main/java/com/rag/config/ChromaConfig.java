package com.rag.config;

import dev.langchain4j.store.embedding.chroma.ChromaEmbeddingStore;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(AppConfig.class)
public class ChromaConfig {

    private final AppConfig appConfig;

    public ChromaConfig(AppConfig appConfig) {
        this.appConfig = appConfig;
    }

    @Bean
    @SuppressWarnings("unchecked")
    public dev.langchain4j.store.embedding.EmbeddingStore<String> embeddingStore() {
        String host = appConfig.chroma().host();
        int port = appConfig.chroma().port();
        String baseUrl = "http://" + host + ":" + port;
        return (dev.langchain4j.store.embedding.EmbeddingStore<String>)
                ChromaEmbeddingStore.builder()
                .baseUrl(baseUrl)
                .build();
    }
}
