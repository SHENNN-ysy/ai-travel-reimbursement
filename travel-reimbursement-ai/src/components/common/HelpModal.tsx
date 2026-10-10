import React, { useState } from 'react';
import { Modal, Button } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import './HelpModal.css';

const GUIDE_CONTENT = (
  <div className="help-guide-content">
    <div className="help-intro">
      欢迎使用出差报销AI助手，智能识别发票，一键生成报销报表，让报销更简单！
    </div>

    <div className="help-section">
      <div className="help-section-title">1. 报销全流程（完整步骤）</div>
      <div className="help-section-subtitle">手动报销操作共分为以下八个步骤，请按顺序依次完成：</div>
      <ol className="help-step-list">
        <li>
          <strong>新建报销项目：</strong>在系统中创建一个新的报销项目，填写项目基本信息（如项目名称、部门、报销人、日期等）。
        </li>
        <li>
          <strong>上传资料文件：</strong>上传与该报销项目相关的原始凭证、发票、收据等支持性文件（支持图片、PDF等格式）。
        </li>
        <li>
          <strong>填写文件信息：</strong>对每个上传的文件进行标注或录入关键信息，如费用类型、金额、发生时间、事由等。
        </li>
        <li>
          <strong>审查并确认文件信息：</strong>逐项核对已填写的文件信息，确保数据准确、凭证合规，确认无误后进入下一步。
        </li>
        <li>
          <strong>建立 Excel 报表：</strong>系统或用户手动创建一份标准格式的 Excel 报销明细表，用于汇总记录各笔费用。
        </li>
        <li>
          <strong>计算每笔报销金额：</strong>根据凭证信息逐行计算每笔费用的实际报销金额（注意扣除不可报销部分）。
        </li>
        <li>
          <strong>汇总审查并进行文件归档：</strong>对所有明细进行总金额核对与合规复审，确认无误后将原始文件与报表分类归档保存。
        </li>
        <li>
          <strong>将报销项目打包：</strong>将整个报销项目的所有材料（含原始文件、Excel报表、审查记录等）打包成一个压缩文件或电子档案，用于提交或留存。
        </li>
      </ol>
    </div>

    <div className="help-section help-section-ai">
      <div className="help-section-title">2. 智能辅助报销流程（AI 快捷模式）</div>
      <div className="help-section-desc">
        如果您觉得上述手动流程比较繁琐、耗时，可以尝试更省心的 <strong>AI 辅助模式</strong>：
      </div>
      <p className="help-ai-highlight">
        只需完成前两个步骤——<strong>新建报销项目</strong> 并 <strong>上传资料文件</strong>，之后的所有操作（包括填写文件信息、生成 Excel 报表、自动计算报销金额、汇总审查及归档打包）全部交给 <em>报销小助手</em> 自动完成。AI 会智能识别发票内容、自动填充表单、计算金额并生成规范的报销档案，让您彻底告别繁琐的手工操作，轻松完成报销。
      </p>
    </div>
  </div>
);

export const HelpModal: React.FC = () => {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Button
        type="text"
        icon={<QuestionCircleOutlined />}
        onClick={() => setVisible(true)}
        className="help-trigger-btn"
      >
        使用说明
      </Button>
      <Modal
        title="使用说明"
        open={visible}
        onCancel={() => setVisible(false)}
        footer={
          <Button type="primary" onClick={() => setVisible(false)}>
            我知道了
          </Button>
        }
        width={700}
        className="help-modal"
        destroyOnClose
      >
        {GUIDE_CONTENT}
      </Modal>
    </>
  );
};
