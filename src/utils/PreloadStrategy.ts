/**
 * 智能预加载策略
 * Week 3 - 任务2.1
 */

import type { LazyLoader } from "./LazyLoader";
import type { ConfigManager } from "./ConfigManager";

export interface PreloadConfig {
  /** 热门分类列表 */
  hotCategories: number[];
  /** 预加载数量限制 */
  maxPreloadCount: number;
  /** 预加载延迟 (ms) */
  preloadDelay: number;
  /** 是否启用空闲时预加载 */
  enableIdlePreload: boolean;
  /** 是否启用悬停预加载 */
  enableHoverPreload: boolean;
  /** 用户历史记录存储天数 */
  historyRetentionDays: number;
}

export interface UserHistory {
  categoryIndex: number;
  visitCount: number;
  lastVisit: number;
  avgLoadTime: number;
}

export interface PreloadPriority {
  categoryIndex: number;
  priority: number;
  reason: "hot" | "adjacent" | "history" | "hover";
  confidence: number;
}

export class PreloadStrategy {
  private lazyLoader: LazyLoader;
  private configManager: ConfigManager;
  private config: PreloadConfig;

  // 用户历史记录
  private userHistory = new Map<number, UserHistory>();
  private readonly STORAGE_KEY = "nav_user_history";

  // 预加载状态管理
  private preloadQueue = new Set<number>();
  private preloadingCategories = new Set<number>();
  private preloadTimers = new Map<number, number>();

  // 性能监控
  private preloadStats = {
    totalPreloads: 0,
    successfulPreloads: 0,
    cacheHits: 0,
    avgPreloadTime: 0,
  };

  constructor(
    lazyLoader: LazyLoader,
    configManager: ConfigManager,
    config?: Partial<PreloadConfig>,
  ) {
    this.lazyLoader = lazyLoader;
    this.configManager = configManager;
    this.config = {
      hotCategories: [0, 1, 2], // 前3个热门分类
      maxPreloadCount: 5,
      preloadDelay: 500,
      enableIdlePreload: true,
      enableHoverPreload: true,
      historyRetentionDays: 30,
      ...config,
    };

    this.loadUserHistory();
    this.initializePreloadStrategies();

    console.log("🧠 PreloadStrategy初始化完成", {
      config: this.config,
      historyEntries: this.userHistory.size,
    });
  }

  /**
   * 记录用户访问
   */
  recordUserVisit(categoryIndex: number, loadTime: number = 0): void {
    const now = Date.now();
    const existing = this.userHistory.get(categoryIndex);

    if (existing) {
      existing.visitCount++;
      existing.lastVisit = now;
      existing.avgLoadTime = (existing.avgLoadTime + loadTime) / 2;
    } else {
      this.userHistory.set(categoryIndex, {
        categoryIndex,
        visitCount: 1,
        lastVisit: now,
        avgLoadTime: loadTime,
      });
    }

    this.saveUserHistory();
    console.log(
      `📊 记录用户访问: 分类${categoryIndex}, 访问次数: ${this.userHistory.get(categoryIndex)?.visitCount}`,
    );
  }

  /**
   * 获取预加载优先级列表
   */
  getPreloadPriorities(currentCategoryIndex?: number): PreloadPriority[] {
    const priorities: PreloadPriority[] = [];
    const allCategories = this.configManager.getAllCategoryIndexes();

    // 优先级1: 热门分类
    for (const hotCategory of this.config.hotCategories) {
      if (
        allCategories.includes(hotCategory) &&
        hotCategory !== currentCategoryIndex
      ) {
        priorities.push({
          categoryIndex: hotCategory,
          priority: 100,
          reason: "hot",
          confidence: 0.9,
        });
      }
    }

    // 优先级2: 相邻分类
    if (currentCategoryIndex !== undefined) {
      const adjacentCategories = this.getAdjacentCategories(
        currentCategoryIndex,
        allCategories,
      );
      for (const adjacent of adjacentCategories) {
        if (!priorities.find((p) => p.categoryIndex === adjacent)) {
          priorities.push({
            categoryIndex: adjacent,
            priority: 80,
            reason: "adjacent",
            confidence: 0.7,
          });
        }
      }
    }

    // 优先级3: 用户历史访问
    const historyPriorities = this.getHistoryBasedPriorities();
    for (const historyPriority of historyPriorities) {
      if (
        !priorities.find(
          (p) => p.categoryIndex === historyPriority.categoryIndex,
        ) &&
        historyPriority.categoryIndex !== currentCategoryIndex
      ) {
        priorities.push(historyPriority);
      }
    }

    // 按优先级排序并限制数量
    return priorities
      .sort((a, b) => b.priority - a.priority)
      .slice(0, this.config.maxPreloadCount);
  }

