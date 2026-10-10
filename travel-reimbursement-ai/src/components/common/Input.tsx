import React from 'react';
import { Input as AntInput, InputProps as AntInputProps } from 'antd';
import type { TextAreaProps as AntTextAreaProps } from 'antd/es/input/TextArea';
import './Input.css';

interface InputProps extends AntInputProps {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  ...props
}) => {
  return (
    <div className="input-wrapper">
      {label && (
        <label className="input-label">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <AntInput
        className={`input-field ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />
      {error && <span className="input-error-text">{error}</span>}
      {helperText && !error && (
        <span className="input-helper-text">{helperText}</span>
      )}
    </div>
  );
};

interface TextAreaProps extends AntTextAreaProps {
  label?: string;
  error?: string;
  helperText?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  helperText,
  className = '',
  ...props
}) => {
  return (
    <div className="input-wrapper">
      {label && (
        <label className="input-label">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <AntInput.TextArea
        className={`input-field ${error ? 'input-error' : ''} ${className}`}
        {...props}
      />
      {error && <span className="input-error-text">{error}</span>}
      {helperText && !error && (
        <span className="input-helper-text">{helperText}</span>
      )}
    </div>
  );
};
