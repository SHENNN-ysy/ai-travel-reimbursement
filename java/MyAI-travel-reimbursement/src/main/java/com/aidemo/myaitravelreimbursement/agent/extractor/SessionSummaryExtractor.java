package com.aidemo.myaitravelreimbursement.agent.extractor;

import com.aidemo.myaitravelreimbursement.agent.memory.SessionMemoryManager;
import com.aidemo.myaitravelreimbursement.agent.prompt.SummaryPromptTemplate;
import com.aidemo.myaitravelreimbursement.agent.service.AgentService;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * 会话摘要提取器（异步）。
 *
 * 负责：
 * 1. 读取 MessageWindowChatMemory 中的最近 N 条消息
 * 2. 调用 LLM 生成 6 Section 结构化摘要
 * 3. 写入 session-memory.md 文件
 *
 * 所有操作均为 @Async，不阻塞主对话流。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SessionSummaryExtractor {

    private final ChatModel chatModel;
    private final SessionMemoryManager sessionMemoryManager;

    @Value("${memory.session.max-summary-tokens:3000}")
    private int maxSummaryTokens;

    /**
     * 异步触发会话摘要提取。
     *
     * @param projectId 项目ID（用于文件路径）
     * @param sessionId 会话ID
     * @return CompletableFuture
     */
    @Async("agentExecutor")
    public CompletableFuture<Void> extractAsync(Long projectId, String sessionId) {
        log.info("Start async summary extraction: sessionId={}", sessionId);
        try {
            // 1. 读取最近 N 条消息
            String recentMessages = buildRecentMessagesText(sessionId);
            if (recentMessages.isBlank()) {
                log.info("No messages to extract for sessionId={}", sessionId);
                return CompletableFuture.completedFuture(null);
            }

            // 2. 调用 LLM 生成摘要
            String prompt = SummaryPromptTemplate.buildSessionSummaryPrompt(recentMessages, maxSummaryTokens);
            String summary = callLlmForSummary(prompt);

            // 3. 写入 session-memory.md 文件
            writeSummaryFile(projectId, sessionId, summary);

            log.info("Summary extraction completed: sessionId={}, summaryLength={}", sessionId, summary.length());
        } catch (Exception e) {
            log.error("Failed to extract summary for sessionId={}", sessionId, e);
        }
        return CompletableFuture.completedFuture(null);
    }

    /**
     * 从 MessageWindowChatMemory 中读取最近 N 条消息，拼装为文本。
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
            dev.langchain4j.model.chat.response.ChatResponse response = chatModel.chat(
                    List.of(dev.langchain4j.data.message.UserMessage.from(prompt)));
            if (response == null || response.aiMessage() == null) {
                log.warn("LLM returned empty summary");
                return "";
            }
            return response.aiMessage().text();
        } catch (Exception e) {
            log.error("LLM call failed for summary extraction", e);
            return "";
        }
    }

    private void writeSummaryFile(Long projectId, String sessionId, String summary) {
        if (summary == null || summary.isBlank()) return;

        String dir = sessionMemoryManager.getSessionMemoryDir(projectId.toString(), sessionId);
        Path path = Paths.get(dir, "session-memory.md");

        try {
            // 确保目录存在
            Files.createDirectories(path.getParent());
            // 写入文件
            Files.writeString(path, summary, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            log.info("Written session summary to: {}", path);
        } catch (IOException e) {
            log.error("Failed to write session summary: {}", path, e);
        }
    }

    /**
     * 读取已存在的会话摘要（用于新会话恢复）。
     */
    public String readSummary(Long projectId, String sessionId) {
        Path path = Paths.get(sessionMemoryManager.getMemoryFilePath(projectId.toString(), sessionId));
        if (!Files.exists(path)) {
            return "";
        }
        try {
            return Files.readString(path);
        } catch (IOException e) {
            log.error("Failed to read session summary: {}", path, e);
            return "";
        }
    }
}
