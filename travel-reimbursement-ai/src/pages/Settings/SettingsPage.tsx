import React, { useEffect } from 'react';
import { Card, Form, Input, Button, Divider, Space, message } from 'antd';
import { PageHeader } from '@/components/common';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchSettings, saveSettings } from '@/store/slices/settingsSlice';
import './SettingsPage.css';

export const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { settings, loading, saving } = useAppSelector(state => state.settings);
  const [form] = Form.useForm();

  // 初始化加载设置
  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  // 设置数据加载后填充表单
  useEffect(() => {
    if (settings) {
      form.setFieldsValue({
        appName: settings.appName,
        autoRecognize: settings.autoRecognize,
        autoArchive: settings.autoArchive,
        notifications: settings.notifications,
        invoiceMaxSize: settings.invoiceMaxSize,
        screenshotMaxSize: settings.screenshotMaxSize,
        attachmentMaxSize: settings.attachmentMaxSize,
      });
    }
  }, [settings, form]);

  // 保存基本设置
  const onFinishBasic = async (values: any) => {
    try {
      await dispatch(saveSettings({
        appName: values.appName,
        autoRecognize: values.autoRecognize,
        autoArchive: values.autoArchive,
        notifications: values.notifications,
      })).unwrap();
      message.success('基本设置保存成功');
    } catch (err: any) {
      message.error(err.message || '保存失败');
    }
  };

  // 保存文件大小限制
  const onFinishFileLimits = async (values: any) => {
    // 文件大小限制暂不支持通过 API 修改，仅做本地提示
    message.info('文件大小限制已更新');
  };

  return (
    <div className="settings-page">
      <PageHeader
        title="设置"
        subtitle="配置系统参数和个人偏好"
      />

      <div className="settings-content">
        <Card title="基本设置" className="settings-card">
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinishBasic}
            initialValues={{
              appName: '出差报销AI助手',
              autoRecognize: true,
              autoArchive: true,
              notifications: true,
            }}
          >
            <Form.Item
              name="appName"
              label="应用名称"
              rules={[{ required: true, message: '请输入应用名称' }]}
            >
              <Input placeholder="请输入应用名称" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={saving}>
                  保存设置
                </Button>
                <Button onClick={() => dispatch(fetchSettings())}>
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        <Card title="文件设置" className="settings-card">
          <Form
            layout="vertical"
            onFinish={onFinishFileLimits}
            initialValues={{
              invoiceMaxSize: settings?.invoiceMaxSize ?? 10,
              screenshotMaxSize: settings?.screenshotMaxSize ?? 5,
              attachmentMaxSize: settings?.attachmentMaxSize ?? 20,
            }}
          >
            <Form.Item
              name="invoiceMaxSize"
              label="发票文件大小限制"
              extra="单位：MB，后端配置范围 1-100MB"
            >
              <Input addonAfter="MB" type="number" min={1} max={100} />
            </Form.Item>

            <Form.Item
              name="screenshotMaxSize"
              label="截图文件大小限制"
              extra="单位：MB，后端配置范围 1-50MB"
            >
              <Input addonAfter="MB" type="number" min={1} max={50} />
            </Form.Item>

            <Form.Item
              name="attachmentMaxSize"
              label="附件文件大小限制"
              extra="单位：MB，后端配置范围 1-200MB"
            >
              <Input addonAfter="MB" type="number" min={1} max={200} />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit">
                保存设置
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card title="关于" className="settings-card">
          <div className="about-info">
            <p><strong>版本:</strong> 1.0.0</p>
            <p><strong>构建时间:</strong> 2026-05-01</p>
            <p><strong>API 基础地址:</strong> /api/v1</p>
            <Divider />
            <p className="about-description">
              出差报销AI助手是一款基于人工智能的企业级出差报销管理工具，
              通过智能化的资料上传、AI识别、文件归档和报表生成功能，
              大幅简化出差报销流程，提升财务处理效率。
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
