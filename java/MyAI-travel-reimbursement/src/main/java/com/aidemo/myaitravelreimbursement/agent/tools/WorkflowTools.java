package com.aidemo.myaitravelreimbursement.agent.tools;

import com.aidemo.myaitravelreimbursement.agent.workflow.WorkflowEngine;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;

/**
 * 一键报销工作流工具。
 * 不作为 Spring Bean：由 ReimbursementAgent 在每次会话请求时实例化，
 * 以捕获当前 sessionId 与对话锚定的项目，供工作流引擎按会话推送 SSE 进度。
 */
public class WorkflowTools {

    private final String sessionId;
    private final Long anchoredProjectId;
    private final String anchoredProjectName;
    private final WorkflowEngine workflowEngine;

    public WorkflowTools(String sessionId, Long anchoredProjectId, String anchoredProjectName,
                         WorkflowEngine workflowEngine) {
        this.sessionId = sessionId;
        this.anchoredProjectId = anchoredProjectId;
        this.anchoredProjectName = anchoredProjectName;
        this.workflowEngine = workflowEngine;
    }

    @Tool("一键报销全流程工作流：依次执行 确认报销项目 → 确认资料文件 → 提交识别 → 识别文件 → 识别结果检验 → 确认识别结果 → 生成报销表 → 导出报销包，共8个固定节点，每个节点带硬校验，不达标即终止。"
            + "当用户要求「一键报销」「全流程报销」「帮我走完全流程」时调用本工具。入参：projectName - 项目名称（可选；当前对话已锚定项目时会自动使用锚定项目，无需传入）")
    public String runFullReimbursementWorkflow(@P(value = "projectName", required = false) String projectName) {
        try {
            // 对话已锚定项目时，始终以锚定项目为准，忽略 LLM 传入的名称
            if (anchoredProjectId != null) {
                return workflowEngine.run(anchoredProjectName, anchoredProjectId, sessionId);
            }
            if (projectName == null || projectName.isBlank()) {
                return "当前对话未选择报销项目，请先在页面左侧选择项目，或告诉我具体的项目名称。";
            }
            return workflowEngine.run(projectName, sessionId);
        } catch (Exception e) {
            return "一键报销工作流执行失败: " + e.getMessage();
        }
    }
}
