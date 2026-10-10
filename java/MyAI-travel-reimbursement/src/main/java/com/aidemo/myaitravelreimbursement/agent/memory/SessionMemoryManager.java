package com.aidemo.myaitravelreimbursement.agent.memory;

import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 会话层记忆管理器（替代原有的纯内存 AgentChatMemoryManager）。
 *
 * 核心职责：
 * 1. 按 sessionId 维护独立的 MessageWindowChatMemory（内存）
 * 2. 检测触发条件（条件A / 条件B），满足时异步触发摘要提取
 * 3. 提供 session-memory.md 文件的读写能力
 *
 * 消息数定义：包含 UserMessage 和 AiMessage 的累计总数，即 MessageWindowChatMemory 中的全部消息条数。
 */
@Slf4j
@Component
public class SessionMemoryManager {

    private final Map<String, MessageWindowChatMemory> memories = new ConcurrentHashMap<>();

    /** 记录每个 session 最近一轮是否发生过工具调用（toolIndex 增长即为有工具调用） */
    private final Map<String, AtomicInteger> toolCounters = new ConcurrentHashMap<>();

    /**
     * 记录每个 session 当前轮次开始时的工具计数器快照。
     * 用于判断该轮次内是否有工具被调用。
     * Key: sessionId, Value: 该轮开始时的 toolCounter 值
     */
    private final Map<String, AtomicInteger> roundStartToolCounters = new ConcurrentHashMap<>();

    /** 触发摘要提取时，摘要写入的文件存储路径 */
    private final String memoryBasePath;

    /** 条件A：消息数阈值（无工具调用场景） */
    private final int minMessagesToInit;
    /** 条件B：消息数阈值（强制触发） */
    private final int minMessagesBetweenUpdate;
    /** 最近 N 条消息用于判断是否无工具调用 */
    private final int recentMessageWindow;

    public SessionMemoryManager(
            @Value("${memory.session.base-path:${storage.base-path:}}") String memoryBasePath,
            @Value("${memory.session.min-messages-to-init:10}") int minMessagesToInit,
            @Value("${memory.session.min-messages-between-update:16}") int minMessagesBetweenUpdate,
            @Value("${memory.session.recent-message-window:3}") int recentMessageWindow) {
        this.memoryBasePath = memoryBasePath;
        this.minMessagesToInit = minMessagesToInit;
        this.minMessagesBetweenUpdate = minMessagesBetweenUpdate;
        this.recentMessageWindow = recentMessageWindow;
    }

    /**
     * 获取或创建指定 session 的 ChatMemory。
     */
    public MessageWindowChatMemory getOrCreateMemory(String sessionId) {
        return memories.computeIfAbsent(sessionId, id -> MessageWindowChatMemory.builder()
                .id(sessionId)
                .maxMessages(20)
                .build());
    }

    /**
     * 获取指定 session 的 ChatMemory（如果不存在则返回 null）。
     */
    public MessageWindowChatMemory getMemory(String sessionId) {
        return memories.get(sessionId);
    }

    /**
     * 移除指定 session 的内存记忆。
     */
    public void removeMemory(String sessionId) {
        memories.remove(sessionId);
        toolCounters.remove(sessionId);
        roundStartToolCounters.remove(sessionId);
    }

    /**
     * 检查指定 session 是否已有内存记录。
     */
    public boolean hasMemory(String sessionId) {
        return memories.containsKey(sessionId);
    }

    /**
     * 获取指定 session 的工具调用计数器（用于摘要触发条件判断）。
     */
    public AtomicInteger getToolCounter(String sessionId) {
        return toolCounters.computeIfAbsent(sessionId, id -> new AtomicInteger(0));
    }

    /**
     * 消息数 = MessageWindowChatMemory.messages().size()（含 UserMessage + AiMessage）。
     */
    public int getMessageCount(String sessionId) {
        MessageWindowChatMemory memory = memories.get(sessionId);
        if (memory == null) return 0;
        return memory.messages().size();
    }

    /**
     * 判断是否满足摘要提取条件。
     *
     * 条件A：消息数 >= minMessagesToInit 且 最近 recentMessageWindow 条消息无工具调用
     * 条件B：消息数 >= minMessagesBetweenUpdate（强制触发）
     *
     * @return 0=不触发, 1=条件A触发, 2=条件B触发
     */
    public int checkTriggerCondition(String sessionId) {
        int count = getMessageCount(sessionId);
        if (count >= minMessagesBetweenUpdate) {
            return 2; // 条件B：强制触发
        }
        if (count >= minMessagesToInit && hasNoToolCallsInRecentMessages(sessionId)) {
            return 1; // 条件A：消息数足够 + 最近无工具调用
        }
        return 0;
    }

    /**
     * 在每轮对话开始时（用户消息发出前），记录当前工具计数器快照。
     * 调用时机：AgentExecutorRunner 开始处理新消息时。
     */
    public void markRoundStart(String sessionId) {
        roundStartToolCounters.put(sessionId, new AtomicInteger(getToolCounter(sessionId).get()));
    }

    /**
     * 判断最近 N 条消息中是否有工具调用。
     * 原理：比较当前 toolCounter 与本轮开始时的快照值，若无增长则本轮无工具调用。
     */
    private boolean hasNoToolCallsInRecentMessages(String sessionId) {
        int count = getMessageCount(sessionId);
        if (count < recentMessageWindow) {
            return true;
        }
        AtomicInteger roundStart = roundStartToolCounters.get(sessionId);
        AtomicInteger current = toolCounters.get(sessionId);
        if (roundStart == null || current == null) {
            return true;
        }
        // 若当前计数器值等于本轮开始时的快照值，说明本轮无工具调用
        return current.get() == roundStart.get();
    }

    /**
     * 获取 session-memory.md 文件的存储路径。
     */
    public String getMemoryFilePath(String projectId, String sessionId) {
        return memoryBasePath + "/memory/projects/" + sanitizeProjectId(projectId)
                + "/sessions/" + sessionId + "/session-memory.md";
    }

    /**
     * 获取会话层记忆目录路径。
     */
    public String getSessionMemoryDir(String projectId, String sessionId) {
        return memoryBasePath + "/memory/projects/" + sanitizeProjectId(projectId)
                + "/sessions/" + sessionId;
    }

    /**
     * 防止 projectId 路径注入：移除或替换非法路径字符。
     */
    private String sanitizeProjectId(String projectId) {
        if (projectId == null) return "default";
        return projectId.replaceAll("[^a-zA-Z0-9_\\-]", "_");
    }

    public String getMemoryBasePath() {
        return memoryBasePath;
    }
}
