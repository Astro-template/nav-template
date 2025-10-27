/**
 * LazyLoader组件 - Week 3 任务1.2
 * 服务端懒加载管理器，与ConfigManager配合使用
 */

import type {
  CategoryData,
  CategoryLoadResult,
  LoadingState,
} from "../types/lazyLoading";
import { ConfigManager } from "./ConfigManager";
import { LocalStorageCache } from "./LocalStorageCache";
import { defaultErrorHandler } from "./ErrorHandler";

// 日志工具 - 在测试环境中禁用
const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
const log = {
  info: (...args: any[]) => !isTestEnv && log.info(...args),
  warn: (...args: any[]) => !isTestEnv && log.warn(...args),
  error: (...args: any[]) => !isTestEnv && log.error(...args),
};

/**
 * LRU缓存节点
 */
interface CacheNode {
  key: number;
  value: CategoryData;
  prev?: CacheNode;
  next?: CacheNode;
  timestamp: number;
}

/**
 * LazyLoader类 - 核心懒加载组件
 */
export class LazyLoader {
  private configManager: ConfigManager;

  // 双层缓存系统
  private memoryCache = new Map<number, CacheNode>(); // 内存缓存 (LRU)
  private localStorageCache: LocalStorageCache; // 本地存储缓存
  private head?: CacheNode;
  private tail?: CacheNode;
  private maxCacheSize: number = 10;

  // 并发请求去重
  private loadingPromises = new Map<number, Promise<CategoryLoadResult>>();

  // 加载状态管理
  private loadingStates = new Map<number, LoadingState>();

  // 配置选项
  private options = {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 10000,
    cacheExpiry: 30 * 60 * 1000, // 30分钟
    preloadCount: 2, // 预加载数量
  };

  constructor(
    configManager?: ConfigManager,
    options?: Partial<typeof LazyLoader.prototype.options>,
  ) {
    this.configManager = configManager || new ConfigManager();
    if (options) {
      this.options = { ...this.options, ...options };
    }

    // 初始化本地存储缓存
    this.localStorageCache = new LocalStorageCache({
      prefix: "nav_category_",
      defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7天
      maxSize: 5 * 1024 * 1024, // 5MB
      maxItems: 100,
      enableCompression: true,
    });

    log.info("🚀 LazyLoader初始化完成 (双层缓存)", {
      maxCacheSize: this.maxCacheSize,
      options: this.options,
      localStorageEnabled: true,
    });
  }

  /**
   * 加载分类数据 (主要方法)
   */
  async loadCategory(categoryIndex: number): Promise<CategoryLoadResult> {
    log.info(`🔄 LazyLoader: 开始加载分类 ${categoryIndex}`);

    // 1. 检查并发请求去重
    if (this.loadingPromises.has(categoryIndex)) {
      log.info(`⏳ 分类 ${categoryIndex} 正在加载中，等待现有请求`);
      return await this.loadingPromises.get(categoryIndex)!;
    }

    // 2. 检查双层缓存
    const cachedResult = await this.getFromDualCache(categoryIndex);
    if (cachedResult) {
      const sourceText =
        cachedResult.source === "memory" ? "内存缓存" : "本地存储缓存";
      log.info(`📦 从${sourceText}获取分类 ${categoryIndex}`);
      return {
        success: true,
        data: cachedResult.data,
        fromCache: true,
        loadTime: 0,
        cacheSource: cachedResult.source,
      };
    }

    // 3. 创建加载Promise并添加到去重Map
    const loadPromise = this.performLoad(categoryIndex);
    this.loadingPromises.set(categoryIndex, loadPromise);

    try {
      const result = await loadPromise;

      // 4. 成功时添加到双层缓存
      if (result.success && result.data) {
        await this.addToDualCache(categoryIndex, result.data);
      }

      return result;
    } finally {
      // 5. 清理并发请求Map
      this.loadingPromises.delete(categoryIndex);
    }
  }

  /**
   * 批量加载多个分类
   */
  async loadMultipleCategories(
    categoryIndexes: number[],
  ): Promise<Map<number, CategoryLoadResult>> {
    log.info(`🔄 LazyLoader: 批量加载 ${categoryIndexes.length} 个分类`);

    const results = new Map<number, CategoryLoadResult>();

    // 并发加载所有分类
    const promises = categoryIndexes.map(async (index) => {
      const result = await this.loadCategory(index);
      results.set(index, result);
      return { index, result };
    });

    await Promise.all(promises);

    const successCount = Array.from(results.values()).filter(
      (r) => r.success,
    ).length;
    log.info(`✅ LazyLoader: 批量加载完成`, {
      total: categoryIndexes.length,
      success: successCount,
      failed: categoryIndexes.length - successCount,
    });

    return results;
  }

