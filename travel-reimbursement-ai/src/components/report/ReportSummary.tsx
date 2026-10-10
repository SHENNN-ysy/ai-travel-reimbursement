import React from 'react';
import { Card, Statistic, Row, Col } from 'antd';
import { FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { ReportItem } from '@/types';
import './ReportSummary.css';

interface ProjectDetailData {
  totalAmount: number;
  fileCount: number;
  confirmedCount: number;
  unconfirmedCount: number;
}

interface ReportSummaryProps {
  items?: ReportItem[];
  projectDetail?: ProjectDetailData;
  totalAmount?: number;
  itemCount?: number;
  confirmedCount?: number;
  pendingCount?: number;
}

export const ReportSummary: React.FC<ReportSummaryProps> = ({
  items,
  projectDetail,
  totalAmount: propTotalAmount,
  itemCount: propItemCount,
  confirmedCount: propConfirmedCount,
  pendingCount: propPendingCount,
}) => {
  // 优先使用 projectDetail 中的数据（复用 1.3 接口）
  const displayTotalAmount = projectDetail?.totalAmount ?? propTotalAmount ?? 0;
  const displayItemCount = projectDetail?.fileCount ?? propItemCount ?? items?.length ?? 0;
  const displayConfirmedCount = projectDetail?.confirmedCount ?? propConfirmedCount ?? 0;
  const displayPendingCount = projectDetail?.unconfirmedCount ?? propPendingCount ?? 0;

  const typeSummary = items?.reduce((acc, item) => {
    acc[item.expenseType ?? ''] = (acc[item.expenseType ?? ''] || 0) + (item.amount || 0);
    return acc;
  }, {} as Record<string, number>) ?? {};

  const transportAmount = typeSummary['transport'] || 0;
  const cateringAmount = typeSummary['catering'] || 0;
  const accommodationAmount = typeSummary['accommodation'] || 0;
  const purchaseAmount = typeSummary['purchase'] || 0;

  return (
    <div className="report-summary">
      <Row gutter={[16, 16]}>
        <Col xs={12}>
          <Card>
            <Statistic
              title="报销总额"
              value={displayTotalAmount}
              precision={2}
              prefix="¥"
              valueStyle={{ color: '#10B981', fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={12}>
          <Card>
            <Statistic
              title="票据数量"
              value={displayItemCount}
              suffix="张"
              valueStyle={{ color: '#3B82F6', fontWeight: 600 }}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12}>
          <Card>
            <Statistic
              title="已确认"
              value={displayConfirmedCount}
              suffix="张"
              valueStyle={{ color: '#10B981', fontWeight: 600 }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12}>
          <Card>
            <Statistic
              title="待确认"
              value={displayPendingCount}
              suffix="张"
              valueStyle={{ color: '#F59E0B', fontWeight: 600 }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {items && items.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24}>
            <Card title="费用分类">
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center', padding: '10px 20px', background: '#EFF6FF', borderRadius: 8, border: '1px solid #DBEAFE', minWidth: 100 }}>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>🚕 交通</div>
                  <div style={{ fontWeight: 700, color: '#2563EB', fontSize: 15 }}>¥{transportAmount.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px 20px', background: '#FFF7ED', borderRadius: 8, border: '1px solid #FED7AA', minWidth: 100 }}>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>🍽️ 餐饮</div>
                  <div style={{ fontWeight: 700, color: '#EA580C', fontSize: 15 }}>¥{cateringAmount.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px 20px', background: '#F5F3FF', borderRadius: 8, border: '1px solid #DDD6FE', minWidth: 100 }}>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>🏨 住宿</div>
                  <div style={{ fontWeight: 700, color: '#7C3AED', fontSize: 15 }}>¥{accommodationAmount.toFixed(2)}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '10px 20px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0', minWidth: 100 }}>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>🛒 采购</div>
                  <div style={{ fontWeight: 700, color: '#16A34A', fontSize: 15 }}>¥{purchaseAmount.toFixed(2)}</div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};
