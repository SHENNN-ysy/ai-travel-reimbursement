import React from 'react';
import { Card, Table, Input, Select, DatePicker, Button, Space, Typography, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { PlusOutlined, DeleteOutlined, EditOutlined, FileTextOutlined, PictureOutlined } from '@ant-design/icons';
import { formatCurrency } from '@/utils/format';
import './ReportTable.css';

const { Text } = Typography;

// 与后端 ReportItemVO 对齐：hasReceipt 为 number (0=无, 1=有)
export interface ReportTableItem {
  id: number;
  date: string;
  receiptType: string; // 票据类型：发票/截图
  receiptTypeName: string;
  expenseType: string; // 消费类型：transport/catering/accommodation/purchase
  expenseTypeName: string; // 消费类型中文名
  summary: string;
  amount: number;
  remark: string;
  hasReceipt: number; // 0=无票据, 1=有票据
  receiptFile: string;
  receiptFileId: number;
  receiptFileName: string;
  createdAt: string;
  updatedAt: string;
}

interface ReportTableProps {
  items: ReportTableItem[];
  onEdit: (record: ReportTableItem) => void;
  onDelete: (id: number) => void;
  readOnly?: boolean;
  loading?: boolean;
}

// 按类型分类的项目
const getItemsByType = (items: ReportTableItem[], type: string) => {
  return items.filter(item => item.receiptType === type);
};

// 票据类型映射（新的分类方式）
const fileTypeLabels: Record<string, string> = {
  '发票': '发票',
  '截图': '截图',
};

const fileTypeOptions = [
  { value: '发票', label: '发票' },
  { value: '截图', label: '截图' },
];

// 单个分类表格组件
interface CategoryTableProps {
  type: string;
  items: ReportTableItem[];
  readOnly?: boolean;
  onEdit: (record: ReportTableItem) => void;
  onDelete: (id: number) => void;
}

  // 消费类型映射
const expenseTypeLabels: Record<string, string> = {
  'transport': '交通',
  'catering': '餐饮',
  'accommodation': '住宿',
  'purchase': '采购',
};

const expenseTypeColors: Record<string, string> = {
  'transport': '#3B82F6',
  'catering': '#F59E0B',
  'accommodation': '#8B5CF6',
  'purchase': '#10B981',
};

const CategoryTable: React.FC<CategoryTableProps> = ({
  type,
  items,
  readOnly = false,
  onEdit,
  onDelete,
}) => {
  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const typeLabel = fileTypeLabels[type] || type;

  const columns: ColumnsType<ReportTableItem> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 130,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      key: 'summary',
      width: 180,
      ellipsis: true,
    },
    {
      title: '票据文件',
      dataIndex: 'receiptFile',
      key: 'receiptFile',
      width: 160,
      ellipsis: true,
      render: (val: string, record: ReportTableItem) => val || record.receiptFileName || '-',
    },
    {
      title: '票据类型',
      dataIndex: 'receiptType',
      key: 'receiptType',
      width: 90,
      align: 'center' as const,
      render: (v: string) => {
        if (v === '发票') {
          return <Tag color="blue" icon={<FileTextOutlined />}>发票</Tag>;
        }
        if (v === '截图') {
          return <Tag color="purple" icon={<PictureOutlined />}>截图</Tag>;
        }
        return <Tag>{v || '-'}</Tag>;
      },
    },
    {
      title: '消费类型',
      dataIndex: 'expenseType',
      key: 'expenseType',
      width: 90,
      align: 'center' as const,
      render: (v: string) => {
        const color = expenseTypeColors[v] || '#6B7280';
        return <Tag style={{ color, borderColor: color }}>{expenseTypeLabels[v] || v || '-'}</Tag>;
      },
    },
    {
      title: () => (
        <span>
          金额
          <Text type="danger" style={{ fontSize: 10, marginLeft: 2 }}>*</Text>
        </span>
      ),
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right' as const,
      render: (amount: number) => (
        <Text strong style={{ color: '#059669' }}>
          ¥{amount.toFixed(2)}
        </Text>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark',
      width: 140,
      ellipsis: true,
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      align: 'center' as const,
      render: (_, record) => (
        <Space size="small">
          {!readOnly && (
            <>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onEdit(record)}
              >
                编辑
              </Button>
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => onDelete(record.id)}
              >
                删除
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  if (items.length === 0) return null;

  return (
    <Card size="small" className={`category-card category-${type}`}>
      <div className="category-header">
        <Space>
          <Tag className={`category-tag category-tag-${type}`}>{typeLabel}</Tag>
          <Text strong className="category-count">
            {items.length} 条记录
          </Text>
          <Text strong className="category-amount">
            小计: {formatCurrency(totalAmount)}
          </Text>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={items}
        pagination={false}
        bordered
        size="small"
        rowKey="id"
        scroll={{ x: 800 }}
        className="category-table"
        locale={{ emptyText: '暂无数据' }}
      />
    </Card>
  );
};

export const ReportTable: React.FC<ReportTableProps> = ({
  items,
  onEdit,
  onDelete,
  readOnly = false,
  loading = false,
}) => {
  const invoiceItems = getItemsByType(items, '发票');
  const screenshotItems = getItemsByType(items, '截图');

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  if (items.length === 0 && !loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
        暂无报表明细
      </div>
    );
  }

  return (
    <div className="report-table-container">
      <div className="report-table-header">
        <div className="summary-total">
          <Text className="summary-total-label">合计: </Text>
          <Text strong className="total-amount">{formatCurrency(totalAmount)}</Text>
        </div>
      </div>

      <div className="report-table-content">
        <CategoryTable
          type="发票"
          items={invoiceItems}
          readOnly={readOnly}
          onEdit={onEdit}
          onDelete={onDelete}
        />

        <CategoryTable
          type="截图"
          items={screenshotItems}
          readOnly={readOnly}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
};