  /**
   * 智能预加载策略 (基础版本，保持向后兼容)
   */
  async preloadCategories(currentIndex: number): Promise<void> {
    if (!this.configManager.isOptimizedMode()) {
      log.info("⚠️ 非优化模式，跳过预加载");
      return;
    }

    const allIndexes = this.configManager.getAllCategoryIndexes();
    const currentPos = allIndexes.indexOf(currentIndex);

    if (currentPos === -1) return;

    // 预加载策略：当前分类的前后各preloadCount个分类
    const preloadIndexes: number[] = [];

    for (let i = 1; i <= this.options.preloadCount; i++) {
      // 预加载后面的分类
      if (currentPos + i < allIndexes.length) {
        preloadIndexes.push(allIndexes[currentPos + i]);
      }
      // 预加载前面的分类
      if (currentPos - i >= 0) {
        preloadIndexes.push(allIndexes[currentPos - i]);
      }
    }

    // 过滤掉已缓存的分类
    const toPreload = preloadIndexes.filter(
      (index) => !this.memoryCache.has(index),
    );

    if (toPreload.length > 0) {
      log.info(`🔮 基础预加载分类: ${toPreload.join(", ")}`);

      // 异步预加载，不等待结果
      this.loadMultipleCategories(toPreload).catch((error) => {
        log.warn("⚠️ 基础预加载失败:", error);
      });
    }
  }

  /**
   * 高级预加载策略 (与PreloadStrategy集成)
   */
  async executeAdvancedPreload(
    preloadStrategy: any,
    currentIndex?: number,
  ): Promise<void> {
    if (!this.configManager.isOptimizedMode()) {
      log.info("⚠️ 非优化模式，跳过高级预加载");
      return;
    }

    try {
      await preloadStrategy.executePreload(currentIndex);
    } catch (error) {
      log.warn("⚠️ 高级预加载失败:", error);
      // 降级到基础预加载
      if (currentIndex !== undefined) {
        await this.preloadCategories(currentIndex);
      }
    }
  }

  /**
   * 执行实际的加载操作
   */
  private async performLoad(
    categoryIndex: number,
  ): Promise<CategoryLoadResult> {
    // 更新加载状态
    this.updateLoadingState(categoryIndex, "loading");

    try {
      // 使用ConfigManager的loadCategoryData方法
      const result = await this.configManager.loadCategoryData(categoryIndex);

      if (result.success) {
        this.updateLoadingState(categoryIndex, "success");
        log.info(`✅ LazyLoader: 分类 ${categoryIndex} 加载成功`);
      } else {
        this.updateLoadingState(categoryIndex, "error");
        log.error(
          `❌ LazyLoader: 分类 ${categoryIndex} 加载失败:`,
          result.error,
        );
      }

      return result;
    } catch (error) {
      this.updateLoadingState(categoryIndex, "error");
      const errorMessage = error instanceof Error ? error.message : "未知错误";

      log.error(
        `❌ LazyLoader: 分类 ${categoryIndex} 加载异常:`,
        errorMessage,
      );

      return {
        success: false,
        error: errorMessage,
        fromCache: false,
        loadTime: 0,
      };
    }
  }

  /**
   * 双层缓存 - 获取数据
   */
  private async getFromDualCache(
    categoryIndex: number,
  ): Promise<{ data: CategoryData; source: "memory" | "localStorage" } | null> {
    // 1. 优先从内存缓存获取
    const memoryData = this.getFromMemoryCache(categoryIndex);
    if (memoryData) {
      return { data: memoryData, source: "memory" };
    }

    // 2. 从本地存储缓存获取
    try {
      const localData = await this.localStorageCache.get<CategoryData>(
        `category_${categoryIndex}`,
      );
      if (localData) {
        // 加载到内存缓存
        this.addToMemoryCache(categoryIndex, localData);
        return { data: localData, source: "localStorage" };
      }
    } catch (error) {
      log.warn(`💾 从本地存储获取分类 ${categoryIndex} 失败:`, error);
    }

    return null;
  }

  /**
   * 双层缓存 - 添加数据
   */
  private async addToDualCache(
    categoryIndex: number,
    data: CategoryData,
  ): Promise<void> {
    // 1. 添加到内存缓存
    this.addToMemoryCache(categoryIndex, data);

    // 2. 添加到本地存储缓存
    try {
      await this.localStorageCache.set(`category_${categoryIndex}`, data);
    } catch (error) {
      log.warn(`💾 保存分类 ${categoryIndex} 到本地存储失败:`, error);
    }
  }

  /**
   * 内存缓存 - 获取数据
   */
  private getFromMemoryCache(categoryIndex: number): CategoryData | null {
    const node = this.memoryCache.get(categoryIndex);
    if (!node) return null;

    // 检查是否过期
    if (Date.now() - node.timestamp > this.options.cacheExpiry) {
      this.removeFromMemoryCache(categoryIndex);
      return null;
    }

    // 移动到头部 (最近使用)
    this.moveToHead(node);
    return node.value;
  }

