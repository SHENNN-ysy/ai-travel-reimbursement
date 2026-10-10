import { useState, useRef, useCallback } from 'react';
import { message } from 'antd';
import { submitBatchRecognize, getBatchRecognizeProgress } from '@/api';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/+$/, '');

export interface BatchRecognizeProgress {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total: number;
  processed: number;
  progress: number;
}

export interface FileRecognitionResult {
  fileId: number;
  fileName: string;
  status: 'success' | 'failed';
  data?: any;
  error?: string;
}

export interface UseBatchRecognizeOptions {
  /** 轮询间隔（毫秒），默认 3000 */
  pollInterval?: number;
  /** 轮询超时时间（毫秒），默认 5 分钟 */
  timeout?: number;
  /** 每识别完成一个文件时的回调 */
  onFileRecognized?: (result: any) => void;
  onAllCompleted?: (results: any[]) => void;
  /** 识别失败时的回调 */
  onError?: (error: string) => void;
}

/**
 * 批量识别 Hook
 * 基于接口文档 2.6 批量识别（异步任务 + 轮询）设计
 * 流程：提交任务 → 轮询进度 → 更新单个文件识别状态
 */
export const useBatchRecognize = (options: UseBatchRecognizeOptions = {}) => {
  const {
    pollInterval = 3000,
    timeout = 5 * 60 * 1000,
    onFileRecognized,
    onAllCompleted,
    onError,
  } = options;

  const [progress, setProgress] = useState<BatchRecognizeProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<FileRecognitionResult[]>([]);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const resultsCountRef = useRef(0);
  const abortRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const pollProgress = useCallback(async (projectId: number, taskId: string) => {
    try {
      const task = await getBatchRecognizeProgress(projectId, taskId);

      setProgress({
        taskId: task.taskId,
        status: task.status,
        total: task.total,
        processed: task.processed,
        progress: task.progress,
      });

      // 逐个通知已完成的结果（只通知新增的）
      if (task.results && task.results.length > resultsCountRef.current) {
        for (let i = resultsCountRef.current; i < task.results.length; i++) {
          onFileRecognized?.(task.results[i]);
        }
        resultsCountRef.current = task.results.length;
      }
      setResults((task.results || []) as any);

      if (task.status === 'completed') {
        stopPolling();
        onAllCompleted?.(task.results || []);
      } else if (task.status === 'failed') {
        stopPolling();
        onError?.(task.errorMessage || '识别任务失败');
      }
    } catch (err) {
      console.error('轮询进度失败:', err);
      onError?.('网络错误，请检查网络连接');
      stopPolling();
    }
  }, [onAllCompleted, onError, onFileRecognized, stopPolling]);

  const startRecognize = useCallback(
    async (projectId: number, fileIds: number[]) => {
      if (fileIds.length === 0) {
        message.warning('请选择要识别的文件');
        return;
      }

      abortRef.current = false;
      startTimeRef.current = Date.now();
      resultsCountRef.current = 0;
      setResults([]);
      setIsRunning(true);
      setProgress({
        taskId: '',
        status: 'pending',
        total: fileIds.length,
        processed: 0,
        progress: 0,
      });

      try {
        const task = await submitBatchRecognize(projectId, fileIds);

        setProgress({
          taskId: task.taskId,
          status: 'processing',
          total: task.total,
          processed: 0,
          progress: 0,
        });

        pollTimerRef.current = setInterval(() => {
          if (Date.now() - startTimeRef.current > timeout) {
            stopPolling();
            onError?.('识别超时，请稍后刷新查看结果');
            return;
          }
          pollProgress(projectId, task.taskId);
        }, pollInterval);
      } catch (err) {
        stopPolling();
        const msg = err instanceof Error ? err.message : '提交识别任务失败';
        message.error(msg);
        onError?.(msg);
      }
    },
    [pollInterval, pollProgress, stopPolling, timeout, onError]
  );

  const stopRecognize = useCallback(() => {
    abortRef.current = true;
    stopPolling();
    message.info('已停止识别');
  }, [stopPolling]);

  return {
    progress,
    isRunning,
    results,
    startRecognize,
    stopRecognize,
  };
};
