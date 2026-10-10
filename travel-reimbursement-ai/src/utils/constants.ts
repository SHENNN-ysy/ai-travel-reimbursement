// 发票文件上传配置
export const INVOICE_CONFIG = {
  acceptTypes: ['pdf', 'jpg', 'jpeg', 'png'],
  maxSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 20,
};

// 截图上传配置
export const SCREENSHOT_CONFIG = {
  acceptTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  maxSize: 5 * 1024 * 1024, // 5MB
  maxFiles: 30,
  thumbnailSize: 200,
};

// 附加材料上传配置
export const ATTACHMENT_CONFIG = {
  acceptTypes: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'zip'],
  maxSize: 20 * 1024 * 1024, // 20MB
  maxFiles: 10,
};

// 票据类型选项
export const RECEIPT_TYPE_OPTIONS = [
  { value: 'transport', label: '交通' },
  { value: 'catering', label: '餐饮' },
  { value: 'accommodation', label: '住宿' },
  { value: 'purchase', label: '采购' },
];

// 消费类型选项（用于发票和截图识别）
export const EXPENSE_TYPE_OPTIONS = [
  { value: 'transport', label: '交通' },
  { value: 'catering', label: '餐饮' },
  { value: 'accommodation', label: '住宿' },
  { value: 'purchase', label: '采购' },
];

// 发票类型选项
export const INVOICE_TYPE_OPTIONS = [
  { value: 'vat_special', label: '增值税专用发票' },
  { value: 'vat_normal', label: '增值税普通发票' },
  { value: 'electronic', label: '电子发票' },
  { value: 'taxi', label: '出租车发票' },
  { value: 'train', label: '火车票' },
  { value: 'airplane', label: '飞机票' },
  { value: 'hotel', label: '酒店住宿发票' },
  { value: 'restaurant', label: '餐饮发票' },
];

// 状态颜色映射
export const STATUS_COLORS = {
  pending: '#F59E0B',   // 警告 - 待处理
  uploading: '#3B82F6', // 主色 - 上传中
  success: '#10B981',   // 成功 - 已完成
  error: '#EF4444',     // 错误 - 失败
  recognizing: '#6366F1', // 信息 - 识别中
  failed: '#EF4444',    // 失败
};

// Session flag: controls whether the project list has been fetched for the current login session.
// Resets when user logs out.
export const projectsFetched = { value: false };

// 状态文本映射
export const STATUS_TEXT = {
  pending: '待处理',
  uploading: '上传中',
  success: '已识别',
  error: '上传失败',
  recognizing: '识别中',
  failed: '识别失败',
};