  /**
   * 内存缓存 - 添加数据
   */
  private addToMemoryCache(categoryIndex: number, data: CategoryData): void {
    // 如果已存在，更新数据并移动到头部
    if (this.memoryCache.has(categoryIndex)) {
      const node = this.memoryCache.get(categoryIndex)!;
      node.value = data;
      node.timestamp = Date.now();
      this.moveToHead(node);
      return;
    }

    // 创建新节点
    const newNode: CacheNode = {
      key: categoryIndex,
      value: data,
      timestamp: Date.now(),
    };

    // 添加到缓存Map
    this.memoryCache.set(categoryIndex, newNode);

    // 添加到链表头部
    this.addToHead(newNode);

    // 检查缓存大小限制
    if (this.memoryCache.size > this.maxCacheSize) {
      const tail = this.removeTail();
      if (tail) {
        this.memoryCache.delete(tail.key);
      }
    }

    log.info(
      `📦 添加到内存缓存: 分类 ${categoryIndex} (缓存大小: ${this.memoryCache.size})`,
    );
  }

  /**
   * 内存缓存 - 移除数据
   */
  private removeFromMemoryCache(categoryIndex: number): void {
    const node = this.memoryCache.get(categoryIndex);
    if (node) {
      this.memoryCache.delete(categoryIndex);
      this.removeNode(node);
    }
  }

  /**
   * LRU链表操作 - 添加到头部
   */
  private addToHead(node: CacheNode): void {
    node.prev = undefined;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * LRU链表操作 - 移除节点
   */
  private removeNode(node: CacheNode): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  /**
   * LRU链表操作 - 移动到头部
   */
  private moveToHead(node: CacheNode): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  /**
   * LRU链表操作 - 移除尾部
   */
  private removeTail(): CacheNode | undefined {
    const lastNode = this.tail;
    if (lastNode) {
      this.removeNode(lastNode);
    }
    return lastNode;
  }

  /**
   * 更新加载状态
   */
  private updateLoadingState(categoryIndex: number, state: LoadingState): void {
    this.loadingStates.set(categoryIndex, state);
  }

  /**
   * 获取加载状态
   */
  getLoadingState(categoryIndex: number): LoadingState {
    return this.loadingStates.get(categoryIndex) || "idle";
  }

  /**
   * 获取缓存统计信息 (双层缓存)
   */
  getCacheStats() {
    const memoryCacheArray = Array.from(this.memoryCache.entries()).map(
      ([key, node]) => ({
        categoryIndex: key,
        timestamp: node.timestamp,
        age: Date.now() - node.timestamp,
      }),
    );

    const localStorageStats = this.localStorageCache.getStats();

    return {
      memoryCache: {
        cacheSize: this.memoryCache.size,
        maxCacheSize: this.maxCacheSize,
        cacheEntries: memoryCacheArray,
      },
      localStorage: localStorageStats,
      loadingPromises: this.loadingPromises.size,
      loadingStates: Object.fromEntries(this.loadingStates),
      options: this.options,
      // 兼容性字段
      cacheSize: this.memoryCache.size,
      hitRate: localStorageStats.hitRate,
    };
  }

  /**
   * 清理过期缓存 (双层缓存)
   */
  async cleanExpiredCache(): Promise<number> {
    const now = Date.now();
    let cleanedCount = 0;

    // 清理内存缓存
    for (const [key, node] of this.memoryCache.entries()) {
      if (now - node.timestamp > this.options.cacheExpiry) {
        this.removeFromMemoryCache(key);
        cleanedCount++;
      }
    }

    // 清理本地存储缓存
    const localCleanedCount = await this.localStorageCache.cleanup();
    cleanedCount += localCleanedCount;

    if (cleanedCount > 0) {
      log.info(`🗑️ LazyLoader: 清理了 ${cleanedCount} 个过期缓存`);
    }

    return cleanedCount;
  }

  /**
   * 清空所有缓存 (双层缓存)
   */
  async clearCache(): Promise<void> {
    // 清空内存缓存
    this.memoryCache.clear();
    this.head = undefined;
    this.tail = undefined;
    this.loadingPromises.clear();
    this.loadingStates.clear();

    // 清空本地存储缓存
    await this.localStorageCache.clear();

    log.info("🗑️ LazyLoader: 已清空所有双层缓存");
  }
}

// 默认实例
export const defaultLazyLoader = new LazyLoader();

/**
 * 便捷函数：加载分类数据
 */
export async function loadCategoryWithLazyLoader(
  categoryIndex: number,
): Promise<CategoryLoadResult> {
  return defaultLazyLoader.loadCategory(categoryIndex);
}

/**
 * 便捷函数：批量加载分类数据
 */
export async function loadMultipleCategoriesWithLazyLoader(
  categoryIndexes: number[],
): Promise<Map<number, CategoryLoadResult>> {
  return defaultLazyLoader.loadMultipleCategories(categoryIndexes);
}

/**
 * 便捷函数：获取缓存统计
 */
export function getLazyLoaderStats() {
  return defaultLazyLoader.getCacheStats();
}

