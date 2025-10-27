/**
 * 懒加载性能测试
 * Week 3 - 性能基准测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigManager } from '../../src/utils/ConfigManager';
import { LazyLoader } from '../../src/utils/LazyLoader';
import fs from 'fs';
import path from 'path';

describe('懒加载性能测试', () => {
  let configManager: ConfigManager;
  let lazyLoader: LazyLoader;

  beforeEach(async () => {
    // Mock fetch to read from static files
    global.fetch = vi.fn((url: string) => {
      const urlPath = new URL(url, 'http://localhost').pathname;
      const filePath = path.join(process.cwd(), 'static', urlPath);
      
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => JSON.parse(content),
        } as Response);
      } catch (error) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response);
      }
    }) as any;

    configManager = new ConfigManager();
    lazyLoader = new LazyLoader(configManager);
    
    // 预加载配置
    await configManager.loadOptimizedConfig();
  });

  afterEach(() => {
    lazyLoader.clearCache();
  });

  describe('加载性能基准', () => {
    it('单个分类加载应该在合理时间内完成', async () => {
      const indexes = configManager.getAllCategoryIndexes();
      if (indexes.length === 0) return;

      const testIndex = indexes[0];
      
      const startTime = performance.now();
      const result = await lazyLoader.loadCategory(testIndex);
      const loadTime = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(loadTime).toBeLessThan(5000); // 应该在5秒内完成
      
      console.log(`单个分类加载时间: ${loadTime.toFixed(2)}ms`);
    });

    it('缓存加载应该非常快速', async () => {
      const indexes = configManager.getAllCategoryIndexes();
      if (indexes.length === 0) return;

      const testIndex = indexes[0];
      
      // 第一次加载
      await lazyLoader.loadCategory(testIndex);
      
      // 第二次加载 (从缓存)
      const startTime = performance.now();
      const result = await lazyLoader.loadCategory(testIndex);
      const cacheLoadTime = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(true);
      expect(cacheLoadTime).toBeLessThan(10); // 缓存加载应该在10ms内
      
      console.log(`缓存加载时间: ${cacheLoadTime.toFixed(2)}ms`);
    });

    it('批量加载性能测试', async () => {
      const indexes = configManager.getAllCategoryIndexes();
      const testIndexes = indexes.slice(0, Math.min(5, indexes.length));
      
      if (testIndexes.length === 0) return;

      const startTime = performance.now();
      const results = await lazyLoader.loadMultipleCategories(testIndexes);
      const batchLoadTime = performance.now() - startTime;

      expect(results.size).toBe(testIndexes.length);
      
      // 批量加载应该比单独加载更高效
      const avgTimePerCategory = batchLoadTime / testIndexes.length;
      expect(avgTimePerCategory).toBeLessThan(2000); // 平均每个分类2秒内
      
      console.log(`批量加载 ${testIndexes.length} 个分类总时间: ${batchLoadTime.toFixed(2)}ms`);
      console.log(`平均每个分类: ${avgTimePerCategory.toFixed(2)}ms`);
    });
  });

  describe('并发性能测试', () => {
    it('并发请求应该正确去重并保持性能', async () => {
      const indexes = configManager.getAllCategoryIndexes();
      if (indexes.length === 0) return;

      const testIndex = indexes[0];
      lazyLoader.clearCache(); // 确保从网络加载

      // 同时发起10个相同的请求
      const concurrentCount = 10;
      const promises = Array(concurrentCount).fill(null).map(() => 
        lazyLoader.loadCategory(testIndex)
      );

      const startTime = performance.now();
      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      // 所有请求都应该成功
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // 并发请求的总时间应该接近单个请求的时间
      expect(totalTime).toBeLessThan(6000); // 应该在6秒内完成所有并发请求
      
      // 验证只有一个缓存条目 (去重成功)
      const stats = lazyLoader.getCacheStats();
      expect(stats.cacheSize).toBe(1);
      
      console.log(`${concurrentCount} 个并发请求总时间: ${totalTime.toFixed(2)}ms`);
    });

    it('混合并发请求性能测试', async () => {
      const indexes = configManager.getAllCategoryIndexes();
      const testIndexes = indexes.slice(0, Math.min(3, indexes.length));
      
      if (testIndexes.length === 0) return;

      lazyLoader.clearCache();

      // 为每个分类创建多个并发请求
      const promises: Promise<any>[] = [];
      testIndexes.forEach(index => {
        for (let i = 0; i < 3; i++) {
          promises.push(lazyLoader.loadCategory(index));
        }
      });

      const startTime = performance.now();
      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      // 所有请求都应该成功
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // 验证缓存大小等于分类数量 (去重成功)
      const stats = lazyLoader.getCacheStats();
      expect(stats.cacheSize).toBe(testIndexes.length);
      
      console.log(`混合并发请求 (${promises.length} 个请求，${testIndexes.length} 个分类) 总时间: ${totalTime.toFixed(2)}ms`);
    });
  });

  describe('内存性能测试', () => {
    it('LRU缓存应该有效控制内存使用', async () => {
      // 创建小缓存的LazyLoader进行测试
      const smallCacheLazyLoader = new LazyLoader(configManager, { maxCacheSize: 3 });
      
      const indexes = configManager.getAllCategoryIndexes();
      const testCount = Math.min(6, indexes.length); // 加载6个分类，但缓存只能存3个
      
      if (testCount <= 3) return; // 需要足够的分类进行测试

      // 依次加载分类
      for (let i = 0; i < testCount; i++) {
        await smallCacheLazyLoader.loadCategory(indexes[i]);
        
        const stats = smallCacheLazyLoader.getCacheStats();
        console.log(`加载第${i+1}个分类后，缓存大小: ${stats.cacheSize}, 内存缓存: ${stats.memoryCache.cacheSize}`);
        expect(stats.cacheSize).toBeLessThanOrEqual(3); // 不应该超过最大缓存大小
      }

      const finalStats = smallCacheLazyLoader.getCacheStats();
      expect(finalStats.cacheSize).toBe(3); // 最终应该正好是最大缓存大小
      
      console.log(`LRU缓存测试: 加载了 ${testCount} 个分类，缓存大小保持在 ${finalStats.cacheSize}`);
    }, 30000); // 30秒超时

    it('缓存清理应该有效释放内存', async () => {
      const indexes = configManager.getAllCategoryIndexes();
      const testIndexes = indexes.slice(0, Math.min(5, indexes.length));
      
      if (testIndexes.length === 0) return;

      // 加载多个分类
      await lazyLoader.loadMultipleCategories(testIndexes);
      
      let stats = lazyLoader.getCacheStats();
      const initialCacheSize = stats.cacheSize;
      expect(initialCacheSize).toBeGreaterThan(0);

      // 清理缓存
      lazyLoader.clearCache();
      
      stats = lazyLoader.getCacheStats();
      expect(stats.cacheSize).toBe(0);
      expect(stats.loadingPromises).toBe(0);
      
      console.log(`缓存清理测试: ${initialCacheSize} → 0`);
    });
  });

  describe('压力测试', () => {
    it('应该能处理大量连续请求', async () => {
      const indexes = configManager.getAllCategoryIndexes();
      if (indexes.length === 0) return;

      const testIndex = indexes[0];
      const requestCount = 50;
      
      const startTime = performance.now();
      
      // 连续发起大量请求
      for (let i = 0; i < requestCount; i++) {
        const result = await lazyLoader.loadCategory(testIndex);
        expect(result.success).toBe(true);
      }
      
      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / requestCount;
      
      // 由于缓存，后续请求应该很快
      expect(avgTime).toBeLessThan(50); // 平均每个请求50ms内
      
      console.log(`${requestCount} 个连续请求总时间: ${totalTime.toFixed(2)}ms`);
      console.log(`平均每个请求: ${avgTime.toFixed(2)}ms`);
    });
  });

  describe('性能回归测试', () => {
    it('性能指标应该满足基准要求', async () => {
      const indexes = configManager.getAllCategoryIndexes();
      if (indexes.length === 0) return;

      const testIndex = indexes[0];
      
      // 性能基准测试
      const benchmarks = {
        firstLoad: 0,
        cacheLoad: 0,
        concurrentLoad: 0
      };

      // 1. 首次加载基准
      lazyLoader.clearCache();
      let startTime = performance.now();
      let result = await lazyLoader.loadCategory(testIndex);
      benchmarks.firstLoad = performance.now() - startTime;
      expect(result.success).toBe(true);

      // 2. 缓存加载基准
      startTime = performance.now();
      result = await lazyLoader.loadCategory(testIndex);
      benchmarks.cacheLoad = performance.now() - startTime;
      expect(result.fromCache).toBe(true);

      // 3. 并发加载基准
      lazyLoader.clearCache();
      const concurrentPromises = Array(5).fill(null).map(() => 
        lazyLoader.loadCategory(testIndex)
      );
      startTime = performance.now();
      await Promise.all(concurrentPromises);
      benchmarks.concurrentLoad = performance.now() - startTime;

      // 性能断言
      expect(benchmarks.firstLoad).toBeLessThan(5000); // 首次加载 < 5秒
      expect(benchmarks.cacheLoad).toBeLessThan(10);   // 缓存加载 < 10ms
      expect(benchmarks.concurrentLoad).toBeLessThan(6000); // 并发加载 < 6秒

      console.log('性能基准测试结果:', {
        firstLoad: `${benchmarks.firstLoad.toFixed(2)}ms`,
        cacheLoad: `${benchmarks.cacheLoad.toFixed(2)}ms`,
        concurrentLoad: `${benchmarks.concurrentLoad.toFixed(2)}ms`
      });
    });
  });
});
