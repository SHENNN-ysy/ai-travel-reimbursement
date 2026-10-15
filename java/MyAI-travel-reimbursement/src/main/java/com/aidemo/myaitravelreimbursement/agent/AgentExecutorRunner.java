package com.aidemo.myaitravelreimbursement.agent;

import com.aidemo.myaitravelreimbursement.agent.extractor.PersistentMemoryExtractor;
import com.aidemo.myaitravelreimbursement.agent.extractor.SessionSummaryExtractor;
import com.aidemo.myaitravelreimbursement.agent.memory.PersistentMemoryManager;
import com.aidemo.myaitravelreimbursement.agent.memory.SessionMemoryManager;
import com.aidemo.myaitravelreimbursement.agent.service.AgentService;
import com.aidemo.myaitravelreimbursement.agent.workflow.SseEmitterRegistry;
import com.aidemo.myaitravelreimbursement.common.UserContext;
import com.aidemo.myaitravelreimbursement.rag.trace.TraceCollector;
import com.aidemo.myaitravelreimbursement.rag.trace.TraceContext;
import com.aidemo.myaitravelreimbursement.rag.trace.TraceDataHolder;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.model.chat.response.PartialThinking;
import dev.langchain4j.model.chat.response.PartialToolCall;
import dev.langchain4j.service.tool.ToolExecution;
import dev.langchain4j.service.TokenStream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Agent 执行器。
 * 负责运行 LangChain4j Agent 并通过 SSE 实时推送流式响应。
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "ai.provider", havingValue = "langchain4j", matchIfMissing = true)
public class AgentExecutorRunner {

    private final ReimbursementAgent reimbursementAgent;
    private final AgentService agentService;
    private final SessionMemoryManager sessionMemoryManager;
    private final PersistentMemoryManager persistentMemoryManager;
    private final SessionSummaryExtractor sessionSummaryExtractor;
    private final PersistentMemoryExtractor persistentMemoryExtractor;
    private final TraceContext traceContext;
    private final TraceCollector traceCollector;
    private final SseEmitterRegistry sseEmitterRegistry;

    @Qualifier("sseScheduler")
    private final ScheduledExecutorService sseScheduler;

