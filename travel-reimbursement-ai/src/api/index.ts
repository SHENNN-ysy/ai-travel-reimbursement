/**
 * 统一 API 调用层
 * 基于接口文档 v1.1.0 (2026-05-04)
 * 后端服务: 通过 VITE_API_BASE_URL 环境变量配置，默认 /api/v1（由 Nginx 反向代理到后端）
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// ==================== 认证 Token ====================

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ==================== 通用工具 ====================

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('登录已过期，请重新登录');
  }

  const result = await response.json();

  if (result.code !== 200) {
    throw new Error(result.message || `请求失败 (code: ${result.code})`);
  }

  return result.data as T;
}

// ==================== API 响应类型 ====================

export interface PageResult<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

// ==================== 1. 项目管理 (/projects) ====================

// --- 请求 DTO ---

export interface CreateProjectDTO {
  name: string;
  destination: string;
  person: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  budget: string;
  reason?: string;
  department?: string;
  remark?: string;
}

export interface UpdateProjectDTO extends CreateProjectDTO {
  status?: number; // 0=待处理, 1=已完成
}

// --- 响应 VO ---

export interface ProjectVO {
  id: number;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  reason: string;
  person: string;
  department: string;
  budget: string;
  remark: string;
  status: number;
  statusName: string;
  totalAmount: number;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}

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

export interface ProjectDetailVO extends ProjectVO {
  confirmedCount: number;
  unconfirmedCount: number;
  folderStructure: {
    folders: FolderVO[];
  };
  folders: FolderVO[];
}

/**
 * 1.1 创建项目
 * POST /projects
 */
export function createProject(data: CreateProjectDTO): Promise<ProjectVO> {
  return request('/projects', { method: 'POST', body: JSON.stringify(data) });
}

/**
 * 1.2 分页查询项目列表
 * GET /projects?current=1&size=10&name=&status=
 */
export function getProjectPage(params: {
  current?: number;
  size?: number;
  name?: string;
  status?: number;
}): Promise<PageResult<ProjectVO>> {
  const sp = new URLSearchParams();
  if (params.current !== undefined) sp.set('current', String(params.current));
  if (params.size !== undefined) sp.set('size', String(params.size));
  if (params.name) sp.set('name', params.name);
  if (params.status !== undefined) sp.set('status', String(params.status));
  const qs = sp.toString();
  return request(`/projects${qs ? `?${qs}` : ''}`);
}

/**
 * 1.3 获取项目详情
 * GET /projects/{id}
 */
export function getProjectDetail(id: number): Promise<ProjectDetailVO> {
  return request(`/projects/${id}`);
}

/**
 * 1.4 更新项目
 * PUT /projects/{id}
 */
export function updateProject(id: number, data: UpdateProjectDTO): Promise<ProjectVO> {
  return request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

/**
 * 1.5 删除项目
 * DELETE /projects/{id}
 */
export function deleteProject(id: number): Promise<void> {
  return request(`/projects/${id}`, { method: 'DELETE' });
}

// ==================== 2. 文件管理 (/projects/{projectId}/files) ====================

// --- AI 识别结果 (扁平化结构) ---
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

// --- FileVO ---
export interface FileVO {
  id: number;
  projectId: number;
  folderId: number;
  name: string;
  originalName: string;
  size: number;
  sizeDisplay: string;
  type: string;
  typeName: string;
  mimeType: string;
  status: number;
  statusName: string;
  remark: string | null;
  confirmed: number;
  createdAt: string;
  updatedAt: string;
  recognitionResult: RecognitionResultVO | null;
}

// --- FileUpdateDTO ---
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

/**
 * 2.1 上传文件
 * POST /projects/{projectId}/files/upload
 */
export async function uploadFile(
  projectId: number,
  file: File,
  type: 'invoice' | 'screenshot' | 'attachment' = 'attachment',
  folderId?: number
): Promise<FileVO> {
  const formData = new FormData();
  formData.append('file', file);
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const query = folderId !== undefined
    ? `?type=${type}&folderId=${folderId}`
    : `?type=${type}`;
  const response = await fetch(`${BASE_URL}/projects/${projectId}/files/upload${query}`, {
    method: 'POST',
    body: formData,
    headers,
  });
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('登录已过期，请重新登录');
  }
  const res = await response.json();
  if (res.code !== 200) throw new Error(res.message);
  return res.data as FileVO;
}

