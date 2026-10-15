// ============================================================
// 后端 API 类型（与后端字段名完全对齐）
// ============================================================

// 统一响应包装
export interface ApiResponse<T> {
  code: number;
  message: string;
  data?: T;
}

export interface PageResult<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

// ============================================================
// 1. 项目管理
// ============================================================

export interface ProjectVO {
  id: number;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  reason: string;
  person: string;
  department: string;
  budget: string; // 预算项目名称（文本）
  remark: string;
  status: number; // 0=待处理, 1=已完成
  statusName: string;
  totalAmount: number;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetailVO extends ProjectVO {
  confirmedCount: number;
  unconfirmedCount: number;
  folderStructure: {
    folders: FolderVO[];
  };
  folders: FolderVO[];
}

export interface CreateProjectDTO {
  name: string;
  destination: string;
  person: string;
  startDate: string;
  endDate: string;
  budget: string;
  reason?: string;
  department?: string;
  remark?: string;
}

export interface UpdateProjectDTO extends CreateProjectDTO {
  status?: number;
}

// ============================================================
// 2. 文件管理
// ============================================================

// AI 识别结果（扁平化结构）
export interface RecognitionResultVO {
  id: number;
  projectId: number;
  fileId: number;
  type: string;
  expenseType: string;
  expenseTypeName: string;
  aiFilename: string;
  description: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  seller: string;
  buyer: string;
  consumptionCount: string;
  consumptionDate: string;
  totalConsumption: number;
  confidence: number;
  confidencePercent: number;
  createdAt: string;
  updatedAt: string;
}

// 文件 VO
export interface FileVO {
  id: number;
  projectId: number;
  folderId: number;
  name: string;
  originalName: string;
  size: number;
  sizeDisplay: string;
  type: string; // invoice / screenshot / attachment
  typeName: string;
  mimeType: string;
  status: number;
  statusName: string;
  remark: string | null;
  confirmed: number; // 0=未确认, 1=已确认
  createdAt: string;
  updatedAt: string;
  recognitionResult: RecognitionResultVO | null;
}

// 文件更新 DTO
export interface FileUpdateDTO {
  remark?: string;
  confirmed?: number;
  expenseType?: string;
  aiFilename?: string;
  description?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  seller?: string;
  buyer?: string;
  totalAmount?: number;
  consumptionCount?: string;
  consumptionDate?: string;
  totalConsumption?: number;
  confidence?: number;
}

// 批量识别任务
export interface BatchRecognizeTaskVO {
  taskId: string;
  projectId: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total: number;
  processed: number;
  progress: number;
  errorMessage: string | null;
  results: BatchFileResult[];
}

export interface BatchFileResult {
  fileId: number;
  fileName: string;
  status: 'success' | 'failed';
  data: RecognitionResultVO | null;
  error: string | null;
}

// ============================================================
// 3. 文件夹管理
// ============================================================

export interface FolderVO {
  id: number;
  projectId: number;
  name: string;
  type: string; // invoice / screenshot / attachment
  parentId: number | null;
  sortOrder: number;
  fileCount: number;
  children: FolderVO[];
  createdAt: string;
  updatedAt: string;
}

export interface FolderDTO {
  name: string;
  type?: string;
  parentId?: number;
  sortOrder?: number;
}

// ============================================================
// 4. 报表管理
// ============================================================

// 报表明细 DTO
export interface ReportItemDTO {
  date: string;
  receiptType: string;
  hasReceipt: number;
  receiptFile: string;
  amount: number;
  summary?: string;
  remark?: string;
  receiptFileId?: number;
}

// 报表明细 VO
export interface ReportItemVO {
  id: number;
  projectId: number;
  date: string;
  receiptType: string;
  receiptTypeName: string;
  expenseType: string;
  expenseTypeName: string;
  summary: string;
  amount: number;
  remark: string;
  hasReceipt: number;
  receiptFile: string;
  receiptFileId: number;
  receiptFileName: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// 5. 全局设置
// ============================================================

export interface SettingsVO {
  appName: string;
  autoRecognize: boolean;
  autoArchive: boolean;
  notifications: boolean;
  invoiceMaxSize: number;
  screenshotMaxSize: number;
  attachmentMaxSize: number;
}

export interface SettingsUpdateDTO {
  appName?: string;
  autoRecognize?: boolean;
  autoArchive?: boolean;
  notifications?: boolean;
}

// ============================================================
// 前端内部类型（独立于 API）
// ============================================================

// 出差信息类型
export interface TravelInfo {
  id?: string;
  projectName?: string;
  destination: string;
  startDate: string;
  endDate: string;
  reason: string;
  person: string;
  department: string;
  budget?: string;
  remark?: string;
}

// 报销报表类型
export interface ReportItem {
  id: string;
  date: string;
  receiptType: string;
  expenseType?: string;
  customerName?: string;
  receiptNumber: string;
  summary: string;
  amount: number;
  remark?: string;
  hasReceipt?: boolean;
  receiptFile?: string;
}

export interface ReportData {
  travelInfo: TravelInfo;
  items: ReportItem[];
  totalAmount: number;
  createdAt: string;
}

// 报销项目（前端内部使用）
export interface ReimbursementProject {
  id: string;
  name: string;
  travelInfo: TravelInfo;
  folderStructure: FolderStructure;
  files: UploadFile[];
  createdAt: string;
  updatedAt: string;
}

// 文件夹结构定义
export interface FolderStructure {
  folders: FolderItem[];
}

// 文件夹项
export interface FolderItem {
  id: string;
  name: string;
  type: 'folder' | 'invoice' | 'screenshot' | 'attachment';
  children?: FolderItem[];
  files?: string[];
}

// 历史报销项目（用于选择器）
export interface HistoricalProject {
  id: string;
  name: string;
  createdAt: string;
  totalAmount: number;
  fileCount: number;
}

// 上传相关类型
export interface UploadFile {
  id: string;
  name: string;
  originalName?: string;
  size: number;
  type: 'invoice' | 'screenshot' | 'attachment';
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress?: number;
  url?: string;
  file?: File;
  metadata?: Record<string, any>;
  createdAt: string;
  recognitionData?: InvoiceRecognitionData | ScreenshotRecognitionData;
  recognitionStatus?: 'pending' | 'recognizing' | 'success' | 'failed';
  recognitionConfidence?: number;
  customFileName?: string;
  remark?: string;
  confirmed?: boolean;
}

// 发票识别结果（前端内部使用）
export interface InvoiceRecognitionData {
  type: string;
  expenseType?: string;
  invoiceNumber: string;
  invoiceDate: string;
  seller: string;
  buyer: string;
  amount: number;
  taxAmount?: number;
  aiFilename?: string;
  description?: string;
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

// 截图识别结果（前端内部使用）
export interface ScreenshotRecognitionData {
  type: string;
  expenseType: string;
  count: string;
  startDate: string;
  endDate?: string;
  amount: number;
  aiFilename?: string;
  description?: string;
}

// 文件夹归档类型
export interface ArchiveFolder {
  id: string;
  name: string;
  path: string;
  travelInfo: TravelInfo;
  files: {
    invoices: UploadFile[];
    screenshots: UploadFile[];
    attachments: UploadFile[];
    recognitionResults: RecognitionResultVO[];
    excelReport?: UploadFile;
  };
  createdAt: string;
}

// 筛选类型
export interface FilterState {
  type?: 'invoice' | 'screenshot' | 'attachment' | 'all';
  dateRange?: [string, string];
  status?: 'pending' | 'success' | 'error' | 'all';
  search?: string;
}

// 文件类型别名 (兼容旧代码)
export type FileItem = UploadFile;

// 发票类型枚举
export type InvoiceType =
  | 'vat_special'
  | 'vat_normal'
  | 'electronic'
  | 'taxi'
  | 'train'
  | 'airplane'
  | 'hotel'
  | 'restaurant';

// 票据类型枚举
export type ReceiptType =
  | 'transport'
  | 'catering'
  | 'accommodation'
  | 'purchase';

// ============================================================
// 6. AI Agent 对话
// ============================================================

// SSE 事件类型
export type AgentEventType = 'thinking' | 'reasoning' | 'tool_call' | 'tool_result' | 'message' | 'done' | 'error' | 'workflow_todo';

// SSE 事件数据
export interface AgentThinkingEvent {
  type: 'thinking';
  data: { content: string };
}

export interface AgentReasoningEvent {
  type: 'reasoning';
  data: { content: string };
}

export interface AgentToolCallEvent {
  type: 'tool_call';
  data: { toolIndex: number; tool: string; input: Record<string, unknown> };
}

export interface AgentToolResultEvent {
  type: 'tool_result';
  data: { toolIndex: number; tool: string; success: boolean; output?: unknown; error?: string };
}

export interface AgentMessageEvent {
  type: 'message';
  data: { content: string };
}

export interface AgentDoneEvent {
  type: 'done';
  data: { summary: string };
}

export interface AgentErrorEvent {
  type: 'error';
  data: { message: string };
}

// 一键报销工作流 TodoList 进度
export type WorkflowTodoStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export interface WorkflowTodoItem {
  key: string;
  label: string;
  status: WorkflowTodoStatus;
  message?: string;
}

export type WorkflowRunStatus = 'running' | 'completed' | 'failed';

export interface AgentWorkflowTodoEvent {
  type: 'workflow_todo';
  data: { runId: string; status: WorkflowRunStatus; items: WorkflowTodoItem[] };
}

export type AgentSSEEvent =
  | AgentThinkingEvent
  | AgentReasoningEvent
  | AgentToolCallEvent
  | AgentToolResultEvent
  | AgentMessageEvent
  | AgentDoneEvent
  | AgentErrorEvent
  | AgentWorkflowTodoEvent;

// 会话消息
export interface AgentMessageVO {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// 会话列表项
export interface AgentSessionVO {
  id: number;
  sessionId: string;
  projectId: number;
  status: number;
  statusName: string;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

// 会话详情
export interface AgentSessionDetailVO {
  sessionId: string;
  projectId: number;
  status: number;
  statusName: string;
  messages: AgentMessageVO[];
  createdAt: string;
  updatedAt: string;
}

// Agent 对话项（前端 UI 渲染用）
export interface AgentChatItem {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCall?: { toolIndex: number; tool: string; input: Record<string, unknown> };
  toolResult?: { success: boolean; output?: unknown; error?: string; isExecuting?: boolean };
  isThinking?: boolean;
  isReasoning?: boolean;
  timestamp?: string;
  /** 消息内容是否已渲染完成（用于判断是否走 markdown 富文本渲染） */
  isComplete?: boolean;
  /** 一键报销工作流进度卡片：同一 runId 的事件更新同一条对话项 */
  workflowRunId?: string;
  workflowTodos?: WorkflowTodoItem[];
  workflowStatus?: WorkflowRunStatus;
}
