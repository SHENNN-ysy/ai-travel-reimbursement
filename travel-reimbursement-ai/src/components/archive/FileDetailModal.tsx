import React, { useState } from 'react';
import { Modal, Descriptions, Input, Button, Space, Tag } from 'antd';
import { UploadFile, InvoiceRecognitionData, ScreenshotRecognitionData } from '@/types';
import './FileDetailModal.css';

interface FileDetailModalProps {
  file: UploadFile | null;
  visible: boolean;
  onClose: () => void;
  onUpdate?: (file: UploadFile) => void;
}

const { TextArea } = Input;

export const FileDetailModal: React.FC<FileDetailModalProps> = ({
  file,
  visible,
  onClose,
  onUpdate,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [remark, setRemark] = useState('');

  React.useEffect(() => {
    if (file) {
      setTempName(file.customFileName || file.name);
      setRemark(file.remark || '');
    }
  }, [file]);

  const handleSaveName = () => {
    if (file && onUpdate && tempName.trim()) {
      onUpdate({
        ...file,
        customFileName: tempName.trim(),
      });
    }
    setEditingName(false);
  };

  const handleSaveRemark = () => {
    if (file && onUpdate) {
      onUpdate({
        ...file,
        remark: remark.trim(),
      });
    }
  };

  const getRecognitionData = () => {
    if (!file?.recognitionData) return null;
    return file.recognitionData as InvoiceRecognitionData | ScreenshotRecognitionData;
  };

  const recognitionData = getRecognitionData();

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      invoice: '发票',
      screenshot: '截图',
      attachment: '附件',
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'orange',
      recognizing: 'blue',
      success: 'green',
      failed: 'red',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: '待识别',
      recognizing: '识别中',
      success: '已识别',
      failed: '识别失败',
    };
    return labels[status] || status;
  };

  return (
    <Modal
      title={
        <div className="modal-title">
          <span>📄 文件详情</span>
          {file && (
            <Tag color={file.type === 'invoice' ? 'blue' : file.type === 'screenshot' ? 'purple' : 'cyan'}>
              {getTypeLabel(file.type)}
            </Tag>
          )}
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      className="file-detail-modal"
    >
      {file && (
        <div className="file-detail-content">
          {/* 基本信息 */}
          <div className="detail-section">
            <h4 className="section-title">基本信息</h4>
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="文件名" span={2}>
                {editingName ? (
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      value={tempName}
                      onChange={e => setTempName(e.target.value)}
                      onPressEnter={handleSaveName}
                    />
                    <Button type="primary" onClick={handleSaveName}>保存</Button>
                    <Button onClick={() => setEditingName(false)}>取消</Button>
                  </Space.Compact>
                ) : (
                  <Space>
                    <span>{file.customFileName || file.name}</span>
                    <Button type="link" size="small" onClick={() => setEditingName(true)}>
                      修改名称
                    </Button>
                  </Space>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="原始文件名">{file.name}</Descriptions.Item>
              <Descriptions.Item label="文件大小">{(file.size / 1024).toFixed(2)} KB</Descriptions.Item>
              <Descriptions.Item label="AI文件改名" span={2}>
                <Input
                  placeholder="选填，请输入AI识别后自动修改的文件名"
                  defaultValue={file.metadata?.aiFilename || ''}
                  onBlur={(e) => {
                    if (file && onUpdate && e.target.value.trim()) {
                      onUpdate({
                        ...file,
                        metadata: { ...file.metadata, aiFilename: e.target.value.trim() },
                      });
                    }
                  }}
                  size="small"
                />
              </Descriptions.Item>
              <Descriptions.Item label="上传时间">
                {new Date(file.createdAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
              <Descriptions.Item label="识别状态" span={2}>
                <Tag color={getStatusColor(file.recognitionStatus || 'pending')}>
                  {getStatusLabel(file.recognitionStatus || 'pending')}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </div>

          {/* 识别结果 */}
          {recognitionData && (
            <div className="detail-section">
              <h4 className="section-title">AI 识别结果</h4>
              <Descriptions column={2} size="small" bordered>
                {recognitionData.type && (
                  <Descriptions.Item label="类型">{recognitionData.type}</Descriptions.Item>
                )}
                {'expenseType' in recognitionData && (
                  <Descriptions.Item label="消费类型">{recognitionData.expenseType}</Descriptions.Item>
                )}
                {'invoiceNumber' in recognitionData && (
                  <Descriptions.Item label="发票号码">{recognitionData.invoiceNumber}</Descriptions.Item>
                )}
                {'invoiceDate' in recognitionData && (
                  <Descriptions.Item label="发票日期">{recognitionData.invoiceDate}</Descriptions.Item>
                )}
                {'seller' in recognitionData && (
                  <Descriptions.Item label="销售方">{recognitionData.seller}</Descriptions.Item>
                )}
                {'buyer' in recognitionData && (
                  <Descriptions.Item label="购买方">{recognitionData.buyer}</Descriptions.Item>
                )}
                {'count' in recognitionData && (
                  <Descriptions.Item label="数量">{recognitionData.count}</Descriptions.Item>
                )}
                {'startDate' in recognitionData && (
                  <Descriptions.Item label="消费日期">{recognitionData.startDate}</Descriptions.Item>
                )}
                {'amount' in recognitionData && (
                  <Descriptions.Item label="金额" span={2}>
                    <span style={{ color: '#f5222d', fontWeight: 'bold' }}>
                      ¥{recognitionData.amount.toFixed(2)}
                    </span>
                  </Descriptions.Item>
                )}
                {'taxAmount' in recognitionData && recognitionData.taxAmount !== undefined && (
                  <Descriptions.Item label="税额">¥{recognitionData.taxAmount.toFixed(2)}</Descriptions.Item>
                )}
                {file.recognitionConfidence !== undefined && (
                  <Descriptions.Item label="识别置信度">
                    {(file.recognitionConfidence * 100).toFixed(1)}%
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>
          )}

          {/* 备注 */}
          <div className="detail-section">
            <h4 className="section-title">备注</h4>
            <TextArea
              rows={3}
              placeholder="添加备注信息..."
              value={remark}
              onChange={e => setRemark(e.target.value)}
              onBlur={handleSaveRemark}
            />
            <div className="remark-actions">
              <Button type="link" size="small" onClick={handleSaveRemark}>
                保存备注
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
