import React from 'react';
import { Layout, Menu, Button, Dropdown, Avatar, Space, Typography } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  UploadOutlined,
  FileTextOutlined,
  HomeOutlined,
  SettingOutlined,
  RobotOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { resetProjectSlice } from '@/store/slices/projectSlice';
import { resetFileSlice } from '@/store/slices/fileSlice';
import { resetReimbursementSlice } from '@/store/slices/reimbursementSlice';
import { resetReportSlice } from '@/store/slices/reportSlice';
import { resetUploadSlice } from '@/store/slices/uploadSlice';
import { resetSettingsSlice } from '@/store/slices/settingsSlice';
import { resetAgentState } from '@/store/slices/agentSlice';
import './MainLayout.css';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/archive',
      icon: <UploadOutlined />,
      label: '资料上传',
    },
    {
      key: '/report',
      icon: <FileTextOutlined />,
      label: '报销报表',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '设置',
    },
    {
      key: '/agent',
      icon: <RobotOutlined />,
      label: 'AI 助手',
    },
  ];

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/archive':
        return '资料上传';
      case '/report':
        return '报销报表';
      case '/settings':
        return '系统设置';
      case '/agent':
        return 'AI 助手';
      default:
        return '首页';
    }
  };

  return (
    <Layout className="main-layout">
      <Sider
        width={240}
        className="layout-sider"
        breakpoint="lg"
        collapsedWidth="0"
      >
        <div className="logo">
          <img src="/logo.png" alt="logo" className="logo-img" />
          <span className="logo-text">报销AI助手</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          className="sidebar-menu"
        />
      </Sider>
      <Layout>
        <Header className="layout-header">
          <div className="header-left">
            <h1 className="page-title">{getPageTitle()}</h1>
          </div>
          <div className="header-right">
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'username',
                    label: (
                      <Space>
                        <UserOutlined />
                        <span>{user?.nickname || user?.username}</span>
                      </Space>
                    ),
                    disabled: true,
                  },
                  { type: 'divider' },
                  {
                    key: 'logout',
                    label: '退出登录',
                    icon: <LogoutOutlined />,
                    danger: true,
                    onClick: () => {
                      dispatch(resetProjectSlice());
                      dispatch(resetFileSlice());
                      dispatch(resetReimbursementSlice());
                      dispatch(resetReportSlice());
                      dispatch(resetUploadSlice());
                      dispatch(resetSettingsSlice());
                      dispatch(resetAgentState());
                      dispatch(logout());
                      navigate('/login');
                    },
                  },
                ],
              }}
              placement="bottomRight"
            >
              <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar size="small" style={{ backgroundColor: '#3B82F6' }}>
                  {(user?.nickname || user?.username || 'U').charAt(0).toUpperCase()}
                </Avatar>
                <Text style={{ color: '#fff' }}>{user?.nickname || user?.username}</Text>
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content className="layout-content">
          <div className="content-wrapper">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};
