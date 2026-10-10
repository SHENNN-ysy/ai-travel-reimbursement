import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Button, message, Empty, Tabs, Modal, Input, Select, Space, DatePicker, Typography, Progress } from 'antd';
import {
  PlusOutlined,
  FileTextOutlined,
  PictureOutlined,
  PaperClipOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  RobotOutlined,
  EditOutlined,
  FolderOpenOutlined,
  SaveOutlined,
  ReloadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileOutlined,
  InboxOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  switchToProject,
  addFilesToProject,
  removeFileFromProject,
  updateFileInProject,
  updateFolderName,
} from '@/store/slices/reimbursementSlice';
import {
  fetchFileList,
  uploadFile,
  deleteFile,
  updateFile,
  submitBatchRecognize,
  fetchFolders,
  createFolder,
  updateFolder,
  batchConfirmFiles,
  recognizeFile,
  fetchFileDetail,
  unconfirmFile,
} from '@/store/slices/fileSlice';
import { fetchReportItems } from '@/store/slices/reportSlice';
import { fetchProjects, fetchProjectDetail, clearCurrentProject } from '@/store/slices/projectSlice';
import { PageHeader, ArchiveUploadGuide } from '@/components/common';
import { UploadFile, InvoiceRecognitionData, ScreenshotRecognitionData } from '@/types';
import { useBatchRecognize, FileRecognitionResult } from '@/hooks/useBatchRecognize';
import { formatFileSize } from '@/utils/format';
import { FileVO } from '@/api';
import dayjs from 'dayjs';
import './ArchivePage.css';

const { TextArea } = Input;
const { Text } = Typography;

// 无项目时的默认子文件夹
const defaultFolders = [
  { id: 'default-invoice', name: '发票文件' },
  { id: 'default-screenshot', name: '付款截图' },
  { id: 'default-attachment', name: '附加材料' },
];

// 消费类型选项
const expenseTypeOptions = [
  { value: 'transport', label: '交通' },
  { value: 'catering', label: '餐饮' },
  { value: 'accommodation', label: '住宿' },
  { value: 'purchase', label: '采购' },
];

// 简化的卡片组件
interface FileCardProps {
  file: UploadFile;
  onClick: () => void;
}

const FileCard: React.FC<FileCardProps> = ({ file, onClick }) => {
  // 获取金额
  const getAmount = () => {
    if (file.recognitionData) {
      const data = file.recognitionData as InvoiceRecognitionData | ScreenshotRecognitionData;
      if ('amount' in data && data.amount) {
        return `¥${data.amount.toFixed(2)}`;
      }
    }
    return null;
  };

  const amount = getAmount();
  const showAmount = file.type !== 'attachment';

  // 获取状态显示
  // 后端 confirmed: 0=未确认 1=已确认；前端 UploadFile.confirmed 为 boolean
  // FileCard 从 Redux 的 FileVO 传入时已转为 boolean（file.confirmed === 1 ? true : false）
  const getStatusDisplay = () => {
    const confirmed = (file as any).confirmed;
    const status = (file as any).status;

    if (confirmed === true) {
      return <span className="status-badge status-confirmed">已确认</span>;
    }
    if (status === 2) {
      return <span className="status-badge status-success">已识别</span>;
    }
    if (status === 1) {
      return <span className="status-badge status-recognizing">识别中</span>;
    }
    if (status === 3) {
      return <span className="status-badge status-failed">识别失败</span>;
    }
    return <span className="status-badge status-pending">待识别</span>;
  };

  // 获取类型标签样式
  const getTypeBadgeClass = () => {
    if (file.type === 'invoice') return 'type-badge type-invoice-red';
    if (file.type === 'screenshot') return 'type-badge type-screenshot';
    return 'type-badge type-attachment';
  };

  return (
    <div className={`file-card ${(file as any).confirmed === true ? 'file-card-confirmed' : ''}`} onClick={onClick}>
      <div className="file-card-header">
        <span className={getTypeBadgeClass()}>
          {file.type === 'invoice' ? '发票' : file.type === 'screenshot' ? '截图' : '附件'}
        </span>
        {getStatusDisplay()}
      </div>

      <div className="file-icon">
        {file.type === 'invoice' ? <FileTextOutlined /> :
         file.type === 'screenshot' ? <PictureOutlined /> :
         <PaperClipOutlined />}
      </div>

      <div className="file-info">
        <span className="file-name" title={file.name}>
          {file.name}
        </span>
        <span className="file-size">{formatFileSize(file.size)}</span>
      </div>

      {/* 金额信息栏 - 发票和截图显示，附件不显示 */}
      {showAmount && (
        <div className="file-amount-display">
          <span className="amount-label">金额</span>
          {amount ? (
            <span className="amount-value">{amount}</span>
          ) : (
            <span className="amount-placeholder">未填写</span>
          )}
        </div>
      )}
    </div>
  );
};

// 检查文件必填字段是否填写
const checkRequiredFields = (file: UploadFile): { valid: boolean } => {
  if (file.type === 'invoice') {
    const data = file.recognitionData as InvoiceRecognitionData | undefined;
    if (!data?.expenseType || !data?.invoiceNumber || !data?.invoiceDate ||
        !data?.seller || !data?.buyer || !data?.amount) {
      return { valid: false };
    }
  } else if (file.type === 'screenshot') {
    const data = file.recognitionData as ScreenshotRecognitionData | undefined;
    if (!data?.expenseType || !data?.count || !data?.startDate ||
        !data?.amount) {
      return { valid: false };
    }
  }
  return { valid: true };
};

// 文件详情弹窗组件
interface FileDetailModalProps {
  file: UploadFile | null;
  visible: boolean;
  projectId?: string;
  onClose: () => void;
  onUpdate: (file: UploadFile) => void;
  onDelete: (id: string) => void;
  onReRecognize?: (id: string) => void; // 重新识别
  onUnconfirm?: (id: string) => void; // 取消确认
  // API 返回的完整 FileVO（包含 recognitionResult）
  apiFile?: FileVO | null;
}

