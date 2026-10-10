package com.aidemo.myaitravelreimbursement.agent.prompt;

/**
 * 摘要提取 Prompt 模板。
 * 用于 LLM 生成会话结构化摘要（6 Section 模板）和持久记忆提炼。
 */
public class SummaryPromptTemplate {

    private SummaryPromptTemplate() {}

    // ========== 会话摘要提取 Prompt ==========

    /**
     * 生成会话摘要的系统提示词。
     * 输入为最近 N 条对话消息，要求 LLM 输出 6 Section 结构化摘要。
     *
     * @param recentMessages 最近 N 条对话消息（格式：[角色] 内容）
     * @param maxTokens     最大输出 tokens
     * @return 完整的 Prompt
     */
    public static String buildSessionSummaryPrompt(String recentMessages, int maxTokens) {
        return String.format("""
                你是一个专业的出差报销AI助手。请根据以下最近的对话记录，生成一份结构化会话摘要。

                【要求】
                - 使用简体中文输出
                - 每个 Section 只需填写实际存在的内容，如果没有相关信息则写"无"
                - 保持简洁，每个 Section 不超过 100 字
                - 不要编造不存在的信息
                - 输出总长度不超过 %2$d tokens

                【对话记录】
                %1$s

                【输出格式】（严格按此格式输出，不要添加任何解释）
                # 会话目标
                _当前会话正在完成什么报销任务_

                # 当前状态
                _进行到哪一步，有什么待确认事项_

                # 已完成步骤
                _已完成的操作和结果_

                # 文件信息
                _上传了哪些文件，识别出了什么内容_

                # 错误与修正
                _遇到的问题和用户纠正_

                # 关键结果
                _生成的报销单金额、人数、日期等关键数据_
                """, recentMessages, maxTokens);
    }

    // ========== 持久记忆提炼 Prompt ==========

    /**
     * 从会话摘要中提炼值得跨会话保留的记忆。
     *
     * @param sessionSummary 会话摘要内容
     * @return 提炼 Prompt
     */
    public static String buildMemoryExtractionPrompt(String sessionSummary) {
        return String.format("""
                你是一个专业的出差报销AI助手。请从以下会话摘要中提炼出值得跨会话保留的记忆条目。

                【四类记忆类型说明】
                - USER（用户偏好）：用户的角色、目标、习惯、知识背景
                - FEEDBACK（行为纠正）：用户对工作方式的纠正和确认
                - PROJECT（项目状态）：关于工作目标、Bug 或事件的信息
                - REFERENCE（外部引用）：外部系统链接、报销系统链接、审批流等

                【不应保存的内容】（严格排除）
                - 代码模式、架构、文件路径（可从代码派生）
                - Git 历史（git log 是权威来源）
                - Debug 解决方案（修复在代码里）
                - 已在 System Prompt 中记录的内容
                - 临时会话状态

                【输出格式】（严格按 JSON 数组格式输出，不要添加任何解释）
                如果没有值得保留的内容，返回空数组 []：
                []

                如果有内容，每条记忆格式如下（JSON 数组）：
                [
                  {
                    "type": "USER|FEEDBACK|PROJECT|REFERENCE",
                    "name": "记忆名称（简短，10字以内）",
                    "content": "记忆的具体内容",
                    "why": "为什么这条信息值得保留（动机）",
                    "howToApply": "在未来的对话中如何应用这条记忆"
                  }
                ]

                【会话摘要】
                %s
                """, sessionSummary);
    }

    // ========== 摘要提取用的用户消息模板 ==========

    /**
     * 用于调用 LLM 生成摘要时的用户消息。
     */
    public static String buildSummaryUserMessage(String recentMessages) {
        return "请根据以下对话记录生成结构化会话摘要：\n\n" + recentMessages;
    }

    /**
     * 用于调用 LLM 提炼记忆时的用户消息。
     */
    public static String buildMemoryExtractionUserMessage(String sessionSummary) {
        return "请从以下会话摘要中提炼值得跨会话保留的记忆条目：\n\n" + sessionSummary;
    }
}
