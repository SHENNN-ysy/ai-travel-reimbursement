import React, { useState } from 'react';
import { Tabs } from 'antd';
import { PageHeader } from '@/components/common';
import { UploadZone, ScreenshotUploader, AttachmentUploader } from '@/components/upload';
import { mockUploadFiles } from '@/store/mockData';
import './UploadPage.css';

export const UploadPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('invoice');
  const [files, setFiles] = useState(mockUploadFiles);

  const invoiceFiles = files.filter(f => f.type === 'invoice');
  const screenshotFiles = files.filter(f => f.type === 'screenshot');
  const attachmentFiles = files.filter(f => f.type === 'attachment');

  const handleFileChange = (type: 'invoice' | 'screenshot' | 'attachment', newFiles: any[]) => {
    setFiles(prev => {
      const filtered = prev.filter(f => f.type !== type);
      return [...filtered, ...newFiles];
    });
  };

  const tabItems = [
    {
      key: 'invoice',
      label: '📄 发票文件',
      children: (
        <UploadZone
          type="invoice"
          files={invoiceFiles}
          onFileChange={(newFiles) => handleFileChange('invoice', newFiles)}
          onRecognize={(fileId) => console.log('识别文件:', fileId)}
        />
      ),
    },
    {
      key: 'screenshot',
      label: '🖼️ 付款截图',
      children: (
        <ScreenshotUploader
          files={screenshotFiles}
          onChange={(newFiles) => handleFileChange('screenshot', newFiles)}
        />
      ),
    },
    {
      key: 'attachment',
      label: '📎 附加材料',
      children: (
        <AttachmentUploader
          files={attachmentFiles}
          onChange={(newFiles) => handleFileChange('attachment', newFiles)}
        />
      ),
    },
  ];

  return (
    <div className="upload-page">
      <PageHeader
        title="资料上传"
        subtitle="上传发票、付款截图和其他附加材料，AI将自动识别并提取信息"
      />

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        className="upload-tabs"
      />
    </div>
  );
};
