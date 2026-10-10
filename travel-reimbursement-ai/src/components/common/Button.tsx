import React from 'react';
import { Button as AntButton, ButtonProps as AntButtonProps } from 'antd';

interface ButtonProps extends Omit<AntButtonProps, 'variant'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'link';
  size?: 'small' | 'middle' | 'large';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'middle',
  className = '',
  ...props
}) => {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-500 hover:bg-blue-600 text-white border-none';
      case 'secondary':
        return 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300';
      case 'danger':
        return 'bg-red-500 hover:bg-red-600 text-white border-none';
      case 'link':
        return 'text-blue-500 hover:text-blue-600 bg-transparent border-none p-0';
      default:
        return '';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return 'px-3 py-1 text-xs';
      case 'large':
        return 'px-6 py-3 text-base';
      default:
        return '';
    }
  };

  return (
    <AntButton
      className={`rounded-lg font-medium transition-all ${getVariantClass()} ${getSizeClass()} ${className}`}
      {...props}
    >
      {children}
    </AntButton>
  );
};
