package com.rag.libs.embedding;

import com.rag.config.AppConfig;
import com.rag.core.types.EmbeddingResult;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.ollama.OllamaEmbeddingModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@ConditionalOnProperty(prefix = "rag.embedding", name = "provider", havingValue = "ollama")
public class OllamaEmbeddingProvider implements EmbeddingProvider {

    private static final Logger log = LoggerFactory.getLogger(OllamaEmbeddingProvider.class);
    private final EmbeddingModel model;
    private final AppConfig appConfig;

    public OllamaEmbeddingProvider(AppConfig appConfig) {
        this.appConfig = appConfig;
        String baseUrl = appConfig.embedding().baseUrl() != null ? appConfig.embedding().baseUrl() : "http://localhost:11434";
        String modelName = appConfig.embedding().model() != null ? appConfig.embedding().model() : "nomic-embed-text";
        this.model = OllamaEmbeddingModel.builder()
                .baseUrl(baseUrl)
                .modelName(modelName)
                .build();
        log.info("Ollama Embedding provider initialized with model: {}", modelName);
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
        return "ollama";
    }

    @Override
    public boolean isAvailable() {
        return true;
    }
}
