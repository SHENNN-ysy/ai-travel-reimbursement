package com.aidemo.myaitravelreimbursement.agent.extractor;

import com.aidemo.myaitravelreimbursement.agent.memory.PersistentMemoryManager;
import com.aidemo.myaitravelreimbursement.agent.memory.PersistentMemoryManager.MemoryType;
import com.aidemo.myaitravelreimbursement.agent.memory.SessionMemoryManager;
import com.aidemo.myaitravelreimbursement.agent.prompt.SummaryPromptTemplate;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * 持久记忆提炼器（异步）。
 *
 * 负责：
 * 1. 从 ChatMemory 读取最近 N 条消息
 * 2. 调用 LLM 生成结构化会话摘要
 * 3. 从摘要中提炼值得跨会话保留的记忆条目
 * 4. 按四类类型写入对应 .md 文件并更新 MEMORY.md 索引
 *
 * 所有操作均为 @Async，不阻塞主对话流。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PersistentMemoryExtractor {

    private final ChatModel chatModel;
    private final PersistentMemoryManager persistentMemoryManager;
    private final SessionMemoryManager sessionMemoryManager;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${memory.session.max-summary-tokens:3000}")
    private int maxSummaryTokens;

    /**
     * 异步提炼持久记忆。
     * 读取 ChatMemory 中的原始消息 → 生成结构化摘要 → 提炼记忆 → 写入文件。
     *
     * @param projectId 项目ID
     * @param sessionId 会话ID
     * @return CompletableFuture
     */
    @Async("agentExecutor")
    public CompletableFuture<Void> extractAsync(Long projectId, String sessionId) {
        log.info("Start async persistent memory extraction: sessionId={}", sessionId);
        try {
            // Step 1：从 ChatMemory 读取最近 N 条消息
            String recentMessages = buildRecentMessagesText(sessionId);
            if (recentMessages.isBlank()) {
                log.info("No messages to extract for sessionId={}", sessionId);
                return CompletableFuture.completedFuture(null);
            }

            // Step 2：调用 LLM 生成结构化摘要
            String prompt = SummaryPromptTemplate.buildSessionSummaryPrompt(recentMessages, maxSummaryTokens);
            String summary = callLlmForSummary(prompt);
            if (summary.isBlank()) {
                log.warn("LLM returned empty summary for sessionId={}", sessionId);
                return CompletableFuture.completedFuture(null);
            }

            // Step 3：调用 LLM 提炼记忆
            String memoryPrompt = SummaryPromptTemplate.buildMemoryExtractionPrompt(summary);
            String llmResponse = callLlmForMemories(memoryPrompt);

            // Step 4：解析 LLM 返回的 JSON 数组
            List<Map<String, String>> memories = parseMemories(llmResponse);
            if (memories.isEmpty()) {
                log.info("No persistent memories extracted for sessionId={}", sessionId);
                return CompletableFuture.completedFuture(null);
            }

            // Step 5：逐条写入持久记忆文件（两步操作）
            for (Map<String, String> memory : memories) {
                try {
                    String typeStr = memory.getOrDefault("type", "PROJECT");
                    MemoryType type = MemoryType.fromString(typeStr);
                    String name = memory.getOrDefault("name", "未命名记忆");
                    String content = memory.getOrDefault("content", "");
                    String why = memory.getOrDefault("why", "");
                    String howToApply = memory.getOrDefault("howToApply", "");

                    persistentMemoryManager.saveMemory(
                            projectId.toString(), type, name, content, why, howToApply);
                    log.info("Saved persistent memory: type={}, name={}", type, name);
                } catch (Exception e) {
                    log.error("Failed to save persistent memory entry: {}", memory, e);
                }
            }

            log.info("Persistent memory extraction completed: sessionId={}, count={}", sessionId, memories.size());

        } catch (Exception e) {
            log.error("Failed to extract persistent memories for sessionId={}", sessionId, e);
        }
        return CompletableFuture.completedFuture(null);
    }

    /**
     * 从 ChatMemory 中读取最近 N 条消息，拼装为文本。
     */
    private String buildRecentMessagesText(String sessionId) {
        var memory = sessionMemoryManager.getMemory(sessionId);
        if (memory == null) return "";

        List<ChatMessage> messages = memory.messages();
        if (messages.isEmpty()) return "";

        int start = Math.max(0, messages.size() - 20);
        List<ChatMessage> recent = messages.subList(start, messages.size());

        return recent.stream()
                .map(msg -> {
                    String role;
                    if (msg instanceof UserMessage) {
                        role = "用户";
                    } else if (msg instanceof AiMessage) {
                        role = "AI";
                    } else {
                        role = msg.type().name();
                    }
                    return "[" + role + "] " + extractText(msg);
                })
                .collect(Collectors.joining("\n\n"));
    }

    private String extractText(ChatMessage msg) {
        if (msg instanceof UserMessage) {
            return ((UserMessage) msg).singleText();
        } else if (msg instanceof AiMessage) {
            return ((AiMessage) msg).text();
        }
        return msg.toString();
    }

    private String callLlmForSummary(String prompt) {
        try {
            var response = chatModel.chat(
                    List.of(dev.langchain4j.data.message.UserMessage.from(prompt)));
            if (response == null || response.aiMessage() == null) {
                log.warn("LLM returned empty summary");
                return "";
            }
            return response.aiMessage().text();
        } catch (Exception e) {
            log.error("LLM call failed for summary generation", e);
            return "";
        }
    }

    private String callLlmForMemories(String prompt) {
        try {
            var response = chatModel.chat(
                    List.of(dev.langchain4j.data.message.UserMessage.from(prompt)));
            if (response == null || response.aiMessage() == null) {
                return "[]";
            }
            return response.aiMessage().text();
        } catch (Exception e) {
            log.error("LLM call failed for memory extraction", e);
            return "[]";
        }
    }

    private List<Map<String, String>> parseMemories(String llmResponse) {
        try {
            String json = llmResponse.trim();
            if (json.startsWith("```json")) {
                json = json.substring(7);
            }
            if (json.startsWith("```")) {
                json = json.substring(3);
            }
            if (json.endsWith("```")) {
                json = json.substring(0, json.length() - 3);
            }
            json = json.trim();

            return objectMapper.readValue(json, new TypeReference<List<Map<String, String>>>() {});
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse memory extraction response as JSON: {}", llmResponse, e);
            return Collections.emptyList();
        }
    }
}
