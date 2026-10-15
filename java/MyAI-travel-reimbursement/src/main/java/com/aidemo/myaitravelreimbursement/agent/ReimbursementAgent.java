package com.aidemo.myaitravelreimbursement.agent;

import com.aidemo.myaitravelreimbursement.agent.extractor.SessionSummaryExtractor;
import com.aidemo.myaitravelreimbursement.agent.memory.PersistentMemoryManager;
import com.aidemo.myaitravelreimbursement.agent.memory.SessionMemoryManager;
import com.aidemo.myaitravelreimbursement.agent.prompt.AgentSystemPrompt;
import com.aidemo.myaitravelreimbursement.agent.tools.FileTools;
import com.aidemo.myaitravelreimbursement.agent.tools.MemoryTools;
import com.aidemo.myaitravelreimbursement.agent.tools.ProjectTools;
import com.aidemo.myaitravelreimbursement.agent.tools.RecognitionTools;
import com.aidemo.myaitravelreimbursement.agent.tools.ReportTools;
import com.aidemo.myaitravelreimbursement.agent.tools.WorkflowTools;
import com.aidemo.myaitravelreimbursement.agent.workflow.WorkflowEngine;
import dev.langchain4j.mcp.McpToolProvider;
import dev.langchain4j.mcp.client.DefaultMcpClient;
import dev.langchain4j.mcp.client.McpClient;
import dev.langchain4j.mcp.client.transport.McpTransport;
import dev.langchain4j.mcp.client.transport.http.StreamableHttpMcpTransport;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.StreamingChatModel;
import dev.langchain4j.rag.RetrievalAugmentor;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.TokenStream;
import dev.langchain4j.service.tool.ToolProvider;
import dev.langchain4j.skills.*;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.annotation.Resource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Agent 对话服务（基于 LangChain4j AiServices）
 * 定义 Agent 行为接口，由 AiServices 自动生成实现
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "ai.provider", havingValue = "langchain4j", matchIfMissing = true)
public class ReimbursementAgent {

    private final ChatModel chatModel;
    private final StreamingChatModel chatStreamModel;
    private final SessionMemoryManager sessionMemoryManager;
    private final PersistentMemoryManager persistentMemoryManager;
    private final SessionSummaryExtractor sessionSummaryExtractor;
    private final ProjectTools projectTools;
    private final FileTools fileTools;
    private final RecognitionTools recognitionTools;
    private final ReportTools reportTools;
    private final MemoryTools memoryTools;
    private final WorkflowEngine workflowEngine;
    private final com.aidemo.myaitravelreimbursement.mapper.ProjectMapper projectMapper;

    @Resource
    private RetrievalAugmentor retrievalAugmentor;

    private ToolProvider excelMcpToolProvider;
    private McpClient excelMcpClient;

    @Value("${excel-mcp.url:}")
    private String excelMcpUrl;

    @PostConstruct
    public void initMcpClient() {
        if (!StringUtils.hasText(excelMcpUrl)) {
            log.warn("excel-mcp.url 未配置，Excel MCP 工具将不启用");
            return;
        }

        McpTransport transport = StreamableHttpMcpTransport.builder()
                .url(excelMcpUrl)
                .build();

        McpClient mcpClient = DefaultMcpClient.builder()
                .key("excel-mcp")
                .transport(transport)
                .build();

        excelMcpToolProvider = McpToolProvider.builder()
                .mcpClients(mcpClient)
                .build();

        excelMcpClient = mcpClient;
        log.info("Excel MCP 客户端初始化成功，连接地址: {}", excelMcpUrl);
    }

    @PreDestroy
    public void closeMcpClient() {
        if (excelMcpClient != null) {
            try {
                excelMcpClient.close();
                log.info("Excel MCP 客户端已关闭");
            } catch (Exception e) {
                log.warn("关闭 Excel MCP 客户端时出错: {}", e.getMessage());
            }
        }
    }

    public interface Assistant {
        TokenStream chatStream(String userMessage);
    }

    /**
     * 创建 Agent 实例（每个会话独立）。
     * 加载会话摘要和持久记忆拼接到 System Prompt 中。
     *
     * @param projectId 项目ID（用于加载持久记忆）
     * @param sessionId 会话ID（用于管理 ChatMemory）
     */
    public Assistant createAssistant(String projectId, String sessionId) {
        String sessionSummary = sessionSummaryExtractor.readSummary(
                Long.valueOf(projectId), sessionId);
        String persistentContext = persistentMemoryManager.loadPersistentContext(projectId, null);
        String enhancedPrompt = buildEnhancedPrompt(sessionSummary, persistentContext);

        // 对话锚定项目：注入系统提示并传递给一键报销工作流工具
        Long anchoredProjectId = null;
        String anchoredProjectName = null;
        try {
            com.aidemo.myaitravelreimbursement.entity.Project anchored =
                    projectMapper.selectById(Long.valueOf(projectId));
            if (anchored != null) {
                anchoredProjectId = anchored.getId();
                anchoredProjectName = anchored.getName();
                enhancedPrompt += "\n\n【当前锚定项目】\n本对话已锚定项目「" + anchoredProjectName + "」(ID=" + anchoredProjectId
                        + ")，用户所有涉及项目的操作（包括一键报销全流程）默认针对该项目，调用相关工具时直接使用该项目，无需再向用户确认项目名称。";
            }
        } catch (Exception e) {
            log.warn("解析锚定项目失败: projectId={}", projectId, e);
        }

        FileSystemSkill skill = ClassPathSkillLoader.loadSkill("skills/full");
        Skill skill_full = Skill.builder()
                .name(skill.name())
                .description(skill.description())
                .content(skill.content())
                .toolProviders(skill.toolProviders())
                .tools(projectTools, fileTools, recognitionTools, reportTools, memoryTools)
                .build();
        Skills skills = Skills.from(skill_full);

        AiServices<Assistant> builder = AiServices.builder(Assistant.class)
                .streamingChatModel(chatStreamModel)
                .chatMemory(sessionMemoryManager.getOrCreateMemory(sessionId))
                .retrievalAugmentor(retrievalAugmentor)
                .tools(projectTools, fileTools, recognitionTools, reportTools, memoryTools,
                        new WorkflowTools(sessionId, anchoredProjectId, anchoredProjectName, workflowEngine))
                .toolProvider(skills.toolProvider())
                .toolProvider(excelMcpToolProvider)
                .systemMessage(enhancedPrompt)
                .systemMessageTransformer(systemMessage -> systemMessage + "\n您可以使用以下技能:\n" + skills.formatAvailableSkills()
                        + "\n当用户请求「一键报销」「全流程报销」或「帮我走完全流程」时，直接调用 runFullReimbursementWorkflow 工具执行完整流程，不要逐一手动调用其他工具，也无需激活技能。");

        return builder.build();
    }

    private String buildEnhancedPrompt(String sessionSummary, String persistentContext) {
        StringBuilder sb = new StringBuilder(AgentSystemPrompt.SYSTEM_PROMPT);
        if (!sessionSummary.isBlank()) {
            sb.append("\n\n【会话上下文】\n").append(sessionSummary);
        }
        if (!persistentContext.isBlank()) {
            sb.append("\n\n【项目记忆】\n").append(persistentContext);
        }
        return sb.toString();
    }
}
