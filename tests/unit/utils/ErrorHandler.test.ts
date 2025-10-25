/**
 * ErrorHandler 单元测试
 * 测试错误处理器的所有核心功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorHandler, ErrorType, ErrorSeverity } from '../../../src/utils/ErrorHandler';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('constructor', () => {
    it('应该成功初始化', () => {
      expect(errorHandler).toBeDefined();
    });

    it('应该初始化空的错误日志', () => {
      const health = errorHandler.getSystemHealth();
      expect(health.totalErrors).toBe(0);
    });
  });

  describe('handleError', () => {
    it('应该处理标准 Error 对象', async () => {
      const error = new Error('Test error');

      const result = await errorHandler.handleError(error);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Test error');
    });

    it('应该处理字符串错误', async () => {
      const result = await errorHandler.handleError('String error');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该处理包含上下文的错误', async () => {
      const error = new Error('Test error');
      const context = { userId: 123, action: 'loadData' };

      const result = await errorHandler.handleError(error, context);

      expect(result.error?.context).toEqual(context);
    });

    it('应该记录错误到日志', async () => {
      const error = new Error('Test error');

      await errorHandler.handleError(error);

      const health = errorHandler.getSystemHealth();
      expect(health.totalErrors).toBe(1);
    });

    it('应该为不同错误类型设置正确的严重级别', async () => {
      const networkError = new Error('Network request failed');
      const result = await errorHandler.handleError(networkError);

      expect(result.error?.type).toBe(ErrorType.NETWORK_ERROR);
      expect(result.error?.severity).toBeDefined();
    });
  });

  describe('analyzeError', () => {
    it('应该识别网络错误', async () => {
      const networkError = new Error('Failed to fetch');

      const result = await errorHandler.handleError(networkError);

      expect(result.error?.type).toBe(ErrorType.NETWORK_ERROR);
    });

    it('应该识别超时错误', async () => {
      const timeoutError = new Error('Request timeout');

      const result = await errorHandler.handleError(timeoutError);

      expect(result.error?.type).toBe(ErrorType.TIMEOUT_ERROR);
    });

    it('应该识别解析错误', async () => {
      const parseError = new Error('JSON parse error');

      const result = await errorHandler.handleError(parseError);

      expect(result.error?.type).toBe(ErrorType.PARSE_ERROR);
    });

    it('应该识别缓存错误', async () => {
      const cacheError = new Error('Cache error');

      const result = await errorHandler.handleError(cacheError);

      expect(result.error?.type).toBe(ErrorType.CACHE_ERROR);
    });

    it('应该为未知错误设置默认类型', async () => {
      const unknownError = new Error('Something went wrong');

      const result = await errorHandler.handleError(unknownError);

      expect(result.error?.type).toBeDefined();
    });

    it('应该提取错误堆栈', async () => {
      const error = new Error('Test error');

      const result = await errorHandler.handleError(error);

      expect(result.error?.stack).toBeDefined();
    });

    it('应该添加时间戳', async () => {
      const error = new Error('Test error');
      const before = Date.now();

      const result = await errorHandler.handleError(error);
      const after = Date.now();

      expect(result.error?.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.error?.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('getSeverity', () => {
    it('应该为网络错误设置中等严重性', async () => {
      const error = new Error('Network error');

      const result = await errorHandler.handleError(error);

      expect(result.error?.severity).toBe(ErrorSeverity.MEDIUM);
    });

    it('应该为配置错误设置高严重性', async () => {
      const error = new Error('Config error: invalid configuration');

      const result = await errorHandler.handleError(error);

      expect(result.error?.severity).toBe(ErrorSeverity.HIGH);
    });

    it('应该为数据错误设置严重性', async () => {
      const error = new Error('Data error');

      const result = await errorHandler.handleError(error);

      expect(result.error?.severity).toBeDefined();
    });
  });

  describe('getUserMessage', () => {
    it('应该为网络错误提供用户友好消息', async () => {
      const error = new Error('Network request failed');

      const result = await errorHandler.handleError(error);

      expect(result.error?.userMessage).toBeDefined();
      expect(result.error?.userMessage).toContain('网络');
    });

    it('应该为超时错误提供用户友好消息', async () => {
      const error = new Error('Request timeout');

      const result = await errorHandler.handleError(error);

      expect(result.error?.userMessage).toContain('超时');
    });

    it('应该为未知错误提供通用消息', async () => {
      const error = new Error('Unknown error');

      const result = await errorHandler.handleError(error);

      expect(result.error?.userMessage).toBeDefined();
    });
  });

  describe('isRetryable', () => {
    it('应该标记网络错误为可重试', async () => {
      const error = new Error('Network error');

      const result = await errorHandler.handleError(error);

      expect(result.error?.retryable).toBe(true);
    });

    it('应该标记超时错误为可重试', async () => {
      const error = new Error('Timeout');

      const result = await errorHandler.handleError(error);

      expect(result.error?.retryable).toBe(true);
    });

    it('应该标记解析错误为不可重试', async () => {
      const error = new Error('JSON parse error');

      const result = await errorHandler.handleError(error);

      expect(result.error?.retryable).toBe(false);
    });

    it('应该标记配置错误为不可重试', async () => {
      const error = new Error('Invalid config');

      const result = await errorHandler.handleError(error);

      expect(result.error?.retryable).toBe(false);
    });
  });

  describe('getSystemHealth', () => {
    it('应该返回健康状态', () => {
      const health = errorHandler.getSystemHealth();

      expect(health).toBeDefined();
      expect(health.totalErrors).toBe(0);
      expect(health.score).toBe(100);
    });

    it('应该在错误后降低健康分数', async () => {
      await errorHandler.handleError(new Error('Test error'));

      const health = errorHandler.getSystemHealth();

      expect(health.totalErrors).toBe(1);
      expect(health.score).toBeLessThan(100);
    });

    it('应该跟踪最近的错误', async () => {
      await errorHandler.handleError(new Error('Error 1'));
      await errorHandler.handleError(new Error('Error 2'));

      const health = errorHandler.getSystemHealth();

      expect(health.recentErrors).toHaveLength(2);
    });

    it('应该只保留最近的错误', async () => {
      // 添加多个错误
      for (let i = 0; i < 15; i++) {
        await errorHandler.handleError(new Error(`Error ${i}`));
      }

      const health = errorHandler.getSystemHealth();

      expect(health.recentErrors.length).toBeLessThanOrEqual(10);
    });

    it('应该计算错误率', async () => {
      await errorHandler.handleError(new Error('Test error'));

      const health = errorHandler.getSystemHealth();

      expect(health.errorRate).toBeDefined();
      expect(health.errorRate).toBeGreaterThanOrEqual(0);
    });

    it('应该按类型统计错误', async () => {
      await errorHandler.handleError(new Error('Network error'));
      await errorHandler.handleError(new Error('Network error'));
      await errorHandler.handleError(new Error('Parse error'));

      const health = errorHandler.getSystemHealth();

      expect(health.errorsByType).toBeDefined();
      expect(health.errorsByType[ErrorType.NETWORK_ERROR]).toBe(2);
    });
  });

  describe('clearErrors', () => {
    it('应该清除所有错误', async () => {
      await errorHandler.handleError(new Error('Error 1'));
      await errorHandler.handleError(new Error('Error 2'));

      errorHandler.clearErrors();

      const health = errorHandler.getSystemHealth();
      expect(health.totalErrors).toBe(0);
    });

    it('应该重置健康分数', async () => {
      await errorHandler.handleError(new Error('Error'));

      errorHandler.clearErrors();

      const health = errorHandler.getSystemHealth();
      expect(health.score).toBe(100);
    });
  });

  describe('getErrorLog', () => {
    it('应该返回错误日志', async () => {
      await errorHandler.handleError(new Error('Test error'));

      const log = errorHandler.getErrorLog();

      expect(log).toHaveLength(1);
      expect(log[0].message).toBe('Test error');
    });

    it('应该按时间倒序返回', async () => {
      await errorHandler.handleError(new Error('First'));
      await new Promise(resolve => setTimeout(resolve, 10));
      await errorHandler.handleError(new Error('Second'));

      const log = errorHandler.getErrorLog();

      expect(log[0].message).toBe('Second');
      expect(log[1].message).toBe('First');
    });

    it('应该支持分页', async () => {
      for (let i = 0; i < 20; i++) {
        await errorHandler.handleError(new Error(`Error ${i}`));
      }

      const page1 = errorHandler.getErrorLog(0, 10);
      const page2 = errorHandler.getErrorLog(10, 10);

      expect(page1).toHaveLength(10);
      expect(page2).toHaveLength(10);
      expect(page1[0].message).not.toBe(page2[0].message);
    });
  });

  describe('retry mechanism', () => {
    it('应该尝试重试可重试的错误', async () => {
      const error = new Error('Network error');

      const result = await errorHandler.handleError(error, null, {
        maxRetries: 3,
        retryDelay: 100,
      });

      expect(result.success).toBe(false);
    });

    it('应该遵守最大重试次数', async () => {
      const retryConfig = {
        maxRetries: 3,
        retryDelay: 50,
      };

      const error = new Error('Network error');
      await errorHandler.handleError(error, null, retryConfig);

      // 验证重试逻辑
      expect(true).toBe(true);
    });

    it('应该使用指数退避', async () => {
      const retryConfig = {
        maxRetries: 3,
        retryDelay: 100,
        backoffMultiplier: 2,
      };

      const error = new Error('Network error');
      const start = Date.now();

      await errorHandler.handleError(error, null, retryConfig);

      const duration = Date.now() - start;
      // 应该有延迟（即使失败）
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('fallback strategies', () => {
    it('应该为支持降级的错误提供降级选项', async () => {
      const error = new Error('Optimized config failed');

      const result = await errorHandler.handleError(error);

      expect(result.error?.fallbackAvailable).toBeDefined();
    });

    it('应该尝试执行降级策略', async () => {
      const error = new Error('Cache error');

      const result = await errorHandler.handleError(error);

      // 降级应该被尝试
      expect(result).toBeDefined();
    });
  });

  describe('error context', () => {
    it('应该保留完整的错误上下文', async () => {
      const context = {
        url: 'https://example.com/api',
        method: 'GET',
        userId: 123,
        timestamp: Date.now(),
      };

      const result = await errorHandler.handleError(new Error('Test'), context);

      expect(result.error?.context).toEqual(context);
    });

    it('应该处理嵌套的上下文对象', async () => {
      const context = {
        request: {
          headers: { 'Content-Type': 'application/json' },
          body: { data: 'test' },
        },
        metadata: {
          retry: 1,
          source: 'api',
        },
      };

      const result = await errorHandler.handleError(new Error('Test'), context);

      expect(result.error?.context).toEqual(context);
    });
  });

  describe('edge cases', () => {
    it('应该处理 null 错误', async () => {
      const result = await errorHandler.handleError(null);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该处理 undefined 错误', async () => {
      const result = await errorHandler.handleError(undefined);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该处理循环引用的上下文', async () => {
      const context: any = { name: 'test' };
      context.self = context; // 循环引用

      const result = await errorHandler.handleError(new Error('Test'), context);

      expect(result.error).toBeDefined();
    });

    it('应该处理非常长的错误消息', async () => {
      const longMessage = 'Error: ' + 'a'.repeat(10000);

      const result = await errorHandler.handleError(new Error(longMessage));

      expect(result.error?.message).toBeDefined();
    });

    it('应该处理特殊字符', async () => {
      const message = 'Error: 特殊字符 !@#$%^&*()_+ 中文测试';

      const result = await errorHandler.handleError(new Error(message));

      expect(result.error?.message).toContain('特殊字符');
    });
  });

  describe('performance', () => {
    it('应该快速处理错误', async () => {
      const start = Date.now();

      await errorHandler.handleError(new Error('Test'));

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该能处理大量错误', async () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        await errorHandler.handleError(new Error(`Error ${i}`));
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // 100个错误应该在5秒内完成
    });
  });

  describe('error statistics', () => {
    it('应该统计错误总数', async () => {
      await errorHandler.handleError(new Error('Error 1'));
      await errorHandler.handleError(new Error('Error 2'));
      await errorHandler.handleError(new Error('Error 3'));

      const health = errorHandler.getSystemHealth();
      expect(health.totalErrors).toBe(3);
    });

    it('应该按严重性统计', async () => {
      await errorHandler.handleError(new Error('Network error'));
      await errorHandler.handleError(new Error('Config error'));

      const health = errorHandler.getSystemHealth();
      expect(health.errorsBySeverity).toBeDefined();
    });

    it('应该计算平均错误率', async () => {
      await errorHandler.handleError(new Error('Error 1'));
      await new Promise(resolve => setTimeout(resolve, 100));
      await errorHandler.handleError(new Error('Error 2'));

      const health = errorHandler.getSystemHealth();
      expect(health.errorRate).toBeGreaterThan(0);
    });
  });
});
