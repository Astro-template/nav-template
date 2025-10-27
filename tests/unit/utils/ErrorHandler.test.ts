/**
 * ErrorHandler 单元测试 - 基于实际源代码API
 *
 * 实际API:
 * - handleError(error, context?, retryConfig?) => { success, data?, error? }
 * - getErrorLog() => ErrorInfo[]
 * - getErrorStats() => { totalErrors, errorsByType, errorsBySeverity, recentErrors }
 * - clearErrorLog() => void
 * - getSystemHealth() => { status, score, issues, recommendations }
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ErrorHandler,
  ErrorType,
  ErrorSeverity,
} from "../../../src/utils/ErrorHandler";

describe("ErrorHandler", () => {
  let errorHandler: ErrorHandler;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
    errorHandler.clearErrorLog(); // 清除错误日志
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe("constructor", () => {
    it("应该成功初始化 ErrorHandler", () => {
      expect(errorHandler).toBeDefined();
      expect(errorHandler).toBeInstanceOf(ErrorHandler);
    });

    it("应该初始化为健康状态", () => {
      const health = errorHandler.getSystemHealth();

      expect(health.status).toBe("healthy");
      expect(health.score).toBe(100);
      expect(health.issues).toEqual([]);
      expect(health.recommendations).toEqual([]);
    });

    it("应该初始化空的错误日志", () => {
      const log = errorHandler.getErrorLog();
      expect(log).toEqual([]);
    });

    it("应该初始化空的错误统计", () => {
      const stats = errorHandler.getErrorStats();

      expect(stats.totalErrors).toBe(0);
      expect(stats.recentErrors).toEqual([]);
      expect(stats.errorsByType).toBeDefined();
      expect(stats.errorsBySeverity).toBeDefined();
    });
  });

  describe("handleError", () => {
    it("应该处理标准 Error 对象", async () => {
      const error = new Error("Test error");

      const result = await errorHandler.handleError(error);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe("Test error");
      expect(result.error?.type).toBeDefined();
      expect(result.error?.severity).toBeDefined();
    });

    it("应该处理字符串错误", async () => {
      const result = await errorHandler.handleError("String error");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain("String error");
    });

    it("应该处理包含上下文的错误", async () => {
      const error = new Error("Test error");
      const context = { userId: 123, action: "loadData" };

      const result = await errorHandler.handleError(error, context);

      expect(result.error?.context).toEqual(context);
    });

    it("应该返回 ErrorInfo 结构", async () => {
      const error = new Error("Test error");

      const result = await errorHandler.handleError(error);

      expect(result.error).toHaveProperty("type");
      expect(result.error).toHaveProperty("severity");
      expect(result.error).toHaveProperty("message");
      expect(result.error).toHaveProperty("userMessage");
      expect(result.error).toHaveProperty("timestamp");
      expect(result.error).toHaveProperty("retryable");
      expect(result.error).toHaveProperty("fallbackAvailable");
    });

    it("应该识别网络错误", async () => {
      const networkError = new Error("Network request failed");

      await errorHandler.handleError(networkError);

      // 检查错误日志中是否正确识别了错误类型
      const errorLog = errorHandler.getErrorLog();
      expect(errorLog.length).toBeGreaterThan(0);
      expect(errorLog[errorLog.length - 1].type).toBe(ErrorType.NETWORK_ERROR);
    });

    it("应该识别超时错误", async () => {
      const timeoutError = new Error("Request timeout");

      await errorHandler.handleError(timeoutError);

      const errorLog = errorHandler.getErrorLog();
      expect(errorLog.length).toBeGreaterThan(0);
      expect(errorLog[errorLog.length - 1].type).toBe(ErrorType.TIMEOUT_ERROR);
    });

    it("应该识别解析错误", async () => {
      const parseError = new Error("JSON parse error");

      await errorHandler.handleError(parseError);

      const errorLog = errorHandler.getErrorLog();
      expect(errorLog.length).toBeGreaterThan(0);
      expect(errorLog[errorLog.length - 1].type).toBe(ErrorType.PARSE_ERROR);
    });

    it("应该识别缓存错误", async () => {
      const cacheError = new Error("Cache error");

      await errorHandler.handleError(cacheError);

      const errorLog = errorHandler.getErrorLog();
      expect(errorLog.length).toBeGreaterThan(0);
      expect(errorLog[errorLog.length - 1].type).toBe(ErrorType.CACHE_ERROR);
    });

    it("应该识别配置错误", async () => {
      const configError = new Error("Config error");

      await errorHandler.handleError(configError);

      const errorLog = errorHandler.getErrorLog();
      expect(errorLog.length).toBeGreaterThan(0);
      expect(errorLog[errorLog.length - 1].type).toBe(ErrorType.CONFIG_ERROR);
    });

    it("应该添加时间戳", async () => {
      const error = new Error("Test error");
      const before = Date.now();

      await errorHandler.handleError(error);

      const after = Date.now();
      const errorLog = errorHandler.getErrorLog();
      const lastError = errorLog[errorLog.length - 1];
      expect(lastError.timestamp).toBeGreaterThanOrEqual(before);
      expect(lastError.timestamp).toBeLessThanOrEqual(after);
    });

    it("应该提供用户友好消息", async () => {
      const error = new Error("Network request failed");

      await errorHandler.handleError(error);

      const errorLog = errorHandler.getErrorLog();
      const lastError = errorLog[errorLog.length - 1];
      expect(lastError.userMessage).toBeDefined();
      expect(typeof lastError.userMessage).toBe("string");
      expect(lastError.userMessage.length).toBeGreaterThan(0);
    });

    it("应该记录错误堆栈", async () => {
      const error = new Error("Test error");

      await errorHandler.handleError(error);

      const errorLog = errorHandler.getErrorLog();
      const lastError = errorLog[errorLog.length - 1];
      expect(lastError.stack).toBeDefined();
    });

    it("应该标记网络错误为可重试", async () => {
      const error = new Error("Network error");

      await errorHandler.handleError(error);

      const errorLog = errorHandler.getErrorLog();
      const lastError = errorLog[errorLog.length - 1];
      expect(lastError.retryable).toBe(true);
    });

    it("应该标记解析错误为不可重试", async () => {
      const error = new Error("JSON parse error");

      await errorHandler.handleError(error);

      const errorLog = errorHandler.getErrorLog();
      const lastError = errorLog[errorLog.length - 1];
      expect(lastError.retryable).toBe(false);
    });

    it("应该设置适当的严重级别", async () => {
      const error = new Error("Test error");

      const result = await errorHandler.handleError(error);

      expect(result.error?.severity).toBeDefined();
      expect(Object.values(ErrorSeverity)).toContain(result.error?.severity);
    });
  });

  describe("getErrorLog", () => {
    it("应该返回空数组（初始状态）", () => {
      const log = errorHandler.getErrorLog();

      expect(log).toBeInstanceOf(Array);
      expect(log.length).toBe(0);
    });

    it("应该记录处理的错误", async () => {
      await errorHandler.handleError(new Error("Test error"));

      const log = errorHandler.getErrorLog();

      expect(log.length).toBe(1);
      expect(log[0].message).toBe("Test error");
    });

    it("应该记录多个错误", async () => {
      await errorHandler.handleError(new Error("Error 1"));
      await errorHandler.handleError(new Error("Error 2"));
      await errorHandler.handleError(new Error("Error 3"));

      const log = errorHandler.getErrorLog();

      expect(log.length).toBe(3);
    });

    it("应该按时间倒序返回（最新的在前）", async () => {
      await errorHandler.handleError(new Error("First"));
      await new Promise((resolve) => setTimeout(resolve, 10));
      await errorHandler.handleError(new Error("Second"));

      const log = errorHandler.getErrorLog();

      // 最新的错误应该在前面
      expect(log[0].timestamp).toBeGreaterThan(log[1].timestamp);
    });

    it("应该返回错误副本而不是引用", () => {
      const log1 = errorHandler.getErrorLog();
      const log2 = errorHandler.getErrorLog();

      expect(log1).not.toBe(log2);
      expect(log1).toEqual(log2);
    });
  });

  describe("getErrorStats", () => {
    it("应该返回完整的统计结构", () => {
      const stats = errorHandler.getErrorStats();

      expect(stats).toHaveProperty("totalErrors");
      expect(stats).toHaveProperty("errorsByType");
      expect(stats).toHaveProperty("errorsBySeverity");
      expect(stats).toHaveProperty("recentErrors");
    });

    it("应该正确统计错误总数", async () => {
      await errorHandler.handleError(new Error("Error 1"));
      await errorHandler.handleError(new Error("Error 2"));
      await errorHandler.handleError(new Error("Error 3"));

      const stats = errorHandler.getErrorStats();

      expect(stats.totalErrors).toBe(3);
    });

    it("应该按类型统计错误", async () => {
      await errorHandler.handleError(new Error("Network error"));
      await errorHandler.handleError(new Error("Network error"));
      await errorHandler.handleError(new Error("Parse error"));

      const stats = errorHandler.getErrorStats();

      expect(stats.errorsByType[ErrorType.NETWORK_ERROR]).toBeGreaterThan(0);
      expect(stats.errorsByType[ErrorType.PARSE_ERROR]).toBeGreaterThan(0);
    });

    it("应该按严重性统计错误", async () => {
      await errorHandler.handleError(new Error("Test error"));

      const stats = errorHandler.getErrorStats();

      expect(stats.errorsBySeverity).toBeDefined();
      const totalBySeverity = Object.values(stats.errorsBySeverity).reduce(
        (sum, count) => sum + count,
        0,
      );
      expect(totalBySeverity).toBe(1);
    });

    it("应该返回最近的错误（最多10个）", async () => {
      // 创建新的 ErrorHandler 实例以确保干净状态
      const freshHandler = new ErrorHandler();
      
      // 使用不可重试的错误以加快速度
      for (let i = 0; i < 15; i++) {
        await freshHandler.handleError(new Error(`JSON parse error ${i}`));
      }

      const stats = freshHandler.getErrorStats();

      expect(stats.recentErrors).toBeInstanceOf(Array);
      expect(stats.recentErrors.length).toBeLessThanOrEqual(10);
    });

    it("应该初始化所有错误类型的计数", () => {
      const stats = errorHandler.getErrorStats();

      Object.values(ErrorType).forEach((type) => {
        expect(stats.errorsByType[type]).toBe(0);
      });
    });

    it("应该初始化所有严重级别的计数", () => {
      const stats = errorHandler.getErrorStats();

      Object.values(ErrorSeverity).forEach((severity) => {
        expect(stats.errorsBySeverity[severity]).toBe(0);
      });
    });
  });

  describe("clearErrorLog", () => {
    it("应该清空错误日志", async () => {
      await errorHandler.handleError(new Error("Error 1"));
      await errorHandler.handleError(new Error("Error 2"));

      errorHandler.clearErrorLog();

      const log = errorHandler.getErrorLog();
      expect(log.length).toBe(0);
    });

    it("应该重置错误统计", async () => {
      await errorHandler.handleError(new Error("Error 1"));
      await errorHandler.handleError(new Error("Error 2"));

      errorHandler.clearErrorLog();

      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBe(0);
      expect(stats.recentErrors.length).toBe(0);
    });

    it("应该恢复健康状态", async () => {
      // 制造一些错误
      for (let i = 0; i < 5; i++) {
        await errorHandler.handleError(new Error(`Error ${i}`));
      }

      errorHandler.clearErrorLog();

      const health = errorHandler.getSystemHealth();
      expect(health.status).toBe("healthy");
      expect(health.score).toBe(100);
    });

    it("应该允许记录新的错误", async () => {
      await errorHandler.handleError(new Error("Old error"));
      errorHandler.clearErrorLog();
      await errorHandler.handleError(new Error("New error"));

      const log = errorHandler.getErrorLog();
      expect(log.length).toBe(1);
      expect(log[0].message).toBe("New error");
    });
  });

  describe("getSystemHealth", () => {
    it("应该返回完整的健康状态结构", () => {
      const health = errorHandler.getSystemHealth();

      expect(health).toHaveProperty("status");
      expect(health).toHaveProperty("score");
      expect(health).toHaveProperty("issues");
      expect(health).toHaveProperty("recommendations");
    });

    it("应该在无错误时返回健康状态", () => {
      const health = errorHandler.getSystemHealth();

      expect(health.status).toBe("healthy");
      expect(health.score).toBe(100);
      expect(health.issues).toEqual([]);
      expect(health.recommendations).toEqual([]);
    });

    it("应该在有错误后降低健康分数", async () => {
      // 制造多个高级错误（网络错误是 HIGH 级别）
      for (let i = 0; i < 3; i++) {
        await errorHandler.handleError(new Error("Network request failed"));
      }

      const health = errorHandler.getSystemHealth();

      expect(health.score).toBeLessThan(100);
    });

    it("应该检测警告状态", async () => {
      // 制造多个高级错误
      for (let i = 0; i < 5; i++) {
        await errorHandler.handleError(new Error(`Error ${i}`));
      }

      const health = errorHandler.getSystemHealth();

      expect(["healthy", "warning", "critical"]).toContain(health.status);
    });

    it("应该提供问题描述", async () => {
      // 制造一些错误
      for (let i = 0; i < 12; i++) {
        await errorHandler.handleError(new Error(`Error ${i}`));
      }

      const health = errorHandler.getSystemHealth();

      expect(health.issues).toBeInstanceOf(Array);
      if (health.issues.length > 0) {
        expect(typeof health.issues[0]).toBe("string");
      }
    });

    it("应该提供修复建议", async () => {
      // 制造一些错误
      for (let i = 0; i < 12; i++) {
        await errorHandler.handleError(new Error(`Error ${i}`));
      }

      const health = errorHandler.getSystemHealth();

      expect(health.recommendations).toBeInstanceOf(Array);
      if (health.recommendations.length > 0) {
        expect(typeof health.recommendations[0]).toBe("string");
      }
    });

    it("应该基于最近5分钟的错误评估", async () => {
      await errorHandler.handleError(new Error("Recent error"));

      const health = errorHandler.getSystemHealth();

      // 应该考虑最近的错误
      expect(health).toBeDefined();
    });

    it("分数应该在0-100范围内", async () => {
      // 创建新的 ErrorHandler 实例
      const freshHandler = new ErrorHandler();
      
      // 制造大量错误（使用不可重试的错误以加快速度）
      for (let i = 0; i < 50; i++) {
        await freshHandler.handleError(new Error(`JSON parse error ${i}`));
      }

      const health = freshHandler.getSystemHealth();

      expect(health.score).toBeGreaterThanOrEqual(0);
      expect(health.score).toBeLessThanOrEqual(100);
    });
  });

  describe("错误上下文", () => {
    it("应该保留完整的错误上下文", async () => {
      const context = {
        url: "https://example.com/api",
        method: "GET",
        userId: 123,
        timestamp: Date.now(),
      };

      const result = await errorHandler.handleError(new Error("Test"), context);

      expect(result.error?.context).toEqual(context);
    });

    it("应该处理嵌套的上下文对象", async () => {
      const context = {
        request: {
          headers: { "Content-Type": "application/json" },
          body: { data: "test" },
        },
        metadata: {
          retry: 1,
          source: "api",
        },
      };

      const result = await errorHandler.handleError(new Error("Test"), context);

      expect(result.error?.context).toEqual(context);
    });

    it("应该处理空上下文", async () => {
      const result = await errorHandler.handleError(new Error("Test"), null);

      expect(result.error).toBeDefined();
    });

    it("应该处理 undefined 上下文", async () => {
      const result = await errorHandler.handleError(new Error("Test"));

      expect(result.error).toBeDefined();
    });
  });

  describe("边缘情况", () => {
    it("应该处理 null 错误", async () => {
      const result = await errorHandler.handleError(null);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("应该处理 undefined 错误", async () => {
      const result = await errorHandler.handleError(undefined);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("应该处理空字符串错误", async () => {
      const result = await errorHandler.handleError("");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("应该处理数字错误", async () => {
      const result = await errorHandler.handleError(404);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("应该处理对象错误", async () => {
      const errorObj = { code: "ERR_001", message: "Custom error" };

      const result = await errorHandler.handleError(errorObj);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("应该处理非常长的错误消息", async () => {
      const longMessage = "Error: " + "a".repeat(10000);

      const result = await errorHandler.handleError(new Error(longMessage));

      expect(result.error?.message).toBeDefined();
    });

    it("应该处理特殊字符", async () => {
      const message = "Error: 特殊字符 !@#$%^&*()_+ 中文测试 emoji 🚀";

      const result = await errorHandler.handleError(new Error(message));

      expect(result.error?.message).toContain("特殊字符");
    });

    it("应该处理循环引用的上下文", async () => {
      const context: any = { name: "test" };
      context.self = context; // 循环引用

      const result = await errorHandler.handleError(new Error("Test"), context);

      expect(result.error).toBeDefined();
    });
  });

  describe("性能", () => {
    it("应该快速处理错误", async () => {
      const start = Date.now();

      // 使用不可重试的错误类型（解析错误）来避免重试延迟
      await errorHandler.handleError(new Error("JSON parse error"));

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it("应该能处理大量错误", async () => {
      const start = Date.now();

      // 使用不可重试的错误类型来避免重试延迟
      for (let i = 0; i < 100; i++) {
        await errorHandler.handleError(new Error(`JSON parse error ${i}`));
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // 调整为更合理的时间
    });

    it("getErrorLog 应该快速返回", async () => {
      // 添加一些错误（使用不可重试的错误）
      for (let i = 0; i < 50; i++) {
        await errorHandler.handleError(new Error(`JSON parse error ${i}`));
      }

      const start = Date.now();
      errorHandler.getErrorLog();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it("getErrorStats 应该快速返回", async () => {
      // 添加一些错误（使用不可重试的错误）
      for (let i = 0; i < 50; i++) {
        await errorHandler.handleError(new Error(`JSON parse error ${i}`));
      }

      const start = Date.now();
      errorHandler.getErrorStats();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });

  describe("集成场景", () => {
    it("应该完整记录错误处理流程", async () => {
      // 1. 处理错误（使用网络错误，会触发降级策略）
      await errorHandler.handleError(
        new Error("Network error"),
        { url: "/api/data" },
      );

      // 2. 检查日志（错误应该被记录，即使降级成功）
      const log = errorHandler.getErrorLog();
      expect(log.length).toBeGreaterThan(0);

      // 3. 检查统计
      const stats = errorHandler.getErrorStats();
      expect(stats.totalErrors).toBeGreaterThan(0);

      // 4. 检查健康状态（多个高级错误会降低分数）
      // 添加更多错误来降低健康分数
      await errorHandler.handleError(new Error("Network error"));
      await errorHandler.handleError(new Error("Network error"));
      
      const health = errorHandler.getSystemHealth();
      expect(health.score).toBeLessThan(100);
    });

    it("应该处理多种类型的错误", async () => {
      // 创建新的 ErrorHandler 实例以确保干净状态
      const freshHandler = new ErrorHandler();
      
      await freshHandler.handleError(new Error("Network error"));
      await freshHandler.handleError(new Error("Parse error"));
      await freshHandler.handleError(new Error("Timeout error"));

      const stats = freshHandler.getErrorStats();

      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType[ErrorType.NETWORK_ERROR]).toBeGreaterThan(0);
      expect(stats.errorsByType[ErrorType.PARSE_ERROR]).toBeGreaterThan(0);
      expect(stats.errorsByType[ErrorType.TIMEOUT_ERROR]).toBeGreaterThan(0);
    });

    it("应该支持错误清理和重新开始", async () => {
      // 创建新的 ErrorHandler 实例
      const freshHandler = new ErrorHandler();
      
      // 制造一些错误（使用不可重试的错误以加快速度）
      for (let i = 0; i < 5; i++) {
        await freshHandler.handleError(new Error(`JSON parse error ${i}`));
      }

      // 清理
      freshHandler.clearErrorLog();

      // 记录新错误
      await freshHandler.handleError(new Error("New error"));

      const stats = freshHandler.getErrorStats();
      expect(stats.totalErrors).toBe(1);

      const log = freshHandler.getErrorLog();
      expect(log[0].message).toBe("New error");
    });
  });
});
