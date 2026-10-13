package com.aidemo.myaitravelreimbursement.agent.workflow;

import com.aidemo.myaitravelreimbursement.agent.tools.ProjectTools;
import com.aidemo.myaitravelreimbursement.agent.tools.ReportTools;
import com.aidemo.myaitravelreimbursement.constant.FileStatus;
import com.aidemo.myaitravelreimbursement.constant.FileType;
import com.aidemo.myaitravelreimbursement.entity.Project;
import com.aidemo.myaitravelreimbursement.entity.UploadFile;
import com.aidemo.myaitravelreimbursement.mapper.UploadFileMapper;
import com.aidemo.myaitravelreimbursement.service.BatchRecognizeService;
import com.aidemo.myaitravelreimbursement.service.ProjectService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 一键报销工作流定义：返回有序节点列表。
 * 节点只做编排与硬校验，业务逻辑全部委托现有 Service / 工具方法。
 */
@Component
@RequiredArgsConstructor
public class ReimbursementWorkflowDefinition {

    /** 识别轮询间隔（毫秒） */
    private static final long RECOGNIZE_POLL_INTERVAL_MS = 5_000;
    /** 识别等待超时（毫秒）：10 分钟 */
    private static final long RECOGNIZE_TIMEOUT_MS = 10 * 60 * 1000L;

    private final ProjectService projectService;
    private final UploadFileMapper uploadFileMapper;
    private final BatchRecognizeService batchRecognizeService;
    private final ReportTools reportTools;
    private final ProjectTools projectTools;

    public List<WorkflowNode> nodes() {
        return List.of(
                WorkflowNode.of("confirm-project", "确认报销项目", this::confirmProject),
                WorkflowNode.of("check-files", "确认报销资料文件", this::checkFiles),
                WorkflowNode.of("submit-recognition", "提交识别任务", this::submitRecognition),
                WorkflowNode.of("wait-recognition", "识别图片文件", this::waitRecognition),
                WorkflowNode.of("verify-results", "识别结果检验", this::verifyResults),
                WorkflowNode.of("confirm-results", "确认识别结果", this::confirmResults),
                WorkflowNode.of("generate-excel", "生成报销表", this::generateExcel),
                WorkflowNode.of("export-package", "导出报销包", this::exportPackage)
        );
    }

    /** 1. 确认报销项目：优先使用对话锚定的项目，否则按名称（模糊）查找；项目不存在则终止 */
    private String confirmProject(WorkflowContext ctx) {
        Project project = ctx.getProjectId() != null
                ? projectService.getOwnedProject(ctx.getProjectId())
                : projectService.getProjectByName(ctx.getProjectName());
        if (project == null) {
            if (ctx.getProjectId() != null) {
                throw new WorkflowAbortException("当前对话锚定的项目不存在或已被删除，请重新选择项目后再发起对话。");
            }
            throw new WorkflowAbortException("未找到项目【" + ctx.getProjectName() + "】，请检查项目名称或先创建项目。");
        }
        ctx.setProject(project);
        return "项目存在：" + project.getName();
    }

    /** 2. 确认报销资料文件：拉取项目文件并按类别统计；无任何文件则终止 */
    private String checkFiles(WorkflowContext ctx) {
        List<UploadFile> files = uploadFileMapper.selectList(
                new LambdaQueryWrapper<UploadFile>()
                        .eq(UploadFile::getProjectId, ctx.getProject().getId())
                        .orderByAsc(UploadFile::getCreatedAt));
        if (files.isEmpty()) {
            throw new WorkflowAbortException("项目【" + ctx.getProject().getName() + "】下没有任何报销资料文件，请先上传发票、截图等资料。");
        }
        ctx.setFiles(files);
        long invoices = files.stream().filter(f -> FileType.INVOICE.equals(f.getType())).count();
        long screenshots = files.stream().filter(f -> FileType.SCREENSHOT.equals(f.getType())).count();
        long attachments = files.stream().filter(f -> FileType.ATTACHMENT.equals(f.getType())).count();
        return String.format("共 %d 个文件（发票 %d、截图 %d、附加材料 %d）",
                files.size(), invoices, screenshots, attachments);
    }

    /** 3. 提交识别任务：无待识别文件则标记跳过识别环节 */
    private String submitRecognition(WorkflowContext ctx) {
        List<Long> pendingIds = ctx.getFiles().stream()
                .filter(f -> !FileType.ATTACHMENT.equals(f.getType()))
                .filter(f -> f.getStatus() != null && f.getStatus() == FileStatus.PENDING)
                .map(UploadFile::getId)
                .collect(Collectors.toList());
        if (pendingIds.isEmpty()) {
            ctx.setRecognitionSkipped(true);
            return "无待识别文件（均已识别或为附加材料）";
        }
        ctx.setPendingFileIds(pendingIds);
        batchRecognizeService.submitTask(ctx.getProject().getId(), pendingIds);
        return String.format("已提交识别任务，共 %d 个文件", pendingIds.size());
    }

    /** 4. 识别图片文件：识别在后台线程执行，此处轮询文件状态直至全部完成 */
    private String waitRecognition(WorkflowContext ctx) throws InterruptedException {
        List<Long> ids = ctx.getPendingFileIds();
        long deadline = System.currentTimeMillis() + RECOGNIZE_TIMEOUT_MS;
        while (true) {
            List<UploadFile> files = uploadFileMapper.selectBatchIds(ids);
            long done = files.stream()
                    .filter(f -> f.getStatus() == FileStatus.SUCCESS || f.getStatus() == FileStatus.FAILED)
                    .count();
            ctx.reportProgress(String.format("识别中 %d/%d", done, ids.size()));
            if (done >= ids.size()) {
                long success = files.stream().filter(f -> f.getStatus() == FileStatus.SUCCESS).count();
                return String.format("识别完成：成功 %d 个，失败 %d 个", success, ids.size() - success);
            }
            if (System.currentTimeMillis() > deadline) {
                throw new WorkflowAbortException("识别等待超时（10 分钟），请稍后重试或到文件归档页查看识别进度。");
            }
            Thread.sleep(RECOGNIZE_POLL_INTERVAL_MS);
        }
    }

    /** 5. 识别结果检验：存在识别失败文件则终止，提示人工核验 */
    private String verifyResults(WorkflowContext ctx) {
        List<UploadFile> files = uploadFileMapper.selectBatchIds(ctx.getPendingFileIds());
        List<String> failedNames = files.stream()
                .filter(f -> f.getStatus() == FileStatus.FAILED)
                .map(UploadFile::getOriginalName)
                .collect(Collectors.toList());
        if (!failedNames.isEmpty()) {
            throw new WorkflowAbortException("以下文件识别失败：" + String.join("、", failedNames)
                    + "。请到文件归档页人工核验后重新发起一键报销。");
        }
        return "全部 " + files.size() + " 个文件识别通过";
    }

    /** 6. 确认识别结果：批量确认并生成报表明细（重跑幂等：无待确认文件时继续后续导出） */
    private String confirmResults(WorkflowContext ctx) {
        return reportTools.batchConfirm(ctx.getProject().getName());
    }

    /** 7. 生成报销表：生成 Excel 并返回下载链接 */
    private String generateExcel(WorkflowContext ctx) {
        return reportTools.exportExcel(ctx.getProject().getName());
    }

    /** 8. 导出报销包：打包 zip 并返回下载地址 */
    private String exportPackage(WorkflowContext ctx) {
        return projectTools.exportPackage(ctx.getProject().getName());
    }
}
