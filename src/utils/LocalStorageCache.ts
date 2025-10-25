/**
 * 本地存储缓存工具
 * Week 3 - 任务3.1
 */

import { defaultErrorHandler, ErrorType } from "./ErrorHandler";

/**
 * 检查是否在浏览器环境中
 */
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  version: string;
  size: number;
  accessCount: number;
  lastAccessed: number;
  compressed?: boolean;
}

export interface CacheConfig {
  prefix: string;
  defaultTTL: number; // 默认过期时间 (ms)
  maxSize: number; // 最大缓存大小 (bytes)
  maxItems: number; // 最大缓存项数
  compressionThreshold: number; // 压缩阈值 (bytes)
  enableCompression: boolean;
  enableVersioning: boolean;
  cleanupInterval: number; // 清理间隔 (ms)
}

export interface CacheStats {
  totalItems: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  oldestItem: number;
  newestItem: number;
  averageSize: number;
  compressionRatio: number;
}

export interface CacheOperation {
  type: "get" | "set" | "delete" | "clear" | "cleanup";
  key: string;
  success: boolean;
  timestamp: number;
  duration: number;
  size?: number;
  fromMemory?: boolean;
}

export class LocalStorageCache {
  private config: CacheConfig;
  private memoryCache = new Map<string, CacheItem>();
  private stats: CacheStats;
  private operations: CacheOperation[] = [];
  private cleanupTimer: number | null = null;
  private version = "1.0.0";

