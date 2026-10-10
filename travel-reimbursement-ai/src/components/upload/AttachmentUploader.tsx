import React from 'react';
import { Upload, Tag, Button } from 'antd';
import { FilePdfOutlined, FileTextOutlined, FolderOutlined, DeleteOutlined } from '@ant-design/icons';
import { UploadFile } from '@/types';
import { formatFileSize, getFileExtension } from '@/utils/format';
import { ATTACHMENT_CONFIG } from '@/utils/constants';
import './AttachmentUploader.css';

interface AttachmentUploaderProps {
  files: UploadFile[];
  onChange?: (files: UploadFile[]) => void;
}

export const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  files,
  onChange,
}) => {
  const handleRemove = (fileId: string) => {
    const newFiles = files.filter(f => f.id !== fileId);
    onChange?.(newFiles);
  };

  const getFileIcon = (filename: string) => {
    const ext = getFileExtension(filename);
    switch (ext) {
      case 'pdf':
        return <FilePdfOutlined style={{ color: '#EF4444', fontSize: '24px' }} />;
      case 'doc':
      case 'docx':
        return <FileTextOutlined style={{ color: '#3B82F6', fontSize: '24px' }} />;
      case 'zip':
      case 'rar':
        return <FolderOutlined style={{ color: '#F59E0B', fontSize: '24px' }} />;
      default:
        return <FileTextOutlined style={{ color: '#9CA3AF', fontSize: '24px' }} />;
    }
  };

  const getFileCategory = (filename: string): string => {
    const name = filename.toLowerCase();
    if (name.includes('行程') || name.includes('机票') || name.includes('火车')) {
      return '行程单';
    }
    if (name.includes('审批')) {
      return '审批单';
    }
    if (name.includes('合同')) {
      return '合同';
    }
    return '其他';
  };

  return (
    <div className="attachment-uploader-container">
      <Upload.Dragger
        name="files"
        multiple
        accept={ATTACHMENT_CONFIG.acceptTypes.map(ext => `.${ext}`).join(',')}
        showUploadList={false}
        beforeUpload={() => false}
        className="attachment-dragger"
      >
        <p className="ant-upload-drag-icon">
          <FolderOutlined style={{ fontSize: '48px', color: '#3B82F6' }} />
        </p>
        <p className="ant-upload-text">
          上传附加材料
        </p>
        <p className="ant-upload-hint">
          支持格式: {ATTACHMENT_CONFIG.acceptTypes.join(', ')} | 
          单文件不超过 {formatFileSize(ATTACHMENT_CONFIG.maxSize)} | 
          最多 {ATTACHMENT_CONFIG.maxFiles} 个文件
        </p>
      </Upload.Dragger>

      {files.length > 0 && (
        <div className="attachment-list">
          {files.map(file => (
            <div key={file.id} className="attachment-item">
              <div className="attachment-icon">
                {getFileIcon(file.name)}
              </div>
              <div className="attachment-info">
                <div className="attachment-name">{file.name}</div>
                <div className="attachment-meta">
                  <span className="attachment-size">{formatFileSize(file.size)}</span>
                  <Tag color="blue">{getFileCategory(file.name)}</Tag>
                </div>
              </div>
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => handleRemove(file.id)}
              >
                删除
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
