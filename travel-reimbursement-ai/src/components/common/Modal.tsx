import React from 'react';
import { Modal as AntModal, ModalProps as AntModalProps } from 'antd';
import './Modal.css';

interface ModalProps extends AntModalProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  children,
  title,
  footer,
  width = 520,
  className = '',
  ...props
}) => {
  return (
    <AntModal
      title={title}
      footer={footer}
      width={width}
      className={`custom-modal ${className}`}
      {...props}
    >
      {children}
    </AntModal>
  );
};
