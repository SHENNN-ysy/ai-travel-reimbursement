import React from 'react';
import { Empty as AntEmpty } from 'antd';
import './Empty.css';

interface EmptyProps {
  description?: string;
  image?: React.ReactNode;
  className?: string;
}

export const Empty: React.FC<EmptyProps> = ({
  description = '暂无数据',
  image,
  className = '',
}) => {
  return (
    <div className={`custom-empty ${className}`}>
      <AntEmpty
        description={description}
        image={image}
      />
    </div>
  );
};
