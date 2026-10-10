package com.rag.libs.llm;

import com.rag.config.AppConfig;
import com.rag.core.types.LLMResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "rag.llm", name = "provider", havingValue = "deepseek")
public class DeepSeekLLMProvider implements LLMProvider {

    private static final Logger log = LoggerFactory.getLogger(DeepSeekLLMProvider.class);
    private final AppConfig appConfig;
    private final dev.langchain4j.model.chat.ChatLanguageModel model;

    public DeepSeekLLMProvider(AppConfig appConfig) {
        this.appConfig = appConfig;
        this.model = dev.langchain4j.model.openai.OpenAiChatModel.builder()
                .baseUrl("https://api.deepseek.com/v1")
                .apiKey(appConfig.llm().apiKey())
                .modelName(appConfig.llm().model() != null ? appConfig.llm().model() : "deepseek-chat")
                .temperature(appConfig.llm().temperature())
                .build();
        log.info("DeepSeek LLM provider initialized");
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
        return "deepseek";
    }

    @Override
    public boolean isAvailable() {
        return appConfig.llm().apiKey() != null && !appConfig.llm().apiKey().isBlank();
    }
}