/**
 * 2.2 获取文件信息
 * GET /projects/{projectId}/files/{fileId}
 */
export function getFile(projectId: number, fileId: number): Promise<FileVO> {
  return request(`/projects/${projectId}/files/${fileId}`);
}

/**
 * 4.1 获取文件列表（报表页面数据源）
 * GET /projects/{projectId}/files?current=1&size=50&type=&expenseType=
 */
export function getFileList(params: {
  projectId: number;
  current?: number;
  size?: number;
  type?: string;
  expenseType?: string;
}): Promise<PageResult<FileVO>> {
  const sp = new URLSearchParams();
  if (params.current !== undefined) sp.set('current', String(params.current));
  if (params.size !== undefined) sp.set('size', String(params.size));
  if (params.type) sp.set('type', params.type);
  if (params.expenseType) sp.set('expenseType', params.expenseType);
  const qs = sp.toString();
  return request(`/projects/${params.projectId}/files${qs ? `?${qs}` : ''}`);
}

/**
 * 2.3 更新文件（识别结果/备注/确认状态）
 * PATCH /projects/{projectId}/files/{fileId}
 */
export function updateFile(
  projectId: number,
  fileId: number,
  data: FileUpdateDTO
): Promise<FileVO> {
  return request(`/projects/${projectId}/files/${fileId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * 2.4 删除文件
 * DELETE /projects/{projectId}/files/{fileId}
 */
export function deleteFile(projectId: number, fileId: number): Promise<void> {
  return request(`/projects/${projectId}/files/${fileId}`, { method: 'DELETE' });
}

/**
 * 2.5 单文件AI识别
 * POST /projects/{projectId}/files/{fileId}/recognize
 */
export function recognizeFile(
  projectId: number,
  fileId: number
): Promise<RecognitionResultVO> {
  return request(`/projects/${projectId}/files/${fileId}/recognize`, {
    method: 'POST',
  });
}

// ==================== 2.6 批量识别 ====================

export interface BatchRecognizeRequestDTO {
  fileIds: number[];
}

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

/**
 * 2.6 提交批量识别任务
 * POST /projects/{projectId}/files/batch/recognize
 */
export function submitBatchRecognize(
  projectId: number,
  fileIds: number[]
): Promise<BatchRecognizeTaskVO> {
  return request(`/projects/${projectId}/files/batch/recognize`, {
    method: 'POST',
    body: JSON.stringify({ fileIds }),
  });
}

/**
 * 2.6 查询批量识别任务进度
 * GET /projects/{projectId}/files/batch/recognize/{taskId}/progress
 */
export function getBatchRecognizeProgress(
  projectId: number,
  taskId: string
): Promise<BatchRecognizeTaskVO> {
  return request(`/projects/${projectId}/files/batch/recognize/${taskId}/progress`);
}

// ==================== 2.7 批量确认 ====================

/**
 * 2.7 批量确认文件
 * POST /projects/{projectId}/files/batch/confirm
 * 确认成功后自动创建报表明细
 */
export function batchConfirmFiles(
  projectId: number,
  fileIds: number[]
): Promise<FileVO[]> {
  return request(`/projects/${projectId}/files/batch/confirm`, {
    method: 'POST',
    body: JSON.stringify(fileIds),
  });
}

/**
 * 2.8 取消确认
 * PATCH /projects/{projectId}/files/{fileId}/unconfirm
 * 将文件确认状态改为未确认（confirmed=0），识别状态改为待识别（pending）
 */
export function unconfirmFile(
  projectId: number,
  fileId: number
): Promise<FileVO> {
  return request(`/projects/${projectId}/files/${fileId}/unconfirm`, {
    method: 'PATCH',
  });
}

/**
 * 2.9 下载文件
 * GET /projects/{projectId}/files/{fileId}/download
 * 返回文件二进制流，用于图片/PDF 预览
 */
export async function downloadFile(
  projectId: number,
  fileId: number
): Promise<Blob> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const url = `${BASE_URL}/projects/${projectId}/files/${fileId}/download`;
  const response = await fetch(url, { headers });
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('登录已过期，请重新登录');
  }
  if (!response.ok) throw new Error('文件下载失败');
  return response.blob();
}

// ==================== 3. 文件夹管理 ====================

export interface FolderDTO {
  name: string;
  type?: string;
  parentId?: number;
  sortOrder?: number;
}

/**
 * 3.1 获取文件夹树
 * GET /projects/{projectId}/folders
 */
export function getFolderTree(projectId: number): Promise<FolderVO[]> {
  return request(`/projects/${projectId}/folders`);
}

/**
 * 3.2 创建文件夹
 * POST /projects/{projectId}/folders
 */
export function createFolder(
  projectId: number,
  data: FolderDTO
): Promise<FolderVO> {
  return request(`/projects/${projectId}/folders`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 3.3 更新文件夹
 * PUT /projects/{projectId}/folders/{id}
 */
export function updateFolder(
  projectId: number,
  folderId: number,
  data: FolderDTO
): Promise<FolderVO> {
  return request(`/projects/${projectId}/folders/${folderId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * 3.4 删除文件夹
 * DELETE /projects/{projectId}/folders/{id}
 */
export function deleteFolder(projectId: number, folderId: number): Promise<void> {
  return request(`/projects/${projectId}/folders/${folderId}`, {
    method: 'DELETE',
  });
}

// ==================== 4. 报表管理 ====================

// --- ReportItemDTO ---
export interface ReportItemDTO {
  date: string; // YYYY-MM-DD
  receiptType: string; // 票据类型：发票 / 截图
  expenseType: string; // 消费类型：transport / catering / accommodation / purchase
  hasReceipt: number; // 0=无, 1=有
  receiptFile: string;
  amount: number;
  summary?: string;
  remark?: string;
  receiptFileId?: number;
}

// --- ReportItemVO ---
export interface ReportItemVO {
  id: number;
  projectId: number;
  date: string;
  receiptType: string; // 票据类型：发票 / 截图
  receiptTypeName: string;
  expenseType: string; // 消费类型：transport / catering / accommodation / purchase
  expenseTypeName: string; // 消费类型中文名
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

/**
 * 4.2 添加报表明细
 * POST /projects/{projectId}/reports/items
 */
export function createReportItem(
  projectId: number,
  data: ReportItemDTO
): Promise<ReportItemVO> {
  return request(`/projects/${projectId}/reports/items`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * 4.3 更新报表明细
 * PUT /projects/{projectId}/reports/items/{itemId}
 */
export function updateReportItem(
  projectId: number,
  itemId: number,
  data: ReportItemDTO
): Promise<ReportItemVO> {
  return request(`/projects/${projectId}/reports/items/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * 4.4 删除报表明细
 * DELETE /projects/{projectId}/reports/items/{itemId}
 */
export function deleteReportItem(
  projectId: number,
  itemId: number
): Promise<void> {
  return request(`/projects/${projectId}/reports/items/${itemId}`, {
    method: 'DELETE',
  });
}

/**
 * 4.1 获取报表明细列表（全部，不分页）
 * GET /projects/{projectId}/reports/items/all
 */
export function getReportItems(projectId: number, receiptType?: string): Promise<ReportItemVO[]> {
  const sp = new URLSearchParams();
  if (receiptType) sp.set('receiptType', receiptType);
  const qs = sp.toString();
  return request(`/projects/${projectId}/reports/items/all${qs ? `?${qs}` : ''}`);
}

/**
 * 4.6 导出 Excel 报销单
 * GET /projects/{projectId}/reports/export
 */
export async function exportReportExcel(projectId: number, fileName: string) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const url = `${BASE_URL}/projects/${projectId}/reports/export`;
  const response = await fetch(url, { headers });
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('登录已过期，请重新登录');
  }
  if (!response.ok) throw new Error('导出失败');

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}

/**
 * 1.6 导出报销项目（打包下载）
 * GET /projects/{projectId}/export-package
 */
export async function exportProjectPackage(projectId: number, fileName: string) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const url = `${BASE_URL}/projects/${projectId}/export-package`;
  const response = await fetch(url, { headers });
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('登录已过期，请重新登录');
  }
  if (!response.ok) throw new Error('导出失败');

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}

// ==================== 4. AI 识别 ====================

/**
 * 5.1 自动识别文件
 * POST /ai/recognize/auto?fileId=&type=
 */
export function autoRecognize(
  fileId: number,
  type: 'invoice' | 'screenshot' = 'invoice'
): Promise<RecognitionResultVO> {
  return request(`/ai/recognize/auto?fileId=${fileId}&type=${type}`, {
    method: 'POST',
  });
}

// ==================== 5. 全局设置 ====================

export interface SettingsUpdateDTO {
  appName?: string;
  autoRecognize?: boolean;
  autoArchive?: boolean;
  notifications?: boolean;
}

export interface SettingsVO {
  appName: string;
  autoRecognize: boolean;
  autoArchive: boolean;
  notifications: boolean;
  invoiceMaxSize: number;
  screenshotMaxSize: number;
  attachmentMaxSize: number;
}

/**
 * 6.1 获取全局设置
 * GET /settings
 */
export function getSettings(): Promise<SettingsVO> {
  return request('/settings');
}

/**
 * 6.2 更新全局设置
 * PUT /settings
 */
export function updateSettings(data: SettingsUpdateDTO): Promise<SettingsVO> {
  return request('/settings', { method: 'PUT', body: JSON.stringify(data) });
}

// ==================== 7. Agent 对话模块 (/projects/{projectId}/agent) ====================

// --- SSE 事件类型 ---
export type AgentEventType = 'thinking' | 'tool_call' | 'tool_result' | 'message' | 'done' | 'error' | 'workflow_todo';

// --- SSE 事件数据 ---
export interface AgentThinkingEvent {
  type: 'thinking';
  data: { content: string };
}

export interface AgentToolCallEvent {
  type: 'tool_call';
  data: { tool: string; input: Record<string, unknown> };
}

export interface AgentToolResultEvent {
  type: 'tool_result';
  data: { tool: string; success: boolean; output?: unknown; error?: string };
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

export type AgentSSEEvent =
  | AgentThinkingEvent
  | AgentToolCallEvent
  | AgentToolResultEvent
  | AgentMessageEvent
  | AgentDoneEvent
  | AgentErrorEvent;

// --- 会话消息 ---
export interface AgentMessageVO {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// --- 会话列表项 ---
export interface AgentSessionVO {
  sessionId: string;
  projectId: number;
  status: number; // 0=活跃, 1=已完成
  statusName: string;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

// --- 会话详情 ---
export interface AgentSessionDetailVO {
  sessionId: string;
  projectId: number;
  status: number;
  statusName: string;
  messages: AgentMessageVO[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 7.1 发送消息并获取 SSE 流（使用 EventSource API）
 * POST /projects/{projectId}/agent/chat?sessionId=&message=
 *
 * 返回 EventSource，可监听事件类型：thinking / tool_call / tool_result / message / done / error
 */
export function createAgentChatSSE(
  projectId: number,
  sessionId: string,
  message: string
): EventSource {
  const params = new URLSearchParams({ sessionId, message });
  const url = `${BASE_URL}/projects/${projectId}/agent/chat?${params.toString()}`;
  return new EventSource(url);
}

/**
 * 7.1 新建会话
 * POST /projects/{projectId}/agent/sessions
 * 返回新建的 sessionId
 */
export function createAgentSession(projectId: number): Promise<string> {
  return request(`/projects/${projectId}/agent/sessions`, {
    method: 'POST',
  });
}

/**
 * 7.2 获取会话列表
 * GET /projects/{projectId}/agent/sessions
 */
export function getAgentSessions(projectId: number): Promise<AgentSessionVO[]> {
  return request(`/projects/${projectId}/agent/sessions`);
}

/**
 * 7.3 获取会话历史（某sessionId下所有对话，按时间正序）
 * GET /projects/{projectId}/agent/sessions/{sessionId}
 */
export function getAgentSessionDetail(
  sessionId: string
): Promise<AgentMessageVO[]> {
  return request(`/projects/0/agent/sessions/${sessionId}`);
}

/**
 * 7.4 删除会话
 * DELETE /projects/{projectId}/agent/sessions/{sessionId}
 */
export function deleteAgentSession(sessionId: string): Promise<void> {
  return request(`/projects/0/agent/sessions/${sessionId}`, {
    method: 'DELETE',
  });
}
