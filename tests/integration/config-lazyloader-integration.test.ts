/**
 * ConfigManager与LazyLoader集成测试
 * Week 3 - 项目级集成测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigManager } from '../../src/utils/ConfigManager';
import { LazyLoader } from '../../src/utils/LazyLoader';
import fs from 'fs';
import path from 'path';

describe('ConfigManager与LazyLoader集成测试', () => {
  let configManager: ConfigManager;
  let lazyLoader: LazyLoader;

  beforeEach(() => {
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
  });

  afterEach(() => {
    lazyLoader.clearCache();
  });

  describe('基础集成流程', () => {
    it('应该完成完整的配置加载和懒加载流程', async () => {
      // 1. 加载配置
      const configResult = await configManager.loadOptimizedConfig();
      expect(configResult.success).toBe(true);
      expect(configResult.isOptimized).toBe(true);

      // 2. 获取分类索引
      const indexes = configManager.getAllCategoryIndexes();
      expect(indexes).toBeInstanceOf(Array);
      expect(indexes.length).toBeGreaterThan(0);

      // 3. 使用LazyLoader加载第一个分类
      const firstIndex = indexes[0];
      console.log('First index:', firstIndex);
      console.log('All indexes:', indexes);
      
      const categoryResult = await lazyLoader.loadCategory(firstIndex);
      
      if (!categoryResult.success) {
        console.log('LazyLoader Error:', categoryResult.error);
        console.log('Category Result:', JSON.stringify(categoryResult, null, 2));
      }
      
      expect(categoryResult.success).toBe(true);
      expect(categoryResult.data).toBeDefined();
      expect(categoryResult.fromCache).toBe(false); // 第一次加载不应该从缓存

      // 4. 验证数据一致性
      const categoryInfo = configManager.getCategoryInfo(firstIndex);
      expect(categoryInfo).toBeTruthy();
      
      if (categoryInfo && categoryResult.data) {
        expect(categoryResult.data.categoryName).toBe(categoryInfo.name);
        expect(categoryResult.data.categoryIndex).toBe(firstIndex);
      }
    });

    it('应该正确处理缓存机制', async () => {
      // 加载配置
      await configManager.loadOptimizedConfig();
      const indexes = configManager.getAllCategoryIndexes();
      const testIndex = indexes[0];

      // 第一次加载
      const result1 = await lazyLoader.loadCategory(testIndex);
      expect(result1.success).toBe(true);
      expect(result1.fromCache).toBe(false);

      // 第二次加载应该从缓存获取
      const result2 = await lazyLoader.loadCategory(testIndex);
      expect(result2.success).toBe(true);
      expect(result2.fromCache).toBe(true);
      expect(result2.loadTime).toBeLessThan(result1.loadTime);

      // 验证缓存统计
      const stats = lazyLoader.getCacheStats();
      expect(stats.cacheSize).toBeGreaterThan(0);
    });

    it('应该正确处理并发请求', async () => {
      // 加载配置
      await configManager.loadOptimizedConfig();
      const indexes = configManager.getAllCategoryIndexes();
      const testIndex = indexes[0];

      // 清理缓存确保测试准确性
      lazyLoader.clearCache();

      // 同时发起多个相同的请求
      const promises = [
        lazyLoader.loadCategory(testIndex),
        lazyLoader.loadCategory(testIndex),
        lazyLoader.loadCategory(testIndex)
      ];

      const results = await Promise.all(promises);

      // 所有请求都应该成功
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });

      // 验证去重机制工作正常
      const stats = lazyLoader.getCacheStats();
      expect(stats.cacheSize).toBe(1); // 只应该有一个缓存条目
    });
  });

  describe('错误处理集成', () => {
    it('应该正确处理无效的分类索引', async () => {
      // 加载配置
      await configManager.loadOptimizedConfig();

      // 尝试加载无效的分类索引
      const invalidIndex = -1;
      const result = await lazyLoader.loadCategory(invalidIndex);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.fromCache).toBe(false);
    });

    it('应该正确处理配置未加载的情况', async () => {
      // 不加载配置，直接尝试懒加载
      const result = await lazyLoader.loadCategory(0);

      expect(result.success).toBe(false);
      expect(result.error).toContain('配置尚未加载');
    });
  });

  describe('批量操作集成', () => {
    it('应该正确处理批量加载', async () => {
      // 加载配置
      await configManager.loadOptimizedConfig();
      const indexes = configManager.getAllCategoryIndexes();
      const testIndexes = indexes.slice(0, Math.min(3, indexes.length));

      // 批量加载
      const results = await lazyLoader.loadMultipleCategories(testIndexes);

      expect(results.size).toBe(testIndexes.length);

      // 验证每个结果
      testIndexes.forEach(index => {
        const result = results.get(index);
        expect(result).toBeDefined();
        expect(result!.success).toBe(true);
      });

      // 验证缓存
      const stats = lazyLoader.getCacheStats();
      expect(stats.cacheSize).toBe(testIndexes.length);
    });
  });

  describe('性能集成测试', () => {
    it('缓存应该显著提升加载性能', async () => {
      // 加载配置
      await configManager.loadOptimizedConfig();
      const indexes = configManager.getAllCategoryIndexes();
      const testIndex = indexes[0];

      // 第一次加载 (网络请求)
      const start1 = performance.now();
      const result1 = await lazyLoader.loadCategory(testIndex);
      const time1 = performance.now() - start1;

      expect(result1.success).toBe(true);
      expect(result1.fromCache).toBe(false);

      // 第二次加载 (缓存)
      const start2 = performance.now();
      const result2 = await lazyLoader.loadCategory(testIndex);
      const time2 = performance.now() - start2;

      expect(result2.success).toBe(true);
      expect(result2.fromCache).toBe(true);

      // 缓存加载应该明显更快
      expect(time2).toBeLessThan(time1 * 0.1); // 缓存应该至少快10倍
    });

    it('LRU缓存应该正确管理内存', async () => {
      // 创建小缓存的LazyLoader
      const smallCacheLazyLoader = new LazyLoader(configManager, { maxCacheSize: 2 });
      
      // 加载配置
      await configManager.loadOptimizedConfig();
      const indexes = configManager.getAllCategoryIndexes();
      
      if (indexes.length >= 3) {
        // 加载3个分类，但缓存只能存2个
        await smallCacheLazyLoader.loadCategory(indexes[0]);
        await smallCacheLazyLoader.loadCategory(indexes[1]);
        await smallCacheLazyLoader.loadCategory(indexes[2]);

        const stats = smallCacheLazyLoader.getCacheStats();
        expect(stats.cacheSize).toBeLessThanOrEqual(2); // 不应该超过最大缓存大小
      }
    });
  });

  describe('数据一致性验证', () => {
    it('LazyLoader加载的数据应该与ConfigManager信息一致', async () => {
      // 加载配置
      await configManager.loadOptimizedConfig();
      const indexes = configManager.getAllCategoryIndexes();

      for (const index of indexes.slice(0, 2)) { // 测试前2个分类
        // 从ConfigManager获取分类信息
        const categoryInfo = configManager.getCategoryInfo(index);
        
        // 从LazyLoader加载完整数据
        const categoryResult = await lazyLoader.loadCategory(index);

        if (categoryInfo && categoryResult.success && categoryResult.data) {
          // 验证基本信息一致性
          expect(categoryResult.data.categoryName).toBe(categoryInfo.name);
          expect(categoryResult.data.categoryIndex).toBe(index);
          
          // 验证网站数量一致性
          expect(categoryResult.data.sites.length).toBe(categoryInfo.siteCount);
        }
      }
    });
  });
});
