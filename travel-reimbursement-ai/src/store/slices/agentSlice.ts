import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as api from '@/api';
import type {
  AgentSessionVO,
  AgentChatItem,
  AgentMessageVO,
} from '@/types';

interface AgentState {
  // 会话列表
  sessions: AgentSessionVO[];
  sessionsLoading: boolean;

  // 当前会话
  currentSessionId: string | null;
  sessionDetailLoading: boolean;

  // 对话消息列表（渲染用）
  chatItems: AgentChatItem[];
  chatLoading: boolean;

  // 当前项目 ID
  projectId: number | null;
}

const initialState: AgentState = {
  sessions: [],
  sessionsLoading: false,
  currentSessionId: null,
  sessionDetailLoading: false,
  chatItems: [],
  chatLoading: false,
  projectId: null,
};

// ==================== Async Thunks ====================

/**
 * 获取会话列表
 */
export const fetchAgentSessions = createAsyncThunk(
  'agent/fetchSessions',
  async (projectId: number) => {
    return await api.getAgentSessions(projectId);
  }
);

/**
 * 获取会话详情（某sessionId下所有用户对话，按时间正序）
 */
export const fetchAgentSessionDetail = createAsyncThunk(
  'agent/fetchSessionDetail',
  async (sessionId: string) => {
    return await api.getAgentSessionDetail(sessionId);
  }
);

/**
 * 删除会话
 */
export const deleteAgentSession = createAsyncThunk(
  'agent/deleteSession',
  async (sessionId: string) => {
    await api.deleteAgentSession(sessionId);
    return sessionId;
  }
);

/**
 * 新建会话（后端创建占位记录，返回 sessionId）
 */
export const createAgentSession = createAsyncThunk(
  'agent/createSession',
  async (projectId: number) => {
    return await api.createAgentSession(projectId);
  }
);

// ==================== Slice ====================

