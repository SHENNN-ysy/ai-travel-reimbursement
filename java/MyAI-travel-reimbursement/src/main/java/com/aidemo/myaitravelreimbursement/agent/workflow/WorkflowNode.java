package com.aidemo.myaitravelreimbursement.agent.workflow;

/**
 * 工作流节点：定义名称与执行逻辑。
 * execute 返回节点完成说明；抛 WorkflowAbortException 表示业务性终止，
 * 其他异常视为节点执行失败。
 */
public interface WorkflowNode {

    /** 节点唯一标识，如 "confirm-project" */
    String key();

    /** 节点展示名，如 "确认报销项目" */
    String label();

    String execute(WorkflowContext ctx) throws Exception;

    @FunctionalInterface
    interface Action {
        String run(WorkflowContext ctx) throws Exception;
    }

    /** 以 lambda 快速定义节点 */
    static WorkflowNode of(String key, String label, Action action) {
        return new WorkflowNode() {
            @Override
            public String key() {
                return key;
            }

            @Override
            public String label() {
                return label;
            }

            @Override
            public String execute(WorkflowContext ctx) throws Exception {
                return action.run(ctx);
            }
        };
    }
}