    @Async("agentExecutor")
    public CompletableFuture<Void> executeStreamAsync(Long projectId, String sessionId,
                                                     String message, SseEmitter emitter,
                                                     UserContext.Snapshot userContextSnapshot) {
        UserContext.restore(userContextSnapshot);
        UserContext.setCurrentSnapshot(userContextSnapshot);

        String traceId = traceContext.newTraceId();
        traceContext.bind(traceId);
        log.debug("[{}] Agent stream started: projectId={}, sessionId={}", traceId, projectId, sessionId);

        emitter.onCompletion(() -> log.debug("SSE completed: projectId={}, sessionId={}", projectId, sessionId));
        emitter.onTimeout(() -> log.debug("SSE timeout: projectId={}, sessionId={}", projectId, sessionId));
        emitter.onError(e -> log.error("SSE error: projectId={}, sessionId={}", projectId, sessionId, e));

        // 登记 emitter，供工作流引擎等 Agent 主循环之外的调用方推送事件
        sseEmitterRegistry.register(sessionId, emitter);

        AtomicBoolean completed = new AtomicBoolean(false);
        long startTime = System.currentTimeMillis();
        StringBuilder assistantContent = new StringBuilder();
        AtomicInteger toolIndexCounter = new AtomicInteger(0);
        StringBuilder messageBuffer = new StringBuilder();
        AtomicReference<ScheduledFuture<?>> flushFutureRef = new AtomicReference<>(null);

        Runnable flushBuffer = () -> {
            if (completed.get() || messageBuffer.length() == 0) return;
            String batch = messageBuffer.toString();
            messageBuffer.setLength(0);
            assistantContent.append(batch);
            sendEvent(emitter, "message", "{\"content\": \"" + escapeJson(batch) + "\"}");
        };

        try {
            ReimbursementAgent.Assistant assistant = reimbursementAgent.createAssistant(
                    projectId.toString(), sessionId);
            // 每轮对话开始前记录工具计数器快照，用于判断本轮是否有工具调用
            sessionMemoryManager.markRoundStart(sessionId);
            TokenStream tokenStream = assistant.chatStream(message);

            tokenStream
                    .onPartialThinking((PartialThinking partialThinking) -> {
                        if (completed.get()) return;
                        if (partialThinking != null && partialThinking.text() != null) {
                            sendEvent(emitter, "reasoning", "{\"content\": \"" + escapeJson(partialThinking.text()) + "\"}");
                        }
                    })
                    .onPartialResponse((String partialResponse) -> {
                        if (completed.get()) return;
                        if (partialResponse != null) {
                            messageBuffer.append(partialResponse);
                            if (flushFutureRef.get() == null) {
                                flushFutureRef.set(sseScheduler.scheduleAtFixedRate(
                                        () -> { try { flushBuffer.run(); } catch (Exception ignored) {} },
                                        50, 50, TimeUnit.MILLISECONDS));
                            }
                        }
                    })
                    .onPartialToolCall((PartialToolCall partialToolCall) -> {
                        if (completed.get()) return;
                        if (partialToolCall != null && partialToolCall.name() != null) {
                            int idx = toolIndexCounter.getAndIncrement();
                            // 记录工具调用：每次工具调用时增加 session 的工具计数器
                            sessionMemoryManager.getToolCounter(sessionId).incrementAndGet();
                            sendEvent(emitter, "tool_call", "{\"toolIndex\": " + idx
                                    + ", \"tool\": \"" + escapeJson(partialToolCall.name()) + "\"}");
                        }
                    })
                    .onToolExecuted((ToolExecution toolExecution) -> {
                        if (completed.get()) return;
                        if (toolExecution != null) {
                            String toolName = toolExecution.request().name();
                            boolean hidden = "getExcelFilePath".equals(toolName);
                            String resultJson = String.format(
                                    "{\"tool\": \"%s\", \"success\": true, \"output\": \"%s\", \"hidden\": %s}",
                                    escapeJson(toolName),
                                    hidden ? "" : escapeJson(String.valueOf(toolExecution.result())),
                                    hidden
                            );
                            sendEvent(emitter, "tool_result", resultJson);
                        }
                    })
                    .onCompleteResponse((ChatResponse response) -> {
                        if (completed.compareAndSet(false, true)) {
                            try {
                                ScheduledFuture<?> f = flushFutureRef.get();
                                if (f != null) f.cancel(false);
                                flushBuffer.run();

                                String fullResponse = assistantContent.toString();
                                saveAssistantMessage(sessionId, fullResponse);

                                // 检查摘要触发条件并异步提取
                                checkAndTriggerSummaryExtraction(projectId, sessionId);

                                TraceDataHolder.TraceData td = TraceDataHolder.get();
                                traceCollector.record(TraceCollector.builder()
                                        .traceId(traceId)
                                        .query(message)
                                        .retrievedCount(td != null ? td.retrievedCount() : 0)
                                        .sources(td != null ? td.sources() : List.of())
                                        .responseSummary(truncate(fullResponse, 200))
                                        .elapsedMs(System.currentTimeMillis() - startTime)
                                        .build());

                                sendEvent(emitter, "done", "{\"summary\": \"\"}");
                                emitter.complete();
                                sseEmitterRegistry.unregister(sessionId, emitter);
                                UserContext.clearCurrentSnapshot();
                                traceContext.clear();
                                TraceDataHolder.clear();
                                log.info("Agent stream completed: sessionId={}, elapsed={}ms, response length={}",
                                        sessionId, System.currentTimeMillis() - startTime, fullResponse.length());
                            } catch (Exception e) {
                                log.warn("Failed to complete SSE", e);
                            }
                        }
                    })
                    .onError((Throwable error) -> {
                        if (completed.compareAndSet(false, true)) {
                            try {
                                ScheduledFuture<?> f = flushFutureRef.get();
                                if (f != null) f.cancel(false);
                                flushBuffer.run();
                                saveAssistantMessage(sessionId, assistantContent.toString());
                                sendEvent(emitter, "error", "{\"error\": \"" + escapeJson(error.getMessage()) + "\"}");
                                emitter.completeWithError(error);
                                sseEmitterRegistry.unregister(sessionId, emitter);
                                UserContext.clearCurrentSnapshot();
                                traceContext.clear();
                                TraceDataHolder.clear();
                            } catch (Exception e) {
                                log.warn("Failed to complete SSE with error", e);
                            }
                        }
                    })
                    .start();

        } catch (Exception e) {
            log.error("Agent stream failed: sessionId={}", sessionId, e);
            if (completed.compareAndSet(false, true)) {
                try {
                    ScheduledFuture<?> f = flushFutureRef.get();
                    if (f != null) f.cancel(false);
                    flushBuffer.run();
                    saveAssistantMessage(sessionId, assistantContent.toString());
                    sendEvent(emitter, "error", "{\"error\": \"" + escapeJson(e.getMessage()) + "\"}");
                    emitter.completeWithError(e);
                    sseEmitterRegistry.unregister(sessionId, emitter);
                    UserContext.clearCurrentSnapshot();
                    traceContext.clear();
                    TraceDataHolder.clear();
                } catch (Exception ex) {
                    log.warn("Failed to complete SSE with error", ex);
                }
            }
        }

        return CompletableFuture.completedFuture(null);
    }

    /**
     * 检查摘要触发条件，满足则异步提取会话摘要和持久记忆。
     */
    private void checkAndTriggerSummaryExtraction(Long projectId, String sessionId) {
        int trigger = sessionMemoryManager.checkTriggerCondition(sessionId);
        if (trigger == 0) {
            return; // 不满足触发条件
        }
        String reason = trigger == 1 ? "条件A" : "条件B";
        log.info("Summary extraction triggered by {}: sessionId={}", reason, sessionId);

        // 异步触发会话摘要提取（写入 session-memory.md）
        sessionSummaryExtractor.extractAsync(projectId, sessionId);

        // 异步触发持久记忆提炼（读取 ChatMemory 原始消息 → 生成摘要 → 提炼记忆）
        persistentMemoryExtractor.extractAsync(projectId, sessionId);
    }

    private void saveAssistantMessage(String sessionId, String content) {
        if (content == null || content.isBlank()) return;
        try {
            agentService.saveAssistantMessage(sessionId, content);
        } catch (Exception e) {
            log.error("保存 AI 回复失败: sessionId={}", sessionId, e);
        }
    }

    private boolean sendEvent(SseEmitter emitter, String eventName, String data) {
        try {
            // 与 SseEmitterRegistry 的发送互斥，防止并发推送撕坏 SSE 帧
            synchronized (emitter) {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(data));
            }
            return true;
        } catch (Exception e) {
            log.warn("Failed to send SSE event: {}, error: {}", eventName, e.getMessage());
            return false;
        }
    }

    private String escapeJson(String text) {
        if (text == null) return "";
        return text
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private static String truncate(String text, int maxLen) {
        if (text == null || text.length() <= maxLen) return text;
        return text.substring(0, maxLen) + "...";
    }
}
