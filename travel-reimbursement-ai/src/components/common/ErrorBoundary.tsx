import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button, Typography, Space } from 'antd';
import { WarningOutlined, ReloadOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) return fallback;

      return (
        <Result
          status="error"
          icon={<WarningOutlined />}
          title="页面渲染出错"
          subTitle="报销报表模块加载失败，请尝试刷新页面或返回上一页。"
          extra={
            <Space direction="vertical" size="middle" style={{ width: '100%', maxWidth: 600 }}>
              {error && (
                <div style={{
                  background: '#FFF2F0',
                  border: '1px solid #FFCCC7',
                  borderRadius: 8,
                  padding: '12px 16px',
                  textAlign: 'left',
                }}>
                  <Text strong style={{ color: '#CF1322' }}>
                    {error.name}: {error.message}
                  </Text>
                  {error.stack && (
                    <Paragraph
                      style={{
                        fontSize: 11,
                        color: '#8C8C8C',
                        fontFamily: 'monospace',
                        marginTop: 8,
                        marginBottom: 0,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        maxHeight: 200,
                        overflow: 'auto',
                        background: '#FAFAFA',
                        padding: 8,
                        borderRadius: 4,
                      }}
                    >
                      {error.stack}
                    </Paragraph>
                  )}
                </div>
              )}
              {errorInfo && (
                <details style={{
                  background: '#F9F9F9',
                  border: '1px solid #E8E8E8',
                  borderRadius: 8,
                  padding: '12px 16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}>
                  <Text style={{ fontSize: 12, color: '#8C8C8C' }}>
                    Component Stack (development only)
                  </Text>
                  <Paragraph
                    style={{
                      fontSize: 11,
                      color: '#595959',
                      fontFamily: 'monospace',
                      marginTop: 8,
                      marginBottom: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {errorInfo.componentStack}
                  </Paragraph>
                </details>
              )}
              <Space>
                <Button icon={<ReloadOutlined />} onClick={this.handleReload} type="primary">
                  刷新页面
                </Button>
                <Button onClick={this.handleReset}>
                  重新尝试
                </Button>
              </Space>
            </Space>
          }
        />
      );
    }

    return children;
  }
}

export default ErrorBoundary;
