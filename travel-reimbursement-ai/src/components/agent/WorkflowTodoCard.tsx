import React from 'react';
import { Steps, Spin } from 'antd';
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import type { WorkflowTodoItem, WorkflowRunStatus } from '@/types';

interface WorkflowTodoCardProps {
  items: WorkflowTodoItem[];
  status?: WorkflowRunStatus;
}

const STEP_STATUS_MAP: Record<WorkflowTodoItem['status'], 'wait' | 'process' | 'finish' | 'error'> = {
  pending: 'wait',
  running: 'process',
  success: 'finish',
  failed: 'error',
  skipped: 'wait',
};

/**
 * 一键报销工作流 TodoList 进度卡片。
 * 由 workflow_todo SSE 事件驱动，按 runId 全量更新。
 */
export const WorkflowTodoCard: React.FC<WorkflowTodoCardProps> = ({ items, status = 'running' }) => {
  const failedItem = status === 'failed' ? items.find((it) => it.status === 'failed') : undefined;

  return (
    <div className="workflow-todo-card">
      <div className="workflow-todo-header">
        {status === 'running' && <Spin size="small" />}
        {status === 'completed' && <CheckCircleFilled style={{ color: '#52c41a' }} />}
        {status === 'failed' && <CloseCircleFilled style={{ color: '#ff4d4f' }} />}
        <span className="workflow-todo-title">
          一键报销进度
          {status === 'completed' ? ' · 已完成' : status === 'failed' ? ' · 已终止' : ''}
        </span>
      </div>
      <Steps
        direction="vertical"
        size="small"
        current={items.findIndex((it) => it.status === 'running')}
        items={items.map((it) => ({
          title: it.label,
          status: STEP_STATUS_MAP[it.status],
          description: it.status === 'skipped' ? '已跳过' : it.message,
        }))}
      />
      {failedItem?.message && (
        <div className="workflow-todo-abort">{failedItem.message}</div>
      )}
    </div>
  );
};

export default WorkflowTodoCard;
