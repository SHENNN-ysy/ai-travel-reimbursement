package com.rag.libs.llm;

import com.rag.config.AppConfig;
import com.rag.core.types.LLMResponse;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.ollama.OllamaChatModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "rag.llm", name = "provider", havingValue = "ollama")
public class OllamaLLMProvider implements LLMProvider {

    private static final Logger log = LoggerFactory.getLogger(OllamaLLMProvider.class);
    private final ChatLanguageModel model;
    private final AppConfig appConfig;

    public OllamaLLMProvider(AppConfig appConfig) {
        this.appConfig = appConfig;
        String baseUrl = appConfig.llm().baseUrl() != null ? appConfig.llm().baseUrl() : "http://localhost:11434";
        this.model = OllamaChatModel.builder()
                .baseUrl(baseUrl)
                .modelName(appConfig.llm().model() != null ? appConfig.llm().model() : "llama3")
                .temperature(appConfig.llm().temperature())
                .build();
        log.info("Ollama LLM provider initialized with model: {}", appConfig.llm().model());
    }

    @Override
    public LLMResponse chat(String prompt) {
        long start = System.currentTimeMillis();
        String response = model.chat(prompt);
        return new LLMResponse(response, appConfig.llm().model(), System.currentTimeMillis() - start, "stop");
    }

    @Override
    public LLMResponse chatWithContext(String systemPrompt, String userQuery, String context) {
        long start = System.currentTimeMillis();
        String fullPrompt = systemPrompt + "\n\nContext:\n" + context + "\n\nQuestion:\n" + userQuery;
        String response = model.chat(fullPrompt);
        return new LLMResponse(response, appConfig.llm().model(), System.currentTimeMillis() - start, "stop");
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
