package com.aidemo.myaitravelreimbursement.agent.memory;

import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Agent 对话记忆管理器（已废弃，请使用 SessionMemoryManager）。
 *
 * 本类已被 {@link com.aidemo.myaitravelreimbursement.agent.memory.SessionMemoryManager} 替代。
 * 保留此类仅为兼容现有引用，后续版本将删除。
 *
 * @deprecated use {@link com.aidemo.myaitravelreimbursement.agent.memory.SessionMemoryManager} instead
 */
@Component
@Deprecated
public class AgentChatMemoryManager {

    private final Map<String, MessageWindowChatMemory> memories = new ConcurrentHashMap<>();

    private static final int MAX_MESSAGES = 20;

    public MessageWindowChatMemory getMemory(String sessionId) {
        return memories.computeIfAbsent(sessionId,
                id -> MessageWindowChatMemory.builder()
                        .id(sessionId)
                        .maxMessages(MAX_MESSAGES)
                        .build());
    }

    public void removeMemory(String sessionId) {
        memories.remove(sessionId);
    }

    public boolean hasMemory(String sessionId) {
        return memories.containsKey(sessionId);
    }
}