  /**
   * 执行智能预加载
   */
  async executePreload(currentCategoryIndex?: number): Promise<void> {
    if (!this.configManager.isOptimizedMode()) {
      console.log("⚠️ 非优化模式，跳过预加载");
      return;
    }

    const priorities = this.getPreloadPriorities(currentCategoryIndex);
    console.log(`🧠 开始智能预加载`, {
      currentCategory: currentCategoryIndex,
      preloadTargets: priorities.map((p) => ({
        category: p.categoryIndex,
        reason: p.reason,
        priority: p.priority,
      })),
    });

    // 并发预加载，但控制并发数量
    const preloadPromises = priorities.map((priority) =>
      this.preloadCategory(priority.categoryIndex, priority.reason),
    );

    try {
      await Promise.allSettled(preloadPromises);
      console.log(
        `✅ 智能预加载完成，成功率: ${this.preloadStats.successfulPreloads}/${this.preloadStats.totalPreloads}`,
      );
    } catch (error) {
      console.warn("⚠️ 预加载过程中出现错误:", error);
    }
  }

  /**
   * 空闲时预加载
   */
  scheduleIdlePreload(currentCategoryIndex?: number): void {
    if (!this.config.enableIdlePreload) return;

    if (typeof requestIdleCallback !== "undefined") {
      requestIdleCallback(
        () => {
          this.executePreload(currentCategoryIndex);
        },
        { timeout: 5000 },
      );
    } else {
      // 降级到setTimeout
      setTimeout(() => {
        this.executePreload(currentCategoryIndex);
      }, this.config.preloadDelay);
    }
  }

  /**
   * 悬停预加载
   */
  scheduleHoverPreload(categoryIndex: number): void {
    if (!this.config.enableHoverPreload) return;

    // 清除之前的定时器
    const existingTimer = this.preloadTimers.get(categoryIndex);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 设置新的预加载定时器
    const timer = window.setTimeout(() => {
      this.preloadCategory(categoryIndex, "hover");
      this.preloadTimers.delete(categoryIndex);
    }, this.config.preloadDelay);

    this.preloadTimers.set(categoryIndex, timer);
  }

  /**
   * 取消悬停预加载
   */
  cancelHoverPreload(categoryIndex: number): void {
    const timer = this.preloadTimers.get(categoryIndex);
    if (timer) {
      clearTimeout(timer);
      this.preloadTimers.delete(categoryIndex);
    }
  }

  /**
   * 预加载单个分类
   */
  private async preloadCategory(
    categoryIndex: number,
    reason: string,
  ): Promise<void> {
    // 避免重复预加载
    if (this.preloadingCategories.has(categoryIndex)) {
      return;
    }

    // 检查是否已在缓存中
    const lazyLoaderStats = this.lazyLoader.getCacheStats();
    if (
      lazyLoaderStats.memoryCache.cacheEntries.some(
        (entry) => entry.categoryIndex === categoryIndex,
      )
    ) {
      this.preloadStats.cacheHits++;
      console.log(`📦 分类${categoryIndex}已在缓存中，跳过预加载 (${reason})`);
      return;
    }

    this.preloadingCategories.add(categoryIndex);
    this.preloadStats.totalPreloads++;

    try {
      const startTime = performance.now();
      const result = await this.lazyLoader.loadCategory(categoryIndex);
      const loadTime = performance.now() - startTime;

      if (result.success) {
        this.preloadStats.successfulPreloads++;
        this.preloadStats.avgPreloadTime =
          (this.preloadStats.avgPreloadTime + loadTime) / 2;

        console.log(
          `✅ 预加载成功: 分类${categoryIndex} (${reason}) - ${loadTime.toFixed(2)}ms`,
        );
      } else {
        console.warn(
          `❌ 预加载失败: 分类${categoryIndex} (${reason}) - ${result.error}`,
        );
      }
    } catch (error) {
      console.error(`💥 预加载异常: 分类${categoryIndex} (${reason})`, error);
    } finally {
      this.preloadingCategories.delete(categoryIndex);
    }
  }

  /**
   * 获取相邻分类
   */
  private getAdjacentCategories(
    currentIndex: number,
    allCategories: number[],
  ): number[] {
    const currentPos = allCategories.indexOf(currentIndex);
    if (currentPos === -1) return [];

    const adjacent: number[] = [];

    // 前一个分类
    if (currentPos > 0) {
      adjacent.push(allCategories[currentPos - 1]);
    }

    // 后一个分类
    if (currentPos < allCategories.length - 1) {
      adjacent.push(allCategories[currentPos + 1]);
    }

    return adjacent;
  }

