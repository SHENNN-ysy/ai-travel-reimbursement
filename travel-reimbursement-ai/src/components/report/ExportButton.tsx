import React from 'react';
import { Button } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import './ExportButton.css';

interface ExportButtonProps {
  onExport?: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  loading = false,
  disabled = false,
}) => {
  return (
    <div className="export-button-container">
      <Button
        type="primary"
        icon={<DownloadOutlined />}
        size="large"
        loading={loading}
        disabled={disabled}
        onClick={onExport}
        className="export-btn"
      >
        导出Excel报表
      </Button>
      <p className="export-hint">
        点击按钮将报销单导出为Excel文件，方便提交和存档
      </p>
    </div>
  );
};
