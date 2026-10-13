package com.aidemo.myaitravelreimbursement.agent.workflow;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * SSE 连接注册中心：按 sessionId 登记当前对话的 SseEmitter，
 * 供 Agent 主循环之外的调用方（如工作流引擎）推送事件。
 */
@Slf4j
@Component
public class SseEmitterRegistry {

    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    public void register(String sessionId, SseEmitter emitter) {
        emitters.put(sessionId, emitter);
    }

    /**
     * 仅当当前登记的仍是同一个 emitter 时才移除，避免误删同会话的新连接。
     */
    public void unregister(String sessionId, SseEmitter emitter) {
        emitters.remove(sessionId, emitter);
    }

    /**
     * 向指定会话推送事件。发送失败（如客户端已断开）仅记日志，不影响调用方流程。
     */
    public boolean send(String sessionId, String eventName, String data) {
        SseEmitter emitter = emitters.get(sessionId);
        if (emitter == null) {
            return false;
        }
        try {
            synchronized (emitter) {
                emitter.send(SseEmitter.event().name(eventName).data(data));
            }
            return true;
        } catch (Exception e) {
            log.warn("Failed to send SSE event {} to session {}: {}", eventName, sessionId, e.getMessage());
            return false;
        }
    }
}
