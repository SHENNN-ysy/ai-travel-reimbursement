import React from 'react';
import { Card as AntCard } from 'antd';

interface CardProps {
  title?: React.ReactNode;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bordered?: boolean;
  hoverable?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  title,
  extra,
  children,
  className = '',
  bordered = true,
  hoverable = false,
  onClick,
}) => {
  return (
    <AntCard
      title={title}
      extra={extra}
      className={`rounded-xl ${className}`}
      bordered={bordered}
      hoverable={hoverable}
      onClick={onClick}
      styles={{
        body: { padding: '24px' },
      }}
    >
      {children}
    </AntCard>
  );
};
