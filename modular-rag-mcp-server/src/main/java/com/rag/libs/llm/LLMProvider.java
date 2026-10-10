package com.rag.libs.llm;

import com.rag.core.types.LLMResponse;

/**
 * Pluggable LLM provider interface.
 * Implementations: OpenAI, Azure OpenAI, DeepSeek, Ollama.
 */
public interface LLMProvider {

    /**
     * Generates a chat completion response.
     */
    LLMResponse chat(String prompt);

    /**
     * Generates a chat completion with retrieved context injected.
     */
    LLMResponse chatWithContext(String systemPrompt, String userQuery, String context);

    /**
     * Provider name, e.g. "openai", "ollama".
     */
    String providerName();

    /**
     * Whether this provider is available (credentials configured, service reachable).
     */
    boolean isAvailable();
}
