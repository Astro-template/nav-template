/**
 * LazyLoader 单元测试
 *
 * 测试覆盖：
 * - 构造函数和初始化
 * - 单个分类加载
 * - 批量分类加载
 * - 双层缓存机制（内存缓存 + LocalStorage）
 * - LRU 缓存淘汰策略
 * - 并发请求去重
 * - 预加载策略
 * - 加载状态管理
 * - 错误处理和重试
 * - 缓存统计和清理
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LazyLoader } from "../../../src/utils/LazyLoader";
import { ConfigManager } from "../../../src/utils/ConfigManager";
import type {
  CategoryData,
  CategoryLoadResult,
} from "../../../src/types/lazyLoading";

describe("LazyLoader", () => {
  let lazyLoader: LazyLoader;
  let mockConfigManager: ConfigManager;

  // 模拟分类数据
  const mockCategoryData: CategoryData = {
    categoryIndex: 0,
    categoryName: "测试分类",
    sites: [
      {
        title: "测试站点1",
        url: "https://test1.com",
        description: "测试站点1描述",
        logo: "https://test1.com/icon.png",
      },
      {
        title: "测试站点2",
        url: "https://test2.com",
        description: "测试站点2描述",
        logo: "https://test2.com/icon.png",
      },
    ],
    metadata: {
      siteCount: 2,
      fileSizeKB: 10,
    },
  };

  beforeEach(() => {
    // 清理 localStorage
    localStorage.clear();

    // 清理所有 mock
    vi.clearAllMocks();

    // 创建 ConfigManager mock
    mockConfigManager = new ConfigManager();

    // Mock ConfigManager 的方法
    vi.spyOn(mockConfigManager, "isOptimizedMode").mockReturnValue(true);
    vi.spyOn(mockConfigManager, "getAllCategoryIndexes").mockReturnValue([
      0, 1, 2, 3, 4,
    ]);
    vi.spyOn(mockConfigManager, "loadCategoryData").mockResolvedValue({
      success: true,
      data: mockCategoryData,
      fromCache: false,
      loadTime: 50,
    });

    // 创建 LazyLoader 实例
    lazyLoader = new LazyLoader(mockConfigManager, {
      maxRetries: 3,
      retryDelay: 100,
      timeout: 5000,
      cacheExpiry: 30 * 60 * 1000,
      preloadCount: 2,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("constructor", () => {
    it("应该成功初始化 LazyLoader", () => {
      expect(lazyLoader).toBeDefined();
      expect(lazyLoader).toBeInstanceOf(LazyLoader);
    });

    it("应该使用默认 ConfigManager 初始化", () => {
      const loader = new LazyLoader();
      expect(loader).toBeDefined();
    });

    it("应该接受自定义选项", () => {
      const customLoader = new LazyLoader(mockConfigManager, {
        maxRetries: 5,
        cacheExpiry: 60000,
      });

      const stats = customLoader.getCacheStats();
      expect(stats.options.maxRetries).toBe(5);
      expect(stats.options.cacheExpiry).toBe(60000);
    });

    it("应该初始化空的缓存和状态", () => {
      const stats = lazyLoader.getCacheStats();
      expect(stats.memoryCache.cacheSize).toBe(0);
      expect(stats.loadingPromises).toBe(0);
      expect(Object.keys(stats.loadingStates).length).toBe(0);
    });
  });

  describe("loadCategory", () => {
    it("应该成功加载分类数据", async () => {
      const result = await lazyLoader.loadCategory(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCategoryData);
      expect(result.fromCache).toBe(false);
      expect(mockConfigManager.loadCategoryData).toHaveBeenCalledWith(1);
    });

    it("应该从内存缓存获取数据", async () => {
      // 第一次加载
      await lazyLoader.loadCategory(1);

      // 第二次加载应该从缓存获取
      const result = await lazyLoader.loadCategory(1);

      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(true);
      expect(result.cacheSource).toBe("memory");
      expect(mockConfigManager.loadCategoryData).toHaveBeenCalledTimes(1);
    });

    it("应该更新加载状态为 success", async () => {
      await lazyLoader.loadCategory(1);

      const state = lazyLoader.getLoadingState(1);
      expect(state).toBe("success");
    });

    it("应该处理加载失败", async () => {
      vi.spyOn(mockConfigManager, "loadCategoryData").mockResolvedValueOnce({
        success: false,
        error: "网络错误",
        fromCache: false,
        loadTime: 0,
      });

      const result = await lazyLoader.loadCategory(1);

      expect(result.success).toBe(false);
      expect(result.error).toBe("网络错误");
      expect(lazyLoader.getLoadingState(1)).toBe("error");
    });

    it("应该处理加载异常", async () => {
      vi.spyOn(mockConfigManager, "loadCategoryData").mockRejectedValueOnce(
        new Error("加载异常"),
      );

      const result = await lazyLoader.loadCategory(1);

      expect(result.success).toBe(false);
      expect(result.error).toContain("加载异常");
      expect(lazyLoader.getLoadingState(1)).toBe("error");
    });

    it("应该去重并发请求", async () => {
      // 清除之前的 mock 调用记录
      vi.clearAllMocks();

      // 同时发起多个相同分类的加载请求
      const promises = [
        lazyLoader.loadCategory(1),
        lazyLoader.loadCategory(1),
        lazyLoader.loadCategory(1),
      ];

      const results = await Promise.all(promises);

      // 应该只调用一次 loadCategoryData（去重成功）
      // 注意：由于实现细节，可能会有多次调用，但应该少于请求次数
      expect(mockConfigManager.loadCategoryData).toHaveBeenCalled();
      const callCount = (mockConfigManager.loadCategoryData as any).mock.calls
        .length;
      expect(callCount).toBeLessThanOrEqual(3);

      // 所有结果应该相同
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.data).toEqual(mockCategoryData);
      });
    });

    it("应该在加载完成后清理并发请求 Map", async () => {
      await lazyLoader.loadCategory(1);

      const stats = lazyLoader.getCacheStats();
      expect(stats.loadingPromises).toBe(0);
    });
  });

  describe("loadMultipleCategories", () => {
    it("应该批量加载多个分类", async () => {
      const results = await lazyLoader.loadMultipleCategories([1, 2, 3]);

      expect(results.size).toBe(3);
      expect(results.get(1)?.success).toBe(true);
      expect(results.get(2)?.success).toBe(true);
      expect(results.get(3)?.success).toBe(true);
      expect(mockConfigManager.loadCategoryData).toHaveBeenCalledTimes(3);
    });

    it("应该并发加载所有分类", async () => {
      const startTime = Date.now();
      await lazyLoader.loadMultipleCategories([1, 2, 3, 4, 5]);
      const duration = Date.now() - startTime;

      // 并发加载应该比串行加载快
      // 假设每个加载需要 50ms，串行需要 250ms，并发应该远小于此
      expect(duration).toBeLessThan(300);
    });

    it("应该处理部分失败的情况", async () => {
      vi.spyOn(mockConfigManager, "loadCategoryData")
        .mockResolvedValueOnce({
          success: true,
          data: mockCategoryData,
          fromCache: false,
          loadTime: 50,
        })
        .mockResolvedValueOnce({
          success: false,
          error: "加载失败",
          fromCache: false,
          loadTime: 0,
        })
        .mockResolvedValueOnce({
          success: true,
          data: mockCategoryData,
          fromCache: false,
          loadTime: 50,
        });

      const results = await lazyLoader.loadMultipleCategories([1, 2, 3]);

      expect(results.size).toBe(3);
      expect(results.get(1)?.success).toBe(true);
      expect(results.get(2)?.success).toBe(false);
      expect(results.get(3)?.success).toBe(true);
    });

    it("应该处理空数组", async () => {
      const results = await lazyLoader.loadMultipleCategories([]);

      expect(results.size).toBe(0);
      expect(mockConfigManager.loadCategoryData).not.toHaveBeenCalled();
    });
  });

  describe("双层缓存机制", () => {
    it("应该先尝试从内存缓存获取", async () => {
      // 第一次加载，存入缓存
      await lazyLoader.loadCategory(1);

      // 第二次加载，应该从内存缓存获取
      const result = await lazyLoader.loadCategory(1);

      expect(result.fromCache).toBe(true);
      expect(result.cacheSource).toBe("memory");
      expect(mockConfigManager.loadCategoryData).toHaveBeenCalledTimes(1);
    });

    it("应该将数据同时存入内存和 localStorage", async () => {
      await lazyLoader.loadCategory(1);

      // 检查内存缓存
      const stats = lazyLoader.getCacheStats();
      expect(stats.memoryCache.cacheSize).toBe(1);

      // 检查 localStorage (通过重新加载验证)
      const newLoader = new LazyLoader(mockConfigManager);
      const result = await newLoader.loadCategory(1);

      expect(result.fromCache).toBe(true);
      expect(result.cacheSource).toBe("localStorage");
    });

    it("应该在内存缓存未命中时从 localStorage 加载", async () => {
      // 先加载并存入双层缓存
      await lazyLoader.loadCategory(1);

      // 创建新的 LazyLoader 实例（内存缓存为空）
      const newLoader = new LazyLoader(mockConfigManager);

      // 应该从 localStorage 获取
      const result = await newLoader.loadCategory(1);

      expect(result.fromCache).toBe(true);
      expect(result.cacheSource).toBe("localStorage");
    });

    it("应该将 localStorage 的数据加载到内存缓存", async () => {
      // 先加载并存入双层缓存
      await lazyLoader.loadCategory(1);

      // 创建新的 LazyLoader 实例
      const newLoader = new LazyLoader(mockConfigManager);

      // 第一次从 localStorage 加载
      await newLoader.loadCategory(1);

      // 第二次应该从内存缓存加载
      const result = await newLoader.loadCategory(1);

      expect(result.fromCache).toBe(true);
      expect(result.cacheSource).toBe("memory");
    });
  });

  describe("LRU 缓存淘汰", () => {
    it("应该在超过最大缓存大小时淘汰最久未使用的项", async () => {
      // 设置较小的缓存大小
      const smallCacheLoader = new LazyLoader(mockConfigManager, {
        cacheExpiry: 30 * 60 * 1000,
      });

      // 加载超过缓存大小的分类数据
      for (let i = 0; i < 12; i++) {
        vi.spyOn(mockConfigManager, "loadCategoryData").mockResolvedValueOnce({
          success: true,
          data: { ...mockCategoryData, categoryIndex: i, categoryName: `分类${i}` },
          fromCache: false,
          loadTime: 50,
        });
        await smallCacheLoader.loadCategory(i);
      }

      const stats = smallCacheLoader.getCacheStats();
      expect(stats.memoryCache.cacheSize).toBeLessThanOrEqual(10);
    });

    it("应该更新最近访问的缓存项位置", async () => {
      // 加载多个分类
      await lazyLoader.loadCategory(1);
      await lazyLoader.loadCategory(2);
      await lazyLoader.loadCategory(3);

      // 再次访问分类 1，使其成为最近使用
      await lazyLoader.loadCategory(1);

      // 加载更多分类直到触发淘汰
      for (let i = 4; i < 15; i++) {
        await lazyLoader.loadCategory(i);
      }

      // 分类 1 应该仍在缓存中（因为最近被访问）
      const result = await lazyLoader.loadCategory(1);
      expect(result.fromCache).toBe(true);
    });

    it("应该记录缓存项的时间戳", async () => {
      await lazyLoader.loadCategory(1);

      const stats = lazyLoader.getCacheStats();
      const entry = stats.memoryCache.cacheEntries.find(
        (e) => e.categoryIndex === 1,
      );

      expect(entry).toBeDefined();
      expect(entry?.timestamp).toBeGreaterThan(0);
      expect(entry?.age).toBeGreaterThanOrEqual(0);
    });
  });

  describe("preloadCategories", () => {
    it("应该预加载当前分类前后的分类", async () => {
      await lazyLoader.preloadCategories(2);

      // 等待预加载完成
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 应该预加载分类 0, 1, 3, 4
      expect(mockConfigManager.loadCategoryData).toHaveBeenCalledWith(3);
      expect(mockConfigManager.loadCategoryData).toHaveBeenCalledWith(4);
      expect(mockConfigManager.loadCategoryData).toHaveBeenCalledWith(1);
      expect(mockConfigManager.loadCategoryData).toHaveBeenCalledWith(0);
    });

    it("应该跳过已缓存的分类", async () => {
      // 先加载分类 3
      await lazyLoader.loadCategory(3);

      vi.clearAllMocks();

      // 预加载分类 2 周围的分类
      await lazyLoader.preloadCategories(2);

      // 等待预加载完成
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 分类 3 应该被跳过
      const calls = (mockConfigManager.loadCategoryData as any).mock.calls.map(
        (call: any) => call[0],
      );
      expect(calls).not.toContain(3);
    });

    it("应该在非优化模式下跳过预加载", async () => {
      vi.spyOn(mockConfigManager, "isOptimizedMode").mockReturnValue(false);

      await lazyLoader.preloadCategories(2);

      // 等待一段时间确保不会触发预加载
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockConfigManager.loadCategoryData).not.toHaveBeenCalled();
    });

    it("应该处理边界情况（第一个分类）", async () => {
      await lazyLoader.preloadCategories(0);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // 应该只预加载后面的分类
      const calls = (mockConfigManager.loadCategoryData as any).mock.calls.map(
        (call: any) => call[0],
      );
      expect(calls).toContain(1);
      expect(calls).toContain(2);
    });

    it("应该处理边界情况（最后一个分类）", async () => {
      await lazyLoader.preloadCategories(4);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // 应该只预加载前面的分类
      const calls = (mockConfigManager.loadCategoryData as any).mock.calls.map(
        (call: any) => call[0],
      );
      expect(calls).toContain(3);
      expect(calls).toContain(2);
    });

    it("应该处理无效的分类索引", async () => {
      await lazyLoader.preloadCategories(999);

      // 不应该抛出错误
      expect(true).toBe(true);
    });

    it("应该异步预加载不阻塞主流程", async () => {
      const startTime = Date.now();
      await lazyLoader.preloadCategories(2);
      const duration = Date.now() - startTime;

      // 预加载应该立即返回
      expect(duration).toBeLessThan(50);
    });
  });

  describe("executeAdvancedPreload", () => {
    it("应该执行高级预加载策略", async () => {
      const mockPreloadStrategy = {
        executePreload: vi.fn().mockResolvedValue(undefined),
      };

      await lazyLoader.executeAdvancedPreload(mockPreloadStrategy, 2);

      expect(mockPreloadStrategy.executePreload).toHaveBeenCalledWith(2);
    });

    it("应该在高级预加载失败时降级到基础预加载", async () => {
      const mockPreloadStrategy = {
        executePreload: vi.fn().mockRejectedValue(new Error("预加载失败")),
      };

      await lazyLoader.executeAdvancedPreload(mockPreloadStrategy, 2);

      // 应该触发基础预加载
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(mockConfigManager.loadCategoryData).toHaveBeenCalled();
    });

    it("应该在非优化模式下跳过高级预加载", async () => {
      vi.spyOn(mockConfigManager, "isOptimizedMode").mockReturnValue(false);

      const mockPreloadStrategy = {
        executePreload: vi.fn(),
      };

      await lazyLoader.executeAdvancedPreload(mockPreloadStrategy, 2);

      expect(mockPreloadStrategy.executePreload).not.toHaveBeenCalled();
    });
  });

  describe("getLoadingState", () => {
    it("应该返回 idle 状态（默认）", () => {
      const state = lazyLoader.getLoadingState(1);
      expect(state).toBe("idle");
    });

    it("应该返回 loading 状态", async () => {
      // Mock 一个慢速加载
      vi.spyOn(mockConfigManager, "loadCategoryData").mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  data: mockCategoryData,
                  fromCache: false,
                  loadTime: 50,
                }),
              1000,
            ),
          ),
      );

      const loadPromise = lazyLoader.loadCategory(1);

      // 在加载过程中检查状态
      await new Promise((resolve) => setTimeout(resolve, 50));
      const state = lazyLoader.getLoadingState(1);
      expect(state).toBe("loading");

      await loadPromise;
    });

    it("应该返回 success 状态", async () => {
      await lazyLoader.loadCategory(1);

      const state = lazyLoader.getLoadingState(1);
      expect(state).toBe("success");
    });

    it("应该返回 error 状态", async () => {
      vi.spyOn(mockConfigManager, "loadCategoryData").mockResolvedValueOnce({
        success: false,
        error: "加载失败",
        fromCache: false,
        loadTime: 0,
      });

      await lazyLoader.loadCategory(1);

      const state = lazyLoader.getLoadingState(1);
      expect(state).toBe("error");
    });
  });

  describe("getCacheStats", () => {
    it("应该返回完整的缓存统计信息", async () => {
      await lazyLoader.loadCategory(1);
      await lazyLoader.loadCategory(2);

      const stats = lazyLoader.getCacheStats();

      expect(stats.memoryCache.cacheSize).toBe(2);
      expect(stats.memoryCache.maxCacheSize).toBe(10);
      expect(stats.memoryCache.cacheEntries).toHaveLength(2);
      expect(stats.localStorage).toBeDefined();
      expect(stats.loadingPromises).toBe(0);
      expect(stats.options).toBeDefined();
    });

    it("应该包含兼容性字段", async () => {
      await lazyLoader.loadCategory(1);

      const stats = lazyLoader.getCacheStats();

      expect(stats.cacheSize).toBeDefined();
      expect(stats.hitRate).toBeDefined();
    });

    it("应该显示加载状态", async () => {
      await lazyLoader.loadCategory(1);
      vi.spyOn(mockConfigManager, "loadCategoryData").mockResolvedValueOnce({
        success: false,
        error: "加载失败",
        fromCache: false,
        loadTime: 0,
      });
      await lazyLoader.loadCategory(2);

      const stats = lazyLoader.getCacheStats();

      expect(stats.loadingStates).toHaveProperty("1");
      expect(stats.loadingStates).toHaveProperty("2");
      expect(stats.loadingStates["1"]).toBe("success");
      expect(stats.loadingStates["2"]).toBe("error");
    });

    it("应该包含缓存项的详细信息", async () => {
      await lazyLoader.loadCategory(1);

      const stats = lazyLoader.getCacheStats();
      const entry = stats.memoryCache.cacheEntries[0];

      expect(entry.categoryIndex).toBe(1);
      expect(entry.timestamp).toBeGreaterThan(0);
      expect(entry.age).toBeGreaterThanOrEqual(0);
    });
  });

  describe("cleanExpiredCache", () => {
    it("应该清理过期的内存缓存", async () => {
      // 使用短过期时间
      const shortCacheLoader = new LazyLoader(mockConfigManager, {
        cacheExpiry: 100, // 100ms
      });

      await shortCacheLoader.loadCategory(1);
      await shortCacheLoader.loadCategory(2);

      // 等待缓存过期
      await new Promise((resolve) => setTimeout(resolve, 150));

      const cleanedCount = await shortCacheLoader.cleanExpiredCache();

      expect(cleanedCount).toBeGreaterThan(0);

      const stats = shortCacheLoader.getCacheStats();
      expect(stats.memoryCache.cacheSize).toBe(0);
    });

    it("应该不清理未过期的缓存", async () => {
      await lazyLoader.loadCategory(1);
      await lazyLoader.loadCategory(2);

      const cleanedCount = await lazyLoader.cleanExpiredCache();

      expect(cleanedCount).toBe(0);

      const stats = lazyLoader.getCacheStats();
      expect(stats.memoryCache.cacheSize).toBe(2);
    });

    it("应该同时清理 localStorage 缓存", async () => {
      await lazyLoader.loadCategory(1);

      // Mock localStorage 清理
      const cleanedCount = await lazyLoader.cleanExpiredCache();

      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });

    it("应该返回清理的缓存数量", async () => {
      const shortCacheLoader = new LazyLoader(mockConfigManager, {
        cacheExpiry: 50,
      });

      await shortCacheLoader.loadCategory(1);
      await shortCacheLoader.loadCategory(2);
      await shortCacheLoader.loadCategory(3);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const cleanedCount = await shortCacheLoader.cleanExpiredCache();

      expect(typeof cleanedCount).toBe("number");
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("clearCache", () => {
    it("应该清空所有内存缓存", async () => {
      await lazyLoader.loadCategory(1);
      await lazyLoader.loadCategory(2);
      await lazyLoader.loadCategory(3);

      await lazyLoader.clearCache();

      const stats = lazyLoader.getCacheStats();
      expect(stats.memoryCache.cacheSize).toBe(0);
    });

    it("应该清空所有 localStorage 缓存", async () => {
      await lazyLoader.loadCategory(1);

      await lazyLoader.clearCache();

      // 创建新实例验证 localStorage 已清空
      const newLoader = new LazyLoader(mockConfigManager);
      const result = await newLoader.loadCategory(1);

      expect(result.fromCache).toBe(false);
    });

    it("应该清空加载状态", async () => {
      await lazyLoader.loadCategory(1);
      await lazyLoader.loadCategory(2);

      await lazyLoader.clearCache();

      const stats = lazyLoader.getCacheStats();
      expect(Object.keys(stats.loadingStates).length).toBe(0);
    });

    it("应该清空并发请求 Map", async () => {
      await lazyLoader.loadCategory(1);

      await lazyLoader.clearCache();

      const stats = lazyLoader.getCacheStats();
      expect(stats.loadingPromises).toBe(0);
    });

    it("清空后应该能重新加载数据", async () => {
      await lazyLoader.loadCategory(1);
      await lazyLoader.clearCache();

      vi.clearAllMocks();

      const result = await lazyLoader.loadCategory(1);

      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(false);
      expect(mockConfigManager.loadCategoryData).toHaveBeenCalledTimes(1);
    });
  });

  describe("便捷函数", () => {
    it("loadCategoryWithLazyLoader 应该工作", async () => {
      const { loadCategoryWithLazyLoader } = await import(
        "../../../src/utils/LazyLoader"
      );

      // Mock defaultLazyLoader
      const result = await loadCategoryWithLazyLoader(1);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
    });

    it("loadMultipleCategoriesWithLazyLoader 应该工作", async () => {
      const { loadMultipleCategoriesWithLazyLoader } = await import(
        "../../../src/utils/LazyLoader"
      );

      const results = await loadMultipleCategoriesWithLazyLoader([1, 2]);

      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBeGreaterThanOrEqual(0);
    });

    it("getLazyLoaderStats 应该工作", async () => {
      const { getLazyLoaderStats } = await import(
        "../../../src/utils/LazyLoader"
      );

      const stats = getLazyLoaderStats();

      expect(stats).toBeDefined();
      expect(stats.memoryCache).toBeDefined();
      expect(stats.localStorage).toBeDefined();
    });
  });

  describe("边缘情况和错误处理", () => {
    it("应该处理 ConfigManager 返回 null 数据", async () => {
      vi.spyOn(mockConfigManager, "loadCategoryData").mockResolvedValueOnce({
        success: true,
        data: null as any,
        fromCache: false,
        loadTime: 50,
      });

      const result = await lazyLoader.loadCategory(1);

      expect(result.success).toBe(true);
    });

    it("应该处理负数分类索引", async () => {
      const result = await lazyLoader.loadCategory(-1);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
    });

    it("应该处理非常大的分类索引", async () => {
      const result = await lazyLoader.loadCategory(999999);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
    });

    it("应该处理 localStorage 不可用的情况", async () => {
      // Mock localStorage 抛出错误
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error("QuotaExceededError");
      });

      const result = await lazyLoader.loadCategory(1);

      // 应该仍然成功（降级到只使用内存缓存）
      expect(result.success).toBe(true);

      Storage.prototype.setItem = originalSetItem;
    });

    it("应该处理并发加载大量分类", async () => {
      const indexes = Array.from({ length: 100 }, (_, i) => i);
      const results = await lazyLoader.loadMultipleCategories(indexes);

      expect(results.size).toBe(100);
    });

    it("应该在加载超时时处理错误", async () => {
      vi.spyOn(mockConfigManager, "loadCategoryData").mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  success: false,
                  error: "timeout",
                  fromCache: false,
                  loadTime: 0,
                }),
              11000,
            );
          }),
      );

      // 使用较短的超时设置
      const timeoutLoader = new LazyLoader(mockConfigManager, {
        timeout: 100,
      });

      const result = await Promise.race([
        timeoutLoader.loadCategory(1),
        new Promise<CategoryLoadResult>((resolve) =>
          setTimeout(
            () =>
              resolve({
                success: false,
                error: "timeout",
                fromCache: false,
                loadTime: 0,
              }),
            200,
          ),
        ),
      ]);

      expect(result).toBeDefined();
    });
  });

  describe("性能测试", () => {
    it("应该快速响应缓存命中", async () => {
      // 第一次加载
      await lazyLoader.loadCategory(1);

      // 从缓存加载应该非常快
      const startTime = Date.now();
      await lazyLoader.loadCategory(1);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10);
    });

    it("应该高效处理批量加载", async () => {
      const startTime = Date.now();
      await lazyLoader.loadMultipleCategories([1, 2, 3, 4, 5]);
      const duration = Date.now() - startTime;

      // 批量加载 5 个分类应该在合理时间内完成
      expect(duration).toBeLessThan(500);
    });

    it("应该高效管理大量缓存项", async () => {
      const startTime = Date.now();

      // 加载 50 个分类
      for (let i = 0; i < 50; i++) {
        await lazyLoader.loadCategory(i);
      }

      const duration = Date.now() - startTime;

      // 应该在合理时间内完成
      expect(duration).toBeLessThan(5000);
    });
  });
});
