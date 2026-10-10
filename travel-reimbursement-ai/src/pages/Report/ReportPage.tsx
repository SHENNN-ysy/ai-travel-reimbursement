import React, { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import {
  Row, Col, Button, message, Select, Card, Space, Typography, Modal,
  DatePicker, Input, Divider,
} from 'antd';
import {
  SendOutlined, FolderOpenOutlined, EditOutlined, PlusOutlined,
  DeleteOutlined, FileTextOutlined, PictureOutlined,
} from '@ant-design/icons';
import { PageHeader } from '@/components/common';
import { ReportTable, ReportSummary, ExportButton } from '@/components/report';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchProjects, fetchProjectDetail, clearCurrentProject } from '@/store/slices/projectSlice';
import { fetchFileList } from '@/store/slices/fileSlice';
import { fetchReportItems, clearReport } from '@/store/slices/reportSlice';
import { createReportItem, updateReportItem, deleteReportItem, exportReport } from '@/store/slices/reportSlice';
import { ProjectVO, ProjectDetailVO } from '@/api';
import './ReportPage.css';

const { Text, Title } = Typography;
const { TextArea } = Input;

let projectsFetched = false;

export const ReportPage: React.FC = () => {
  const dispatch = useAppDispatch();

  // Redux state
  const { projects, projectsLoading } = useAppSelector(state => state.project);
  const { currentProject } = useAppSelector(state => state.project);
  const { items, itemsLoading, exportLoading } = useAppSelector(state => state.report);
  const { files } = useAppSelector(state => state.files);

  // Local state
  const [reportLocked, setReportLocked] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  // 消费类型选项
  const expenseTypeOptions = [
    { value: 'transport', label: '交通' },
    { value: 'catering', label: '餐饮' },
    { value: 'accommodation', label: '住宿' },
    { value: 'purchase', label: '采购' },
  ];

  // 票据类型选项
  const receiptTypeOptions = [
    { value: '发票', label: '发票' },
    { value: '截图', label: '截图' },
  ];

  // 加载项目列表（通过模块级标志位防止 StrictMode 和 Redux 状态变化导致重复请求）
  useEffect(() => {
    if (projectsFetched) return;
    projectsFetched = true;
    dispatch(fetchProjects({ size: 50 }));
  }, [dispatch]);

  // 项目变化时加载详情、文件列表和报表明细
  useEffect(() => {
    if (currentProject?.id) {
      dispatch(fetchFileList({ projectId: currentProject.id, size: 200 }));
      dispatch(fetchReportItems({ projectId: currentProject.id }));
    }
  }, [currentProject?.id]);

  // 切换项目
  const handleProjectChange = (value: number | null) => {
    setReportLocked(false);
    if (value) {
      const project = projects.find(p => p.id === value);
      dispatch(fetchProjectDetail(value));
      message.info(`已选择项目: ${project?.name}`);
    } else {
      dispatch(clearCurrentProject());
      dispatch(clearReport());
    }
  };

  // 添加行
  const handleAddRow = (receiptType: string = '发票') => {
    if (!currentProject?.id) {
      message.warning('请先选择报销项目');
      return;
    }
    setEditingItem({
      id: null,
      date: new Date().toISOString().split('T')[0],
      receiptType, // 票据类型：发票 / 截图
      expenseType: 'transport', // 消费类型，默认交通
      hasReceipt: 1,
      receiptFile: '',
      amount: 0,
      summary: '',
      remark: '',
      receiptFileId: null,
    });
    setEditModalVisible(true);
  };

  // 编辑行
  const handleEditRow = (record: any) => {
    setEditingItem({ ...record });
    setEditModalVisible(true);
  };

  // 删除行
  const handleDeleteRow = async (id: number) => {
    if (!currentProject?.id) return;
    try {
      await dispatch(deleteReportItem({ projectId: currentProject.id, itemId: id })).unwrap();
      message.success('删除成功');
    } catch (err: any) {
      message.error(err.message || '删除失败');
    }
  };

  // 保存编辑（新建/更新）
  const handleSaveItem = async () => {
    if (!currentProject?.id || !editingItem) return;

    // 验证必填字段
    if (!editingItem.date || editingItem.date.trim() === '') {
      message.error('请填写日期');
      return;
    }
    if (!editingItem.receiptType) {
      message.error('请选择票据类型');
      return;
    }
    if (!editingItem.expenseType) {
      message.error('请选择消费类型');
      return;
    }
    if (!editingItem.receiptFile || editingItem.receiptFile.trim() === '') {
      message.error('请填写票据文件');
      return;
    }
    if (!editingItem.amount || editingItem.amount <= 0) {
      message.error('请填写正确的金额');
      return;
    }

    try {
      const data = {
        date: editingItem.date,
        receiptType: editingItem.receiptType,
        expenseType: editingItem.expenseType,
        hasReceipt: editingItem.hasReceipt ?? 1,
        receiptFile: editingItem.receiptFile,
        amount: editingItem.amount,
        summary: editingItem.summary || '',
        remark: editingItem.remark || '',
        receiptFileId: editingItem.receiptFileId || undefined,
      };

      if (editingItem.id) {
        await dispatch(updateReportItem({
          projectId: currentProject.id,
          itemId: editingItem.id,
          data,
        })).unwrap();
        message.success('更新成功');
      } else {
        await dispatch(createReportItem({
          projectId: currentProject.id,
          data,
        })).unwrap();
        message.success('添加成功');
      }

      setEditModalVisible(false);
      setEditingItem(null);
    } catch (err: any) {
      message.error(err.message || '保存失败');
    }
  };

  // 确认提交
  const handleConfirmSubmit = () => {
    if (reportLocked) {
      message.info('报销信息已确认锁定，如需修改请先点击"编辑"按钮');
      return;
    }
    setReportLocked(true);
    message.success('报销信息已确认锁定，不可更改');
  };

  // 编辑
  const handleEdit = () => {
    setReportLocked(false);
    message.info('已解除锁定，可以修改报销信息');
  };

  // 导出
  const handleExport = async () => {
    if (!currentProject?.id) {
      message.warning('请先选择报销项目');
      return;
    }
    try {
      await dispatch(exportReport({
        projectId: currentProject.id,
        fileName: `${currentProject?.name || '报销报表'}_${dayjs().format('YYYYMMDD')}.xlsx`,
      })).unwrap();
      message.success('报表导出成功！');
    } catch (err: any) {
      message.error(err.message || '导出失败');
    }
  };

  // 统计数据
  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const confirmedCount = items.filter(i => i.hasReceipt === 1).length;

  return (
    <div className="report-page">
      <PageHeader
        title="报销报表"
        subtitle="填写出差信息，生成并导出报销报表"
      />

      <Row gutter={[24, 24]}>
        {/* 选择报销项目 */}
        <Col xs={24}>
          <Card className="project-selector-card" size="small">
            <Space size="large" wrap>
              <Space>
                <Text strong>报销项目：</Text>
                <Select
                  placeholder="请选择报销项目"
                  value={currentProject?.id ?? null}
                  onChange={handleProjectChange}
                  style={{ width: 280 }}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  suffixIcon={<FolderOpenOutlined />}
                  loading={projectsLoading}
                  options={projects.map(p => ({
                    value: p.id,
                    label: p.name,
                  }))}
                />
              </Space>
              {currentProject && (
                <Text type="secondary">
                  文件数: {currentProject.fileCount} | 已确认: {currentProject.confirmedCount} | 未确认: {currentProject.unconfirmedCount}
                </Text>
              )}
            </Space>
          </Card>
        </Col>

        {/* 项目详情 */}
        {currentProject && (
          <>
            <Col xs={24} md={12}>
              <Card title="📋 出差信息" size="small">
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <Text type="secondary">目的地：</Text><Text>{currentProject.destination || '-'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">出差人：</Text><Text>{currentProject.person || '-'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">部门：</Text><Text>{currentProject.department || '-'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">预算项目：</Text><Text>{currentProject.budget || '-'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">出差日期：</Text>
                    <Text>
                      {currentProject.startDate ? dayjs(currentProject.startDate).format('YYYY-MM-DD') : '-'} 至 {currentProject.endDate ? dayjs(currentProject.endDate).format('YYYY-MM-DD') : '-'}
                    </Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">出差事由：</Text><Text>{currentProject.reason || '-'}</Text>
                  </Col>
                </Row>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card title="💰 报销汇总" size="small">
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <Text type="secondary">已确认报销金额：</Text>
                    <Text strong style={{ color: '#059669', fontSize: 18 }}>
                      ¥{totalAmount.toFixed(2)}
                    </Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">票据数量：</Text><Text>{items.length} 条</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">已确认：</Text><Text>{confirmedCount} 条</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">报销状态：</Text>
                    <Text>{currentProject.status === 0 ? '待处理' : '已完成'}</Text>
                  </Col>
                </Row>
              </Card>
            </Col>
          </>
        )}

        {/* 报表明细表格 */}
        <Col xs={24}>
          <Card
            title="📝 报销明细"
            extra={
              <Space>
                {!reportLocked && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddRow('发票')}>
                    添加明细
                  </Button>
                )}
                {reportLocked ? (
                  <Button icon={<EditOutlined />} onClick={handleEdit}>
                    编辑
                  </Button>
                ) : (
                  <Button type="primary" icon={<SendOutlined />} onClick={handleConfirmSubmit}>
                    确认提交
                  </Button>
                )}
                <Button icon={<SendOutlined />} onClick={handleExport} loading={exportLoading}>
                  导出Excel
                </Button>
              </Space>
            }
          >
            {currentProject ? (
              <ReportTable
                items={items}
                onEdit={handleEditRow}
                onDelete={handleDeleteRow}
                readOnly={reportLocked}
                loading={itemsLoading}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
                请先选择报销项目
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 编辑/新增报表明细弹窗 */}
      <Modal
        title={
          <Space>
            <span style={{ fontSize: 18 }}>
              {editingItem?.id ? '编辑报表明细' : '新增报表明细'}
            </span>
          </Space>
        }
        open={editModalVisible}
        onCancel={() => { setEditModalVisible(false); setEditingItem(null); }}
        onOk={handleSaveItem}
        okText="保存"
        cancelText="取消"
        width={560}
        destroyOnClose
        className="report-item-modal"
      >
        {editingItem && (
          <div className="report-item-form">
            <div className="form-section">
              <div className="form-section-title">基本信息</div>
              <Row gutter={[16, 0]}>
                <Col span={12}>
                  <div className="form-field">
                    <label className="form-label required">报销日期</label>
                    <DatePicker
                      style={{ width: '100%' }}
                      value={editingItem.date ? dayjs(editingItem.date) : null}
                      onChange={(date) => setEditingItem({ ...editingItem, date: date?.format('YYYY-MM-DD') || '' })}
                      format="YYYY-MM-DD"
                      placeholder="选择日期"
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div className="form-field">
                    <label className="form-label required">票据类型</label>
                    <Select
                      style={{ width: '100%' }}
                      value={editingItem.receiptType}
                      onChange={(val) => setEditingItem({ ...editingItem, receiptType: val })}
                      placeholder="选择票据类型"
                    >
                      <Select.Option value="发票">
                        <Space>
                          <FileTextOutlined style={{ color: '#3B82F6' }} />
                          发票
                        </Space>
                      </Select.Option>
                      <Select.Option value="截图">
                        <Space>
                          <PictureOutlined style={{ color: '#8B5CF6' }} />
                          截图
                        </Space>
                      </Select.Option>
                    </Select>
                  </div>
                </Col>
              </Row>

              <div className="form-field">
                <label className="form-label required">票据文件</label>
                <Input
                  value={editingItem.receiptFile || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, receiptFile: e.target.value })}
                  placeholder="请输入或粘贴票据文件名"
                  maxLength={200}
                  prefix={<FileTextOutlined style={{ color: '#9CA3AF' }} />}
                />
              </div>

              <div className="form-field">
                <label className="form-label required">消费类型</label>
                <Select
                  style={{ width: '100%' }}
                  value={editingItem.expenseType}
                  onChange={(val) => setEditingItem({ ...editingItem, expenseType: val })}
                  placeholder="选择消费类型"
                  options={expenseTypeOptions}
                />
              </div>

              <Row gutter={[16, 0]}>
                <Col span={12}>
                  <div className="form-field">
                    <label className="form-label required">金额</label>
                    <Input
                      type="number"
                      value={editingItem.amount || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      prefix={<Text style={{ color: '#DC2626' }}>¥</Text>}
                      min={0}
                    />
                  </div>
                </Col>
                <Col span={12}>
                  <div className="form-field">
                    <label className="form-label">摘要</label>
                    <Input
                      value={editingItem.summary || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, summary: e.target.value })}
                      placeholder="简要描述该票据内容"
                      maxLength={200}
                    />
                  </div>
                </Col>
              </Row>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div className="form-section">
              <div className="form-section-title">备注</div>
              <TextArea
                rows={2}
                value={editingItem.remark || ''}
                onChange={(e) => setEditingItem({ ...editingItem, remark: e.target.value })}
                placeholder="选填，补充说明..."
                maxLength={500}
                showCount
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
