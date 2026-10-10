package com.aidemo.myaitravelreimbursement.agent.tools;

import com.aidemo.myaitravelreimbursement.agent.memory.PersistentMemoryManager;
import com.aidemo.myaitravelreimbursement.agent.memory.PersistentMemoryManager.MemoryType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Agent 可调用的记忆工具。
 *
 * Agent 在对话中识别到值得跨会话保留的内容时，可调用此工具保存记忆。
 *
 * 使用方式（Agent 内部调用）：
 * - saveMemory(type, name, content, why, howToApply)
 */
@Slf4j
@Component
public class MemoryTools {

    private final PersistentMemoryManager persistentMemoryManager;

    public MemoryTools(PersistentMemoryManager persistentMemoryManager) {
        this.persistentMemoryManager = persistentMemoryManager;
    }

    /**
     * 保存一条跨会话持久记忆。
     *
     * @param projectId   项目ID
     * @param type        记忆类型：USER / FEEDBACK / PROJECT / REFERENCE
     * @param name        记忆名称（简短，10字以内）
     * @param content     记忆的具体内容
     * @param why         为什么这条信息值得保留
     * @param howToApply  在未来对话中如何应用
     * @return 保存结果（文件名）
     */
    public String saveMemory(String projectId, String type, String name,
                             String content, String why, String howToApply) {
        try {
            MemoryType memoryType = MemoryType.fromString(type);
            String filename = persistentMemoryManager.saveMemory(
                    projectId, memoryType, name, content, why, howToApply);
            log.info("Memory saved: projectId={}, type={}, filename={}", projectId, type, filename);
            return "记忆已保存：" + filename;
        } catch (IllegalArgumentException e) {
            log.error("Invalid memory type: {}", type, e);
            return "记忆保存失败：无效的记忆类型 " + type + "，支持的类型为 USER/FEEDBACK/PROJECT/REFERENCE";
        } catch (Exception e) {
            log.error("Failed to save memory: projectId={}, type={}", projectId, type, e);
            return "记忆保存失败：" + e.getMessage();
        }
    }
}