const agentSlice = createSlice({
  name: 'agent',
  initialState,
  reducers: {
    setProjectId: (state, action: PayloadAction<number>) => {
      state.projectId = action.payload;
    },

    setCurrentSessionId: (state, action: PayloadAction<string | null>) => {
      state.currentSessionId = action.payload;
      if (action.payload === null) {
        state.chatItems = [];
      }
    },

    /** 清空对话 */
    clearChatItems: (state) => {
      state.chatItems = [];
    },

    /** 标记指定消息为已完成（触发 markdown 富文本渲染） */
    setMessageComplete: (state, action: PayloadAction<string>) => {
      const item = state.chatItems.find((it) => it.id === action.payload);
      if (item) {
        item.isComplete = true;
      }
    },

    /** 添加用户消息到列表 */
    addUserMessage: (state, action: PayloadAction<{ content: string }>) => {
      state.chatItems.push({
        id: `user-${Date.now()}`,
        role: 'user',
        content: action.payload.content,
        timestamp: new Date().toISOString(),
      });
    },

    /** 添加 AI 思考中状态 */
    addThinkingMessage: (state, action: PayloadAction<{ content: string }>) => {
      state.chatItems.push({
        id: `thinking-${Date.now()}`,
        role: 'assistant',
        content: action.payload.content,
        isThinking: true,
        timestamp: new Date().toISOString(),
      });
    },

    /** 更新最后一条 thinking 消息的内容 */
    updateLastThinkingMessage: (state, action: PayloadAction<string>) => {
      const last = state.chatItems[state.chatItems.length - 1];
      if (last && last.isThinking) {
        last.content = action.payload;
      }
    },

    // Don't remove reasoning/thinking on thinking end — keep them visible

    /** 添加模型推理中状态 */
    addReasoningMessage: (state, action: PayloadAction<{ content: string; id?: string }>) => {
      state.chatItems.push({
        id: action.payload.id ?? `reasoning-${Date.now()}`,
        role: 'assistant',
        content: action.payload.content,
        isReasoning: true,
        timestamp: new Date().toISOString(),
      });
    },

    /** 更新最后一条 reasoning 消息的内容（追加）
     *  修复：从后往前找最近的一个 reasoning 条目，排除 toolCall
     */
    appendReasoningContent: (state, action: PayloadAction<string>) => {
      for (let i = state.chatItems.length - 1; i >= 0; i--) {
        const item = state.chatItems[i];
        if (item.isReasoning && !item.toolCall) {
          item.content += action.payload;
          break;
        }
      }
    },

    /** 删除所有 reasoning 消息（可能有多条） */
    removeLastReasoningMessage: (state) => {
      state.chatItems = state.chatItems.filter((item) => !item.isReasoning);
    },

    /** 添加工具调用记录（每个 tool_call 事件都创建独立气泡） */
    addToolCallItem: (
      state,
      action: PayloadAction<{ toolIndex: number; tool: string; input: Record<string, unknown>; isExecuting?: boolean }>
    ) => {
      state.chatItems.push({
        id: `tool-call-${Date.now()}-${action.payload.toolIndex}`,
        role: 'assistant',
        content: `调用工具 ${action.payload.tool}`,
        toolCall: {
          toolIndex: action.payload.toolIndex,
          tool: action.payload.tool,
          input: action.payload.input,
        },
        toolResult: action.payload.isExecuting === false
          ? { success: true, output: undefined }
          : undefined,
        timestamp: new Date().toISOString(),
      });
    },

    /** 更新指定 toolIndex 的工具调用记录的结果 */
    updateToolCallResultByIndex: (
      state,
      action: PayloadAction<{ toolIndex: number; success: boolean; output?: unknown; error?: string }>
    ) => {
      const item = state.chatItems.find(
        (it) => it.toolCall && it.toolCall.toolIndex === action.payload.toolIndex
      );
      if (item) {
        item.toolResult = {
          success: action.payload.success,
          output: action.payload.output,
          error: action.payload.error,
        };
      }
    },

    /** 通过工具名称匹配更新工具调用记录的结果（用于 tool_result 没有 toolIndex 的情况） */
    updateToolCallResultByToolName: (
      state,
      action: PayloadAction<{ tool: string; success: boolean; output?: unknown; error?: string }>
    ) => {
      const item = state.chatItems.find(
        (it) => it.toolCall && it.toolCall.tool === action.payload.tool && !it.toolResult
      );
      if (item) {
        item.toolResult = {
          success: action.payload.success,
          output: action.payload.output,
          error: action.payload.error,
        };
      }
    },

    /** 添加 AI 回复消息（支持自定义 ID，用于流式场景） */
    addAssistantMessage: (
      state,
      action: PayloadAction<{ id?: string; content: string }>
    ) => {
      // Don't remove reasoning/thinking — keep them visible after thinking ends
      state.chatItems.push({
        id: action.payload.id ?? `assistant-${Date.now()}`,
        role: 'assistant',
        content: action.payload.content,
        timestamp: new Date().toISOString(),
      });
    },

    /** 更新最后一条纯 assistant 消息的内容（传入完整累积内容，不是增量）
     *  修复：从后往前找最近的一个纯 assistant 消息，排除 toolCall、reasoning、thinking
     */
    updateAssistantMessageContent: (state, action: PayloadAction<string>) => {
      for (let i = state.chatItems.length - 1; i >= 0; i--) {
        const last = state.chatItems[i];
        if (last.role === 'assistant' && !last.toolCall && !last.isReasoning && !last.isThinking) {
          last.content = action.payload;
          break;
        }
      }
    },

    /** 追加内容到最后一条纯 assistant 消息（流式场景增量追加）
     *  修复：在工具调用完成后，last item 是 toolCall，需找到最后一个非 toolCall/reasoning/thinking 的 assistant 条目
     */
    appendAssistantContent: (state, action: PayloadAction<string>) => {
      // 从后往前找最近的一个纯 assistant 消息（排除 toolCall、reasoning、thinking）
      for (let i = state.chatItems.length - 1; i >= 0; i--) {
        const item = state.chatItems[i];
        if (item.role === 'assistant' && !item.toolCall && !item.isReasoning && !item.isThinking) {
          item.content += action.payload;
          break;
        }
      }
    },

    setChatLoading: (state, action: PayloadAction<boolean>) => {
      state.chatLoading = action.payload;
    },

    resetAgentState: () => initialState,
  },

  extraReducers: (builder) => {
    // fetchAgentSessions
    builder.addCase(fetchAgentSessions.pending, (state) => {
      state.sessionsLoading = true;
    });
    builder.addCase(fetchAgentSessions.fulfilled, (state, action) => {
      state.sessionsLoading = false;
      state.sessions = action.payload as AgentSessionVO[];
    });
    builder.addCase(fetchAgentSessions.rejected, (state) => {
      state.sessionsLoading = false;
    });

    // fetchAgentSessionDetail
    builder.addCase(fetchAgentSessionDetail.pending, (state) => {
      state.sessionDetailLoading = true;
    }),
    builder.addCase(fetchAgentSessionDetail.fulfilled, (state, action) => {
      state.sessionDetailLoading = false;
      // 追加历史消息，不要覆盖用户正在输入的消息
      // 后端按 id 升序返回，即时间正序
      const historyMessages = action.payload
        .map((msg, idx) => ({
          id: `history-${msg.id ?? idx}`,
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.timestamp,
          isComplete: msg.role === 'assistant',
        }))
      // 只有当历史消息与当前消息不重复时才追加
      const existingIds = new Set(state.chatItems.map((item) => item.id));
      const newHistory = historyMessages.filter((msg) => !existingIds.has(msg.id));
      if (newHistory.length > 0) {
        state.chatItems.push(...newHistory);
      }
    }),

    // deleteAgentSession
    builder.addCase(deleteAgentSession.fulfilled, (state, action) => {
      state.sessions = state.sessions.filter(
        (s) => s.sessionId !== action.payload
      );
      if (state.currentSessionId === action.payload) {
        state.currentSessionId = null;
        state.chatItems = [];
      }
    }),

    // createAgentSession
    builder.addCase(createAgentSession.fulfilled, (state, action) => {
      state.currentSessionId = action.payload;
      state.chatItems = [];
    });
  },
});

export const {
  setProjectId,
  setCurrentSessionId,
  clearChatItems,
  setMessageComplete,
  addUserMessage,
  addThinkingMessage,
  updateLastThinkingMessage,
  addReasoningMessage,
  appendReasoningContent,
  removeLastReasoningMessage,
  addToolCallItem,
  updateToolCallResultByIndex,
  updateToolCallResultByToolName,
  addAssistantMessage,
  updateAssistantMessageContent,
  appendAssistantContent,
  setChatLoading,
  resetAgentState,
} = agentSlice.actions;

export default agentSlice.reducer;
