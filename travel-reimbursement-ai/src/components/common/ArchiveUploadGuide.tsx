import React, { useState } from 'react';
import { Modal, Button } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import './ArchiveUploadGuide.css';

const UPLOAD_GUIDE_CONTENT = (
  <div className="upload-guide-content">
    <div className="guide-section">
      <div className="guide-section-title">1. 上传要求（发票区）</div>
      <p className="guide-text">
        进入项目后，请在"资料上传"页面按分区上传文件。
      </p>
      <p className="guide-text">
        <strong>发票区：</strong>请将差旅发票等报销凭证上传至此区域。支持 PDF 格式，请务必遵守 <em>一张发票对应一个文件</em> 的原则，不要将多张发票合并为一个文件上传。
      </p>
    </div>

    <div className="guide-section">
      <div className="guide-section-title">2. 支持的文件格式</div>
      <p className="guide-text">系统文件上传接口仅接受以下格式的文件：</p>
      <div className="guide-format-tags">
        {['pdf', 'jpg', 'jpeg', 'png', 'heic', 'gif', 'webp'].map(fmt => (
          <span key={fmt} className="format-tag">{fmt.toUpperCase()}</span>
        ))}
      </div>
      <p className="guide-warning">请确保文件为上述格式之一，否则将上传失败</p>
    </div>

    <div className="guide-section">
      <div className="guide-section-title">3. 附加材料说明</div>
      <p className="guide-text">
        在分区上传的文件中，标记为<strong>"附加材料"</strong>的文件 <em>不会</em> 经过 AI 识别处理，请自行核对内容。
      </p>
    </div>

    <div className="guide-section guide-section-ai">
      <div className="guide-section-title">4. AI 智能重命名</div>
      <p className="guide-text">
        上传的发票或付款截图在被 AI 识别完成后，系统将根据识别到的内容（如金额、商户、日期等）自动为其修改一个更具描述性的文件名，方便您在报销项目中与其他文件进行清晰区分。
      </p>
    </div>
  </div>
);

export const ArchiveUploadGuide: React.FC = () => {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Button
        type="text"
        icon={<QuestionCircleOutlined />}
        onClick={() => setVisible(true)}
        className="upload-guide-trigger-btn"
      >
        使用说明
      </Button>
      <Modal
        title="资料上传使用说明"
        open={visible}
        onCancel={() => setVisible(false)}
        footer={
          <Button type="primary" onClick={() => setVisible(false)}>
            我知道了
          </Button>
        }
        width={620}
        className="upload-guide-modal"
        destroyOnClose
      >
        {UPLOAD_GUIDE_CONTENT}
      </Modal>
    </>
  );
};
