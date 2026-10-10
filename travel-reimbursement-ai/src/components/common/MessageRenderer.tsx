import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MessageRendererProps {
  content: string;
  className?: string;
}

/**
 * 规范化 markdown 内容，防止 remark-gfm 将单换行误拆为多段落。
 * - 列表项后续行强制双空格续行（硬换行）
 * - 行末双空格+换行统一处理
 */
function normalizeMarkdownContent(text: string): string {
  return text
    // 行末双空格+换行 → 单换行
    .replace(/  \n/g, '\n');
}

/**
 * 将 markdown 内容渲染为美观的富文本组件。
 * 支持：标题、粗体/斜体、表格（GFM）、列表（有序/无序）、
 * 分隔线、行内代码/代码块、超链接。
 */
export const MessageRenderer: React.FC<MessageRendererProps> = ({ content, className }) => {
  const processed = normalizeMarkdownContent(content);

  const components: Components = {
    // 链接默认在新窗口打开，并添加下划线
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="md-link">
        {children}
      </a>
    ),
    // 代码块：等宽字体 + 浅色背景 + 圆角
    pre: ({ children }) => (
      <pre className="md-pre">{children}</pre>
    ),
    // 行内代码
    code: ({ className: codeClass, children, ...props }) => {
      // 有 className (language-xxx) 的是代码块内的 code 标签，由 pre 处理
      if (codeClass) {
        return (
          <code className={`md-code-block ${codeClass}`} {...props}>
            {children}
          </code>
        );
      }
      return (
        <code className="md-code-inline" {...props}>
          {children}
        </code>
      );
    },
    // 使用 <span display:block> 替代 <p>，消除段落标签导致的空白折叠问题
    p: ({ children, ...props }) => {
      if (children === '' || children == null) return null;
      return (
        <span style={{ margin: 0, padding: 0, display: 'block' }} {...props}>
          {children}
        </span>
      );
    },
  };

  return (
    <div className={`message-markdown ${className ?? ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {processed}
      </ReactMarkdown>
    </div>
  );
};

/**
 * 简单检测一段文本是否包含 markdown 语法特征。
 * 用于判断工具返回内容是否应走 markdown 渲染路径。
 */
export function isMarkdownContent(text: string): boolean {
  const patterns = [
    /^#{1,6}\s/m,            // 标题
    /^\|.+\|$/m,             // 表格行
    /^\s*[-*+]\s/m,          // 无序列表
    /^\s*\d+\.\s/m,          // 有序列表
    /\*\*[^*]+\*\*/,          // 粗体
    /__[^_]+__/,             // 粗体（下划线）
    /\*[^*]+\*/,              // 斜体
    /`[^`]+`/,               // 行内代码
    /^```/m,                 // 代码块
    /^---$/m,                // 分隔线
  ];
  return patterns.some((p) => p.test(text));
}
