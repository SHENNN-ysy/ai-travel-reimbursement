import React, { useState } from 'react';
import { Upload, Modal } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { UploadFile } from '@/types';
import { formatFileSize } from '@/utils/format';
import { SCREENSHOT_CONFIG } from '@/utils/constants';
import './ScreenshotUploader.css';

interface ScreenshotUploaderProps {
  files: UploadFile[];
  onChange?: (files: UploadFile[]) => void;
}

export const ScreenshotUploader: React.FC<ScreenshotUploaderProps> = ({
  files,
  onChange,
}) => {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  const handleRemove = (fileId: string) => {
    const newFiles = files.filter(f => f.id !== fileId);
    onChange?.(newFiles);
  };

  const getAmountFromFileName = (filename: string): string | null => {
    const match = filename.match(/¥?(\d+\.?\d*)/);
    return match ? `¥${match[1]}` : null;
  };

  return (
    <div className="screenshot-uploader-container">
      <div className="screenshot-upload-area">
        <Upload.Dragger
          name="files"
          multiple
          listType="picture-card"
          accept={SCREENSHOT_CONFIG.acceptTypes.map(ext => `.${ext}`).join(',')}
          showUploadList={true}
          beforeUpload={() => false}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            点击上传付款截图
          </p>
          <p className="ant-upload-hint">
            支持格式: {SCREENSHOT_CONFIG.acceptTypes.join(', ')} | 
            单文件不超过 {formatFileSize(SCREENSHOT_CONFIG.maxSize)}
          </p>
        </Upload.Dragger>
      </div>

      {files.length > 0 && (
        <div className="screenshot-grid">
          {files.map(file => (
            <div key={file.id} className="screenshot-card">
              <div className="screenshot-image">
                {file.url ? (
                  <img src={file.url} alt={file.name} />
                ) : file.file ? (
                  <img src={URL.createObjectURL(file.file)} alt={file.name} />
                ) : (
                  <div className="placeholder">暂无预览</div>
                )}
              </div>
              <div className="screenshot-footer">
                <span className="screenshot-amount">
                  {getAmountFromFileName(file.name) || '¥--'}
                </span>
                <button
                  className="screenshot-delete"
                  onClick={() => handleRemove(file.id)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={previewVisible}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
      >
        <img alt={previewTitle} style={{ width: '100%' }} src={previewImage} />
      </Modal>
    </div>
  );
};
