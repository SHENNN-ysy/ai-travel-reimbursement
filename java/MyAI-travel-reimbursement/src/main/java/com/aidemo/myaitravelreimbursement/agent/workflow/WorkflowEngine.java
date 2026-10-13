package com.aidemo.myaitravelreimbursement.agent.workflow;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * 一键报销工作流引擎：顺序执行流程定义中的节点，硬校验终止条件，
 * 并在每次节点状态变化时通过 SSE 推送 todo 进度快照。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WorkflowEngine {

    /** 无待识别文件时跳过的识别环节节点 */
    private static final Set<String> SKIP_WHEN_NO_RECOGNITION = Set.of("wait-recognition", "verify-results");

    private final ReimbursementWorkflowDefinition workflowDefinition;
    private final SseEmitterRegistry sseEmitterRegistry;
    private final ObjectMapper objectMapper;

    /**
     * 执行一键报销全流程。
     *
     * @param projectName 项目名称
     * @param sessionId   会话 ID（用于 SSE 进度推送）
     * @return 流程结果汇总文本（作为工具结果返回给 LLM）
     */
    public String run(String projectName, String sessionId) {
        return run(projectName, null, sessionId);
    }

    /**
     * 执行一键报销全流程（锚定项目模式）。
     *
     * @param projectName 项目名称（可空，锚定时以 projectId 为准）
     * @param projectId   对话锚定的项目 ID（可空，空则按 projectName 查找）
     * @param sessionId   会话 ID（用于 SSE 进度推送）
     * @return 流程结果汇总文本（作为工具结果返回给 LLM）
     */
    public String run(String projectName, Long projectId, String sessionId) {
        String runId = "wf-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        List<WorkflowNode> nodes = workflowDefinition.nodes();
        List<WorkflowTodoItem> items = new ArrayList<>();
        for (WorkflowNode node : nodes) {
            items.add(new WorkflowTodoItem(node.key(), node.label(), "pending", null));
        }

        WorkflowContext ctx = new WorkflowContext(projectName, sessionId, projectId);
        StringBuilder summary = new StringBuilder();
        push(sessionId, runId, "running", items);
        log.info("Workflow {} started: project={}, projectId={}, session={}", runId, projectName, projectId, sessionId);

        boolean terminated = false;
        for (int i = 0; i < nodes.size(); i++) {
            WorkflowNode node = nodes.get(i);
            WorkflowTodoItem item = items.get(i);

            // 无待识别文件时，识别环节节点直接跳过
            if (ctx.isRecognitionSkipped() && SKIP_WHEN_NO_RECOGNITION.contains(node.key())) {
                item.setStatus("skipped");
                item.setMessage("无待识别文件，跳过");
                push(sessionId, runId, "running", items);
                continue;
            }

            item.setStatus("running");
            ctx.setProgressReporter(message -> {
                item.setMessage(message);
                push(sessionId, runId, "running", items);
            });
            push(sessionId, runId, "running", items);

            try {
                String message = node.execute(ctx);
                if (ctx.isRecognitionSkipped() && "submit-recognition".equals(node.key())) {
                    item.setStatus("skipped");
                } else {
                    item.setStatus("success");
                }
                item.setMessage(truncate(message, 80));
                summary.append("【").append(node.label()).append("】").append(message).append("\n");
                push(sessionId, runId, "running", items);
            } catch (WorkflowAbortException e) {
                item.setStatus("failed");
                item.setMessage(e.getMessage());
                push(sessionId, runId, "failed", items);
                summary.append("流程在节点「").append(node.label()).append("」终止：").append(e.getMessage());
                log.warn("Workflow {} aborted at node {}: {}", runId, node.key(), e.getMessage());
                terminated = true;
                break;
            } catch (Exception e) {
                item.setStatus("failed");
                item.setMessage("执行异常：" + e.getMessage());
                push(sessionId, runId, "failed", items);
                summary.append("节点「").append(node.label()).append("」执行异常：").append(e.getMessage());
                log.error("Workflow {} failed at node {}", runId, node.key(), e);
                terminated = true;
                break;
            }
        }

        if (!terminated) {
            push(sessionId, runId, "completed", items);
            summary.insert(0, "一键报销全流程执行完成。\n");
            log.info("Workflow {} completed", runId);
        }
        return summary.toString();
    }

    /** 推送 todo 进度快照（全量 items，前端按 runId upsert） */
    private void push(String sessionId, String runId, String status, List<WorkflowTodoItem> items) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("runId", runId);
            payload.put("status", status);
            payload.put("items", items);
            sseEmitterRegistry.send(sessionId, "workflow_todo", objectMapper.writeValueAsString(payload));
        } catch (Exception e) {
            log.warn("推送 workflow_todo 事件失败: runId={}, error={}", runId, e.getMessage());
        }
    }

    private static String truncate(String text, int maxLen) {
        if (text == null || text.length() <= maxLen) return text;
        return text.substring(0, maxLen) + "...";
    }
}
