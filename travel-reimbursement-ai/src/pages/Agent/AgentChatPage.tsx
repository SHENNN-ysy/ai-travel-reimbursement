import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Input,
  Button,
  List,
  Typography,
  Spin,
  Empty,
  Popconfirm,
  message,
  Badge,
  Select,
  Alert,
} from 'antd';
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  TableOutlined,
  ExportOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchAgentSessions,
  fetchAgentSessionDetail,
  deleteAgentSession,
  setCurrentSessionId,
  addUserMessage,
  addThinkingMessage,
  updateLastThinkingMessage,
  addReasoningMessage,
  appendReasoningContent,
  addToolCallItem,
  updateToolCallResultByIndex,
  updateToolCallResultByToolName,
  addAssistantMessage,
  updateAssistantMessageContent,
  appendAssistantContent,
  clearChatItems,
  setChatLoading,
  createAgentSession,
  setMessageComplete,
  upsertWorkflowTodoList,
} from '@/store/slices/agentSlice';
import { fetchProjectDetail, fetchProjects } from '@/store/slices/projectSlice';
import type { AgentChatItem, WorkflowTodoItem, WorkflowRunStatus } from '@/types';
import { MessageRenderer } from '@/components/common/MessageRenderer';
import { WorkflowTodoCard } from '@/components/agent/WorkflowTodoCard';
import dayjs from 'dayjs';
import './AgentChatPage.css';

const { Text } = Typography;
const { TextArea } = Input;

let projectsFetched = false;

const WELCOME_MESSAGE = `你好！我是你的专业出差报销AI助手，很高兴为你服务！

以下是基本操作流程，你可以根据自己的情况选择：

## 📋 **标准报销流程**

### 1️⃣ **创建项目阶段**
- 告知我你的报销项目名称（如"北京出差"）
- 我会帮你初始化项目，设置基本信息

### 2️⃣ **上传发票/截图**
- 直接上传你的发票照片、行程截图、支付记录等
- 支持多种格式（图片、PDF等）
- 我会自动帮你归档整理

### 3️⃣ **AI智能识别**
- 系统自动识别发票信息（金额、日期、类型等）
- 无需手动填写，节省你的时间

### 4️⃣ **确认生成报表**
- 查看识别结果，确认无误后一键生成报表明细
- 支持人工补充或修改

### 5️⃣ **导出报销单**
- 自动生成标准格式的 Excel 报销单
- 可打包下载完整项目文件

---

## 💡 **你可以这样对我说：**

| 你的需求 | 示例说法 |
|---------|---------|
| 开始新报销 | "我要报销上海出差的费用" |
| 上传文件 | "上传几张发票" / "这是我的车票" |
| 查看进度 | "识别完成了吗？" |
| 导出报表 | "生成报销单" / "导出Excel" |
| 批量操作 | "帮我完成全部报销流程" |

---

## ⚡ **快速开始**
如果你想一次性完成整个报销流程，只需告诉我：
> **"我要报销【项目名称】，请帮我走完全流程"**

我会自动完成：上传→识别→生成报表→导出Excel的所有步骤！`;

// 工具名称映射（中文展示）
const TOOL_LABELS: Record<string, string> = {
  get_project_info: '获取项目信息',
  list_files: '列出文件',
  upload_file: '上传文件',
  recognize_files: '识别文件',
  get_recognition_results: '获取识别结果',
  create_report_item: '创建报表明细',
  auto_fill_report: '智能填充报表',
  export_excel: '导出 Excel',
  export_package: '导出报销项目',
  runFullReimbursementWorkflow: '一键报销工作流',
};

