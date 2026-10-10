import React from 'react';
import { Card, Button, Tag } from 'antd';
import { EditOutlined, CheckOutlined, ReloadOutlined, EyeOutlined } from '@ant-design/icons';
import { RecognitionResultVO } from '@/types';
import { formatCurrency } from '@/utils/format';
import './RecognitionResult.css';

interface RecognitionResultProps {
  result: RecognitionResultVO;
  onEdit?: () => void;
  onConfirm?: () => void;
  onReRecognize?: () => void;
  onPreview?: () => void;
}

export const RecognitionResultCard: React.FC<RecognitionResultProps> = ({
  result,
  onEdit,
  onConfirm,
  onReRecognize,
  onPreview,
}) => {
  const isInvoice = result.type === 'invoice';
  const isScreenshot = result.type === 'screenshot';

  const renderInvoiceInfo = () => {
    if (!isInvoice) return null;
    return (
      <div className="recognition-data">
        <div className="data-row">
          <span className="data-label">发票号码:</span>
          <span className="data-value">{result.invoiceNumber || '-'}</span>
        </div>
        <div className="data-row">
          <span className="data-label">开票日期:</span>
          <span className="data-value">{result.invoiceDate || '-'}</span>
        </div>
        <div className="data-row">
          <span className="data-label">销售方:</span>
          <span className="data-value">{result.seller || '-'}</span>
        </div>
        <div className="data-row">
          <span className="data-label">购买方:</span>
          <span className="data-value">{result.buyer || '-'}</span>
        </div>
        <div className="data-row">
          <span className="data-label">价税合计:</span>
          <span className="data-value amount">{result.totalAmount != null ? formatCurrency(result.totalAmount) : '-'}</span>
        </div>
      </div>
    );
  };

  const renderScreenshotInfo = () => {
    if (!isScreenshot) return null;
    return (
      <div className="recognition-data">
        <div className="data-row">
          <span className="data-label">消费笔数:</span>
          <span className="data-value">{result.consumptionCount || '-'} 笔消费</span>
        </div>
        <div className="data-row">
          <span className="data-label">消费日期:</span>
          <span className="data-value">{result.consumptionDate || '-'}</span>
        </div>
        <div className="data-row">
          <span className="data-label">消费总额:</span>
          <span className="data-value amount">{result.totalConsumption != null ? formatCurrency(result.totalConsumption) : '-'}</span>
        </div>
      </div>
    );
  };

  return (
    <Card
      className="recognition-result-card"
      title={
        <div className="recognition-header">
          <span className="recognition-icon">🤖</span>
          <span className="recognition-title">AI识别结果</span>
          {result.confidence != null && (
            <Tag color="green">置信度: {(result.confidencePercent ?? result.confidence * 100).toFixed(0)}%</Tag>
          )}
        </div>
      }
      extra={
        <div className="recognition-file-info">
          文件: {result.aiFilename || '-'}
        </div>
      }
    >
      {renderInvoiceInfo()}
      {renderScreenshotInfo()}

      <div className="recognition-actions">
        <Button icon={<EyeOutlined />} onClick={onPreview}>预览</Button>
        <Button icon={<EditOutlined />} onClick={onEdit}>编辑修正</Button>
        <Button type="primary" icon={<CheckOutlined />} onClick={onConfirm}>确认无误</Button>
        <Button icon={<ReloadOutlined />} onClick={onReRecognize}>重新识别</Button>
      </div>
    </Card>
  );
};
