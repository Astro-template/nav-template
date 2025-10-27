/**
 * ConfigManager 单元测试
 * 测试配置管理器的所有核心功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigManager } from '../../../src/utils/ConfigManager';
import type { UnifiedConfig, OptimizedConfig } from '../../../src/types/lazyLoading';

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    // 清除单例实例
    (ConfigManager as any).instance = null;

    // Mock fetch
    global.fetch = vi.fn();

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    global.localStorage = localStorageMock as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getInstance', () => {
    it('应该返回单例实例', () => {
      const instance1 = ConfigManager.getInstance();
      const instance2 = ConfigManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('应该使用默认配置路径', () => {
      const instance = ConfigManager.getInstance();
      expect(instance).toBeDefined();
    });

    it('应该接受自定义配置路径', () => {
      const customPath = '/custom/config.json';
      const instance = ConfigManager.getInstance(customPath);
      expect(instance).toBeDefined();
    });
  });

  describe('detectConfigFormat', () => {
    beforeEach(() => {
      configManager = new ConfigManager();
    });

    it('应该检测优化配置格式 - 完整优化配置', () => {
      const optimizedConfig = {
        optimization: {
          enabled: true,
          version: '2.0',
        },
        menuItems: [
          {
            name: 'Test',
            categoryIndex: 0,
            previewSites: [{ title: 'Site 1' }],
          },
        ],
      };

      const result = configManager.detectConfigFormat(optimizedConfig);

      expect(result.isOptimized).toBe(true);
      expect(result.hasOptimizationField).toBe(true);
      expect(result.hasCategoryIndexes).toBe(true);
      expect(result.hasPreviewSites).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('应该检测优化配置格式 - 仅有 categoryIndex', () => {
      const config = {
        menuItems: [
          {
            name: 'Test',
            categoryIndex: 0,
          },
          {
            name: 'Test 2',
            categoryIndex: 1,
          },
        ],
      };

      const result = configManager.detectConfigFormat(config);

      expect(result.isOptimized).toBe(true);
      expect(result.hasCategoryIndexes).toBe(true);
      expect(result.estimatedCategories).toBe(2);
    });

    it('应该检测优化配置格式 - 包含 submenu', () => {
      const config = {
        menuItems: [
          {
            name: 'Parent',
            categoryIndex: null,
            submenu: [
              { name: 'Child 1', categoryIndex: 0 },
              { name: 'Child 2', categoryIndex: 1 },
              { name: 'Child 3', categoryIndex: 2 },
            ],
          },
        ],
      };

      const result = configManager.detectConfigFormat(config);

      expect(result.isOptimized).toBe(true);
      expect(result.hasCategoryIndexes).toBe(true);
      expect(result.estimatedCategories).toBe(3);
    });

    it('应该检测传统配置格式 - sites 数组', () => {
      const traditionalConfig = {
        menuItems: [
          {
            name: 'Test',
            sites: [
              { title: 'Site 1', url: 'https://example.com' },
              { title: 'Site 2', url: 'https://example2.com' },
            ],
          },
        ],
      };

      const result = configManager.detectConfigFormat(traditionalConfig);

      expect(result.isOptimized).toBe(false);
      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
    });

    it('应该检测传统配置格式 - 包含 categoryMap', () => {
      const config = {
        menuItems: [
          {
            name: 'Test',
            sites: [],
          },
        ],
        categoryMap: {
          test: { id: 'test', name: 'Test' },
        },
      };

      const result = configManager.detectConfigFormat(config);

      expect(result.isOptimized).toBe(false);
      expect(result.confidence).toBeGreaterThan(0.95);
    });

    it('应该处理空配置', () => {
      const emptyConfig = {};

      const result = configManager.detectConfigFormat(emptyConfig);

      expect(result.isOptimized).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.estimatedCategories).toBe(0);
    });

    it('应该处理 null 或 undefined', () => {
      const result1 = configManager.detectConfigFormat(null);
      const result2 = configManager.detectConfigFormat(undefined);

      expect(result1.confidence).toBe(0);
      expect(result2.confidence).toBe(0);
    });

    it('应该计算正确的置信度分数', () => {
      const config = {
        optimization: { enabled: true }, // +0.4
        menuItems: [
          { name: 'Test', categoryIndex: 0 }, // +0.4
        ],
      };

      const result = configManager.detectConfigFormat(config);

      expect(result.confidence).toBeCloseTo(0.8, 1);
    });
  });

  describe('loadConfig', () => {
    beforeEach(() => {
      configManager = ConfigManager.getInstance();
    });

    it('应该成功加载优化配置', async () => {
      const mockConfig: OptimizedConfig = {
        site: {
          title: 'Test Site',
          description: 'Test Description',
          logo: { text: 'Test', href: '/' },
        },
        menuItems: [
          {
            name: 'Test',
            href: '/test',
            icon: 'test-icon',
            type: 'single',
            categoryIndex: 0,
            siteCount: 0,
            previewSites: [],
          },
        ],
        optimization: {
          enabled: true,
          totalCategories: 1,
          totalSites: 10,
          previewCount: 3,
          fileSizeKB: 50,
          compressionRatio: 0.5,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockConfig,
      });

      const result = await configManager.loadConfig();

      expect(result.success).toBe(true);
      expect(result.isOptimized).toBe(true);
      expect(configManager.isConfigLoaded()).toBe(true);
    });

    it('应该处理网络错误', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await configManager.loadConfig();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
      if (typeof result.error === 'string') {
        expect(result.error).toContain('配置加载失败');
      }
    });

    it('应该处理 404 错误', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await configManager.loadConfig();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该记录加载时间', async () => {
      const mockConfig: OptimizedConfig = {
        site: { title: 'Test', description: '', logo: { text: 'T', href: '/' } },
        menuItems: [],
        optimization: { enabled: true, totalCategories: 0, totalSites: 0, previewCount: 3, fileSizeKB: 50, compressionRatio: 0.5 },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const result = await configManager.loadConfig();

      expect(result.loadTime).toBeGreaterThan(0);
    });

    it('应该支持重试机制', async () => {
      // 第一次失败，第二次成功
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            site: { title: 'Test', description: '', logo: { text: 'T' } },
            menuItems: [],
            optimization: { enabled: true, version: '2.0', totalCategories: 0, totalSites: 0 },
          }),
        });

      const result = await configManager.loadConfig();

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getAllCategoryIndexes', () => {
    beforeEach(() => {
      configManager = ConfigManager.getInstance();
    });

    it('应该返回所有分类索引 - 单层菜单', () => {
      const config: UnifiedConfig = {
        site: { title: 'Test', description: '', logo: { text: 'T', href: '/' } },
        menuItems: [
          { name: 'Menu 1', href: '/menu-1', icon: 'icon', type: 'single', categoryIndex: 0 },
          { name: 'Menu 2', href: '/menu-2', icon: 'icon', type: 'single', categoryIndex: 1 },
          { name: 'Menu 3', href: '/menu-3', icon: 'icon', type: 'single', categoryIndex: 2 },
        ],
        isOptimized: false,
      };

      (configManager as any).currentConfig = config;

      const indexes = configManager.getAllCategoryIndexes();

      expect(indexes).toEqual([0, 1, 2]);
    });

    it('应该返回所有分类索引 - 包含 submenu', () => {
      const config: UnifiedConfig = {
        site: { title: 'Test', description: '', logo: { text: 'T', href: '/' } },
        menuItems: [
          {
            name: 'Parent',
            href: '/parent',
            icon: 'icon',
            type: 'tabs',
            submenu: [
              { name: 'Child 1', href: '/child-1', icon: 'icon', categoryIndex: 0 },
              { name: 'Child 2', href: '/child-2', icon: 'icon', categoryIndex: 1 },
            ],
          },
          { name: 'Menu 2', href: '/menu-2', icon: 'icon', type: 'single', categoryIndex: 2 },
        ],
        isOptimized: false,
      };

      (configManager as any).currentConfig = config;

      const indexes = configManager.getAllCategoryIndexes();

      expect(indexes).toEqual([0, 1, 2]);
    });

    it('应该过滤 null 值', () => {
      const config: UnifiedConfig = {
        site: { title: 'Test', description: '', logo: { text: 'T', href: '/' } },
        menuItems: [
          { name: 'Menu 1', href: '/menu-1', icon: 'icon', type: 'single', categoryIndex: 0 },
          { name: 'Menu 2', href: '/menu-2', icon: 'icon', type: 'single' },
          { name: 'Menu 3', href: '/menu-3', icon: 'icon', type: 'single', categoryIndex: 2 },
        ],
        isOptimized: false,
      };

      (configManager as any).currentConfig = config;

      const indexes = configManager.getAllCategoryIndexes();

      expect(indexes).toEqual([0, 2]);
    });

    it('应该返回空数组如果没有配置', () => {
      const indexes = configManager.getAllCategoryIndexes();

      expect(indexes).toEqual([]);
    });

    it('应该去重并排序', () => {
      const config: UnifiedConfig = {
        site: { title: 'Test', description: '', logo: { text: 'T', href: '/' } },
        menuItems: [
          { name: 'Menu 1', href: '/menu-1', icon: 'icon', type: 'single', categoryIndex: 2 },
          { name: 'Menu 2', href: '/menu-2', icon: 'icon', type: 'single', categoryIndex: 0 },
          { name: 'Menu 3', href: '/menu-3', icon: 'icon', type: 'single', categoryIndex: 1 },
          { name: 'Menu 4', href: '/menu-4', icon: 'icon', type: 'single', categoryIndex: 2 }, // 重复
        ],
        isOptimized: false,
      };

      (configManager as any).currentConfig = config;

      const indexes = configManager.getAllCategoryIndexes();

      expect(indexes).toEqual([0, 1, 2]);
    });
  });

  describe('getCategoryInfo', () => {
    beforeEach(() => {
      configManager = ConfigManager.getInstance();
    });

    it('应该返回分类信息', () => {
      const config: UnifiedConfig = {
        site: { title: 'Test', description: '', logo: { text: 'T', href: '/' } },
        menuItems: [
          { name: 'Category 1', href: '/category-1', icon: 'icon-1', type: 'single', categoryIndex: 0, siteCount: 10, previewSites: [] },
          { name: 'Category 2', href: '/category-2', icon: 'icon-2', type: 'single', categoryIndex: 1, siteCount: 15, previewSites: [] },
        ],
        isOptimized: false,
      };

      (configManager as any).currentConfig = config;

      const info = configManager.getCategoryInfo(0);

      expect(info).toEqual({
        name: 'Category 1',
        icon: 'icon-1',
        categoryIndex: 0,
        siteCount: 10,
        previewSites: [],
        url: undefined,
      });
    });

    it('应该返回 submenu 中的分类信息', () => {
      const config: UnifiedConfig = {
        site: { title: 'Test', description: '', logo: { text: 'T', href: '/' } },
        menuItems: [
          {
            name: 'Parent',
            href: '/parent',
            icon: 'parent-icon',
            type: 'tabs',
            submenu: [
              { name: 'Child 1', href: '/child-1', icon: 'child-icon-1', categoryIndex: 0, siteCount: 5, previewSites: [] },
              { name: 'Child 2', href: '/child-2', icon: 'child-icon-2', categoryIndex: 1, siteCount: 8, previewSites: [] },
            ],
          },
        ],
        isOptimized: false,
      };

      (configManager as any).currentConfig = config;

      const info = configManager.getCategoryInfo(1);

      expect(info).toEqual({
        name: 'Child 2',
        icon: 'child-icon-2',
        categoryIndex: 1,
        siteCount: 8,
        previewSites: [],
        url: undefined,
      });
    });

    it('应该返回 null 如果索引不存在', () => {
      const config: UnifiedConfig = {
        site: { title: 'Test', description: '', logo: { text: 'T', href: '/' } },
        menuItems: [
          { name: 'Category 1', href: '/category-1', icon: 'icon', type: 'single', categoryIndex: 0 },
        ],
        isOptimized: false,
      };

      (configManager as any).currentConfig = config;

      const info = configManager.getCategoryInfo(999);

      expect(info).toBeNull();
    });

    it('应该返回 null 如果没有配置', () => {
      const info = configManager.getCategoryInfo(0);

      expect(info).toBeNull();
    });
  });

  describe('getConfigStats', () => {
    beforeEach(() => {
      configManager = ConfigManager.getInstance();
    });

    it('应该返回配置统计信息', () => {
      const config: UnifiedConfig = {
        site: { title: 'Test', description: '', logo: { text: 'T', href: '/' } },
        menuItems: [
          { name: 'Menu 1', href: '/menu-1', icon: 'icon', type: 'single', categoryIndex: 0 },
          {
            name: 'Menu 2',
            href: '/menu-2',
            icon: 'icon',
            type: 'tabs',
            submenu: [
              { name: 'Sub 1', href: '/sub-1', icon: 'icon', categoryIndex: 1 },
              { name: 'Sub 2', href: '/sub-2', icon: 'icon', categoryIndex: 2 },
            ],
          },
        ],
        isOptimized: true,
        optimization: {
          enabled: true,
          totalCategories: 3,
          totalSites: 150,
          previewCount: 5,
          fileSizeKB: 1.6,
          compressionRatio: 0.95,
        },
      };

      (configManager as any).currentConfig = config;
      (configManager as any).configFormat = 'optimized';

      const stats = configManager.getConfigStats();

      expect(stats.isLoaded).toBe(true);
      expect(stats.format).toBe('optimized');
      expect(stats.totalCategories).toBe(3);
      expect(stats.menuItemCount).toBe(2);
      expect(stats.totalSites).toBe(150);
    });

    it('应该返回默认统计如果没有配置', () => {
      const stats = configManager.getConfigStats();

      expect(stats.isLoaded).toBe(false);
      expect(stats.format).toBe(null);
      expect(stats.totalCategories).toBe(0);
      expect(stats.menuItemCount).toBe(0);
      expect(stats.totalSites).toBe(0);
    });
  });

  describe('loadCategoryData', () => {
    beforeEach(() => {
      configManager = ConfigManager.getInstance();
      // 清除之前的 mock 调用
      (global.fetch as any).mockClear();
    });

    it('应该成功加载分类数据', async () => {
      // 先设置配置（模拟已加载状态）
      const mockConfig: UnifiedConfig = {
        site: { title: 'Test', description: '', logo: { text: 'T', href: '/' } },
        menuItems: [
          { name: 'Test Category', href: '/test-category', icon: 'icon', type: 'single', categoryIndex: 0, siteCount: 2, previewSites: [] },
        ],
        isOptimized: true,
      };
      (configManager as any).currentConfig = mockConfig;
      (configManager as any).configFormat = 'optimized';
      (configManager as any).loadingState = 'success';

      const mockCategoryData = {
        categoryIndex: 0,
        categoryName: 'Test Category',
        sites: [
          { title: 'Site 1', url: 'https://site1.com' },
          { title: 'Site 2', url: 'https://site2.com' },
        ],
        metadata: {
          siteCount: 2,
          fileSizeKB: 1.0,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCategoryData,
      });

      const result = await configManager.loadCategoryData(0);

      if (!result.success) {
        console.log('Error:', result.error);
      }

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.categoryIndex).toBe(0);
    });

    it('应该处理加载错误', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Load error'));

      const result = await configManager.loadCategoryData(0);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该使用正确的 URL 路径', async () => {
      // 设置配置（模拟已加载状态）
      const mockConfig: UnifiedConfig = {
        site: { title: 'Test', description: '', logo: { text: 'T', href: '/' } },
        menuItems: [
          { name: 'Test Category', href: '/test', icon: 'icon', type: 'single', categoryIndex: 5, siteCount: 0, previewSites: [] },
        ],
        isOptimized: true,
      };
      (configManager as any).currentConfig = mockConfig;
      (configManager as any).configFormat = 'optimized';
      (configManager as any).loadingState = 'success';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          categoryIndex: 5, 
          categoryName: 'Test', 
          sites: [],
          metadata: { siteCount: 0, fileSizeKB: 0 }
        }),
      });

      await configManager.loadCategoryData(5);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/categories/5.json'),
        expect.any(Object)
      );
    });
  });

  describe('isOptimizedMode', () => {
    beforeEach(() => {
      configManager = ConfigManager.getInstance();
    });

    it('应该返回 true 对于优化配置', () => {
      (configManager as any).configFormat = 'optimized';

      expect(configManager.isOptimizedMode()).toBe(true);
    });

    it('应该返回 false 对于传统配置', () => {
      (configManager as any).configFormat = 'traditional';

      expect(configManager.isOptimizedMode()).toBe(false);
    });

    it('应该返回 false 对于未知格式', () => {
      (configManager as any).configFormat = 'unknown';

      expect(configManager.isOptimizedMode()).toBe(false);
    });
  });

  describe('getMenuItems', () => {
    beforeEach(() => {
      configManager = ConfigManager.getInstance();
    });

    it('应该返回菜单项', () => {
      const menuItems = [
        { name: 'Menu 1', href: '/menu-1', icon: 'icon', type: 'single' as const, categoryIndex: 0 },
        { name: 'Menu 2', href: '/menu-2', icon: 'icon', type: 'single' as const, categoryIndex: 1 },
      ];

      const config: UnifiedConfig = {
        site: { title: 'Test', description: '', logo: { text: 'T', href: '/' } },
        menuItems,
        isOptimized: false,
      };

      (configManager as any).currentConfig = config;

      expect(configManager.getMenuItems()).toEqual(menuItems);
    });

    it('应该返回空数组如果没有配置', () => {
      expect(configManager.getMenuItems()).toEqual([]);
    });
  });

  describe('updateRetryConfig', () => {
    beforeEach(() => {
      configManager = ConfigManager.getInstance();
    });

    it('应该更新重试配置', () => {
      const newConfig = {
        maxRetries: 5,
        retryDelay: 2000,
        timeout: 20000,
      };

      configManager.updateRetryConfig(newConfig);

      const currentConfig = configManager.getRetryConfig();

      expect(currentConfig).toEqual(newConfig);
    });

    it('应该部分更新配置', () => {
      configManager.updateRetryConfig({ maxRetries: 10 });

      const config = configManager.getRetryConfig();

      expect(config.maxRetries).toBe(10);
      expect(config.retryDelay).toBeDefined();
      expect(config.timeout).toBeDefined();
    });
  });

  describe('reloadConfig', () => {
    beforeEach(() => {
      configManager = ConfigManager.getInstance();
    });

    it('应该清除当前配置并重新加载', async () => {
      const mockConfig: OptimizedConfig = {
        site: { title: 'Test', description: '', logo: { text: 'T', href: '/' } },
        menuItems: [],
        optimization: { enabled: true, totalCategories: 0, totalSites: 0, previewCount: 3, fileSizeKB: 50, compressionRatio: 0.5 },
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockConfig,
      });

      // 第一次加载
      await configManager.loadConfig();
      expect(configManager.isConfigLoaded()).toBe(true);

      // 重新加载
      await configManager.reloadConfig();

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      configManager = ConfigManager.getInstance();
    });

    it('应该处理畸形的 JSON 数据', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await configManager.loadConfig();

      expect(result.success).toBe(false);
    });

    it('应该处理超时', async () => {
      // 模拟超时错误（不实际等待）
      (global.fetch as any).mockRejectedValueOnce(
        new Error('Request timeout')
      );

      const result = await configManager.loadConfig();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }, 5000); // 设置 5 秒超时

    it('应该处理空的 menuItems 数组', () => {
      const config: UnifiedConfig = {
        site: { title: 'Test', description: '', logo: { text: 'T', href: '/' } },
        menuItems: [],
        isOptimized: false,
      };

      (configManager as any).currentConfig = config;

      const indexes = configManager.getAllCategoryIndexes();
      expect(indexes).toEqual([]);

      const stats = configManager.getConfigStats();
      expect(stats.totalCategories).toBe(0);
    });
  });
});