const FileDetailModal: React.FC<FileDetailModalProps> = ({ file, visible, projectId, onClose, onUpdate, onDelete, onReRecognize, onUnconfirm, apiFile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [remark, setRemark] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // 初始化编辑数据（优先使用 apiFile.recognitionResult，其次使用 file.recognitionData）
  useEffect(() => {
    if (file) {
      setRemark(file.remark || '');

      // 优先从 apiFile.recognitionResult 读取（API 返回的识别结果）
      const apiResult = apiFile?.recognitionResult;

      if (file.type === 'invoice' && (file.recognitionData || apiResult)) {
        const data = file.recognitionData as InvoiceRecognitionData | undefined;
        const r = apiResult;
        setEditData({
          expenseType: r?.expenseType || data?.expenseType || '',
          invoiceNumber: r?.invoiceNumber || data?.invoiceNumber || '',
          invoiceDate: r?.invoiceDate || data?.invoiceDate || '',
          seller: r?.seller || data?.seller || '',
          buyer: r?.buyer || data?.buyer || '',
          totalAmount: r?.totalAmount ?? data?.amount ?? 0,
          description: r?.description || data?.description || data?.seller || '',
          aiFilename: r?.aiFilename || data?.aiFilename || file.metadata?.aiFilename || '',
        });
      } else if (file.type === 'screenshot' && (file.recognitionData || apiResult)) {
        const data = file.recognitionData as ScreenshotRecognitionData | undefined;
        const r = apiResult;
        setEditData({
          expenseType: r?.expenseType || data?.expenseType || '',
          consumptionCount: r?.consumptionCount || data?.count || '',
          consumptionDate: r?.consumptionDate || data?.startDate || '',
          totalConsumption: r?.totalConsumption ?? data?.amount ?? 0,
          description: r?.description || data?.description || file.customFileName || '',
          aiFilename: r?.aiFilename || data?.aiFilename || file.metadata?.aiFilename || '',
        });
      } else {
        setEditData({
          description: file.customFileName || apiResult?.description || '',
          aiFilename: apiResult?.aiFilename || file.metadata?.aiFilename || '',
        });
      }
    }
  }, [file, apiFile]);

  // Fetch image/PDF preview via download API when modal opens
  useEffect(() => {
    if (!visible || !file || !projectId) {
      setPreviewUrl(null);
      return;
    }
    const previewType = getFilePreviewType(file.name);
    if (previewType !== 'image' && previewType !== 'pdf') {
      setPreviewUrl(null);
      return;
    }
    // Only fetch if no local blob/file URL is available
    if (file.file) {
      setPreviewUrl(URL.createObjectURL(file.file));
      return;
    }
    if (file.url) {
      setPreviewUrl(file.url);
      return;
    }

    // Fetch from backend download API
    setPreviewLoading(true);
    import('@/api').then(({ downloadFile }) => {
      downloadFile(Number(projectId), Number(file.id))
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
        })
        .catch(() => {
          setPreviewUrl(null);
        })
        .finally(() => {
          setPreviewLoading(false);
        });
    });
  }, [visible, file, projectId]);

  // 必填字段验证
  const requiredFieldsFilled = useMemo(() => {
    if (!editData || !file) return false;
    if (file.type === 'invoice') {
      return !!(
        editData.expenseType &&
        editData.invoiceNumber &&
        editData.invoiceDate &&
        editData.seller &&
        editData.buyer &&
        editData.totalAmount
      );
    } else if (file.type === 'screenshot') {
      return !!(
        editData.expenseType &&
        editData.consumptionCount &&
        editData.consumptionDate &&
        editData.totalConsumption
      );
    }
    return true;
  }, [editData, file]);

  // 获取文件预览类型
  const getFilePreviewType = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '')) {
      return 'image';
    }
    if (ext === 'pdf') {
      return 'pdf';
    }
    return 'other';
  };

  // 取消确认文件
  const handleUnconfirm = () => {
    if (file && onUnconfirm) {
      onUnconfirm(file.id);
      onClose();
    }
  };

  // 确认文件
  const handleConfirm = async () => {
    if (!requiredFieldsFilled) {
      message.error('请填写所有必填字段后再确认');
      return;
    }

    let recognitionData: InvoiceRecognitionData | ScreenshotRecognitionData | undefined;

    if (file?.type === 'invoice') {
      recognitionData = {
        type: 'invoice',
        expenseType: editData.expenseType,
        invoiceNumber: editData.invoiceNumber,
        invoiceDate: editData.invoiceDate,
        seller: editData.seller,
        buyer: editData.buyer,
        amount: editData.totalAmount,
      } as InvoiceRecognitionData;
    } else     if (file?.type === 'screenshot') {
      recognitionData = {
        type: 'screenshot',
        expenseType: editData.expenseType,
        count: editData.consumptionCount,
        startDate: editData.consumptionDate,
        amount: editData.totalConsumption,
      } as ScreenshotRecognitionData;
    }

    const updatedFile: UploadFile = {
      ...file!,
      confirmed: true,
      recognitionData,
      customFileName: editData.description,
      metadata: { ...file!.metadata, aiFilename: editData.aiFilename },
      remark,
      recognitionStatus: 'success',
      recognitionConfidence: 1,
    };

    // 将文件转换为报表明细（字段映射与后端保持一致）
    const date = recognitionData && 'invoiceDate' in recognitionData
      ? recognitionData.invoiceDate
      : recognitionData && 'startDate' in recognitionData
        ? recognitionData.startDate
        : updatedFile.createdAt.split('T')[0];
    const amount = recognitionData && 'amount' in recognitionData ? recognitionData.amount : 0;
    const reportItem = {
      date,
      receiptType: recognitionData?.expenseType || 'purchase',
      hasReceipt: true,
      receiptFile: recognitionData?.aiFilename || updatedFile.name,
      amount,
      summary: editData.description || updatedFile.customFileName || updatedFile.name,
      remark: remark || '',
      receiptFileId: updatedFile.id,
    };

    // 构建要保存的数据（包含 confirmed 状态）
    // 附加材料类型不修改文件名，不传 aiFilename
    const isAttachment = file?.type === 'attachment';
    const data: any = {
      remark,
      description: editData.description,
      ...(isAttachment ? {} : { aiFilename: editData.aiFilename }),
      confirmed: 1, // 确认文件
    };

    // 根据文件类型添加对应的识别结果字段
    if (file?.type === 'invoice' && recognitionData) {
      const invoiceData = recognitionData as InvoiceRecognitionData;
      data.expenseType = invoiceData.expenseType;
      data.invoiceNumber = invoiceData.invoiceNumber;
      data.invoiceDate = invoiceData.invoiceDate;
      data.seller = invoiceData.seller;
      data.buyer = invoiceData.buyer;
      data.totalAmount = invoiceData.amount;
    } else if (file?.type === 'screenshot' && recognitionData) {
      const screenshotData = recognitionData as ScreenshotRecognitionData;
      data.expenseType = screenshotData.expenseType;
      data.consumptionCount = screenshotData.count;
      data.consumptionDate = screenshotData.startDate;
      data.totalConsumption = screenshotData.amount;
    }

    // 调用 onUpdate 传递完整数据（包含 confirmed: 1）
    onUpdate({
      ...updatedFile,
      confirmed: 1,
      ...data,
    });
    setIsEditing(false);
    message.success('文件已确认');
  };

  // 重新识别
  const handleReRecognize = () => {
    if (file && onReRecognize) {
      onReRecognize(file.id);
      onClose();
    } else {
      message.loading('正在重新识别...', 1.5).then(() => {
        message.success('重新识别完成');
      });
    }
  };

  // 保存编辑
  const handleSave = () => {
    let recognitionData: InvoiceRecognitionData | ScreenshotRecognitionData | undefined;

    if (file?.type === 'invoice') {
      recognitionData = {
        type: 'invoice',
        expenseType: editData.expenseType,
        invoiceNumber: editData.invoiceNumber,
        invoiceDate: editData.invoiceDate,
        seller: editData.seller,
        buyer: editData.buyer,
        amount: editData.totalAmount,
      } as InvoiceRecognitionData;
    } else     if (file?.type === 'screenshot') {
      recognitionData = {
        type: 'screenshot',
        expenseType: editData.expenseType,
        count: editData.consumptionCount,
        startDate: editData.consumptionDate,
        amount: editData.totalConsumption,
      } as ScreenshotRecognitionData;
    }

    onUpdate({
      ...file!,
      recognitionData,
      customFileName: editData.description,
      ...(file?.type !== 'attachment' ? { metadata: { ...file!.metadata, aiFilename: editData.aiFilename } } : {}),
      remark,
      recognitionStatus: 'success',
    });
    setIsEditing(false);
    message.success('文件信息已保存');
  };

  // 渲染发票类型字段
  const renderInvoiceFields = () => (
    <>
      <div className="detail-field-row">
        <div className="detail-field-item">
          <label className="detail-field-label required">消费类型</label>
          <Select
            value={editData?.expenseType}
            onChange={(val) => setEditData({ ...editData, expenseType: val })}
            options={expenseTypeOptions}
            placeholder="选择消费类型"
            disabled={!isEditing}
          />
        </div>
        <div className="detail-field-item">
          <label className="detail-field-label required">发票号码</label>
          <Input
            value={editData?.invoiceNumber}
            onChange={(e) => setEditData({ ...editData, invoiceNumber: e.target.value })}
            placeholder="请输入发票号码"
            disabled={!isEditing}
          />
        </div>
      </div>
      <div className="detail-field-row">
        <div className="detail-field-item">
          <label className="detail-field-label required">开票日期</label>
          <DatePicker
            value={editData?.invoiceDate ? dayjs(editData.invoiceDate) : null}
            onChange={(date) => setEditData({ ...editData, invoiceDate: date?.format('YYYY-MM-DD') })}
            style={{ width: '100%' }}
            disabled={!isEditing}
            placeholder="选择日期"
          />
        </div>
        <div className="detail-field-item">
          <label className="detail-field-label required">价税合计</label>
          <Input
            type="number"
            value={editData?.totalAmount}
            onChange={(e) => setEditData({ ...editData, totalAmount: parseFloat(e.target.value) || 0 })}
            placeholder="请输入金额"
            disabled={!isEditing}
            prefix="¥"
          />
        </div>
      </div>
      <div className="detail-field-row">
        <div className="detail-field-item">
          <label className="detail-field-label required">销售方</label>
          <Input
            value={editData?.seller}
            onChange={(e) => setEditData({ ...editData, seller: e.target.value })}
            placeholder="请输入销售方名称"
            disabled={!isEditing}
          />
        </div>
        <div className="detail-field-item">
          <label className="detail-field-label required">购买方</label>
          <Input
            value={editData?.buyer}
            onChange={(e) => setEditData({ ...editData, buyer: e.target.value })}
            placeholder="请输入购买方名称"
            disabled={!isEditing}
          />
        </div>
      </div>
      <div className="detail-field-row">
        <div className="detail-field-item">
          <label className="detail-field-label">AI文件改名</label>
          <Input
            value={editData?.aiFilename || ''}
            onChange={(e) => setEditData({ ...editData, aiFilename: e.target.value })}
            placeholder="选填，AI识别后自动修改的文件名"
            disabled={!isEditing}
          />
        </div>
        <div className="detail-field-item">
          <label className="detail-field-label">文件简述</label>
          <Input
            value={editData?.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            placeholder="简要描述"
            disabled={!isEditing}
          />
        </div>
      </div>
    </>
  );

  // 渲染截图类型字段
  const renderScreenshotFields = () => (
    <>
      <div className="detail-field-row">
        <div className="detail-field-item">
          <label className="detail-field-label required">消费类型</label>
          <Select
            value={editData?.expenseType}
            onChange={(val) => setEditData({ ...editData, expenseType: val })}
            options={expenseTypeOptions}
            placeholder="选择消费类型"
            disabled={!isEditing}
          />
        </div>
        <div className="detail-field-item">
          <label className="detail-field-label required">消费次数</label>
          <Input
            value={editData?.consumptionCount}
            onChange={(e) => setEditData({ ...editData, consumptionCount: e.target.value })}
            placeholder="如：1次"
            disabled={!isEditing}
          />
        </div>
      </div>
      <div className="detail-field-row">
        <div className="detail-field-item">
          <label className="detail-field-label required">消费日期</label>
          <DatePicker
            value={editData?.consumptionDate ? dayjs(editData.consumptionDate) : null}
            onChange={(date) => setEditData({ ...editData, consumptionDate: date?.format('YYYY-MM-DD') })}
            style={{ width: '100%' }}
            disabled={!isEditing}
            placeholder="选择日期"
          />
        </div>
        <div className="detail-field-item">
          <label className="detail-field-label">AI文件改名</label>
          <Input
            value={editData?.aiFilename || ''}
            onChange={(e) => setEditData({ ...editData, aiFilename: e.target.value })}
            placeholder="选填，AI识别后自动修改的文件名"
            disabled={!isEditing}
          />
        </div>
      </div>
      <div className="detail-field-row">
        <div className="detail-field-item">
          <label className="detail-field-label required">总额</label>
          <Input
            type="number"
            value={editData?.totalConsumption}
            onChange={(e) => setEditData({ ...editData, totalConsumption: parseFloat(e.target.value) || 0 })}
            placeholder="请输入总额"
            disabled={!isEditing}
            prefix="¥"
          />
        </div>
        <div className="detail-field-item">
          <label className="detail-field-label">文件简述</label>
          <Input
            value={editData?.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            placeholder="简要描述"
            disabled={!isEditing}
          />
        </div>
      </div>
    </>
  );

  // 渲染附件类型字段
  const renderAttachmentFields = () => (
    <>
      <div className="detail-field-row">
        <div className="detail-field-item">
          <label className="detail-field-label">AI文件改名</label>
          <Input
            value={editData?.aiFilename || ''}
            onChange={(e) => setEditData({ ...editData, aiFilename: e.target.value })}
            placeholder="选填，AI识别后自动修改的文件名"
            disabled={!isEditing}
          />
        </div>
        <div className="detail-field-item">
          <label className="detail-field-label">文件简述</label>
          <Input
            value={editData?.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            placeholder="简要描述"
            disabled={!isEditing}
          />
        </div>
      </div>
    </>
  );

  if (!file) return null;

  const previewType = getFilePreviewType(file.name);

  return (
    <Modal
      title={
        <div className="detail-modal-title">
          <span>📄 {file.name}</span>
          <span className={`type-badge type-${file.type}`}>
            {file.type === 'invoice' ? '发票' : file.type === 'screenshot' ? '截图' : '附件'}
          </span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={700}
      footer={
        <div className="detail-modal-footer">
          <Button danger icon={<DeleteOutlined />} onClick={() => {
            onDelete(file.id);
            onClose();
          }}>
            删除
          </Button>
          <Space>
            {isEditing ? (
              <>
                <Button onClick={() => setIsEditing(false)}>取消</Button>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
                  保存
                </Button>
              </>
            ) : (
              <>
                <Button icon={<EditOutlined />} onClick={() => setIsEditing(true)}>
                  编辑
                </Button>
                {file.type !== 'attachment' && (
                  <Button icon={<ReloadOutlined />} onClick={handleReRecognize}>
                    重新识别
                  </Button>
                )}
                {file.confirmed ? (
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={handleUnconfirm}
                  >
                    取消确认
                  </Button>
                ) : (
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    onClick={handleConfirm}
                  >
                    确认
                  </Button>
                )}
              </>
            )}
          </Space>
        </div>
      }
    >
      <div className="detail-modal-content">
        {/* 文件预览 */}
        <div className="detail-section">
          <h4 className="detail-section-title">文件预览</h4>
          <div className="file-preview-area">
            {previewType === 'image' ? (
              <div className="preview-image-container">
                {previewLoading ? (
                  <div className="preview-placeholder">
                    <LoadingOutlined style={{ fontSize: 48, color: '#9CA3AF' }} spin />
                    <span>加载中...</span>
                  </div>
                ) : previewUrl ? (
                  <img src={previewUrl} alt={file.name} className="preview-image" />
                ) : (
                  <div className="preview-placeholder">
                    <FileImageOutlined style={{ fontSize: 48, color: '#9CA3AF' }} />
                    <span>图片预览</span>
                  </div>
                )}
              </div>
            ) : previewType === 'pdf' ? (
              <div className="preview-pdf-container">
                <div className="preview-placeholder">
                  <FilePdfOutlined style={{ fontSize: 48, color: '#EF4444' }} />
                  <span>PDF 文档</span>
                  <span className="file-name-preview">{file.name}</span>
                </div>
              </div>
            ) : (
              <div className="preview-file-container">
                <div className="preview-placeholder">
                  <FileOutlined style={{ fontSize: 48, color: '#6B7280' }} />
                  <span>文件预览</span>
                  <span className="file-name-preview">{file.name}</span>
                </div>
              </div>
            )}
            <div className="preview-info">
              <span>{file.name}</span>
              <span>{formatFileSize(file.size)}</span>
            </div>
          </div>
        </div>

        {/* 基本信息 */}
        <div className="detail-section">
          <h4 className="detail-section-title">基本信息</h4>
          <div className="detail-info-row">
            <span className="info-label">上传时间：</span>
            <span className="info-value">{new Date(file.createdAt).toLocaleString('zh-CN')}</span>
          </div>
          <div className="detail-info-row">
            <span className="info-label">识别状态：</span>
            <span className={`status-badge status-${
              (file as any).confirmed === true ? 'confirmed' :
              (file as any).status === 2 ? 'success' :
              (file as any).status === 3 ? 'failed' :
              (file as any).status === 1 ? 'recognizing' : 'pending'
            }`}>
              {(file as any).confirmed === true ? '已确认' :
               (file as any).status === 2 ? '已识别' :
               (file as any).status === 1 ? '识别中' :
               (file as any).status === 3 ? '识别失败' : '待识别'}
            </span>
          </div>
        </div>

        {/* AI识别结果 */}
        <div className="detail-section">
          <h4 className="detail-section-title">
            AI识别结果
            {!requiredFieldsFilled && file.type !== 'attachment' && (
              <span className="required-hint">（*为必填字段）</span>
            )}
          </h4>
          <div className="detail-fields-container">
            {file.type === 'invoice' && renderInvoiceFields()}
            {file.type === 'screenshot' && renderScreenshotFields()}
            {file.type === 'attachment' && renderAttachmentFields()}
          </div>
        </div>

        {/* 备注信息 */}
        <div className="detail-section">
          <h4 className="detail-section-title">备注信息</h4>
          <TextArea
            rows={3}
            placeholder="添加备注信息..."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            disabled={!isEditing}
          />
        </div>
      </div>
    </Modal>
  );
};

// 子文件夹编辑组件
interface FolderEditorProps {
  folderId: string;
  currentName: string;
  onSave: (name: string) => void;
}

const FolderEditor: React.FC<FolderEditorProps> = ({ folderId, currentName, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(currentName);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setName(currentName);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Space.Compact size="small" className="folder-editor-inline">
        <Input
          size="small"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onPressEnter={handleSave}
          style={{ width: 100 }}
          autoFocus
        />
        <Button size="small" type="primary" onClick={handleSave}>保存</Button>
        <Button size="small" onClick={handleCancel}>取消</Button>
      </Space.Compact>
    );
  }

  return (
    <div className="folder-item-content">
      <span className="folder-name">{currentName}</span>
      <Button
        type="link"
        size="small"
        icon={<EditOutlined />}
        onClick={() => setIsEditing(true)}
        className="folder-edit-btn"
      />
    </div>
  );
};

// 分离的上传区域组件
interface UploadAreaProps {
  type: 'invoice' | 'screenshot' | 'attachment';
  files: UploadFile[];
  onFileChange: (files: UploadFile[]) => void;
}

const UploadArea: React.FC<UploadAreaProps> = ({ type, files, onFileChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const getTitle = () => {
    switch (type) {
      case 'invoice': return '📄 发票文件';
      case 'screenshot': return '🖼️ 付款截图';
      case 'attachment': return '📎 附加材料';
    }
  };

  const getAccept = () => {
    switch (type) {
      case 'invoice': return '.pdf';
      case 'screenshot': return 'image/*';
      case 'attachment': return '*/*';
    }
  };

  const getHint = () => {
    switch (type) {
      case 'invoice': return '支持 PDF 文件';
      case 'screenshot': return '支持 JPG、PNG 等图片';
      case 'attachment': return '支持所有文件格式';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: UploadFile[] = Array.from(selectedFiles).map((file) => ({
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      file: file,
      size: file.size,
      type: type,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      recognitionStatus: 'pending' as const,
      confirmed: false,
    }));

    onFileChange([...files, ...newFiles]);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles) return;

    const newFiles: UploadFile[] = Array.from(droppedFiles).map((file) => ({
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      file: file,
      size: file.size,
      type: type,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      recognitionStatus: 'pending' as const,
      confirmed: false,
    }));

    onFileChange([...files, ...newFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="upload-area-container">
      <div className="upload-area-header">
        <span className="upload-area-title">{getTitle()}</span>
        <span className="upload-area-count">{files.length} 个文件</span>
      </div>
      <div
        className="upload-area-drag"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={getAccept()}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <InboxOutlined className="upload-icon" />
        <p className="upload-text">点击或拖拽文件到此处上传</p>
        <p className="upload-hint">{getHint()}</p>
      </div>
      {files.length > 0 && (
        <div className="upload-area-files">
          {files.slice(0, 5).map((file) => (
            <div key={file.id} className="upload-file-item">
              <FileOutlined />
              <span className="upload-file-name" title={file.name}>{file.name}</span>
              <span className="upload-file-size">{formatFileSize(file.size)}</span>
            </div>
          ))}
          {files.length > 5 && (
            <div className="upload-file-more">还有 {files.length - 5} 个文件...</div>
          )}
        </div>
      )}
    </div>
  );
};

export const ArchivePage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Redux state - 项目列表
  const {
    projects,
    projectsLoading,
    currentProject: projectDetail,
  } = useAppSelector(state => state.project);

  // Redux state - 文件列表
  const {
    files: apiFiles,
    filesLoading,
    batchRecognizeTask,
    batchRecognizeLoading,
  } = useAppSelector(state => state.files);

  // 本地文件列表（来自 API）
  const files = apiFiles;

  // 文件详情弹窗状态
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileVO | null>(null);

  // 根据文件类型从 projectDetail.folders 中查找对应子文件夹 ID
  const getSubfolderId = (type: 'invoice' | 'screenshot' | 'attachment'): number | undefined => {
    if (!projectDetail?.folders) return undefined;
    for (const rootFolder of projectDetail.folders) {
      const children = rootFolder.children || [];
      const match = children.find(sub => sub.type === type);
      if (match) return match.id;
    }
    return undefined;
  };

  // URL 参数中的 projectId（从首页跳转时传入）
  const urlProjectId = searchParams.get('projectId');

  // 跟踪当前生效的项目 ID（用于让 effect 判断是否需要跳过本次执行）
  // 用 '___INIT___' 作为哨兵值，确保首次 render 时 effect 一定会执行
  const projectIdRef = useRef('___INIT___');

  // 初始化 / 项目切换：根据 urlProjectId 加载数据
  useEffect(() => {
    // urlProjectId === projectIdRef：说明本次是 fetchProjectDetail 成功后引起的 re-render，跳过
    // urlProjectId !== projectIdRef：说明是新的加载请求，执行
    if (urlProjectId !== projectIdRef.current) {
      projectIdRef.current = urlProjectId ?? '___NULL___';
      if (urlProjectId) {
        dispatch(fetchProjectDetail(parseInt(urlProjectId)));
      }
    }
  }, [dispatch, urlProjectId]);

  // projectDetail 变化时加载文件列表和文件夹（自动响应）
  useEffect(() => {
    if (projectDetail?.id) {
      const pid = Number(projectDetail.id);
      dispatch(fetchFileList({ projectId: pid, size: 100 }));
      dispatch(fetchFolders(pid));
    }
  }, [dispatch, projectDetail?.id]);

  // 批量识别 Hook
  const { progress: batchProgress, isRunning: isBatchRunning, startRecognize, stopRecognize } = useBatchRecognize({
    pollInterval: 3000,
    timeout: 5 * 60 * 1000,
    onFileRecognized: (result: FileRecognitionResult) => {
      // 根据识别结果更新对应文件的状态
      if (projectDetail?.id) {
        dispatch(fetchFileList({ projectId: Number(projectDetail.id), size: 100 }));
      }
    },
    onAllCompleted: (results: FileRecognitionResult[]) => {
      const successCount = results.filter(r => r.status === 'success').length;
      const failCount = results.filter(r => r.status === 'failed').length;
      if (failCount > 0) {
        message.warning(`识别完成：成功 ${successCount} 个，失败 ${failCount} 个`);
      } else {
        message.success(`识别完成，共识别 ${successCount} 个文件`);
      }
      // 刷新文件列表
      if (projectDetail?.id) {
        const pid = Number(projectDetail.id);
        dispatch(fetchFileList({ projectId: pid, size: 100 }));
        dispatch(fetchProjectDetail(pid));
      }
    },
    onError: (error: string) => {
      message.error(`识别失败：${error}`);
    },
  });

  // 处理项目切换（Effect 1 通过 urlProjectId 变化触发加载，Effect 2 自动加载文件列表）
  const handleProjectChange = (projectId: string | number) => {
    if (!projectId) return;
    const pid = typeof projectId === 'string' ? parseInt(projectId) : projectId;

    // 清除旧项目数据（触发 Effect 2 跳过本次）
    if (projectDetail?.id !== pid) {
      dispatch(clearCurrentProject());
    }

    // 通过更新 URL 触发 Effect 1 加载项目详情
    navigate(`/archive?projectId=${pid}`, { replace: true });
  };

  // 上传文件（自动归档到对应类型的子文件夹）
  const handleUploadFile = async (
    type: 'invoice' | 'screenshot' | 'attachment',
    uploadFiles: File[]
  ) => {
    if (!projectDetail?.id) {
      message.warning('请先选择或创建报销项目');
      return;
    }
    const projectId = Number(projectDetail.id);
    const folderId = getSubfolderId(type);
    for (const file of uploadFiles) {
      try {
        await dispatch(uploadFile({ projectId, file, type, folderId })).unwrap();
      } catch (err: any) {
        message.error(`上传失败: ${file.name} - ${err.message}`);
      }
    }
    // 刷新文件列表和文件夹结构
    dispatch(fetchFileList({ projectId, size: 100 }));
    dispatch(fetchFolders(projectId));
  };

  // 删除文件
  const handleDeleteFile = async (fileId: number) => {
    if (!projectDetail?.id) return;
    try {
      await dispatch(deleteFile({ projectId: Number(projectDetail.id), fileId })).unwrap();
      message.success('文件已删除');
    } catch (err: any) {
      message.error(err.message || '删除失败');
    }
  };

  // 更新文件信息
  const handleUpdateFile = async (fileId: number, data: any) => {
    if (!projectDetail?.id) return;
    const projectId = Number(projectDetail.id);
    const isConfirming = data.confirmed === 1;
    try {
      await dispatch(updateFile({ projectId, fileId, data })).unwrap();
      message.success(data.confirmed === 1 ? '文件已确认' : '文件信息已保存');
      dispatch(fetchFileList({ projectId, size: 100 }));
      if (isConfirming) {
        dispatch(fetchReportItems({ projectId }));
      }
    } catch (err: any) {
      message.error(err.message || '保存失败');
    }
  };

  // 单文件识别
  const handleRecognizeFile = async (fileId: number) => {
    if (!projectDetail?.id) return;
    const projectId = Number(projectDetail.id);
    try {
      message.loading('正在识别...', 1.5);
      await dispatch(recognizeFile({ projectId, fileId })).unwrap();
      message.success('识别完成');
      dispatch(fetchFileList({ projectId, size: 100 }));
    } catch (err: any) {
      message.error(err.message || '识别失败');
    }
  };

  // 识别所有文件（排除附加材料类型、已识别、已确认的文件）
  const handleRecognizeAll = async () => {
    if (files.length === 0) return;
    if (!projectDetail?.id) {
      message.warning('请先选择报销项目');
      return;
    }
    // 过滤条件：非附件类型 + 非已识别(status=2) + 非已确认(confirmed=1)
    const filesToRecognize = files.filter(f =>
      f.type !== 'attachment' &&
      (f as any).status !== 2 &&
      (f as any).confirmed !== 1
    );
    if (filesToRecognize.length === 0) {
      message.info('没有需要识别的发票或截图文件（均已识别或已确认）');
      return;
    }
    const fileIds = filesToRecognize.map(f => f.id);
    startRecognize(Number(projectDetail.id), fileIds);
  };

  // 确认所有文件（批量确认 API）
  const handleConfirmAll = async () => {
    if (files.length === 0) return;
    if (!projectDetail?.id) {
      message.warning('请先选择报销项目');
      return;
    }
    const projectId = Number(projectDetail.id);
    const unconfirmedFiles = files.filter(f => f.confirmed !== 1);
    if (unconfirmedFiles.length === 0) {
      message.info('所有文件已确认');
      return;
    }

    // 前端校验：逐个检查未确认文件的必填字段
    const incompleteFiles: string[] = [];
    for (const file of unconfirmedFiles) {
      const result = file.recognitionResult;
      if (file.type === 'invoice') {
        if (
          !result ||
          !result.expenseType ||
          !result.invoiceNumber ||
          !result.invoiceDate ||
          !result.totalAmount ||
          !result.seller ||
          !result.buyer
        ) {
          incompleteFiles.push(file.name || file.originalName || `文件#${file.id}`);
        }
      } else if (file.type === 'screenshot') {
        if (
          !result ||
          !result.expenseType ||
          !result.consumptionCount ||
          !result.consumptionDate ||
          !result.totalConsumption
        ) {
          incompleteFiles.push(file.name || file.originalName || `文件#${file.id}`);
        }
      }
    }

    if (incompleteFiles.length > 0) {
      message.error(`以下文件信息不完整，无法确认：\n${incompleteFiles.join('\n')}`);
      return;
    }

    try {
      await dispatch(batchConfirmFiles({ projectId, fileIds: unconfirmedFiles.map(f => f.id) })).unwrap();
      message.success(`确认完成，共确认 ${unconfirmedFiles.length} 个文件，已自动添加报表明细`);
      dispatch(fetchFileList({ projectId, size: 100 }));
      dispatch(fetchProjectDetail(projectId));
      dispatch(fetchReportItems({ projectId }));
    } catch (err: any) {
      message.error(err.message || '确认失败');
    }
  };

  // 取消文件确认
  const handleUnconfirmFile = async (fileId: number) => {
    if (!projectDetail?.id) return;
    const projectId = Number(projectDetail.id);
    try {
      await dispatch(unconfirmFile({ projectId, fileId })).unwrap();
      message.success('已取消确认，报销明细已移除');
      // 刷新文件列表、项目详情和报表明细
      dispatch(fetchFileList({ projectId, size: 100 }));
      dispatch(fetchProjectDetail(projectId));
      dispatch(fetchReportItems({ projectId }));
    } catch (err: any) {
      message.error(err.message || '取消确认失败');
    }
  };

  // 修改子文件夹名称
  const handleUpdateFolderName = async (folderId: number, name: string) => {
    if (!projectDetail?.id) return;
    try {
      await dispatch(updateFolder({
        projectId: Number(projectDetail.id),
        folderId,
        data: { name },
      })).unwrap();
      message.success('文件夹名称已更新');
    } catch (err: any) {
      message.error(err.message || '更新失败');
    }
  };

  // 点击卡片（先调用 getFile API 获取最新识别结果）
  const handleFileClick = async (file: FileVO) => {
    if (projectDetail?.id) {
      try {
        const latestFile = await dispatch(
          fetchFileDetail({ projectId: Number(projectDetail.id), fileId: file.id })
        ).unwrap();
        setSelectedFile(latestFile);
      } catch {
        setSelectedFile(file); // 降级：使用列表中的数据
      }
    } else {
      setSelectedFile(file);
    }
    setDetailModalVisible(true);
  };

  // 计算统计数据
  const totalFiles = files.length;
  const invoiceCount = files.filter(f => f.type === 'invoice').length;
  const screenshotCount = files.filter(f => f.type === 'screenshot').length;
  const attachmentCount = files.filter(f => f.type === 'attachment').length;

  // 项目下拉选项（去重）
  const projectOptions = useMemo(() => {
    const seen = new Set<number>();
    return projects
      .filter(p => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .map(p => ({ value: p.id, label: p.name }));
  }, [projects]);

  return (
    <div className="archive-page">
      <PageHeader
        title="资料上传"
        subtitle="上传发票、截图及附件，AI自动识别票据信息"
      />

      {/* 项目头部 */}
      <Card className="project-selector-card" size="small">
        <Space size="large" wrap>
          <Space>
            <Text strong>报销项目：</Text>
            <Select
              placeholder="请选择报销项目"
              value={projectDetail?.id ?? null}
              onChange={handleProjectChange}
              style={{ width: 300 }}
              loading={projectsLoading}
              showSearch
              optionFilterProp="label"
              suffixIcon={<FolderOpenOutlined />}
              options={projectOptions}
            />
          </Space>
          {projectDetail && (
            <Text type="secondary">
              当前项目：{projectDetail.name}
            </Text>
          )}
        </Space>
      </Card>

      <div className="archive-content">
        {/* 左侧：文件夹结构 */}
        <div className="archive-sidebar">
          <Card title="📁 归档文件夹" className="folder-card">
            <div className="folder-tree">
              {projectDetail ? (
                <>
                  <div className="folder-main">
                    <div className="folder-main-header">
                      <span className="folder-icon-large">📁</span>
                      <span className="folder-main-name">{projectDetail.name}</span>
                    </div>
                  </div>
                  <div className="folder-children">
                    {/* projectDetail.folders 是根文件夹列表，根文件夹的 children 才是子文件夹 */}
                    {projectDetail.folders?.flatMap(rootFolder =>
                      (rootFolder.children || []).map(sub => (
                        <div key={sub.id} className="folder-item">
                          <div className="folder-item-content">
                            <span className="folder-icon">📁</span>
                            <span className="folder-name">{sub.name}</span>
                            {sub.fileCount !== undefined && sub.fileCount > 0 && (
                              <span className="folder-file-count">({sub.fileCount})</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <Empty description="请先选择报销项目" />
              )}
            </div>
          </Card>
        </div>

        {/* 右侧：资料汇总 */}
        <div className="archive-main">
          {/* 资料上传区 */}
          <Card
            title="📤 资料上传"
            className="upload-card"
            extra={<ArchiveUploadGuide />}
          >
            <div className="upload-areas-split">
              <UploadArea
                type="invoice"
                files={files.filter(f => f.type === 'invoice').map(f => ({
                  ...f,
                  id: String(f.id),
                } as unknown as UploadFile))}
                onFileChange={(newFiles) => handleUploadFile('invoice', newFiles.map(f => f.file!).filter(Boolean) as File[])}
              />
              <UploadArea
                type="screenshot"
                files={files.filter(f => f.type === 'screenshot').map(f => ({
                  ...f,
                  id: String(f.id),
                } as unknown as UploadFile))}
                onFileChange={(newFiles) => handleUploadFile('screenshot', newFiles.map(f => f.file!).filter(Boolean) as File[])}
              />
              <UploadArea
                type="attachment"
                files={files.filter(f => f.type === 'attachment').map(f => ({
                  ...f,
                  id: String(f.id),
                } as unknown as UploadFile))}
                onFileChange={(newFiles) => handleUploadFile('attachment', newFiles.map(f => f.file!).filter(Boolean) as File[])}
              />
            </div>
          </Card>

          {/* 资料汇总 */}
          <Card
            title={
              <div className="summary-card-title">
                <span className="summary-title-text">📊 资料汇总</span>
                <div className="file-stats-inline">
                  <span>总计: <strong>{totalFiles}</strong></span>
                  <span>发票: <strong>{invoiceCount}</strong></span>
                  <span>截图: <strong>{screenshotCount}</strong></span>
                  <span>附件: <strong>{attachmentCount}</strong></span>
                </div>
              </div>
            }
            extra={
              <div className="card-actions">
                {isBatchRunning && batchProgress ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Progress type="circle" percent={batchProgress.progress} size={32} format={(p) => `${p}%`} />
                    <span style={{ fontSize: 12, color: '#666' }}>
                      {batchProgress.processed}/{batchProgress.total}
                    </span>
                    <Button size="small" danger onClick={stopRecognize}>停止</Button>
                  </div>
                ) : (
                  <>
                    <Button type="primary" icon={<RobotOutlined />} onClick={handleRecognizeAll} disabled={totalFiles === 0 || !projectDetail}>一键识别</Button>
                    <Button type="primary" icon={<CheckOutlined />} onClick={handleConfirmAll} disabled={totalFiles === 0 || !projectDetail} style={{ background: '#10B981', borderColor: '#10B981' }}>全部确认</Button>
                  </>
                )}
              </div>
            }
            className="summary-card"
          >
            {filesLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <LoadingOutlined style={{ fontSize: 32 }} spin />
              </div>
            ) : totalFiles > 0 ? (
              <div className="file-grid">
                {files.map(file => (
                  <FileCard
                    key={file.id}
                    file={{
                      ...file,
                      id: String(file.id),
                      confirmed: file.confirmed === 1,
                    } as unknown as UploadFile}
                    onClick={() => handleFileClick(file)}
                  />
                ))}
              </div>
            ) : (
              <Empty description="暂无文件，请上传资料" />
            )}
          </Card>
        </div>
      </div>

      {/* 文件详情弹窗 */}
      <FileDetailModal
        file={selectedFile ? {
          ...selectedFile,
          id: String(selectedFile.id),
          confirmed: selectedFile.confirmed === 1,
        } as unknown as UploadFile : null}
        apiFile={selectedFile}
        visible={detailModalVisible}
        projectId={projectDetail?.id ? String(projectDetail.id) : undefined}
        onClose={() => setDetailModalVisible(false)}
        onUpdate={async (file: any) => {
          // file.id 是字符串，转为数字
          // 附加材料类型不修改文件名，不传 aiFilename
          const isAttachment = file.type === 'attachment';
          const data: any = {
            remark: file.remark,
            description: file.customFileName,
            ...(isAttachment ? {} : { aiFilename: file.metadata?.aiFilename }),
          };

          // 处理 confirmed 字段（确认按钮会传入 confirmed: 1）
          const isConfirming = file.confirmed === 1 || file.confirmed === true;
          if (isConfirming) {
            data.confirmed = 1;
          }

          // 根据文件类型添加对应的识别结果字段
          if (file.type === 'invoice' && file.recognitionData) {
            data.expenseType = file.recognitionData.expenseType;
            data.invoiceNumber = file.recognitionData.invoiceNumber;
            data.invoiceDate = file.recognitionData.invoiceDate;
            data.seller = file.recognitionData.seller;
            data.buyer = file.recognitionData.buyer;
            data.totalAmount = file.recognitionData.amount;
          } else if (file.type === 'screenshot' && file.recognitionData) {
            data.expenseType = file.recognitionData.expenseType;
            data.consumptionCount = file.recognitionData.count;
            data.consumptionDate = file.recognitionData.startDate;
            data.totalConsumption = file.recognitionData.amount;
          }

          await handleUpdateFile(parseInt(file.id), data);

          // 更新本地 selectedFile 状态，确保再次打开弹窗显示最新数据
          setSelectedFile((prev: any) => ({
            ...prev,
            ...file,
            remark: file.remark,
            name: file.customFileName || file.name,
            confirmed: isConfirming ? 1 : (prev?.confirmed || 0),
          }));
        }}
        onDelete={(id: string) => handleDeleteFile(parseInt(id))}
        onReRecognize={(id: string) => handleRecognizeFile(parseInt(id))}
        onUnconfirm={(id: string) => handleUnconfirmFile(parseInt(id))}
      />
    </div>
  );
};
