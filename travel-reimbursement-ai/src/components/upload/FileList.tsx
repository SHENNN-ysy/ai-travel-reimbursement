import React from 'react';
import { Button, Progress, Empty } from 'antd';
import { EyeOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { UploadFile } from '@/types';
import { formatFileSize, getFileTypeIcon, truncateText } from '@/utils/format';
import { StatusTag } from '@/components/common';
import './FileList.css';

interface FileListProps {
  files: UploadFile[];
  onRemove?: (id: string) => void;
  onPreview?: (file: UploadFile) => void;
  onRecognize?: (id: string) => void;
  showActions?: boolean;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  onRemove,
  onPreview,
  onRecognize,
  showActions = true,
}) => {
  if (files.length === 0) {
    return <Empty description="暂无上传文件" />;
  }

  return (
    <div className="file-list-container">
      <div className="file-list-header">
        <span className="file-count">共 {files.length} 个文件</span>
      </div>
      
      <div className="file-list">
        {files.map(file => (
          <div key={file.id} className="file-item">
            <div className="file-icon">
              {getFileTypeIcon(file.name)}
            </div>
            
            <div className="file-info">
              <div className="file-name" title={file.name}>
                {truncateText(file.name, 40)}
              </div>
              <div className="file-meta">
                <span className="file-size">{formatFileSize(file.size)}</span>
                <StatusTag status={file.status} />
              </div>
              
              {file.status === 'uploading' && file.progress !== undefined && (
                <Progress
                  percent={file.progress}
                  size="small"
                  strokeColor="#3B82F6"
                  showInfo={false}
                />
              )}
            </div>

            {showActions && (
              <div className="file-actions">
                {onPreview && (
                  <Button
                    type="text"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => onPreview(file)}
                  >
                    预览
                  </Button>
                )}
                
                {file.status === 'success' && onRecognize && (
                  <Button
                    type="text"
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={() => onRecognize(file.id)}
                  >
                    重新识别
                  </Button>
                )}
                
                {onRemove && (
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => onRemove(file.id)}
                  >
                    删除
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
