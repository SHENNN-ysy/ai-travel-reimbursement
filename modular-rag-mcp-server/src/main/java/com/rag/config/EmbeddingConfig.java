package com.rag.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
@EnableConfigurationProperties(AppConfig.class)
public class EmbeddingConfig {

    private final AppConfig appConfig;

    public EmbeddingConfig(AppConfig appConfig) {
        this.appConfig = appConfig;
    }

    @Bean
    public WebClient embeddingWebClient() {
        return WebClient.builder()
                .baseUrl(appConfig.embedding().baseUrl())
                .defaultHeaders(headers -> {
                    if (appConfig.embedding().apiKey() != null && !appConfig.embedding().apiKey().isBlank()) {
                        headers.setBearerAuth(appConfig.embedding().apiKey());
                    }
                })
                .build();
    }
}
