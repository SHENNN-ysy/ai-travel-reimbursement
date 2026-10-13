package com.aidemo.myaitravelreimbursement.agent.workflow;

/**
 * 工作流业务性终止信号（如项目不存在、无资料文件、识别失败待人工核验）。
 * message 直接作为终止原因展示给用户。
 */
public class WorkflowAbortException extends RuntimeException {

    public WorkflowAbortException(String message) {
        super(message);
    }
}
