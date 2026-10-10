package com.rag.libs.llm;

import com.rag.config.AppConfig;
import com.rag.core.types.LLMResponse;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.azure.AzureOpenAiChatModel;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "rag.llm", name = "provider", havingValue = "azure")
public class AzureLLMProvider implements LLMProvider {

    private static final Logger log = LoggerFactory.getLogger(AzureLLMProvider.class);
    private final ChatLanguageModel model;
    private final AppConfig appConfig;

    public AzureLLMProvider(AppConfig appConfig) {
        this.appConfig = appConfig;
        this.model = AzureOpenAiChatModel.builder()
                .baseUrl(appConfig.llm().baseUrl())
                .apiKey(appConfig.llm().apiKey())
                .deploymentName(appConfig.llm().model())
                .temperature(appConfig.llm().temperature())
                .build();
        log.info("Azure OpenAI LLM provider initialized");
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
        return "azure";
    }

    @Override
    public boolean isAvailable() {
        return appConfig.llm().apiKey() != null && !appConfig.llm().apiKey().isBlank();
    }
}
