import React from 'react';
import { Tag as AntTag, TagProps as AntTagProps } from 'antd';
import './StatusTag.css';

type StatusType = 'pending' | 'uploading' | 'success' | 'error' | 'recognizing' | 'failed';

interface StatusTagProps extends Omit<AntTagProps, 'color'> {
  status: StatusType;
  showIcon?: boolean;
}

const statusConfig = {
  pending: { color: 'warning', text: '待处理', icon: '⏳' },
  uploading: { color: 'processing', text: '上传中', icon: '⬆️' },
  success: { color: 'success', text: '已完成', icon: '✓' },
  error: { color: 'error', text: '失败', icon: '✗' },
  recognizing: { color: 'processing', text: '识别中', icon: '🤖' },
  failed: { color: 'error', text: '识别失败', icon: '✗' },
};

export const StatusTag: React.FC<StatusTagProps> = ({
  status,
  showIcon = true,
  className = '',
  ...props
}) => {
  const config = statusConfig[status];
  
  return (
    <AntTag
      color={config.color}
      className={`status-tag ${className}`}
      {...props}
    >
      {showIcon && <span className="status-icon">{config.icon}</span>}
      {config.text}
    </AntTag>
  );
};

interface FileTypeTagProps extends AntTagProps {
  type: 'invoice' | 'screenshot' | 'attachment';
}

const fileTypeConfig = {
  invoice: { color: 'blue', text: '发票', icon: '📄' },
  screenshot: { color: 'green', text: '截图', icon: '🖼️' },
  attachment: { color: 'purple', text: '附件', icon: '📎' },
};

export const FileTypeTag: React.FC<FileTypeTagProps> = ({
  type,
  className = '',
  ...props
}) => {
  const config = fileTypeConfig[type];
  
  return (
    <AntTag
      color={config.color}
      className={`file-type-tag ${className}`}
      {...props}
    >
      <span className="tag-icon">{config.icon}</span>
      {config.text}
    </AntTag>
  );
};
