/**
 * 性能监控工具
 * Week 3 - 任务2.2
 */

/**
 * 检查是否在浏览器环境中
 */
function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export interface PerformanceMetrics {
  // 加载时间指标
  configLoadTime: number;
  categoryLoadTime: number;
  avgCategoryLoadTime: number;

  // 缓存指标
  cacheHitRate: number;
  cacheSize: number;
  maxCacheSize: number;

  // 网络指标
  networkRequestCount: number;
  failedRequestCount: number;
  avgResponseTime: number;

  // 用户交互指标
  userInteractionCount: number;
  avgInteractionResponseTime: number;

  // 预加载指标
  preloadCount: number;
  preloadSuccessRate: number;
  preloadCacheHitRate: number;

  // 内存指标
  memoryUsage: number;
  memoryUsagePercentage: number;

  // 时间戳
  lastUpdated: number;
  sessionStartTime: number;
}

export interface PerformanceAlert {
  type: "warning" | "error" | "info";
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export interface PerformanceRecommendation {
  category: "cache" | "network" | "preload" | "memory";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  actionable: boolean;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private alerts: PerformanceAlert[] = [];
  private recommendations: PerformanceRecommendation[] = [];

  // 性能阈值配置
  private thresholds = {
    configLoadTime: 1000, // 配置加载时间 < 1秒
    categoryLoadTime: 2000, // 分类加载时间 < 2秒
    cacheHitRate: 80, // 缓存命中率 > 80%
    networkResponseTime: 1500, // 网络响应时间 < 1.5秒
    interactionResponseTime: 100, // 交互响应时间 < 100ms
    memoryUsage: 50, // 内存使用 < 50MB
    failureRate: 5, // 失败率 < 5%
  };

  // 数据收集器
  private collectors = {
    loadTimes: [] as number[],
    responseTimes: [] as number[],
    interactionTimes: [] as number[],
  };

  // 更新定时器
  private updateTimer: number | null = null;
  private updateInterval = 5000; // 5秒更新一次

  constructor() {
    this.metrics = this.initializeMetrics();

    if (isBrowser()) {
      this.startMonitoring();
      console.log("📊 PerformanceMonitor初始化完成");
    }
  }

  /**
   * 初始化性能指标
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      configLoadTime: 0,
      categoryLoadTime: 0,
      avgCategoryLoadTime: 0,
      cacheHitRate: 0,
      cacheSize: 0,
      maxCacheSize: 0,
      networkRequestCount: 0,
      failedRequestCount: 0,
      avgResponseTime: 0,
      userInteractionCount: 0,
      avgInteractionResponseTime: 0,
      preloadCount: 0,
      preloadSuccessRate: 0,
      preloadCacheHitRate: 0,
      memoryUsage: 0,
      memoryUsagePercentage: 0,
      lastUpdated: Date.now(),
      sessionStartTime: Date.now(),
    };
  }

  /**
   * 开始监控
   */
  private startMonitoring(): void {
    if (!isBrowser()) return;

    this.updateTimer = window.setInterval(() => {
      this.updateMetrics();
      this.checkAlerts();
      this.generateRecommendations();
    }, this.updateInterval);
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * 记录配置加载时间
   */
  recordConfigLoadTime(loadTime: number): void {
    this.metrics.configLoadTime = loadTime;
    this.checkThreshold(
      "configLoadTime",
      loadTime,
      this.thresholds.configLoadTime,
    );
    console.log(`📊 记录配置加载时间: ${loadTime.toFixed(2)}ms`);
  }

  /**
   * 记录分类加载时间
   */
  recordCategoryLoadTime(loadTime: number): void {
    this.collectors.loadTimes.push(loadTime);
    this.metrics.categoryLoadTime = loadTime;
    this.metrics.avgCategoryLoadTime = this.calculateAverage(
      this.collectors.loadTimes,
    );

    this.checkThreshold(
      "categoryLoadTime",
      loadTime,
      this.thresholds.categoryLoadTime,
    );
    console.log(`📊 记录分类加载时间: ${loadTime.toFixed(2)}ms`);
  }

  /**
   * 记录网络请求
   */
  recordNetworkRequest(responseTime: number, success: boolean = true): void {
    this.metrics.networkRequestCount++;
    if (!success) {
      this.metrics.failedRequestCount++;
    }

    this.collectors.responseTimes.push(responseTime);
    this.metrics.avgResponseTime = this.calculateAverage(
      this.collectors.responseTimes,
    );

    const failureRate =
      (this.metrics.failedRequestCount / this.metrics.networkRequestCount) *
      100;
    this.checkThreshold(
      "failureRate",
      failureRate,
      this.thresholds.failureRate,
    );
    this.checkThreshold(
      "responseTime",
      responseTime,
      this.thresholds.networkResponseTime,
    );
  }

  /**
   * 记录用户交互
   */
  recordUserInteraction(responseTime: number): void {
    this.metrics.userInteractionCount++;
    this.collectors.interactionTimes.push(responseTime);
    this.metrics.avgInteractionResponseTime = this.calculateAverage(
      this.collectors.interactionTimes,
    );

    this.checkThreshold(
      "interactionResponseTime",
      responseTime,
      this.thresholds.interactionResponseTime,
    );
  }

  /**
   * 更新缓存指标
   */
  updateCacheMetrics(
    cacheSize: number,
    maxCacheSize: number,
    hitRate: number,
  ): void {
    this.metrics.cacheSize = cacheSize;
    this.metrics.maxCacheSize = maxCacheSize;
    this.metrics.cacheHitRate = hitRate;

    this.checkThreshold(
      "cacheHitRate",
      hitRate,
      this.thresholds.cacheHitRate,
      "below",
    );
  }

  /**
   * 更新预加载指标
   */
  updatePreloadMetrics(
    preloadCount: number,
    successRate: number,
    cacheHitRate: number,
  ): void {
    this.metrics.preloadCount = preloadCount;
    this.metrics.preloadSuccessRate = successRate;
    this.metrics.preloadCacheHitRate = cacheHitRate;
  }

  /**
   * 更新内存使用指标
   */
  private updateMemoryMetrics(): void {
    if (typeof performance !== "undefined" && (performance as any).memory) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const totalMB = memory.totalJSHeapSize / 1024 / 1024;

      this.metrics.memoryUsage = usedMB;
      this.metrics.memoryUsagePercentage = (usedMB / totalMB) * 100;

      this.checkThreshold("memoryUsage", usedMB, this.thresholds.memoryUsage);
    }
  }

  /**
   * 更新所有指标
   */
  private updateMetrics(): void {
    this.updateMemoryMetrics();
    this.metrics.lastUpdated = Date.now();
  }

  /**
   * 检查阈值并生成警告
   */
  private checkThreshold(
    metric: string,
    value: number,
    threshold: number,
    direction: "above" | "below" = "above",
  ): void {
    const isAlert =
      direction === "above" ? value > threshold : value < threshold;

    if (isAlert) {
      const alert: PerformanceAlert = {
        type: value > threshold * 1.5 ? "error" : "warning",
        message: this.getAlertMessage(metric, value, threshold, direction),
        metric,
        value,
        threshold,
        timestamp: Date.now(),
      };

      this.alerts.unshift(alert);

      // 保持最近20个警告
      if (this.alerts.length > 20) {
        this.alerts = this.alerts.slice(0, 20);
      }

      console.warn(`⚠️ 性能警告: ${alert.message}`);
    }
  }

  /**
   * 生成警告消息
   */
  private getAlertMessage(
    metric: string,
    value: number,
    threshold: number,
    direction: string,
  ): string {
    const messages: Record<string, string> = {
      configLoadTime: `配置加载时间过长: ${value.toFixed(0)}ms (阈值: ${threshold}ms)`,
      categoryLoadTime: `分类加载时间过长: ${value.toFixed(0)}ms (阈值: ${threshold}ms)`,
      cacheHitRate: `缓存命中率过低: ${value.toFixed(1)}% (阈值: ${threshold}%)`,
      responseTime: `网络响应时间过长: ${value.toFixed(0)}ms (阈值: ${threshold}ms)`,
      interactionResponseTime: `交互响应时间过长: ${value.toFixed(0)}ms (阈值: ${threshold}ms)`,
      memoryUsage: `内存使用过高: ${value.toFixed(1)}MB (阈值: ${threshold}MB)`,
      failureRate: `请求失败率过高: ${value.toFixed(1)}% (阈值: ${threshold}%)`,
    };

    return (
      messages[metric] || `${metric} 超出阈值: ${value} (阈值: ${threshold})`
    );
  }

  /**
   * 检查并生成警告
   */
  private checkAlerts(): void {
    // 清理过期警告 (超过1小时)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.alerts = this.alerts.filter((alert) => alert.timestamp > oneHourAgo);
  }

  /**
   * 生成性能优化建议
   */
  private generateRecommendations(): void {
    this.recommendations = [];

    // 缓存相关建议
    if (this.metrics.cacheHitRate < 70) {
      this.recommendations.push({
        category: "cache",
        title: "提高缓存命中率",
        description: "当前缓存命中率较低，建议增加预加载策略或调整缓存大小",
        impact: "high",
        actionable: true,
      });
    }

    // 网络相关建议
    if (this.metrics.avgResponseTime > 1000) {
      this.recommendations.push({
        category: "network",
        title: "优化网络请求",
        description: "网络响应时间较长，建议检查网络连接或优化请求策略",
        impact: "medium",
        actionable: true,
      });
    }

    // 预加载相关建议
    if (this.metrics.preloadSuccessRate < 80 && this.metrics.preloadCount > 0) {
      this.recommendations.push({
        category: "preload",
        title: "优化预加载策略",
        description: "预加载成功率较低，建议调整预加载时机或减少预加载数量",
        impact: "medium",
        actionable: true,
      });
    }

    // 内存相关建议
    if (this.metrics.memoryUsage > 40) {
      this.recommendations.push({
        category: "memory",
        title: "优化内存使用",
        description: "内存使用较高，建议清理过期缓存或减少缓存大小",
        impact: "high",
        actionable: true,
      });
    }
  }

  /**
   * 计算平均值
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;

    // 保持最近50个值
    if (values.length > 50) {
      values.splice(0, values.length - 50);
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  /**
   * 获取当前性能指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取性能警告
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * 获取性能建议
   */
  getRecommendations(): PerformanceRecommendation[] {
    return [...this.recommendations];
  }

  /**
   * 获取性能评分 (0-100)
   */
  getPerformanceScore(): number {
    let score = 100;

    // 配置加载时间评分 (20分)
    if (this.metrics.configLoadTime > this.thresholds.configLoadTime) {
      score -= 20;
    } else if (
      this.metrics.configLoadTime >
      this.thresholds.configLoadTime * 0.7
    ) {
      score -= 10;
    }

    // 分类加载时间评分 (20分)
    if (this.metrics.avgCategoryLoadTime > this.thresholds.categoryLoadTime) {
      score -= 20;
    } else if (
      this.metrics.avgCategoryLoadTime >
      this.thresholds.categoryLoadTime * 0.7
    ) {
      score -= 10;
    }

    // 缓存命中率评分 (20分)
    if (this.metrics.cacheHitRate < this.thresholds.cacheHitRate) {
      score -= 20;
    } else if (this.metrics.cacheHitRate < this.thresholds.cacheHitRate * 1.1) {
      score -= 10;
    }

    // 网络响应时间评分 (20分)
    if (this.metrics.avgResponseTime > this.thresholds.networkResponseTime) {
      score -= 20;
    } else if (
      this.metrics.avgResponseTime >
      this.thresholds.networkResponseTime * 0.7
    ) {
      score -= 10;
    }

    // 内存使用评分 (20分)
    if (this.metrics.memoryUsage > this.thresholds.memoryUsage) {
      score -= 20;
    } else if (this.metrics.memoryUsage > this.thresholds.memoryUsage * 0.8) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * 重置统计数据
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.alerts = [];
    this.recommendations = [];
    this.collectors = {
      loadTimes: [],
      responseTimes: [],
      interactionTimes: [],
    };

    console.log("📊 性能监控数据已重置");
  }

  /**
   * 导出性能报告
   */
  exportReport(): string {
    const report = {
      metrics: this.metrics,
      alerts: this.alerts,
      recommendations: this.recommendations,
      score: this.getPerformanceScore(),
      exportTime: new Date().toISOString(),
    };

    return JSON.stringify(report, null, 2);
  }
}

/**
 * 默认性能监控实例
 */
export const defaultPerformanceMonitor = new PerformanceMonitor();

/**
 * 便捷函数：记录配置加载时间
 */
export function recordConfigLoad(loadTime: number): void {
  defaultPerformanceMonitor.recordConfigLoadTime(loadTime);
}

/**
 * 便捷函数：记录分类加载时间
 */
export function recordCategoryLoad(loadTime: number): void {
  defaultPerformanceMonitor.recordCategoryLoadTime(loadTime);
}

/**
 * 便捷函数：记录网络请求
 */
export function recordNetworkRequest(
  responseTime: number,
  success: boolean = true,
): void {
  defaultPerformanceMonitor.recordNetworkRequest(responseTime, success);
}

/**
 * 便捷函数：记录用户交互
 */
export function recordUserInteraction(responseTime: number): void {
  defaultPerformanceMonitor.recordUserInteraction(responseTime);
}

/**
 * 便捷函数：获取性能指标
 */
export function getPerformanceMetrics() {
  return defaultPerformanceMonitor.getMetrics();
}