// 下载链接正则（export-package 和 reports/export）
const DOWNLOAD_URL_RE = /(https?:\/\/[^\s'")，]+(?:\/export-package|\/reports\/export)[^\s'")]*)/g;

/**
 * 用 Authorization 头下载文件（避免 token 出现在 URL 中）
 */
async function downloadWithAuth(url: string, filenameHint?: string) {
  const token = localStorage.getItem('token');
  if (!token) {
    message.error('未登录，无法下载文件');
    return;
  }
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`下载失败 (${res.status}): ${errText}`);
    }
    const blob = await res.blob();
    // 优先从 Content-Disposition 取文件名，否则用 hint
    let filename = filenameHint ?? 'download';
    const cd = res.headers.get('Content-Disposition');
    if (cd) {
      const m = cd.match(/filename[^;=\n]*=(?:(\\?['"])(.*?)\1|([^;\n]*))/i);
      if (m && (m[2] || m[3])) {
        filename = m[2] || m[3];
        filename = decodeURIComponent(filename);
      }
    } else if (filenameHint) {
      filename = decodeURIComponent(filenameHint);
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    message.success('文件下载成功');
  } catch (err: any) {
    message.error(err.message ?? '下载失败');
  }
}

// 快捷指令
const QUICK_ACTIONS = [
  {
    key: 'recognize_all',
    label: '一键识别所有文件',
    icon: <ThunderboltOutlined />,
    prompt: '帮我识别项目下所有待识别的文件',
  },
  {
    key: 'auto_fill',
    label: '智能填充报表',
    icon: <TableOutlined />,
    prompt: '根据已识别的文件，帮我自动生成报表明细',
  },
  {
    key: 'export_excel',
    label: '导出报销单',
    icon: <ExportOutlined />,
    prompt: '帮我导出报销单 Excel',
  },
];

export const AgentChatPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // From Redux get current project and Agent state
  const { currentProject, projects, projectsLoading } = useAppSelector((state) => state.project);
  const {
    sessions,
    sessionsLoading,
    currentSessionId,
    chatItems,
    chatLoading,
  } = useAppSelector((state) => state.agent);

  const projectId = currentProject?.id ?? null;

  // Local state
  const [inputValue, setInputValue] = useState('');
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  // 打字机效果：用于触发组件重渲染（interval 更新 ref 后需要通知 React 重新渲染气泡）
  const [typingRenderTick, setTypingRenderTick] = useState(0);
  // 聊天列表容器 ref，用于打字时自动滚动到底部
  const chatListContainerRef = useRef<HTMLDivElement>(null);

  // ==================== 打字机效果相关状态 ====================
  // 每个流式消息的打字状态：message id -> { fullText, displayedLength, intervalId }
  const typingStateMap = useRef<
    Map<string, { fullText: string; displayedLength: number; intervalId: ReturnType<typeof setInterval> | null }>
  >(new Map());

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // 追踪当前流式消息 ID
  const currentStreamingMsgId = useRef<string | null>(null);
  // 追踪当前 reasoning 消息 ID（用于 reasoning 打字机效果）
  const currentReasoningMsgId = useRef<string | null>(null);
  // 追踪当前是否已创建 thinking/reasoning 消息，避免竞态导致的重复窗口
  const hasThinkingMessage = useRef<boolean>(false);
  const hasReasoningMessage = useRef<boolean>(false);
  // 追踪已处理的 (toolName, toolIndex) 对，避免同工具多调用产生重复气泡
  const processedToolCalls = useRef<Set<string>>(new Set());
  // 追踪上一次 tool_call 的 (toolName, toolIndex)，用于判断是流式参数还是新调用
  const lastToolCallKey = useRef<{ tool: string; idx: number } | null>(null);

  // 追踪是否已发送过默认欢迎消息，避免切换会话/项目时重复出现
  const welcomeMessageSent = useRef(false);

  // 初始化默认欢迎消息（仅首次加载且 chatItems 为空时）
  useEffect(() => {
    if (chatItems.length === 0 && !welcomeMessageSent.current) {
      welcomeMessageSent.current = true;
      dispatch(addAssistantMessage({ id: 'welcome-default', content: WELCOME_MESSAGE }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load project list on mount (通过模块级标志位防止 StrictMode 和 Redux 状态变化导致重复请求)
  useEffect(() => {
    if (projectsFetched) return;
    projectsFetched = true;
    dispatch(fetchProjects({ current: 1, size: 50 }));
  }, [dispatch]);

  // Listen for session switch, load history messages
  useEffect(() => {
    if (!currentSessionId) return;
    dispatch(fetchAgentSessionDetail(currentSessionId));
  }, [currentSessionId]);

  // 打字动画触发时自动滚动到底部
  useEffect(() => {
    if (typingRenderTick === 0) return;
    const container = chatListContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [typingRenderTick]);

  // chatItems 更新时（用户发送消息、收到 AI 回复）自动滚动到底部
  useEffect(() => {
    if (chatItems.length === 0) return;
    const container = chatListContainerRef.current;
    if (container) {
      // 延迟一小帧确保 DOM 已渲染
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [chatItems.length]);
  // ==================== 打字机效果工具函数 ====================
  const startTypingInterval = useCallback((
    msgId: string,
    getState: () => ReturnType<typeof typingStateMap.current.get>,
    setTick: (fn: (t: number) => number) => void,
    charSpeed: number = 1,
    intervalMs: number = 16
  ) => {
    const intervalId = setInterval(() => {
      const state = getState();
      if (!state) return;
      const newLen = Math.min(state.displayedLength + charSpeed, state.fullText.length);
      state.displayedLength = newLen;
      setTick((t) => t + 1);
      if (newLen >= state.fullText.length) {
        clearInterval(intervalId);
        state.intervalId = null;
      }
    }, intervalMs);
    const state = getState();
    if (state) state.intervalId = intervalId;
  }, []);

  // 终止上一次请求
  const cancelPreviousRequest = useCallback(() => {
    if (abortController) {
      abortController.abort();
    }
  }, [abortController]);

  // SSE 行解析：累积 buffer，处理完整的 event+data 块
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      // 开启对话前必须先选择锚定项目
      if (!projectId) {
        message.warning('请先在左侧「选择项目」中选择报销项目，再开始对话');
        return;
      }

      cancelPreviousRequest();

      // 重置流式状态，防止上次中断遗留
      typingStateMap.current.clear();
      currentStreamingMsgId.current = null;
      currentReasoningMsgId.current = null;
      hasThinkingMessage.current = false;
      hasReasoningMessage.current = false;
      processedToolCalls.current.clear();
      lastToolCallKey.current = null;

      const controller = new AbortController();
      setAbortController(controller);

      // If no session, generate a stable UUID for this new session
      let sessionId = currentSessionId;
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        dispatch(setCurrentSessionId(sessionId));
      }

      dispatch(addUserMessage({ content }));
      setInputValue('');
      dispatch(setChatLoading(true));

      // SSE 解析状态（用 ref 避免闭包问题）
      const pendingEventType = { current: '' };
      const pendingData = { current: '' };

      try {
        const token = localStorage.getItem('token');
        const baseUrl = projectId
          ? `${window.location.protocol}//${window.location.host}/api/v1/projects/${projectId}/agent/chat`
          : `${window.location.protocol}//${window.location.host}/api/v1/agent/chat`;
        const response = await fetch(
          `${baseUrl}?sessionId=${encodeURIComponent(sessionId)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: new URLSearchParams({ message: content }),
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`请求失败 (${response.status}): ${errText}`);
        }

        if (!response.body) throw new Error('响应体为空');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // 累积器：保存不完整的行尾
        let leftover = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // 将新数据追加到累积器
          leftover += decoder.decode(value, { stream: true });

          // 按行分割
          let lines = leftover.split(/\n/);
          // 最后一项可能是未完成的行，保留给下次处理
          leftover = lines.pop() ?? '';

          for (const rawLine of lines) {
            // 去掉可能的 \r
            const line = rawLine.replace(/\r$/, '').trim();

            if (!line) {
              // 空行 → 触发一个完整事件的分发
              if (pendingEventType.current) {
                const raw = pendingData.current.trim();
                if (raw) {
                  try {
                    handleSSEEvent(pendingEventType.current, JSON.parse(raw));
                  } catch {
                    handleSSEEvent(pendingEventType.current, raw);
                  }
                } else {
                  handleSSEEvent(pendingEventType.current, null);
                }
              }
              pendingEventType.current = '';
              pendingData.current = '';
              continue;
            }

            if (line.startsWith('event:')) {
              pendingEventType.current = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              pendingData.current = line.slice(5);
            }
          }
        }

        // 处理流结束时残留在 buffer 中的最后一个事件（可能无尾随空行）
        if (pendingEventType.current) {
          const raw = pendingData.current.trim();
          if (raw) {
            try {
              handleSSEEvent(pendingEventType.current, JSON.parse(raw));
            } catch {
              handleSSEEvent(pendingEventType.current, raw);
            }
          } else {
            handleSSEEvent(pendingEventType.current, null);
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        // 流式内容已实时追加到 Redux，直接添加错误消息
        typingStateMap.current.clear();
        dispatch(addAssistantMessage({ content: `连接失败: ${err.message}` }));
        currentStreamingMsgId.current = null;
        currentReasoningMsgId.current = null;
        hasThinkingMessage.current = false;
        hasReasoningMessage.current = false;
      } finally {
        dispatch(setChatLoading(false));
        setAbortController(null);
        if (projectId) {
          dispatch(fetchAgentSessions(projectId));
        }
      }
    },
    [currentSessionId, projectId, cancelPreviousRequest]
  );

  // 处理键盘提交
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  // 处理快捷指令
  const handleQuickAction = (prompt: string) => {
    sendMessage(prompt);
  };

  // 切换会话
  const handleSelectSession = (sessionId: string) => {
    cancelPreviousRequest();
    dispatch(setCurrentSessionId(sessionId));
    dispatch(clearChatItems());
  };

  // 删除会话
  const handleDeleteSession = async (sessionId: string) => {
    try {
      await dispatch(deleteAgentSession(sessionId)).unwrap();
      if (currentSessionId === sessionId) {
        dispatch(setCurrentSessionId(null));
        dispatch(clearChatItems());
      }
      message.success('会话已删除');
    } catch (err: any) {
      message.error(err.message || '删除失败');
    }
  };

  // New session
  const handleNewSession = async () => {
    cancelPreviousRequest();
    try {
      if (projectId) {
        await dispatch(createAgentSession(projectId)).unwrap();
        await dispatch(fetchAgentSessions(projectId)).unwrap();
      } else {
        // 无项目时，仅创建本地会话
        const newSessionId = crypto.randomUUID();
        dispatch(setCurrentSessionId(newSessionId));
        dispatch(clearChatItems());
      }
    } catch (err: any) {
      message.error(err.message || '创建会话失败');
    }
  };

  // Switch project
  const handleSelectProject = (projectId: number) => {
    if (!projectId) return;
    cancelPreviousRequest();
    dispatch(fetchProjectDetail(projectId));
    dispatch(fetchAgentSessions(projectId));
    dispatch(clearChatItems());
    dispatch(setCurrentSessionId(null));
  };

  // 清空对话
  const handleClearChat = () => {
    cancelPreviousRequest();
    dispatch(clearChatItems());
    dispatch(setChatLoading(false));
  };

  // 处理解析出的事件
  const handleSSEEvent = (eventType: string, rawData: unknown) => {
    switch (eventType) {
      case 'reasoning':
        if (typeof rawData === 'object' && rawData !== null && 'content' in rawData) {
          const content = (rawData as { content: string }).content;
          if (!content) {
            hasReasoningMessage.current = false;
          } else {
            if (hasReasoningMessage.current) {
              // 追加 reasoning 内容：同步到 Redux + 推进打字机动画
              const msgId = currentReasoningMsgId.current!;
              const state = typingStateMap.current.get(msgId);
              const newToken = content;
              if (state) {
                state.fullText += newToken;
                if (state.intervalId === null && state.displayedLength >= state.fullText.length - newToken.length) {
                  startTypingInterval(msgId, () => typingStateMap.current.get(msgId), setTypingRenderTick, 1, 20);
                }
                dispatch(appendReasoningContent(newToken));
              } else {
                dispatch(appendReasoningContent(newToken));
              }
              setTypingRenderTick((t) => t + 1);
            } else {
              // 首次收到 reasoning：创建消息并注册打字状态
              const msgId = `reasoning-${Date.now()}`;
              currentReasoningMsgId.current = msgId;
              dispatch(addReasoningMessage({ id: msgId, content }));
              typingStateMap.current.set(msgId, {
                fullText: content,
                displayedLength: 0,
                intervalId: null,
              });
              startTypingInterval(msgId, () => typingStateMap.current.get(msgId), setTypingRenderTick, 1, 20);
              setTypingRenderTick((t) => t + 1);
              hasReasoningMessage.current = true;
            }
          }
        }
        break;
      case 'thinking':
        if (typeof rawData === 'object' && rawData !== null && 'content' in rawData) {
          if (hasThinkingMessage.current) {
            dispatch(updateLastThinkingMessage((rawData as { content: string }).content));
          } else {
            dispatch(addThinkingMessage({ content: (rawData as { content: string }).content }));
            hasThinkingMessage.current = true;
          }
        }
        break;
      case 'tool_call':
        if (typeof rawData === 'object' && rawData !== null) {
          const d = rawData as { toolIndex?: number; tool?: string; input?: Record<string, unknown> };
          const tool = d.tool || '';
          const idx = d.toolIndex ?? 0;
          const last = lastToolCallKey.current;

          // 同工具 idx 递增：流式参数回调，跳过（不创建新气泡）
          if (last && last.tool === tool && idx > last.idx) {
            lastToolCallKey.current = { tool, idx };
            break;
          }

          // 新工具调用（或 idx 变小 / 工具名变化）：创建气泡
          lastToolCallKey.current = { tool, idx };
          dispatch(
            addToolCallItem({
              toolIndex: idx,
              tool,
              input: d.input || {},
              isExecuting: true,
            })
          );
        }
        break;
      case 'tool_result':
        if (typeof rawData === 'object' && rawData !== null) {
          const d = rawData as { tool?: string; success?: boolean; output?: unknown; error?: string };
          if (d.tool) {
            dispatch(
              updateToolCallResultByToolName({
                tool: d.tool,
                success: d.success ?? false,
                output: d.output,
                error: d.error,
              })
            );
          }
          // 工具执行完成后，清空回复和推理的状态标记
          // 这样下一轮 reasoning/message 到来时会创建全新的气泡
          currentStreamingMsgId.current = null;
          hasReasoningMessage.current = false;
          currentReasoningMsgId.current = null;
        }
        break;
      case 'message':
        if (typeof rawData === 'object' && rawData !== null && 'content' in rawData) {
          const token = (rawData as { content: string }).content;
          if (!token) break;

          // 首次收到 token：创建 assistant 消息并注册打字状态
          if (!currentStreamingMsgId.current) {
            const msgId = `assistant-${Date.now()}`;
            currentStreamingMsgId.current = msgId;
            dispatch(addAssistantMessage({ id: msgId, content: token }));

            typingStateMap.current.set(msgId, {
              fullText: token,
              displayedLength: 0,
              intervalId: null,
            });

            // 启动打字机动画（每 16ms 展示 1 个字符，≈ 60fps 逐字打字）
            startTypingInterval(msgId, () => typingStateMap.current.get(msgId), setTypingRenderTick, 1, 16);

            // 触发 React 重渲染（首次显示内容）
            setTypingRenderTick((t) => t + 1);
          } else {
            // 追加 token：推进打字机动画 + 同步到 Redux（保底）
            const msgId = currentStreamingMsgId.current;
            const state = typingStateMap.current.get(msgId);
            const newToken = token;

            if (state) {
              state.fullText += newToken;

              // interval 触底时重新启动，从断点继续逐字动画
              if (state.intervalId === null && state.displayedLength >= state.fullText.length - newToken.length) {
                startTypingInterval(msgId, () => typingStateMap.current.get(msgId), setTypingRenderTick, 1, 16);
              }

              dispatch(appendAssistantContent(newToken));
            } else {
              dispatch(appendAssistantContent(newToken));
            }
            setTypingRenderTick((t) => t + 1);
          }
        }
        break;
      case 'workflow_todo':
        if (typeof rawData === 'object' && rawData !== null && 'runId' in rawData && 'items' in rawData) {
          const d = rawData as { runId: string; status: WorkflowRunStatus; items: WorkflowTodoItem[] };
          if (Array.isArray(d.items)) {
            dispatch(upsertWorkflowTodoList({ runId: d.runId, status: d.status, items: d.items }));
          }
        }
        break;
      case 'done':
        // 停止所有打字动画，并将最终完整内容写入 Redux
        // 同时标记所有流式 assistant 消息为已完成，触发 markdown 富文本渲染
        typingStateMap.current.forEach((_, msgId) => {
          if (msgId.startsWith('assistant-')) {
            dispatch(setMessageComplete(msgId));
          }
        });
        typingStateMap.current.forEach((state) => {
          if (state.intervalId) clearInterval(state.intervalId);
          if (state.fullText) {
            dispatch(updateAssistantMessageContent(state.fullText));
            // 拦截下载链接，自动触发带 Authorization 头的下载
            const matches = state.fullText.match(DOWNLOAD_URL_RE);
            if (matches) {
              matches.forEach((url) => {
                // 从 URL 末尾提取文件名作为 hint
                const filenameHint = decodeURIComponent(url.split('/').pop()?.split('?')[0] ?? 'download');
                downloadWithAuth(url, filenameHint);
              });
            }
          }
        });
        typingStateMap.current.clear();
        currentStreamingMsgId.current = null;
        currentReasoningMsgId.current = null;
        hasThinkingMessage.current = false;
        hasReasoningMessage.current = false;
        break;
      default:
        break;
    }
  };

  // 渲染聊天项
  const renderChatItem = (item: AgentChatItem) => {
    if (item.role === 'user') {
      return (
        <div key={item.id} className="chat-item chat-item-user">
          <div className="chat-avatar chat-avatar-user">
            <UserOutlined />
          </div>
          <div className="chat-bubble chat-bubble-user">
            <p>{item.content}</p>
          </div>
        </div>
      );
    }

    if (item.toolCall) {
      const isExecuting = !item.toolResult;
      return (
        <div key={item.id} className="chat-item chat-item-assistant">
          <div className="chat-avatar chat-avatar-assistant">
            <RobotOutlined />
          </div>
          <div className="chat-content-wrapper">
            <div className="chat-tool-call">
              <div className="tool-call-header">
                <span className="tool-call-icon">⚙️</span>
                <span className="tool-call-label">
                  {isExecuting
                    ? `工具调用中：${TOOL_LABELS[item.toolCall.tool] || item.toolCall.tool}`
                    : `${TOOL_LABELS[item.toolCall.tool] || item.toolCall.tool}`}
                </span>
              </div>
              {isExecuting && (
                <div className="tool-call-executing">
                  <Spin size="small" />
                  <span>执行中...</span>
                </div>
              )}
            </div>
              {item.toolResult && (
                <div
                  className={`chat-tool-result ${
                    item.toolResult.success ? 'tool-result-success' : 'tool-result-error'
                  }`}
                >
                  {item.toolResult.success ? '执行成功' : '执行失败'}
                  {item.toolResult.output !== undefined && (
                    <pre className="tool-result-output">
                      {typeof item.toolResult.output === 'string'
                        ? item.toolResult.output
                        : JSON.stringify(item.toolResult.output, null, 2)}
                    </pre>
                  )}
                  {item.toolResult.error && (
                    <span className="tool-result-error-msg">{item.toolResult.error}</span>
                  )}
                </div>
              )}
          </div>
        </div>
      );
    }

    if (item.workflowTodos) {
      return (
        <div key={item.id} className="chat-item chat-item-assistant">
          <div className="chat-avatar chat-avatar-assistant">
            <RobotOutlined />
          </div>
          <div className="chat-content-wrapper">
            <WorkflowTodoCard items={item.workflowTodos} status={item.workflowStatus} />
          </div>
        </div>
      );
    }

    if (item.isReasoning) {
      const reasoningDisplayed = typingStateMap.current.has(item.id)
        ? item.content.slice(0, typingStateMap.current.get(item.id)!.displayedLength)
        : item.content;
      return (
        <div key={item.id} className="chat-item chat-item-assistant">
          <div className="chat-avatar chat-avatar-assistant">
            <RobotOutlined />
          </div>
          <div className="chat-bubble chat-bubble-reasoning">
            <span className="reasoning-label">🤔 思考中...</span>
            <pre className="reasoning-text">{reasoningDisplayed}</pre>
          </div>
        </div>
      );
    }

    if (item.isThinking) {
      return (
        <div key={item.id} className="chat-item chat-item-assistant">
          <div className="chat-avatar chat-avatar-assistant">
            <RobotOutlined />
          </div>
          <div className="chat-bubble chat-bubble-thinking">
            <Spin size="small" />
            <span className="thinking-text">{item.content}</span>
          </div>
        </div>
      );
    }

    // 普通 assistant 回复（流式内容已实时追加到 Redux，使用打字机效果显示）
    const displayedContent = typingStateMap.current.has(item.id)
      ? item.content.slice(0, typingStateMap.current.get(item.id)!.displayedLength)
      : item.content;
    return (
      <div key={item.id} className="chat-item chat-item-assistant">
        <div className="chat-avatar chat-avatar-assistant">
          <RobotOutlined />
        </div>
        <div className="chat-bubble chat-bubble-assistant">
          <MessageRenderer content={displayedContent} className="message-text" />
        </div>
      </div>
    );
  };

  const invoiceCount = currentProject?.confirmedCount ?? 0;
  const unconfirmedCount = currentProject?.unconfirmedCount ?? 0;

  return (
    <div className="agent-chat-page">
      {/* 左侧边栏 */}
      <aside className="agent-sidebar">
        <div className="sidebar-header">
          <Text strong className="sidebar-title">会话列表</Text>
          <Button
            type="text"
            icon={<PlusOutlined />}
            size="small"
            onClick={handleNewSession}
            disabled={!projectId}
            title={projectId ? '新建会话' : '请先选择报销项目'}
          >
            新建对话
          </Button>
        </div>

        <div className="sidebar-sessions">
          <Spin spinning={sessionsLoading}>
            <List
              size="small"
              dataSource={sessions}
              locale={{ emptyText: '暂无会话记录' }}
              renderItem={(session) => (
                <List.Item
                  className={`session-item ${
                    session.sessionId === currentSessionId ? 'session-item-active' : ''
                  }`}
                  onClick={() => handleSelectSession(session.sessionId)}
                  actions={[
                    <Popconfirm
                      key="delete"
                      title="确定删除此会话？"
                      onConfirm={(e) => {
                        e?.stopPropagation();
                        handleDeleteSession(session.sessionId);
                      }}
                      okText="删除"
                      cancelText="取消"
                      okButtonProps={{ danger: true }}
                    >
                      <DeleteOutlined
                        className="session-delete-btn"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <span className="session-title">
                        {session.lastMessage || '新会话'}
                        {session.status === 0 && (
                          <Badge status="processing" className="session-badge" />
                        )}
                      </span>
                    }
                    description={
                      <span className="session-time">
                        {dayjs(session.updatedAt).format('MM-DD HH:mm')}
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          </Spin>
        </div>

        {/* Project selector */}
        <div className="sidebar-bottom">
          <div className="sidebar-project-selector">
            <Text strong className="sidebar-title">选择项目</Text>
            <Select
              placeholder="请选择报销项目"
              value={currentProject?.id}
              onChange={handleSelectProject}
              loading={projectsLoading}
              className="project-select"
              allowClear
              onClear={() => {
                dispatch({ type: 'project/clearCurrentProject' });
                dispatch(clearChatItems());
                dispatch(setCurrentSessionId(null));
              }}
              options={projects.map(p => ({
                value: p.id,
                label: p.name,
              }))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Project info card */}
          {currentProject ? (
            <div className="sidebar-project-card">
              <div className="project-card-title">📋 项目信息</div>
              <div className="project-card-content">
                <div className="project-info-row">
                  <span className="project-info-label">项目:</span>
                  <span className="project-info-value">{currentProject.name}</span>
                </div>
                <div className="project-info-row">
                  <span className="project-info-label">人员:</span>
                  <span className="project-info-value">{currentProject.person || '-'}</span>
                </div>
                <div className="project-info-row">
                  <span className="project-info-label">日期:</span>
                  <span className="project-info-value">
                    {currentProject.startDate && currentProject.endDate
                      ? `${dayjs(currentProject.startDate).format('MM/DD')} - ${dayjs(currentProject.endDate).format('MM/DD')}`
                      : '-'}
                  </span>
                </div>
                <div className="project-info-row">
                  <span className="project-info-label">预算:</span>
                  <span className="project-info-value">{currentProject.budget || '-'}</span>
                </div>
                <div className="project-info-row">
                  <span className="project-info-label">发票:</span>
                  <span className="project-info-value">
                    {invoiceCount} 份已确认 / {unconfirmedCount} 份待识别
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="sidebar-project-card">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请从上方选择报销项目" />
            </div>
          )}

          {/* 快捷指令 */}
          <div className="sidebar-quick-actions">
            <div className="quick-actions-title">💡 快捷指令</div>
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.key}
                type="text"
                icon={action.icon}
                className="quick-action-btn"
                onClick={() => handleQuickAction(action.prompt)}
                disabled={!projectId}
                block
              >
                {action.label}
              </Button>
            ))}
          </div>

          {/* 返回按钮 */}
          <div className="sidebar-footer">
            <Button
              type="text"
              icon={<FileTextOutlined />}
              className="back-btn"
              onClick={() => navigate('/archive')}
            >
              返回项目
            </Button>
          </div>
        </div>
      </aside>

      {/* 主对话区 */}
      <main className="agent-chat-main">
        <div className="chat-header">
          <div className="chat-header-left">
            <RobotOutlined className="chat-header-icon" />
            <span className="chat-header-title">AI 报销助手</span>
            {currentProject && (
              <span style={{ marginLeft: 12, fontSize: 13, color: '#52c41a' }}>
                📌 当前项目：{currentProject.name}
              </span>
            )}
          </div>
          <div className="chat-header-right">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              size="small"
              onClick={handleClearChat}
              disabled={chatItems.length === 0}
            >
              清空对话
            </Button>
          </div>
        </div>

        <div className="chat-messages" ref={chatListContainerRef}>
          {!projectId && (
            <Alert
              type="info"
              showIcon
              message="请先选择报销项目"
              description="在左侧「选择项目」下拉框中选择一个报销项目后，才能开启对话。对话将锚定该项目，一键报销等操作会自动针对当前项目执行。"
              style={{ margin: '12px 16px 0' }}
            />
          )}
          <div className="chat-list-container">
            <div className="chat-list">
              {chatItems.map(renderChatItem)}
            </div>
          </div>
          {chatLoading && (
            <div className="chat-loading-indicator">
              <Spin size="small" />
              <Text type="secondary" className="loading-text">AI 正在处理中...</Text>
            </div>
          )}
        </div>

        <div className="chat-input-area">
          <TextArea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={projectId ? '请输入消息，Enter 发送，Shift+Enter 换行...' : '请先在左侧「选择项目」中选择报销项目，再开始对话...'}
            autoSize={{ minRows: 1, maxRows: 4 }}
            className="chat-input"
            disabled={!projectId || chatLoading}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={() => sendMessage(inputValue)}
            disabled={!projectId || !inputValue.trim() || chatLoading}
            className="chat-send-btn"
          >
            发送
          </Button>
        </div>
      </main>
    </div>
  );
};
