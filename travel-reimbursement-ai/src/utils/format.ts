import dayjs from 'dayjs';

// 日期格式化
export const formatDate = (date: string | Date, format: string = 'YYYY/MM/DD'): string => {
  return dayjs(date).format(format);
};

// 日期时间格式化
export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('YYYY/MM/DD HH:mm:ss');
};

// 文件大小格式化
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// 金额格式化
export const formatCurrency = (amount: number, showSymbol: boolean = true): string => {
  const safeAmount = amount ?? 0;
  const formatted = new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
  return showSymbol ? `¥${formatted}` : formatted;
};

// 生成唯一ID
export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 获取文件扩展名
export const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

// 验证文件类型
export const isValidFileType = (
  file: File,
  allowedTypes: string[]
): boolean => {
  const ext = getFileExtension(file.name);
  return allowedTypes.includes(ext);
};

// 验证文件大小
export const isValidFileSize = (
  file: File,
  maxSizeMB: number
): boolean => {
  return file.size <= maxSizeMB * 1024 * 1024;
};

// 获取文件类型图标
export const getFileTypeIcon = (filename: string): string => {
  const ext = getFileExtension(filename);
  switch (ext) {
    case 'pdf':
      return '📕';
    case 'doc':
    case 'docx':
      return '📘';
    case 'xls':
    case 'xlsx':
      return '📗';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return '🖼️';
    case 'zip':
    case 'rar':
      return '📦';
    default:
      return '📄';
  }
};

// 计算报销总额
export const calculateTotalAmount = (items: Array<{ amount: number }>): number => {
  return items.reduce((sum, item) => sum + item.amount, 0);
};

// 生成文件夹名称
export const generateFolderName = (
  destination: string,
  startDate: string,
  endDate: string
): string => {
  return `${destination}_${formatDate(startDate, 'YYYY-MM-DD')}_${formatDate(endDate, 'YYYY-MM-DD')}`;
};

// 解析文件夹名称获取信息
export const parseFolderName = (folderName: string): {
  destination: string;
  startDate: string;
  endDate: string;
} | null => {
  const parts = folderName.split('_');
  if (parts.length >= 3) {
    const destination = parts[0];
    const startDate = parts[1];
    const endDate = parts[2];
    return { destination, startDate, endDate };
  }
  return null;
};

// 截断文本
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

// 防抖函数
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// 睡眠函数
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
