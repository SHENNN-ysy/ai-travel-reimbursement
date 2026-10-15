import React, { useEffect } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { login, guestLogin, fetchCurrentUser } from '@/store/slices/authSlice';

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    form.resetFields();
  }, [form]);

  const handleSubmit = async (values: { username: string; password: string }) => {
    try {
      await dispatch(login(values)).unwrap();
      await dispatch(fetchCurrentUser()).unwrap();
      message.success('登录成功');
      navigate('/');
    } catch (err: any) {
      message.error(err.message || '登录失败，请检查用户名和密码');
    }
  };

  const handleGuestLogin = async () => {
    try {
      await dispatch(guestLogin()).unwrap();
      await dispatch(fetchCurrentUser()).unwrap();
      message.success('已使用临时账号登录');
      navigate('/');
    } catch (err: any) {
      message.error(err.message || '一键登录失败，请稍后重试');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card
        style={{
          width: 400,
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
        styles={{ body: { padding: '40px 40px 32px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ marginBottom: 8 }}>
            <img src="/logo.png" alt="logo" style={{ width: 56, height: 56, borderRadius: 12 }} />
          </div>
          <Title level={3} style={{ margin: '12px 0 4px' }}>报销 AI 助手</Title>
          <Text type="secondary">智能报销管理平台</Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          size="large"
          initialValues={{ username: '', password: '' }}
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少 3 个字符' },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="用户名"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少 6 个字符' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{ height: 44, fontSize: 16 }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <Text type="secondary">还没有账号？</Text>
          <Link to="/register" style={{ marginLeft: 6 }}>立即注册</Link>
        </div>

        <Button
          block
          size="large"
          onClick={handleGuestLogin}
          loading={loading}
          style={{ height: 44, fontSize: 16 }}
        >
          一键登录
        </Button>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Text type="secondary">不想注册？就一键登录吧</Text>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
