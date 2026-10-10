import React from 'react';
import { FolderOpenOutlined, FileTextOutlined, PictureOutlined, PaperClipOutlined, FileExcelOutlined, FileUnknownOutlined } from '@ant-design/icons';
import { ArchiveFolder } from '@/types';
import './FolderTree.css';

interface FolderTreeViewProps {
  folders: ArchiveFolder[];
  selectedFolderId?: string;
  onFolderSelect?: (folder: ArchiveFolder) => void;
}

export const FolderTreeView: React.FC<FolderTreeViewProps> = ({
  folders,
  selectedFolderId,
  onFolderSelect,
}) => {
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'invoices':
        return <FileTextOutlined style={{ fontSize: '16px' }} />;
      case 'screenshots':
        return <PictureOutlined style={{ fontSize: '16px' }} />;
      case 'attachments':
        return <PaperClipOutlined style={{ fontSize: '16px' }} />;
      case 'excelReport':
        return <FileExcelOutlined style={{ fontSize: '16px' }} />;
      default:
        return <FileUnknownOutlined style={{ fontSize: '16px' }} />;
    }
  };

  return (
    <div className="folder-tree-container">
      <div className="folder-tree-header">
        <FolderOpenOutlined style={{ fontSize: '20px' }} />
        <span className="folder-tree-title">归档文件夹</span>
      </div>

      <div className="folder-tree-list">
        {folders.map(folder => (
          <div
            key={folder.id}
            className={`folder-item ${selectedFolderId === folder.id ? 'selected' : ''}`}
            onClick={() => onFolderSelect?.(folder)}
          >
            <div className="folder-icon">📁</div>
            <div className="folder-info">
              <div className="folder-name">{folder.name}</div>
              <div className="folder-meta">
                <span>发票: {folder.files.invoices.length}</span>
                <span>截图: {folder.files.screenshots.length}</span>
                <span>附件: {folder.files.attachments.length}</span>
              </div>
            </div>
          </div>
        ))}

        {folders.length === 0 && (
          <div className="empty-folders">
            暂无归档文件夹
          </div>
        )}
      </div>
    </div>
  );
};
