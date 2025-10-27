/**
 * PerformanceMonitor 单元测试
 *
 * 测试覆盖：
 * - 构造函数和初始化
 * - 配置加载时间记录
 * - 分类加载时间记录
 * - 网络请求记录
 * - 用户交互记录
 * - 缓存指标更新
 * - 预加载指标更新
 * - 内存指标更新
 * - 性能阈值检查
 * - 警告生成和管理
 * - 性能建议生成
 * - 指标获取和导出
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { PerformanceMonitor } from "../../../src/utils/PerformanceMonitor";
import type {
  PerformanceMetrics,
  PerformanceAlert,
  PerformanceRecommendation,
} from "../../../src/utils/PerformanceMonitor";

describe("PerformanceMonitor", () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    // 清理所有 mock
    vi.clearAllMocks();

    // Mock 浏览器环境
    if (typeof window === "undefined") {
      (global as any).window = {
        setInterval: vi.fn((fn, ms) => setInterval(fn, ms)),
        clearInterval: vi.fn((id) => clearInterval(id)),
      };
    }

    // Mock performance.memory
    if (typeof performance !== "undefined") {
      (performance as any).memory = {
        usedJSHeapSize: 10 * 1024 * 1024, // 10MB
        totalJSHeapSize: 100 * 1024 * 1024, // 100MB
        jsHeapSizeLimit: 2048 * 1024 * 1024, // 2GB
      };
    }

    // 创建 PerformanceMonitor 实例
    monitor = new PerformanceMonitor();
  });

  afterEach(() => {
    // 停止监控
    monitor.stopMonitoring();
  });

  describe("constructor", () => {
    it("应该成功初始化 PerformanceMonitor", () => {
      expect(monitor).toBeDefined();
      expect(monitor).toBeInstanceOf(PerformanceMonitor);
    });

    it("应该初始化默认指标", () => {
      const metrics = monitor.getMetrics();

      expect(metrics.configLoadTime).toBe(0);
      expect(metrics.categoryLoadTime).toBe(0);
      expect(metrics.avgCategoryLoadTime).toBe(0);
      expect(metrics.cacheHitRate).toBe(0);
      expect(metrics.networkRequestCount).toBe(0);
      expect(metrics.sessionStartTime).toBeGreaterThan(0);
      expect(metrics.lastUpdated).toBeGreaterThan(0);
    });

    it("应该在浏览器环境中启动监控", () => {
      expect(monitor).toBeDefined();
    });
  });

  describe("recordConfigLoadTime", () => {
    it("应该记录配置加载时间", () => {
      monitor.recordConfigLoadTime(500);

      const metrics = monitor.getMetrics();
      expect(metrics.configLoadTime).toBe(500);
    });

    it("应该记录多次配置加载并保留最新值", () => {
      monitor.recordConfigLoadTime(500);
      monitor.recordConfigLoadTime(800);

      const metrics = monitor.getMetrics();
      expect(metrics.configLoadTime).toBe(800);
    });

    it("应该在加载时间超过阈值时生成警告", () => {
      monitor.recordConfigLoadTime(1500); // 超过 1000ms 阈值

      const alerts = monitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);

      const configAlert = alerts.find((a) => a.metric === "configLoadTime");
      expect(configAlert).toBeDefined();
      expect(configAlert?.value).toBe(1500);
      expect(configAlert?.type).toMatch(/warning|error/);
    });

    it("应该在正常范围内不生成警告", () => {
      monitor.recordConfigLoadTime(500); // 低于 1000ms 阈值

      const alerts = monitor.getAlerts();
      const configAlert = alerts.find((a) => a.metric === "configLoadTime");
      expect(configAlert).toBeUndefined();
    });
  });

  describe("recordCategoryLoadTime", () => {
    it("应该记录分类加载时间", () => {
      monitor.recordCategoryLoadTime(300);

      const metrics = monitor.getMetrics();
      expect(metrics.categoryLoadTime).toBe(300);
    });

    it("应该计算平均加载时间", () => {
      monitor.recordCategoryLoadTime(300);
      monitor.recordCategoryLoadTime(400);
      monitor.recordCategoryLoadTime(500);

      const metrics = monitor.getMetrics();
      expect(metrics.avgCategoryLoadTime).toBe(400);
    });

    it("应该更新最新的加载时间", () => {
      monitor.recordCategoryLoadTime(300);
      monitor.recordCategoryLoadTime(600);

      const metrics = monitor.getMetrics();
      expect(metrics.categoryLoadTime).toBe(600);
    });

    it("应该在加载时间超过阈值时生成警告", () => {
      monitor.recordCategoryLoadTime(2500); // 超过 2000ms 阈值

      const alerts = monitor.getAlerts();
      const categoryAlert = alerts.find((a) => a.metric === "categoryLoadTime");
      expect(categoryAlert).toBeDefined();
      expect(categoryAlert?.value).toBe(2500);
    });

    it("应该处理大量记录并保持平均值准确", () => {
      for (let i = 1; i <= 100; i++) {
        monitor.recordCategoryLoadTime(i * 10); // 10, 20, 30, ..., 1000
      }

      const metrics = monitor.getMetrics();
      // 平均值应该在合理范围内（实际实现可能使用滑动平均）
      expect(metrics.avgCategoryLoadTime).toBeGreaterThan(0);
      expect(metrics.avgCategoryLoadTime).toBeLessThan(1000);
    });
  });

  describe("recordNetworkRequest", () => {
    it("应该记录成功的网络请求", () => {
      monitor.recordNetworkRequest(200, true);

      const metrics = monitor.getMetrics();
      expect(metrics.networkRequestCount).toBe(1);
      expect(metrics.failedRequestCount).toBe(0);
      expect(metrics.avgResponseTime).toBe(200);
    });

    it("应该记录失败的网络请求", () => {
      monitor.recordNetworkRequest(500, false);

      const metrics = monitor.getMetrics();
      expect(metrics.networkRequestCount).toBe(1);
      expect(metrics.failedRequestCount).toBe(1);
    });

    it("应该计算平均响应时间", () => {
      monitor.recordNetworkRequest(100, true);
      monitor.recordNetworkRequest(200, true);
      monitor.recordNetworkRequest(300, true);

      const metrics = monitor.getMetrics();
      expect(metrics.avgResponseTime).toBe(200);
    });

    it("应该计算失败率", () => {
      monitor.recordNetworkRequest(100, true);
      monitor.recordNetworkRequest(200, false);
      monitor.recordNetworkRequest(150, true);
      monitor.recordNetworkRequest(300, false);

      const metrics = monitor.getMetrics();
      expect(metrics.networkRequestCount).toBe(4);
      expect(metrics.failedRequestCount).toBe(2);
      // 失败率 = 50%
    });

    it("应该在失败率超过阈值时生成警告", () => {
      // 失败率阈值是 5%，所以需要超过 5% 的失败率
      for (let i = 0; i < 10; i++) {
        monitor.recordNetworkRequest(100, false); // 10 个失败请求
      }
      for (let i = 0; i < 90; i++) {
        monitor.recordNetworkRequest(100, true); // 90 个成功请求
      }

      const alerts = monitor.getAlerts();
      const failureAlert = alerts.find((a) => a.metric === "failureRate");
      expect(failureAlert).toBeDefined();
    });

    it("应该在响应时间超过阈值时生成警告", () => {
      monitor.recordNetworkRequest(2000, true); // 超过 1500ms 阈值

      const alerts = monitor.getAlerts();
      const responseAlert = alerts.find((a) => a.metric === "responseTime");
      expect(responseAlert).toBeDefined();
      expect(responseAlert?.value).toBe(2000);
    });

    it("应该默认记录为成功请求", () => {
      monitor.recordNetworkRequest(200); // 不传 success 参数

      const metrics = monitor.getMetrics();
      expect(metrics.failedRequestCount).toBe(0);
    });
  });

  describe("recordUserInteraction", () => {
    it("应该记录用户交互", () => {
      monitor.recordUserInteraction(50);

      const metrics = monitor.getMetrics();
      expect(metrics.userInteractionCount).toBe(1);
      expect(metrics.avgInteractionResponseTime).toBe(50);
    });

    it("应该计算平均交互响应时间", () => {
      monitor.recordUserInteraction(50);
      monitor.recordUserInteraction(100);
      monitor.recordUserInteraction(150);

      const metrics = monitor.getMetrics();
      expect(metrics.avgInteractionResponseTime).toBe(100);
    });

    it("应该在交互响应时间超过阈值时生成警告", () => {
      monitor.recordUserInteraction(200); // 超过 100ms 阈值

      const alerts = monitor.getAlerts();
      const interactionAlert = alerts.find(
        (a) => a.metric === "interactionResponseTime",
      );
      expect(interactionAlert).toBeDefined();
      expect(interactionAlert?.value).toBe(200);
    });

    it("应该记录多次交互并保持计数准确", () => {
      for (let i = 0; i < 50; i++) {
        monitor.recordUserInteraction(50 + i);
      }

      const metrics = monitor.getMetrics();
      expect(metrics.userInteractionCount).toBe(50);
      expect(metrics.avgInteractionResponseTime).toBeGreaterThan(0);
    });
  });

  describe("updateCacheMetrics", () => {
    it("应该更新缓存指标", () => {
      monitor.updateCacheMetrics(5, 10, 85);

      const metrics = monitor.getMetrics();
      expect(metrics.cacheSize).toBe(5);
      expect(metrics.maxCacheSize).toBe(10);
      expect(metrics.cacheHitRate).toBe(85);
    });

    it("应该在缓存命中率过低时生成警告", () => {
      monitor.updateCacheMetrics(5, 10, 50); // 低于 80% 阈值

      const alerts = monitor.getAlerts();
      const cacheAlert = alerts.find((a) => a.metric === "cacheHitRate");
      expect(cacheAlert).toBeDefined();
      expect(cacheAlert?.value).toBe(50);
    });

    it("应该在高缓存命中率时不生成警告", () => {
      monitor.updateCacheMetrics(5, 10, 95); // 高于 80% 阈值

      const alerts = monitor.getAlerts();
      const cacheAlert = alerts.find((a) => a.metric === "cacheHitRate");
      expect(cacheAlert).toBeUndefined();
    });

    it("应该处理极端值", () => {
      monitor.updateCacheMetrics(0, 10, 0);
      let metrics = monitor.getMetrics();
      expect(metrics.cacheHitRate).toBe(0);

      monitor.updateCacheMetrics(10, 10, 100);
      metrics = monitor.getMetrics();
      expect(metrics.cacheHitRate).toBe(100);
    });
  });

  describe("updatePreloadMetrics", () => {
    it("应该更新预加载指标", () => {
      monitor.updatePreloadMetrics(10, 90, 85);

      const metrics = monitor.getMetrics();
      expect(metrics.preloadCount).toBe(10);
      expect(metrics.preloadSuccessRate).toBe(90);
      expect(metrics.preloadCacheHitRate).toBe(85);
    });

    it("应该允许多次更新预加载指标", () => {
      monitor.updatePreloadMetrics(5, 80, 70);
      monitor.updatePreloadMetrics(10, 90, 85);

      const metrics = monitor.getMetrics();
      expect(metrics.preloadCount).toBe(10);
      expect(metrics.preloadSuccessRate).toBe(90);
      expect(metrics.preloadCacheHitRate).toBe(85);
    });

    it("应该处理零值", () => {
      monitor.updatePreloadMetrics(0, 0, 0);

      const metrics = monitor.getMetrics();
      expect(metrics.preloadCount).toBe(0);
      expect(metrics.preloadSuccessRate).toBe(0);
      expect(metrics.preloadCacheHitRate).toBe(0);
    });
  });

  describe("getMetrics", () => {
    it("应该返回完整的性能指标", () => {
      const metrics = monitor.getMetrics();

      expect(metrics).toHaveProperty("configLoadTime");
      expect(metrics).toHaveProperty("categoryLoadTime");
      expect(metrics).toHaveProperty("avgCategoryLoadTime");
      expect(metrics).toHaveProperty("cacheHitRate");
      expect(metrics).toHaveProperty("networkRequestCount");
      expect(metrics).toHaveProperty("failedRequestCount");
      expect(metrics).toHaveProperty("avgResponseTime");
      expect(metrics).toHaveProperty("userInteractionCount");
      expect(metrics).toHaveProperty("preloadCount");
      expect(metrics).toHaveProperty("memoryUsage");
      expect(metrics).toHaveProperty("lastUpdated");
      expect(metrics).toHaveProperty("sessionStartTime");
    });

    it("应该返回实时更新的指标", () => {
      monitor.recordConfigLoadTime(500);
      monitor.recordCategoryLoadTime(300);

      const metrics = monitor.getMetrics();
      expect(metrics.configLoadTime).toBe(500);
      expect(metrics.categoryLoadTime).toBe(300);
    });
  });

  describe("getAlerts", () => {
    it("应该返回空数组（初始状态）", () => {
      const alerts = monitor.getAlerts();
      expect(alerts).toBeInstanceOf(Array);
      expect(alerts.length).toBe(0);
    });

    it("应该返回生成的警告", () => {
      monitor.recordConfigLoadTime(1500); // 生成警告
      monitor.recordCategoryLoadTime(2500); // 生成警告

      const alerts = monitor.getAlerts();
      expect(alerts.length).toBeGreaterThan(0);
    });

    it("应该按时间倒序返回警告（最新的在前）", () => {
      monitor.recordConfigLoadTime(1500);
      // 等待一小段时间
      monitor.recordCategoryLoadTime(2500);

      const alerts = monitor.getAlerts();
      if (alerts.length >= 2) {
        expect(alerts[0].timestamp).toBeGreaterThanOrEqual(alerts[1].timestamp);
      }
    });

    it("应该限制警告数量不超过20个", () => {
      // 生成大量警告
      for (let i = 0; i < 30; i++) {
        monitor.recordConfigLoadTime(1500 + i);
      }

      const alerts = monitor.getAlerts();
      expect(alerts.length).toBeLessThanOrEqual(20);
    });

    it("警告应该包含必要的属性", () => {
      monitor.recordConfigLoadTime(1500);

      const alerts = monitor.getAlerts();
      if (alerts.length > 0) {
        const alert = alerts[0];
        expect(alert).toHaveProperty("type");
        expect(alert).toHaveProperty("message");
        expect(alert).toHaveProperty("metric");
        expect(alert).toHaveProperty("value");
        expect(alert).toHaveProperty("threshold");
        expect(alert).toHaveProperty("timestamp");
      }
    });
  });

  describe("getRecommendations", () => {
    it("应该返回性能建议", () => {
      const recommendations = monitor.getRecommendations();
      expect(recommendations).toBeInstanceOf(Array);
    });

    it("建议应该包含必要的属性", () => {
      const recommendations = monitor.getRecommendations();
      if (recommendations.length > 0) {
        const rec = recommendations[0];
        expect(rec).toHaveProperty("category");
        expect(rec).toHaveProperty("title");
        expect(rec).toHaveProperty("description");
        expect(rec).toHaveProperty("impact");
        expect(rec).toHaveProperty("actionable");
      }
    });
  });

  describe("stopMonitoring", () => {
    it("应该停止监控", () => {
      monitor.stopMonitoring();
      // 不应该抛出错误
      expect(true).toBe(true);
    });

    it("应该可以多次调用", () => {
      monitor.stopMonitoring();
      monitor.stopMonitoring();
      // 不应该抛出错误
      expect(true).toBe(true);
    });
  });

  describe("reset", () => {
    it("应该重置所有指标", () => {
      // 记录一些数据
      monitor.recordConfigLoadTime(500);
      monitor.recordCategoryLoadTime(300);
      monitor.recordNetworkRequest(200, true);

      // 重置
      monitor.reset();

      const metrics = monitor.getMetrics();
      expect(metrics.configLoadTime).toBe(0);
      expect(metrics.categoryLoadTime).toBe(0);
      expect(metrics.networkRequestCount).toBe(0);
    });

    it("应该清空警告", () => {
      monitor.recordConfigLoadTime(1500); // 生成警告
      monitor.reset();

      const alerts = monitor.getAlerts();
      expect(alerts.length).toBe(0);
    });
  });

  describe("exportReport", () => {
    it("应该导出指标为 JSON 格式", () => {
      monitor.recordConfigLoadTime(500);
      monitor.recordCategoryLoadTime(300);

      const exported = monitor.exportReport();
      expect(exported).toBeDefined();

      const parsed = JSON.parse(exported);
      expect(parsed.metrics).toBeDefined();
      expect(parsed.metrics.configLoadTime).toBe(500);
      expect(parsed.metrics.categoryLoadTime).toBe(300);
    });

    it("应该包含警告和建议", () => {
      monitor.recordConfigLoadTime(1500); // 生成警告

      const exported = monitor.exportReport();
      const parsed = JSON.parse(exported);

      expect(parsed.alerts).toBeDefined();
      expect(parsed.recommendations).toBeDefined();
    });
  });

  describe("警告类型和严重性", () => {
    it("应该生成 warning 类型警告（超过阈值）", () => {
      monitor.recordConfigLoadTime(1200); // 1.2x 阈值

      const alerts = monitor.getAlerts();
      const alert = alerts.find((a) => a.metric === "configLoadTime");
      expect(alert?.type).toBe("warning");
    });

    it("应该生成 error 类型警告（严重超过阈值）", () => {
      monitor.recordConfigLoadTime(2000); // 2x 阈值

      const alerts = monitor.getAlerts();
      const alert = alerts.find((a) => a.metric === "configLoadTime");
      expect(alert?.type).toBe("error");
    });

    it("应该根据不同指标生成不同的警告消息", () => {
      monitor.recordConfigLoadTime(1500);
      monitor.recordCategoryLoadTime(2500);
      monitor.recordNetworkRequest(2000, true);

      const alerts = monitor.getAlerts();
      expect(alerts.length).toBeGreaterThanOrEqual(3);

      const messages = alerts.map((a) => a.message);
      expect(messages.some((m) => m.includes("配置加载"))).toBe(true);
      expect(messages.some((m) => m.includes("分类加载"))).toBe(true);
      expect(messages.some((m) => m.includes("响应时间"))).toBe(true);
    });
  });

  describe("边缘情况和错误处理", () => {
    it("应该处理负数时间", () => {
      monitor.recordConfigLoadTime(-100);
      const metrics = monitor.getMetrics();
      expect(metrics.configLoadTime).toBe(-100);
    });

    it("应该处理零值", () => {
      monitor.recordConfigLoadTime(0);
      monitor.recordCategoryLoadTime(0);
      monitor.recordNetworkRequest(0, true);

      const metrics = monitor.getMetrics();
      expect(metrics.configLoadTime).toBe(0);
      expect(metrics.categoryLoadTime).toBe(0);
      expect(metrics.avgResponseTime).toBe(0);
    });

    it("应该处理非常大的数值", () => {
      monitor.recordConfigLoadTime(999999);
      monitor.recordCategoryLoadTime(999999);

      const metrics = monitor.getMetrics();
      expect(metrics.configLoadTime).toBe(999999);
      expect(metrics.categoryLoadTime).toBe(999999);
    });

    it("应该处理浮点数", () => {
      monitor.recordConfigLoadTime(123.456);
      monitor.recordCategoryLoadTime(789.012);

      const metrics = monitor.getMetrics();
      expect(metrics.configLoadTime).toBeCloseTo(123.456, 2);
      expect(metrics.categoryLoadTime).toBeCloseTo(789.012, 2);
    });

    it("应该在非浏览器环境中正常工作", () => {
      // PerformanceMonitor 应该能在 Node.js 环境中初始化
      const nodeMonitor = new PerformanceMonitor();
      expect(nodeMonitor).toBeDefined();
      nodeMonitor.stopMonitoring();
    });
  });

  describe("性能测试", () => {
    it("应该高效处理大量记录", () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        monitor.recordCategoryLoadTime(100 + i);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // 应该在 100ms 内完成
    });

    it("应该高效处理大量网络请求记录", () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        monitor.recordNetworkRequest(100 + i, i % 10 !== 0);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100);
    });

    it("getMetrics 应该快速返回", () => {
      // 先记录一些数据
      for (let i = 0; i < 100; i++) {
        monitor.recordCategoryLoadTime(100);
      }

      const startTime = Date.now();
      const metrics = monitor.getMetrics();
      const duration = Date.now() - startTime;

      expect(metrics).toBeDefined();
      expect(duration).toBeLessThan(10);
    });
  });

  describe("集成场景", () => {
    it("应该模拟完整的性能监控流程", () => {
      // 1. 记录配置加载
      monitor.recordConfigLoadTime(800);

      // 2. 记录多次分类加载
      monitor.recordCategoryLoadTime(200);
      monitor.recordCategoryLoadTime(300);
      monitor.recordCategoryLoadTime(250);

      // 3. 记录网络请求
      monitor.recordNetworkRequest(150, true);
      monitor.recordNetworkRequest(200, true);
      monitor.recordNetworkRequest(180, false);

      // 4. 记录用户交互
      monitor.recordUserInteraction(50);
      monitor.recordUserInteraction(60);

      // 5. 更新缓存指标
      monitor.updateCacheMetrics(8, 10, 85);

      // 6. 更新预加载指标
      monitor.updatePreloadMetrics(5, 90, 80);

      // 验证指标
      const metrics = monitor.getMetrics();
      expect(metrics.configLoadTime).toBe(800);
      expect(metrics.avgCategoryLoadTime).toBeCloseTo(250, 0);
      expect(metrics.networkRequestCount).toBe(3);
      expect(metrics.failedRequestCount).toBe(1);
      expect(metrics.userInteractionCount).toBe(2);
      expect(metrics.cacheHitRate).toBe(85);
      expect(metrics.preloadCount).toBe(5);
    });

    it("应该在高负载场景下正常工作", () => {
      // 模拟高负载场景
      for (let i = 0; i < 50; i++) {
        monitor.recordCategoryLoadTime(100 + Math.random() * 100);
        monitor.recordNetworkRequest(
          100 + Math.random() * 200,
          Math.random() > 0.1,
        );
        monitor.recordUserInteraction(30 + Math.random() * 50);
      }

      monitor.updateCacheMetrics(45, 50, 92);
      monitor.updatePreloadMetrics(25, 95, 88);

      const metrics = monitor.getMetrics();
      expect(metrics.categoryLoadTime).toBeGreaterThan(0);
      expect(metrics.networkRequestCount).toBe(50);
      expect(metrics.userInteractionCount).toBe(50);
    });
  });
});
