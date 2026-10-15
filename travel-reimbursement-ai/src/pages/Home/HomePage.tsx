import React, { useEffect, useState, useRef } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Button, Space, Typography, Popconfirm, Modal, message } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/utils/format';
import { TravelInfoForm } from '@/components/forms';
import { HelpModal } from '@/components/common/HelpModal';
import {
  fetchProjects,
  createProject,
  updateProject,
  deleteProject,
  fetchProjectDetail,
  exportProjectPackage,
} from '@/store/slices/projectSlice';
import { projectsFetched } from '@/utils/constants';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { ProjectVO } from '@/api';
import dayjs from 'dayjs';
import './HomePage.css';

const { Text } = Typography;

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Redux state
  const {
    projects,
    projectsLoading,
    projectsTotal,
    createLoading,
    updateLoading,
    deleteLoading,
  } = useAppSelector(state => state.project);

  const [exportLoading, setExportLoading] = useState(false);

  // Local UI state
  const [newProjectModalVisible, setNewProjectModalVisible] = useState(false);
  const [editFormVisible, setEditFormVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectVO | null>(null);

  // 初始化加载项目列表（通过 projectsFetched 标志位防止 StrictMode 和 Redux 状态变化导致重复请求）
  useEffect(() => {
    if (projectsFetched.value) return;
    projectsFetched.value = true;
    dispatch(fetchProjects({ current: 1, size: 50 }));
  }, [dispatch]);

  // 统计数据（从 Redux store 计算）
  const stats = [
    {
      title: '待处理报销',
      value: projects.filter(p => p.status === 0).length,
      icon: <ClockCircleOutlined style={{ color: '#F59E0B' }} />,
      color: '#FEF3C7',
      path: '/report',
    },
    {
      title: '本月报销总额',
      value: formatCurrency(projects.reduce((sum, p) => sum + (p.totalAmount || 0), 0)),
      icon: <DollarOutlined style={{ color: '#10B981' }} />,
      color: '#D1FAE5',
      path: '/report',
    },
    {
      title: '已完成报销',
      value: projects.filter(p => p.status === 1).length,
      icon: <CheckCircleOutlined style={{ color: '#3B82F6' }} />,
      color: '#DBEAFE',
      path: '/archive',
    },
    {
      title: '报销项目总数',
      value: projects.length,
      icon: <FileTextOutlined style={{ color: '#6366F1' }} />,
      color: '#E0E7FF',
      path: '/report',
    },
  ];

  const quickActions = [
    {
      title: '上传资料',
      description: '上传发票、截图、附件',
      icon: '📤',
      path: '/archive',
    },
    {
      title: '查看报表',
      description: '查看并审核资料汇总结果',
      icon: '📊',
      path: '/report',
    },
    {
      title: 'AI助手',
      description: 'AI快捷完成报销',
      icon: '🤖',
      path: '/agent',
    },
  ];

  // 新建项目
  const handleNewProjectSubmit = async (values: any) => {
    try {
      const result = await dispatch(createProject({
        name: values.projectName,
        destination: values.destination || '',
        person: values.person || '',
        startDate: values.startDate?.format('YYYY-MM-DD') || '',
        endDate: values.endDate?.format('YYYY-MM-DD') || '',
        department: values.department || '',
        reason: values.reason || '',
        budget: values.budget || '',
        remark: values.remark || '',
      })).unwrap();

      // 同步获取项目详情（包含文件夹结构），确保切换到归档页时文件夹已加载
      await dispatch(fetchProjectDetail(result.id)).unwrap();

      setNewProjectModalVisible(false);
      message.success('新建报销项目成功');

      // 跳转到归档页（当前项目自动切换）
      navigate(`/archive?projectId=${result.id}`);
    } catch (err: any) {
      message.error(err.message || '创建项目失败');
    }
  };

  // 编辑项目
  const handleEditProject = (record: ProjectVO) => {
    setEditingProject(record);
    setEditFormVisible(true);
  };

  // 编辑项目提交
  const handleEditProjectSubmit = async (values: any) => {
    if (!editingProject) return;
    try {
      await dispatch(updateProject({
        id: editingProject.id,
        data: {
          name: values.projectName || editingProject.name,
          destination: values.destination || '',
          person: values.person || '',
          startDate: values.startDate?.format('YYYY-MM-DD') || '',
          endDate: values.endDate?.format('YYYY-MM-DD') || '',
          department: values.department || '',
          reason: values.reason || '',
          budget: values.budget || '',
          remark: values.remark || '',
          status: editingProject.status,
        },
      })).unwrap();

      setEditFormVisible(false);
      setEditingProject(null);
      message.success('保存成功');
    } catch (err: any) {
      message.error(err.message || '保存失败');
    }
  };

  // 删除项目
  const handleDeleteProject = async (id: number) => {
    try {
      await dispatch(deleteProject(id)).unwrap();
      message.success('删除成功');
    } catch (err: any) {
      message.error(err.message || '删除项目失败');
    }
  };

  // 导出报销项目
  const handleExportPackage = async (record: ProjectVO) => {
    setExportLoading(true);
    try {
      const fileName = `${record.name}_报销项目_${dayjs().format('YYYYMMDD')}.zip`;
      await dispatch(exportProjectPackage({ projectId: record.id, fileName })).unwrap();
      message.success('导出成功');
    } catch (err: any) {
      message.error(err.message || '导出失败');
    } finally {
      setExportLoading(false);
    }
  };

  // 切换项目状态（待处理 ↔ 已完成）
  const handleToggleStatus = async (record: ProjectVO) => {
    const newStatus = record.status === 0 ? 1 : 0;
    try {
      await dispatch(updateProject({
        id: record.id,
        data: {
          name: record.name,
          destination: record.destination,
          person: record.person,
          startDate: record.startDate,
          endDate: record.endDate,
          budget: record.budget,
          reason: record.reason,
          department: record.department,
          remark: record.remark,
          status: newStatus,
        },
      })).unwrap();
      message.success(newStatus === 1 ? '项目已标记为已完成' : '项目已标记为待处理');
    } catch (err: any) {
      message.error(err.message || '状态更新失败');
    }
  };

  // 表格列定义
  const projectColumns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span className="project-name-text">{name}</span>,
    },
    {
      title: '出差地点',
      dataIndex: 'destination',
      key: 'destination',
      width: 120,
      render: (d: string) => <Text type="secondary" style={{ fontSize: 13 }}>{d || '-'}</Text>,
    },
    {
      title: '创建日期',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => (
        <Text style={{ color: '#6B7280', fontSize: 13 }}>
          {date ? dayjs(date).format('YYYY-MM-DD') : '-'}
        </Text>
      ),
    },
    {
      title: '文件数',
      dataIndex: 'fileCount',
      key: 'fileCount',
      width: 80,
      align: 'center' as const,
      render: (count: number) => <Text style={{ fontSize: 13 }}>{count || 0} 条</Text>,
    },
    {
      title: '报销金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right' as const,
      render: (amount: number) => (
        <Text strong style={{ color: '#059669', fontSize: 13 }}>
          {formatCurrency(amount || 0)}
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      align: 'center' as const,
      render: (status: number, record: ProjectVO) => (
        <Tag
          className={`status-tag status-${status === 0 ? 'pending' : 'processed'}`}
          onClick={() => handleToggleStatus(record)}
          style={{ cursor: 'pointer' }}
        >
          {status === 0 ? '待处理' : '已完成'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      align: 'center' as const,
      render: (_: any, record: ProjectVO) => (
        <Space size="small" onClick={e => e.stopPropagation()}>
          <Button
            type="text"
            size="small"
            icon={<ExportOutlined />}
            loading={exportLoading}
            onClick={(e) => { e.stopPropagation(); handleExportPackage(record); }}
          >
            导出
          </Button>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => { e.stopPropagation(); handleEditProject(record); }}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除此报销项目？"
            onConfirm={(e) => { e?.stopPropagation(); handleDeleteProject(record.id); }}
            onCancel={e => e?.stopPropagation()}
            okText="删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={e => e.stopPropagation()}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="home-page">
      <div className="welcome-section">
        <div className="welcome-left">
          <h2 className="welcome-title">欢迎使用出差报销AI助手 👋</h2>
          <p className="welcome-subtitle">智能识别发票，一键生成报销报表，让报销更简单</p>
        </div>
        <div className="welcome-right">
          <HelpModal />
        </div>
      </div>

      <Row gutter={[16, 16]} className="stats-row">
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} md={6} key={index}>
            <Card
              className="stat-card"
              onClick={() => navigate(stat.path)}
              style={{ background: stat.color }}
            >
              <Statistic
                title={stat.title}
                value={stat.value}
                valueStyle={{ fontSize: '24px', fontWeight: 600 }}
                prefix={stat.icon}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <div className="projects-section">
        <div className="projects-header">
          <h3 className="section-title">报销项目</h3>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setNewProjectModalVisible(true)}
            size="small"
          >
            新建报销项目
          </Button>
        </div>
        <Card className="projects-card">
          <Table
            columns={projectColumns}
            dataSource={projects}
            rowKey="id"
            pagination={{ pageSize: 10, total: projectsTotal, showTotal: (t) => `共 ${t} 个项目` }}
            loading={projectsLoading ? { indicator: <LoadingOutlined spin /> } : false}
            size="small"
            className="projects-table"
            locale={{ emptyText: '暂无报销项目，点击上方"新建报销项目"创建' }}
          />
        </Card>
      </div>

      <div className="quick-actions-section">
        <h3 className="section-title">快捷操作</h3>
        <Row gutter={[16, 16]}>
          {quickActions.map((action, index) => (
            <Col xs={24} sm={8} key={index}>
              <Card
                className="action-card"
                onClick={() => navigate(action.path)}
                hoverable
              >
                <div className="action-icon">{action.icon}</div>
                <div className="action-content">
                  <h4 className="action-title">{action.title}</h4>
                  <p className="action-description">{action.description}</p>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* 新建项目弹窗 */}
      <Modal
        title="新建报销项目"
        open={newProjectModalVisible}
        onCancel={() => setNewProjectModalVisible(false)}
        footer={null}
        width={720}
        destroyOnClose
      >
        <TravelInfoForm
          showProjectName
          onFinish={handleNewProjectSubmit}
          formId="form-new-project"
        />
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Space>
            <Button onClick={() => setNewProjectModalVisible(false)}>取消</Button>
            <Button
              type="primary"
              loading={createLoading}
              onClick={() => {
                const formEl = document.getElementById('form-new-project') as HTMLFormElement;
                if (formEl) formEl.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
              }}
            >
              新建
            </Button>
          </Space>
        </div>
      </Modal>

      {/* 编辑项目弹窗 */}
      <Modal
        title="编辑报销项目"
        open={editFormVisible}
        onCancel={() => { setEditFormVisible(false); setEditingProject(null); }}
        footer={null}
        width={720}
        destroyOnClose
      >
        <TravelInfoForm
          showProjectName
          initialValues={editingProject ? {
            projectName: editingProject.name,
            destination: editingProject.destination,
            person: editingProject.person,
            startDate: editingProject.startDate ? dayjs(editingProject.startDate).format('YYYY-MM-DD') : undefined,
            endDate: editingProject.endDate ? dayjs(editingProject.endDate).format('YYYY-MM-DD') : undefined,
            department: editingProject.department,
            reason: editingProject.reason,
            budget: editingProject.budget,
            remark: editingProject.remark,
          } : undefined}
          onFinish={handleEditProjectSubmit}
          formId="form-edit-project"
          formTitle="编辑报销项目"
        />
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Space>
            <Button onClick={() => { setEditFormVisible(false); setEditingProject(null); }}>取消</Button>
            <Button
              type="primary"
              loading={updateLoading}
              onClick={() => {
                const formEl = document.getElementById('form-edit-project') as HTMLFormElement;
                if (formEl) formEl.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
              }}
            >
              保存
            </Button>
          </Space>
        </div>
      </Modal>
    </div>
  );
};