  /**
   * 基于历史记录的优先级
   */
  private getHistoryBasedPriorities(): PreloadPriority[] {
    const now = Date.now();
    const retentionTime =
      this.config.historyRetentionDays * 24 * 60 * 60 * 1000;

    return Array.from(this.userHistory.values())
      .filter((history) => now - history.lastVisit < retentionTime)
      .sort((a, b) => {
        // 综合考虑访问频率和最近访问时间
        const scoreA = a.visitCount * 0.7 + (1 / (now - a.lastVisit + 1)) * 0.3;
        const scoreB = b.visitCount * 0.7 + (1 / (now - b.lastVisit + 1)) * 0.3;
        return scoreB - scoreA;
      })
      .slice(0, 3) // 最多3个历史优先级
      .map((history) => ({
        categoryIndex: history.categoryIndex,
        priority: Math.min(60, history.visitCount * 10), // 最高60分
        reason: "history" as const,
        confidence: Math.min(0.8, history.visitCount * 0.1),
      }));
  }

  /**
   * 初始化预加载策略
   */
  private initializePreloadStrategies(): void {
    // 页面加载完成后的空闲预加载
    if (typeof document !== "undefined") {
      document.addEventListener("DOMContentLoaded", () => {
        this.scheduleIdlePreload();
      });
    }
  }

  /**
   * 加载用户历史记录
   */
  private loadUserHistory(): void {
    try {
      if (typeof localStorage !== "undefined") {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          this.userHistory = new Map(data);
          console.log(`📚 加载用户历史记录: ${this.userHistory.size}条`);
        }
      }
    } catch (error) {
      console.warn("⚠️ 加载用户历史记录失败:", error);
    }
  }

  /**
   * 保存用户历史记录
   */
  private saveUserHistory(): void {
    try {
      if (typeof localStorage !== "undefined") {
        const data = Array.from(this.userHistory.entries());
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      }
    } catch (error) {
      console.warn("⚠️ 保存用户历史记录失败:", error);
    }
  }

  /**
   * 获取预加载统计信息
   */
  getPreloadStats() {
    return {
      ...this.preloadStats,
      cacheHitRate:
        this.preloadStats.totalPreloads > 0
          ? (this.preloadStats.cacheHits / this.preloadStats.totalPreloads) *
            100
          : 0,
      successRate:
        this.preloadStats.totalPreloads > 0
          ? (this.preloadStats.successfulPreloads /
              this.preloadStats.totalPreloads) *
            100
          : 0,
      userHistorySize: this.userHistory.size,
      currentlyPreloading: this.preloadingCategories.size,
      queueSize: this.preloadQueue.size,
    };
  }

  /**
   * 清理过期历史记录
   */
  cleanupHistory(): number {
    const now = Date.now();
    const retentionTime =
      this.config.historyRetentionDays * 24 * 60 * 60 * 1000;
    let cleanedCount = 0;

    for (const [categoryIndex, history] of this.userHistory.entries()) {
      if (now - history.lastVisit > retentionTime) {
        this.userHistory.delete(categoryIndex);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.saveUserHistory();
      console.log(`🗑️ 清理了${cleanedCount}条过期历史记录`);
    }

    return cleanedCount;
  }

  /**
   * 重置预加载策略
   */
  reset(): void {
    // 清除所有定时器
    for (const timer of this.preloadTimers.values()) {
      clearTimeout(timer);
    }
    this.preloadTimers.clear();

    // 清空队列和状态
    this.preloadQueue.clear();
    this.preloadingCategories.clear();

    // 重置统计
    this.preloadStats = {
      totalPreloads: 0,
      successfulPreloads: 0,
      cacheHits: 0,
      avgPreloadTime: 0,
    };

    console.log("🔄 预加载策略已重置");
  }
}

/**
 * 默认预加载策略实例
 */
let defaultPreloadStrategy: PreloadStrategy | null = null;

/**
 * 获取默认预加载策略实例
 */
export function getDefaultPreloadStrategy(
  lazyLoader?: LazyLoader,
  configManager?: ConfigManager,
): PreloadStrategy | null {
  if (!defaultPreloadStrategy && lazyLoader && configManager) {
    defaultPreloadStrategy = new PreloadStrategy(lazyLoader, configManager);
  }
  return defaultPreloadStrategy;
}

/**
 * 便捷函数：记录用户访问
 */
export function recordVisit(categoryIndex: number, loadTime?: number): void {
  if (defaultPreloadStrategy) {
    defaultPreloadStrategy.recordUserVisit(categoryIndex, loadTime);
  }
}

/**
 * 便捷函数：执行预加载
 */
export async function executePreload(
  currentCategoryIndex?: number,
): Promise<void> {
  if (defaultPreloadStrategy) {
    await defaultPreloadStrategy.executePreload(currentCategoryIndex);
  }
}
