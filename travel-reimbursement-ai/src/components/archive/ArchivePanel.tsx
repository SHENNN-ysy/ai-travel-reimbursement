import React from 'react';
import { Card, Button, Input, Select } from 'antd';
import { SyncOutlined, CheckCircleOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { UploadFile } from '@/types';
import { StatusTag, FileTypeTag } from '@/components/common';
import './ArchivePanel.css';

const { Search } = Input;

interface ArchivePanelProps {
  files: UploadFile[];
  totalCount: number;
  invoiceCount: number;
  screenshotCount: number;
  attachmentCount: number;
  selectedIds: string[];
  onRefresh?: () => void;
  onSelectAll?: () => void;
  onBatchDelete?: () => void;
  onSearch?: (value: string) => void;
  onFilterType?: (value: string) => void;
  onFileClick?: (file: UploadFile) => void;
}

export const ArchivePanel: React.FC<ArchivePanelProps> = ({
  files,
  totalCount,
  invoiceCount,
  screenshotCount,
  attachmentCount,
  selectedIds: _selectedIds,
  onRefresh,
  onSelectAll,
  onBatchDelete,
  onSearch,
  onFilterType,
  onFileClick,
}) => {
  return (
    <div className="archive-panel">
      <Card
        title={
          <div className="archive-header">
            <span className="archive-title">资料汇总</span>
            <div className="archive-stats">
              <span className="stat-item">
                总计: <strong>{totalCount}</strong> 份文件
              </span>
              <span className="stat-divider">|</span>
              <span className="stat-item">
                发票: <strong>{invoiceCount}</strong> 份
              </span>
              <span className="stat-divider">|</span>
              <span className="stat-item">
                截图: <strong>{screenshotCount}</strong> 份
              </span>
              <span className="stat-divider">|</span>
              <span className="stat-item">
                其他: <strong>{attachmentCount}</strong> 份
              </span>
            </div>
          </div>
        }
        extra={
          <div className="archive-actions">
            <Button icon={<SyncOutlined spin />} onClick={onRefresh}>刷新</Button>
            <Button icon={<CheckCircleOutlined />} onClick={onSelectAll}>全选</Button>
            <Button danger icon={<DeleteOutlined />} onClick={onBatchDelete}>批量删除</Button>
          </div>
        }
        className="archive-card"
      >
        <div className="archive-filters">
          <Select
            placeholder="类型筛选"
            style={{ width: 120 }}
            allowClear
            onChange={onFilterType}
            options={[
              { value: 'all', label: '全部' },
              { value: 'invoice', label: '发票' },
              { value: 'screenshot', label: '截图' },
              { value: 'attachment', label: '附件' },
            ]}
          />
          <Search
            placeholder="搜索文件名"
            allowClear
            onSearch={onSearch}
            style={{ width: 240 }}
            prefix={<SearchOutlined />}
          />
        </div>

        <div className="archive-content">
          {files.length === 0 ? (
            <div className="empty-state">
              暂无归档文件
            </div>
          ) : (
            <div className="file-grid">
              {files.map(file => (
                <div
                  key={file.id}
                  className="file-grid-item"
                  onClick={() => onFileClick?.(file)}
                >
                  <div className="file-icon-large">📄</div>
                  <div className="file-details">
                    <div className="file-name">{file.name}</div>
                    <div className="file-meta">
                      <FileTypeTag type={file.type} />
                      <StatusTag status={file.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