  // 默认配置
  private static defaultConfig: CacheConfig = {
    prefix: "nav_cache_",
    defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7天
    maxSize: 10 * 1024 * 1024, // 10MB
    maxItems: 1000,
    compressionThreshold: 1024, // 1KB
    enableCompression: true,
    enableVersioning: true,
    cleanupInterval: 60 * 60 * 1000, // 1小时
  };

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...LocalStorageCache.defaultConfig, ...config };
    this.stats = this.initializeStats();

    if (isBrowser()) {
      this.loadFromLocalStorage();
      this.startCleanupTimer();

      console.log("💾 LocalStorageCache初始化完成", {
        prefix: this.config.prefix,
        maxSize: `${(this.config.maxSize / 1024 / 1024).toFixed(1)}MB`,
        maxItems: this.config.maxItems,
        compression: this.config.enableCompression,
      });
    }
  }

  /**
   * 初始化统计数据
   */
  private initializeStats(): CacheStats {
    return {
      totalItems: 0,
      totalSize: 0,
      hitCount: 0,
      missCount: 0,
      hitRate: 0,
      oldestItem: 0,
      newestItem: 0,
      averageSize: 0,
      compressionRatio: 1,
    };
  }

  /**
   * 从localStorage加载缓存
   */
  private loadFromLocalStorage(): void {
    try {
      const keys = this.getStorageKeys();
      let loadedCount = 0;

      for (const key of keys) {
        try {
          const item = this.getFromStorage(key);
          if (item && !this.isExpired(item)) {
            this.memoryCache.set(key, item);
            loadedCount++;
          } else if (item) {
            // 删除过期项
            this.removeFromStorage(key);
          }
        } catch (error) {
          console.warn(`💾 加载缓存项失败: ${key}`, error);
          this.removeFromStorage(key);
        }
      }

      this.updateStats();
      console.log(`💾 从localStorage加载了 ${loadedCount} 个缓存项`);
    } catch (error) {
      console.error("💾 从localStorage加载缓存失败", error);
    }
  }

  /**
   * 获取缓存项
   */
  async get<T = any>(key: string): Promise<T | null> {
    const startTime = performance.now();
    const fullKey = this.getFullKey(key);

    try {
      // 1. 优先从内存缓存获取
      let item = this.memoryCache.get(fullKey);
      let fromMemory = true;

      // 2. 如果内存中没有，从localStorage获取
      if (!item) {
        const storageItem = this.getFromStorage(fullKey);
        item = storageItem ?? undefined;
        fromMemory = false;

        if (item && !this.isExpired(item)) {
          // 加载到内存缓存
          this.memoryCache.set(fullKey, item);
        }
      }

      // 3. 检查是否过期
      if (!item || this.isExpired(item)) {
        this.recordOperation("get", key, false, startTime, 0, fromMemory);
        this.stats.missCount++;

        if (item) {
          // 删除过期项
          await this.delete(key);
        }

        return null;
      }

      // 4. 更新访问信息
      item.accessCount++;
      item.lastAccessed = Date.now();

      // 5. 同步到localStorage (如果是从内存获取的)
      if (fromMemory) {
        this.setToStorage(fullKey, item);
      }

      this.recordOperation("get", key, true, startTime, item.size, fromMemory);
      this.stats.hitCount++;
      this.updateStats();

      return item.data as T;
    } catch (error) {
      await defaultErrorHandler.handleError(error, {
        type: "cache",
        operation: "get",
        key,
      });

      this.recordOperation("get", key, false, startTime, 0);
      this.stats.missCount++;
      return null;
    }
  }

  /**
   * 设置缓存项
   */
  async set<T = any>(key: string, data: T, ttl?: number): Promise<boolean> {
    const startTime = performance.now();
    const fullKey = this.getFullKey(key);

    try {
      const now = Date.now();
      const expiresAt = now + (ttl || this.config.defaultTTL);

      // 序列化数据
      let serializedData = JSON.stringify(data);
      let compressed = false;

      // 压缩大数据
      if (
        this.config.enableCompression &&
        serializedData.length > this.config.compressionThreshold
      ) {
        try {
          serializedData = this.compress(serializedData);
          compressed = true;
        } catch (error) {
          console.warn("💾 数据压缩失败，使用原始数据", error);
        }
      }

      const item: CacheItem<T> = {
        data,
        timestamp: now,
        expiresAt,
        version: this.version,
        size: serializedData.length,
        accessCount: 1,
        lastAccessed: now,
        compressed,
      };

      // 检查缓存大小限制
      if (!(await this.ensureSpace(item.size))) {
        this.recordOperation("set", key, false, startTime, item.size);
        return false;
      }

      // 保存到内存和localStorage
      this.memoryCache.set(fullKey, item);
      this.setToStorage(fullKey, item);

      this.recordOperation("set", key, true, startTime, item.size);
      this.updateStats();

      return true;
    } catch (error) {
      await defaultErrorHandler.handleError(error, {
        type: "cache",
        operation: "set",
        key,
      });

      this.recordOperation("set", key, false, startTime, 0);
      return false;
    }
  }

  /**
   * 删除缓存项
   */
  async delete(key: string): Promise<boolean> {
    const startTime = performance.now();
    const fullKey = this.getFullKey(key);

    try {
      const item = this.memoryCache.get(fullKey);
      const size = item?.size || 0;

      this.memoryCache.delete(fullKey);
      this.removeFromStorage(fullKey);

      this.recordOperation("delete", key, true, startTime, size);
      this.updateStats();

      return true;
    } catch (error) {
      await defaultErrorHandler.handleError(error, {
        type: "cache",
        operation: "delete",
        key,
      });

      this.recordOperation("delete", key, false, startTime, 0);
      return false;
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<boolean> {
    const startTime = performance.now();

    try {
      // 清空内存缓存
      this.memoryCache.clear();

      // 清空localStorage
      const keys = this.getStorageKeys();
      for (const key of keys) {
        this.removeFromStorage(key);
      }

      this.recordOperation("clear", "all", true, startTime, 0);
      this.updateStats();

      console.log("💾 缓存已清空");
      return true;
    } catch (error) {
      await defaultErrorHandler.handleError(error, {
        type: "cache",
        operation: "clear",
      });

      this.recordOperation("clear", "all", false, startTime, 0);
      return false;
    }
  }

  /**
   * 检查缓存项是否存在
   */
  has(key: string): boolean {
    const fullKey = this.getFullKey(key);
    const item = this.memoryCache.get(fullKey) || this.getFromStorage(fullKey);
    return item !== null && !this.isExpired(item);
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.memoryCache.size;
  }

  /**
   * 获取所有缓存键
   */
  keys(): string[] {
    return Array.from(this.memoryCache.keys()).map((key) =>
      key.replace(this.config.prefix, ""),
    );
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * 获取操作历史
   */
  getOperations(): CacheOperation[] {
    return [...this.operations];
  }

  /**
   * 清理过期缓存
   */
  async cleanup(): Promise<number> {
    const startTime = performance.now();
    let cleanedCount = 0;

    try {
      const now = Date.now();
      const keysToDelete: string[] = [];

      // 检查内存缓存
      for (const [key, item] of this.memoryCache.entries()) {
        if (this.isExpired(item)) {
          keysToDelete.push(key);
        }
      }

      // 检查localStorage
      const storageKeys = this.getStorageKeys();
      for (const key of storageKeys) {
        if (!this.memoryCache.has(key)) {
          const item = this.getFromStorage(key);
          if (!item || this.isExpired(item)) {
            keysToDelete.push(key);
          }
        }
      }

      // 删除过期项
      for (const key of keysToDelete) {
        this.memoryCache.delete(key);
        this.removeFromStorage(key);
        cleanedCount++;
      }

      this.recordOperation("cleanup", "expired", true, startTime, 0);
      this.updateStats();

      if (cleanedCount > 0) {
        console.log(`💾 清理了 ${cleanedCount} 个过期缓存项`);
      }

      return cleanedCount;
    } catch (error) {
      await defaultErrorHandler.handleError(error, {
        type: "cache",
        operation: "cleanup",
      });

      this.recordOperation("cleanup", "expired", false, startTime, 0);
      return 0;
    }
  }

  /**
   * 获取完整键名
   */
  private getFullKey(key: string): string {
    return `${this.config.prefix}${key}`;
  }

  /**
   * 检查是否过期
   */
  private isExpired(item: CacheItem): boolean {
    return Date.now() > item.expiresAt;
  }

  /**
   * 从localStorage获取
   */
  private getFromStorage(key: string): CacheItem | null {
    if (!isBrowser()) return null;

    try {
      const data = localStorage.getItem(key);
      if (!data) return null;

      const item: CacheItem = JSON.parse(data);

      // 解压缩数据
      if (item.compressed && typeof item.data === "string") {
        try {
          item.data = JSON.parse(this.decompress(item.data));
        } catch (error) {
          console.warn("💾 数据解压缩失败", error);
          return null;
        }
      }

      return item;
    } catch (error) {
      console.warn(`💾 从localStorage读取失败: ${key}`, error);
      return null;
    }
  }

  /**
   * 保存到localStorage
   */
  private setToStorage(key: string, item: CacheItem): void {
    if (!isBrowser()) return;

    try {
      let dataToStore = { ...item };

      // 压缩数据用于存储
      if (item.compressed) {
        dataToStore.data = this.compress(JSON.stringify(item.data));
      }

      localStorage.setItem(key, JSON.stringify(dataToStore));
    } catch (error) {
      console.warn(`💾 保存到localStorage失败: ${key}`, error);
      throw error;
    }
  }

  /**
   * 从localStorage删除
   */
  private removeFromStorage(key: string): void {
    if (!isBrowser()) return;

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`💾 从localStorage删除失败: ${key}`, error);
    }
  }

  /**
   * 获取所有存储键
   */
  private getStorageKeys(): string[] {
    const keys: string[] = [];
    if (!isBrowser()) return keys;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.config.prefix)) {
          keys.push(key);
        }
      }
    } catch (error) {
      console.warn("💾 获取存储键失败", error);
    }
    return keys;
  }

  /**
   * 确保有足够空间
   */
  private async ensureSpace(requiredSize: number): Promise<boolean> {
    const currentSize = this.calculateTotalSize();

    if (
      currentSize + requiredSize <= this.config.maxSize &&
      this.memoryCache.size < this.config.maxItems
    ) {
      return true;
    }

    // 尝试清理过期项
    await this.cleanup();

    const newSize = this.calculateTotalSize();
    if (
      newSize + requiredSize <= this.config.maxSize &&
      this.memoryCache.size < this.config.maxItems
    ) {
      return true;
    }

    // LRU清理
    return this.evictLRU(requiredSize);
  }

  /**
   * LRU清理
   */
  private evictLRU(requiredSize: number): boolean {
    const items = Array.from(this.memoryCache.entries())
      .map(([key, item]) => ({ key, item }))
      .sort((a, b) => a.item.lastAccessed - b.item.lastAccessed);

    let freedSize = 0;
    let evictedCount = 0;

    for (const { key, item } of items) {
      this.memoryCache.delete(key);
      this.removeFromStorage(key);

      freedSize += item.size;
      evictedCount++;

      if (
        freedSize >= requiredSize &&
        this.memoryCache.size < this.config.maxItems
      ) {
        break;
      }
    }

    console.log(
      `💾 LRU清理: 删除了 ${evictedCount} 个项目，释放 ${freedSize} 字节`,
    );
    return freedSize >= requiredSize;
  }

  /**
   * 计算总大小
   */
  private calculateTotalSize(): number {
    let totalSize = 0;
    for (const item of this.memoryCache.values()) {
      totalSize += item.size;
    }
    return totalSize;
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    const items = Array.from(this.memoryCache.values());

    this.stats.totalItems = items.length;
    this.stats.totalSize = this.calculateTotalSize();
    this.stats.hitRate =
      this.stats.hitCount + this.stats.missCount > 0
        ? (this.stats.hitCount / (this.stats.hitCount + this.stats.missCount)) *
          100
        : 0;

    if (items.length > 0) {
      this.stats.averageSize = this.stats.totalSize / items.length;
      this.stats.oldestItem = Math.min(...items.map((item) => item.timestamp));
      this.stats.newestItem = Math.max(...items.map((item) => item.timestamp));

      const compressedItems = items.filter((item) => item.compressed);
      this.stats.compressionRatio = compressedItems.length / items.length;
    } else {
      this.stats.averageSize = 0;
      this.stats.oldestItem = 0;
      this.stats.newestItem = 0;
      this.stats.compressionRatio = 0;
    }
  }

  /**
   * 记录操作
   */
  private recordOperation(
    type: CacheOperation["type"],
    key: string,
    success: boolean,
    startTime: number,
    size?: number,
    fromMemory?: boolean,
  ): void {
    const operation: CacheOperation = {
      type,
      key,
      success,
      timestamp: Date.now(),
      duration: performance.now() - startTime,
      size,
      fromMemory,
    };

    this.operations.unshift(operation);

    // 保持最近100个操作
    if (this.operations.length > 100) {
      this.operations = this.operations.slice(0, 100);
    }
  }

  /**
   * 开始清理定时器
   */
  private startCleanupTimer(): void {
    if (!isBrowser()) return;

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = window.setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 停止清理定时器
   */
  stopCleanupTimer(): void {
    if (!isBrowser()) return;

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 简单压缩 (Base64编码)
   */
  private compress(data: string): string {
    try {
      return btoa(encodeURIComponent(data));
    } catch (error) {
      return data;
    }
  }

  /**
   * 简单解压缩
   */
  private decompress(data: string): string {
    try {
      return decodeURIComponent(atob(data));
    } catch (error) {
      return data;
    }
  }

  /**
   * 销毁缓存
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.memoryCache.clear();
    this.operations = [];
    console.log("💾 LocalStorageCache已销毁");
  }
}

/**
 * 默认本地存储缓存实例
 */
export const defaultLocalStorageCache = new LocalStorageCache();

/**
 * 便捷函数：获取缓存
 */
export async function getCached<T = any>(key: string): Promise<T | null> {
  return defaultLocalStorageCache.get<T>(key);
}

/**
 * 便捷函数：设置缓存
 */
export async function setCached<T = any>(
  key: string,
  data: T,
  ttl?: number,
): Promise<boolean> {
  return defaultLocalStorageCache.set(key, data, ttl);
}

/**
 * 便捷函数：删除缓存
 */
export async function deleteCached(key: string): Promise<boolean> {
  return defaultLocalStorageCache.delete(key);
}

/**
 * 便捷函数：清空缓存
 */
export async function clearCache(): Promise<boolean> {
  return defaultLocalStorageCache.clear();
}
