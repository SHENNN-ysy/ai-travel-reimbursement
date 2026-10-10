package com.rag.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
@EnableConfigurationProperties(AppConfig.class)
public class LLMConfig {

    private final AppConfig appConfig;

    public LLMConfig(AppConfig appConfig) {
        this.appConfig = appConfig;
    }

    @Bean
    public WebClient llmWebClient() {
        return WebClient.builder()
                .baseUrl(appConfig.llm().baseUrl())
                .defaultHeaders(headers -> {
                    if (appConfig.llm().apiKey() != null && !appConfig.llm().apiKey().isBlank()) {
                        headers.setBearerAuth(appConfig.llm().apiKey());
                    }
                })
                .build();
    }
}
