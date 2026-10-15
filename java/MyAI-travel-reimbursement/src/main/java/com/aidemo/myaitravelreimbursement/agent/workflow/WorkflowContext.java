package com.aidemo.myaitravelreimbursement.agent.workflow;

import com.aidemo.myaitravelreimbursement.entity.Project;
import com.aidemo.myaitravelreimbursement.entity.UploadFile;
import lombok.Data;

import java.util.List;
import java.util.function.Consumer;

/**
 * 一键报销工作流执行上下文。
 * 在节点间传递数据（不走对话），并携带当前节点的进度上报回调。
 */
@Data
public class WorkflowContext {

    /** 项目名称（用户/LLM 传入；锚定模式下可为空，以 projectId 为准） */
    private final String projectName;

    /** 当前会话 ID（用于 SSE 进度推送） */
    private final String sessionId;

    /** 对话锚定的项目 ID（前端选中的项目；未锚定时为 null） */
    private final Long projectId;

    /** 节点 1 解析出的项目实体 */
    private Project project;

    /** 节点 2 拉取的项目文件清单 */
    private List<UploadFile> files;

    /** 节点 3 提交识别的文件 ID 列表 */
    private List<Long> pendingFileIds;

    /** 无待识别文件时置 true，后续识别相关节点跳过 */
    private boolean recognitionSkipped;

    /** 由引擎注入的当前节点进度上报回调（参数为进度说明文本） */
    private transient Consumer<String> progressReporter;

    /** 上报当前节点进度：引擎会更新当前节点 message 并推送 SSE 快照 */
    public void reportProgress(String message) {
        if (progressReporter != null) {
            progressReporter.accept(message);
        }
    }
}
