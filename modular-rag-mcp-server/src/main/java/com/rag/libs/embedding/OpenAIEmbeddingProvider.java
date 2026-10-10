package com.rag.libs.embedding;

import com.rag.config.AppConfig;
import com.rag.core.types.EmbeddingResult;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.openai.OpenAiEmbeddingModel;
import dev.langchain4j.model.openai.OpenAiEmbeddingModel.Size;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConditionalOnProperty(prefix = "rag.embedding", name = "provider", havingValue = "openai")
public class OpenAIEmbeddingProvider implements EmbeddingProvider {

    private static final Logger log = LoggerFactory.getLogger(OpenAIEmbeddingProvider.class);
    private final EmbeddingModel model;
    private final AppConfig appConfig;

    public OpenAIEmbeddingProvider(AppConfig appConfig) {
        this.appConfig = appConfig;
        Size size = switch (appConfig.embedding().dimension()) {
            case 1536 -> Size.ADA_2;
            case 256 -> Size.ADA;
            case 1024 -> Size.DAVINCI;
            case 3072 -> Size.CURIE;
            default -> Size.ADA_2;
        };
        this.model = OpenAiEmbeddingModel.builder()
                .baseUrl(appConfig.embedding().baseUrl())
                .apiKey(appConfig.embedding().apiKey())
                .modelName(appConfig.embedding().model())
                .dimensions(size)
                .build();
        log.info("OpenAI Embedding provider initialized with dimension: {}", appConfig.embedding().dimension());
    }

    @Override
    public EmbeddingResult embed(String text) {
        List<Float> vector = model.embed(text).content().vectorAsList();
        float[] arr = new float[vector.size()];
        for (int i = 0; i < vector.size(); i++) arr[i] = vector.get(i);
        return new EmbeddingResult(text, arr, appConfig.embedding().model());
    }

    @Override
    public List<EmbeddingResult> embedAll(List<String> texts) {
        return texts.stream().map(this::embed).toList();
    }

    @Override
    public int dimension() {
        return appConfig.embedding().dimension();
    }

    @Override
    public String providerName() {
        return "openai";
    }

    @Override
    public boolean isAvailable() {
        return appConfig.embedding().apiKey() != null && !appConfig.embedding().apiKey().isBlank();
    }
}
