import React from 'react';
import { Form, Input, Button, Card, message, Typography, Divider } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { register } from '@/store/slices/authSlice';

const { Title, Text } = Typography;

const RegisterPage: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.auth);

  const handleSubmit = async (values: {
    username: string;
    password: string;
    confirmPassword: string;
    nickname?: string;
    email?: string;
  }) => {
    if (values.password !== values.confirmPassword) {
      message.error('两次输入的密码不一致');
      return;
    }
    try {
      const { confirmPassword, ...registerData } = values;
      await dispatch(register(registerData)).unwrap();
      message.success('注册成功，请登录');
      navigate('/login');
    } catch (err: any) {
      message.error(err.message || '注册失败，请重试');
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
          <Title level={3} style={{ margin: '12px 0 4px' }}>注册账号</Title>
          <Text type="secondary">加入报销 AI 助手</Text>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          size="large"
          initialValues={{ username: '', password: '', confirmPassword: '', nickname: '', email: '' }}
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
              placeholder="用户名（用于登录）"
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="nickname"
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="昵称（选填）"
            />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { type: 'email', message: '请输入有效的邮箱地址' },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="邮箱（选填）"
              autoComplete="email"
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
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            rules={[
              { required: true, message: '请再次输入密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="确认密码"
              autoComplete="new-password"
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
              注册
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ margin: '16px 0' }} />

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">已有账号？</Text>
          <Link to="/login" style={{ marginLeft: 6 }}>立即登录</Link>
        </div>
      </Card>
    </div>
  );
};

export default RegisterPage;
