import React, { useCallback, useState, useRef } from 'react';
import { message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { UploadFile } from '@/types';
import { INVOICE_CONFIG } from '@/utils/constants';
import { formatFileSize, isValidFileType, isValidFileSize, generateId } from '@/utils/format';
import './UploadZone.css';

interface UploadZoneProps {
  type: 'invoice' | 'screenshot' | 'attachment';
  files: UploadFile[];
  onFileChange?: (files: UploadFile[]) => void;
  onRecognize?: (fileId: string) => void;
}

const configMap = {
  invoice: INVOICE_CONFIG,
  screenshot: INVOICE_CONFIG,
  attachment: INVOICE_CONFIG,
};

export const UploadZone: React.FC<UploadZoneProps> = ({
  type,
  files,
  onFileChange,
  onRecognize,
}) => {
  const [dragging, setDragging] = useState(false);
  const config = configMap[type];
  const inputRef = useRef<HTMLInputElement>(null);

  const typeLabels = {
    invoice: '发票文件',
    screenshot: '付款截图',
    attachment: '附加材料',
  };

  // 创建 UploadFile 对象
  const createUploadFile = (file: File): UploadFile => {
    return {
      id: generateId(),
      name: file.name,
      size: file.size,
      type,
      status: 'pending',
      file,
      createdAt: new Date().toISOString(),
    };
  };

  // 处理文件上传 - 只传递新文件，不做合并
  const handleFileUpload = useCallback((uploadedFiles: File[]) => {
    const validFiles = uploadedFiles.filter(file => {
      if (!isValidFileType(file, config.acceptTypes)) {
        message.error(`不支持的文件格式: ${file.name}，请上传 ${config.acceptTypes.join(', ')} 格式`);
        return false;
      }
      if (!isValidFileSize(file, config.maxSize / (1024 * 1024))) {
        message.error(`文件大小超过限制: ${file.name}，最大 ${formatFileSize(config.maxSize)}`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      // 只传递新文件，由父组件负责合并
      const newFiles = validFiles.map(file => createUploadFile(file));
      onFileChange?.(newFiles);
      message.success(`成功添加 ${newFiles.length} 个文件`);
    }
  }, [onFileChange, config]);

  // 拖拽放置
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      handleFileUpload(droppedFiles);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  // 粘贴上传（仅截图类型）
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (type !== 'screenshot') return;
    const items = Array.from(e.clipboardData.items);
    const imageFiles: File[] = [];

    items.forEach(item => {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    });

    if (imageFiles.length > 0) {
      handleFileUpload(imageFiles);
    }
  }, [type, handleFileUpload]);

  // 点击上传
  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // 文件选择变化
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFileUpload(Array.from(selectedFiles));
    }
    // 重置 input 以允许选择相同文件
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [handleFileUpload]);

  return (
    <div
      className={`upload-zone-container ${dragging ? 'dragging' : ''}`}
      onPaste={handlePaste}
    >
      {/* 隐藏的 file input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={config.acceptTypes.map(ext => `.${ext}`).join(',')}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <div
        className={`upload-dragger ${dragging ? 'dragging' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <div className="upload-drag-inner">
          <p className="upload-icon">
            <InboxOutlined />
          </p>
          <p className="upload-text">
            点击或拖拽文件到此处上传 {typeLabels[type]}
          </p>
          <p className="upload-hint">
            支持格式: {config.acceptTypes.join(', ')} |
            单文件不超过 {formatFileSize(config.maxSize)}
          </p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="file-list-section">
          <div className="file-list-grid">
            {files.map(file => (
              <div key={file.id} className="file-list-item">
                <div className="file-item-icon">
                  {file.type === 'invoice' ? '📄' : file.type === 'screenshot' ? '🖼️' : '📎'}
                </div>
                <div className="file-item-info">
                  <span className="file-item-name" title={file.name}>{file.name}</span>
                  <span className="file-item-size">{formatFileSize(file.size)}</span>
                </div>
                <div className="file-item-actions">
                  {file.status === 'pending' && onRecognize && (
                    <button
                      className="recognize-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRecognize(file.id);
                      }}
                      title="AI识别"
                    >
                      🤖
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
