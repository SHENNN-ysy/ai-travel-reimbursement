package com.aidemo.myaitravelreimbursement.agent.workflow;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 工作流待办项：SSE 推送给前端展示的工作流进度条目。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowTodoItem {

    /** 节点标识 */
    private String key;

    /** 节点展示名 */
    private String label;

    /** 状态：pending / running / success / failed / skipped */
    private String status;

    /** 附加说明（进度、结果摘要或终止原因） */
    private String message;
}
