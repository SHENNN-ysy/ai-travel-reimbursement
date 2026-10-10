import React from 'react';
import { Form, Input, DatePicker, Select, Row, Col } from 'antd';
import { TravelInfo } from '@/types';
import './TravelInfoForm.css';

interface TravelInfoFormProps {
  initialValues?: Partial<TravelInfo>;
  onFinish?: (values: any) => void;
  onValuesChange?: (changedValues: any, allValues: any) => void;
  showProjectName?: boolean;
  formId?: string;
  formTitle?: string;
}

export const TravelInfoForm: React.FC<TravelInfoFormProps> = ({
  initialValues,
  onFinish,
  onValuesChange,
  showProjectName = false,
  formId,
  formTitle,
}) => {
  const [form] = Form.useForm();

  return (
    <div className="travel-info-form">
      <h3 className="form-title">{formTitle || (showProjectName ? '新建报销项目' : '出差信息')}</h3>
        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          onFinish={onFinish}
          onValuesChange={onValuesChange}
          id={formId}
        >
        {showProjectName && (
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="projectName"
                label="项目名称"
                rules={[{ required: true, message: '请输入项目名称' }]}
              >
                <Input placeholder="请输入项目名称，如：2026年5月北京出差" />
              </Form.Item>
            </Col>
          </Row>
        )}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="destination"
              label="出差地点"
              rules={[{ required: true, message: '请输入出差地点' }]}
            >
              <Input placeholder="请输入出差地点" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="person"
              label="出差人员"
              rules={[{ required: true, message: '请输入出差人员' }]}
            >
              <Input placeholder="请输入出差人员" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="startDate"
              label="出差开始日期"
              rules={[{ required: true, message: '请选择出差开始日期' }]}
            >
              <DatePicker style={{ width: '100%' }} placeholder="选择开始日期" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="endDate"
              label="出差结束日期"
              rules={[{ required: true, message: '请选择出差结束日期' }]}
            >
              <DatePicker style={{ width: '100%' }} placeholder="选择结束日期" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="department"
              label="部门名称"
            >
              <Input placeholder="请输入部门名称（选填）" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="budget"
              label="预算项目"
              rules={[{ required: true, message: '请输入预算项目' }]}
            >
              <Input placeholder="请输入预算项目，如：市场推广预算" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="reason"
              label="出差事由"
            >
              <Input.TextArea
                rows={2}
                placeholder="选填"
                maxLength={200}
                showCount
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={24}>
            <Form.Item name="remark" label="备注说明">
              <Input.TextArea
                rows={2}
                placeholder="选填，补充说明"
                maxLength={100}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  );
};
