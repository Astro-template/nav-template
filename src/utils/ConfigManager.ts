/**
 * ConfigManager - 配置管理器
 * Week 2: 基于设计文档重构的配置管理系统
 */

import type { SiteConfig } from "../types/config";
import type {
  OptimizedConfig,
  UnifiedConfig,
  ConfigLoadResult,
  ConfigDetectionResult,
  UnifiedMenuItem,
  UnifiedSubMenuItem,
  ConfigFormat,
  LoadingState,
  CategoryData,
  CategoryLoadResult,
} from "../types/lazyLoading";
import { defaultErrorHandler, ErrorType } from "./ErrorHandler";

// 日志工具 - 在测试环境中禁用
const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
const log = {
  info: (...args: any[]) => !isTestEnv && log.info(...args),
  warn: (...args: any[]) => !isTestEnv && log.warn(...args),
  error: (...args: any[]) => !isTestEnv && log.error(...args),
};

/**
 * 配置管理器 - 核心配置管理类
 */
export class ConfigManager {
  private static instance: ConfigManager;

  // 核心状态
  private currentConfig: UnifiedConfig | null = null;
  private configFormat: ConfigFormat = "unknown";
  private loadingState: LoadingState = "idle";
  private configPath: string;

  // Week 3 新增: 错误处理配置
  private retryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 10000,
  };

  // 性能监控
  private loadStartTime: number = 0;
  private loadMetrics: {
    configLoadTime: number;
    detectionTime: number;
    conversionTime: number;
  } = {
    configLoadTime: 0,
    detectionTime: 0,
    conversionTime: 0,
  };

  constructor(configPath?: string) {
    // 智能路径检测：优先使用public/，回退到src/data/
    this.configPath = configPath || this.detectConfigPath();
  }

  /**
   * 智能检测配置文件路径
   */
  private detectConfigPath(): string {
    // 在服务器端（SSR）和客户端都使用相对URL
    // Astro会在构建时将static/复制到dist/根目录
    return "/config.json";
  }

  /**
   * 检测是否在服务器端运行
   */
  private isServer(): boolean {
    return typeof window === "undefined";
  }

  /**
   * 带重试机制的数据获取（支持服务器端和客户端）
   */
  private async fetchWithRetry(
    url: string,
    retries: number = this.retryConfig.maxRetries,
  ): Promise<Response> {
    // 服务器端使用文件系统
    if (this.isServer()) {
      return this.fetchFromFileSystem(url);
    }

    // 客户端使用fetch
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.retryConfig.timeout,
        );

        const response = await fetch(url, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        const isLastAttempt = attempt === retries;

        if (isLastAttempt) {
          throw error;
        }

        log.warn(
          `🔄 ConfigManager: 请求失败，重试 ${attempt + 1}/${retries}`,
          error,
        );

        // 延迟后重试
        await new Promise((resolve) =>
          setTimeout(resolve, this.retryConfig.retryDelay),
        );
      }
    }

    throw new Error("fetchWithRetry: 不应该到达这里");
  }

  /**
   * 从文件系统读取配置（服务器端）
   */
  private async fetchFromFileSystem(filePath: string): Promise<Response> {
    try {
      // 动态导入仅在服务器端可用的模块
      const fs = await import("fs/promises");
      const path = await import("path");

      // 将URL路径转换为文件系统路径
      // /config.json -> static/config.json
      let fsPath = filePath;
      if (filePath.startsWith("/")) {
        fsPath = `./static${filePath}`;
      }

      // 转换为绝对路径
      const absolutePath = path.resolve(process.cwd(), fsPath);
      const content = await fs.readFile(absolutePath, "utf-8");

      // 模拟 Response 对象
      return new Response(content, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }

  /**
   * 获取单例实例
   */
  static getInstance(configPath?: string): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager(configPath);
    }
    return ConfigManager.instance;
  }

  /**
   * 检测配置格式
   */
  detectConfigFormat(config: any): ConfigDetectionResult {
    const startTime = performance.now();

    // 处理 null/undefined 情况
    if (!config || typeof config !== 'object') {
      return {
        isOptimized: false,
        confidence: 0,
        hasOptimizationField: false,
        hasCategoryIndexes: false,
        hasPreviewSites: false,
        estimatedCategories: 0,
        detectionTime: performance.now() - startTime,
      };
    }

    let confidence = 0;
    let isOptimized = false;
    let hasOptimizationField = false;
    let hasCategoryIndexes = false;
    let hasPreviewSites = false;
    let estimatedCategories = 0;

    // 1. 检查optimization字段 (权重: 40%)
    if (config.optimization && typeof config.optimization === "object") {
      hasOptimizationField = true;
      if (config.optimization.enabled === true) {
        confidence += 0.4;
        isOptimized = true;
      }
    }

    // 2. 检查categoryIndex字段 (权重: 40%)
    if (config.menuItems && Array.isArray(config.menuItems)) {
      // 收集所有 categoryIndex（包括 submenu）
      const allIndexes: number[] = [];
      config.menuItems.forEach((item: any) => {
        if (
          typeof item.categoryIndex === "number" &&
          item.categoryIndex >= 0
        ) {
          allIndexes.push(item.categoryIndex);
        }
        if (item.submenu && Array.isArray(item.submenu)) {
          item.submenu.forEach((sub: any) => {
            if (
              typeof sub.categoryIndex === "number" &&
              sub.categoryIndex >= 0
            ) {
              allIndexes.push(sub.categoryIndex);
            }
          });
        }
      });

      if (allIndexes.length > 0) {
        hasCategoryIndexes = true;
        confidence += 0.4;
        isOptimized = true;
        estimatedCategories = Math.max(...allIndexes) + 1;
      }
    }

    // 3. 检查previewSites字段 (权重: 20%)
    if (
      config.menuItems &&
      config.menuItems.some(
        (item: any) =>
          Array.isArray(item.previewSites) ||
          (item.submenu &&
            item.submenu.some((sub: any) => Array.isArray(sub.previewSites))),
      )
    ) {
      hasPreviewSites = true;
      confidence += 0.2;
      isOptimized = true;
    }

    // 4. 检查传统格式特征
    if (
      !isOptimized &&
      config.menuItems &&
      config.menuItems.some(
        (item: any) =>
          Array.isArray(item.sites) ||
          (item.submenu &&
            item.submenu.some((sub: any) => Array.isArray(sub.sites))),
      )
    ) {
      confidence = 0.95; // 传统配置的高置信度
    }

    // 5. 检查categoryMap字段 (传统格式特征)
    if (config.categoryMap && typeof config.categoryMap === "object") {
      if (!isOptimized) {
        confidence += 0.05; // 增强传统格式置信度
      }
    }

    const detectionTime = performance.now() - startTime;
    this.loadMetrics.detectionTime = detectionTime;

    const result: ConfigDetectionResult = {
      isOptimized,
      hasOptimizationField,
      hasCategoryIndexes,
      hasPreviewSites,
      estimatedCategories,
      confidence,
    };

    log.info("🔍 配置格式检测:", {
      ...result,
      detectionTime: `${detectionTime.toFixed(2)}ms`,
    });

    return result;
  }

  /**
   * 加载配置文件
   */
  async loadConfig(): Promise<ConfigLoadResult> {
    this.loadStartTime = performance.now();
    this.loadingState = "loading";

    try {
      log.info("🔄 ConfigManager: 开始加载配置文件...");

      // 1. 加载主配置文件 (带错误处理)
      const response = await this.fetchWithRetry(this.configPath);

      const rawConfig = await response.json();
      this.loadMetrics.configLoadTime = performance.now() - this.loadStartTime;

      // 2. 检测配置格式
      const detection = this.detectConfigFormat(rawConfig);
      this.configFormat = detection.isOptimized ? "optimized" : "traditional";

      // 3. 转换为统一格式
      const conversionStartTime = performance.now();
      const unifiedConfig = detection.isOptimized
        ? this.convertOptimizedConfig(rawConfig as OptimizedConfig)
        : this.convertTraditionalConfig(rawConfig as SiteConfig);

      this.loadMetrics.conversionTime = performance.now() - conversionStartTime;
      this.currentConfig = unifiedConfig;
      this.loadingState = "success";

      const totalLoadTime = performance.now() - this.loadStartTime;

      log.info("✅ ConfigManager: 配置加载成功", {
        format: this.configFormat,
        loadTime: `${totalLoadTime.toFixed(2)}ms`,
        menuItems: unifiedConfig.menuItems.length,
        totalSites: this.getTotalSiteCount(unifiedConfig),
        metrics: this.loadMetrics,
      });

      return {
        success: true,
        config: unifiedConfig,
        isOptimized: detection.isOptimized,
        loadTime: totalLoadTime,
        detection,
      };
    } catch (error) {
      this.loadingState = "error";
      const totalLoadTime = performance.now() - this.loadStartTime;

      // 使用错误处理器处理错误
      const errorResult = await defaultErrorHandler.handleError(error, {
        type: "config",
        operation: "loadConfig",
        path: this.configPath,
      });

      const errorMessage = errorResult.error?.userMessage || "配置加载失败";

      log.error("❌ ConfigManager: 配置加载失败", {
        error: errorMessage,
        loadTime: `${totalLoadTime.toFixed(2)}ms`,
        errorType: errorResult.error?.type,
      });

      return {
        success: false,
        error: errorMessage,
        isOptimized: false,
        loadTime: totalLoadTime,
      };
    }
  }

  /**
   * 转换传统配置为统一格式
   */
  private convertTraditionalConfig(config: SiteConfig): UnifiedConfig {
    const unifiedMenuItems: UnifiedMenuItem[] = config.menuItems.map(
      (item) => ({
        name: item.name,
        href: item.href,
        icon: item.icon,
        type: item.type,
        sites: item.sites,
        submenu: item.submenu?.map(
          (sub) =>
            ({
              name: sub.name,
              href: sub.href,
              icon: sub.icon,
              sites: sub.sites,
              isLazyLoaded: false,
            }) as UnifiedSubMenuItem,
        ),
        isLazyLoaded: false,
      }),
    );

    return {
      site: config.site,
      menuItems: unifiedMenuItems,
      isOptimized: false,
    };
  }

  /**
   * 转换优化配置为统一格式
   */
  private convertOptimizedConfig(config: OptimizedConfig): UnifiedConfig {
    const unifiedMenuItems: UnifiedMenuItem[] = config.menuItems.map(
      (item) => ({
        name: item.name,
        href: item.href,
        icon: item.icon,
        type: item.type,
        categoryIndex: item.categoryIndex,
        siteCount: item.siteCount,
        previewSites: item.previewSites,
        submenu: item.submenu?.map(
          (sub) =>
            ({
              name: sub.name,
              href: sub.href,
              icon: sub.icon,
              categoryIndex: sub.categoryIndex,
              siteCount: sub.siteCount,
              previewSites: sub.previewSites,
              isLazyLoaded: true,
            }) as UnifiedSubMenuItem,
        ),
        isLazyLoaded:
          item.categoryIndex !== undefined && item.categoryIndex >= 0,
      }),
    );

    return {
      site: config.site,
      menuItems: unifiedMenuItems,
      isOptimized: true,
      optimization: config.optimization,
    };
  }

  /**
   * 获取总网站数量
   */
  private getTotalSiteCount(config: UnifiedConfig): number {
    if (config.isOptimized && config.optimization) {
      return config.optimization.totalSites || 0;
    }

    // 传统配置需要计算
    let total = 0;
    config.menuItems.forEach((item) => {
      if (item.sites) {
        total += item.sites.length;
      }
      if (item.submenu) {
        item.submenu.forEach((sub) => {
          if (sub.sites) {
            total += sub.sites.length;
          }
        });
      }
    });

    return total;
  }

  // ============ 公共API ============

  /**
   * 获取当前配置
   */
  getCurrentConfig(): UnifiedConfig | null {
    return this.currentConfig;
  }

  /**
   * 获取配置格式
   */
  getConfigFormat(): ConfigFormat {
    return this.configFormat;
  }

  /**
   * 获取加载状态
   */
  getLoadingState(): LoadingState {
    return this.loadingState;
  }

  /**
   * 检查是否为优化模式
   */
  isOptimizedMode(): boolean {
    return this.configFormat === "optimized";
  }

  /**
   * 获取菜单项
   */
  getMenuItems(): UnifiedMenuItem[] {
    return this.currentConfig?.menuItems || [];
  }

  /**
   * 检查配置是否已加载
   */
  isConfigLoaded(): boolean {
    return this.currentConfig !== null && this.loadingState === "success";
  }

  /**
   * 检查是否有配置（别名方法）
   */
  hasConfig(): boolean {
    return this.isConfigLoaded();
  }

  /**
   * 重新加载配置
   */
  async reloadConfig(): Promise<ConfigLoadResult> {
    this.currentConfig = null;
    this.configFormat = "unknown";
    this.loadingState = "idle";
    return this.loadConfig();
  }

  /**
   * 获取配置统计信息
   * 
   * @returns 配置统计对象，即使配置未加载也返回默认值（空对象模式）
   */
  getConfigStats() {
    // 配置未加载时返回默认值（空对象模式）
    if (!this.currentConfig) {
      return {
        isLoaded: false,
        isOptimized: false,
        format: null as ConfigFormat | null,
        loadingState: this.loadingState,
        menuItemCount: 0,
        totalSites: 0,
        totalCategories: 0,
        lazyLoadedItems: 0,
        loadMetrics: this.loadMetrics,
      };
    }

    const config = this.currentConfig;
    const stats = {
      isLoaded: true,
      isOptimized: config.isOptimized || false,
      format: this.configFormat,
      loadingState: this.loadingState,
      menuItemCount: config.menuItems.length,
      totalSites: this.getTotalSiteCount(config),
      totalCategories: this.getAllCategoryIndexes().length,
      lazyLoadedItems: config.menuItems.filter((item) => item.isLazyLoaded)
        .length,
      loadMetrics: this.loadMetrics,
    };

    if (config.optimization) {
      Object.assign(stats, {
        optimization: {
          totalCategories: config.optimization.totalCategories,
          previewCount: config.optimization.previewCount,
          fileSizeKB: config.optimization.fileSizeKB,
          compressionRatio: config.optimization.compressionRatio,
        },
      });
    }

    return stats;
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics() {
    return {
      ...this.loadMetrics,
      totalLoadTime:
        this.loadMetrics.configLoadTime +
        this.loadMetrics.detectionTime +
        this.loadMetrics.conversionTime,
    };
  }

  // ============ Week 3 新增方法 ============

  /**
   * 加载优化配置 (Week 3 新增)
   * 专门用于处理优化格式的配置文件
   */
  async loadOptimizedConfig(): Promise<ConfigLoadResult> {
    log.info("🚀 ConfigManager: 开始加载优化配置...");

    // 首先尝试正常加载配置
    const result = await this.loadConfig();

    if (!result.success) {
      return result;
    }

    // 验证是否为优化配置
    if (!result.isOptimized) {
      log.warn("⚠️ ConfigManager: 当前配置不是优化格式");
      return {
        ...result,
        error: "当前配置不是优化格式，请使用 loadConfig() 方法",
      };
    }

    log.info("✅ ConfigManager: 优化配置加载成功", {
      totalCategories: this.currentConfig?.optimization?.totalCategories,
      totalSites: this.currentConfig?.optimization?.totalSites,
      compressionRatio: this.currentConfig?.optimization?.compressionRatio,
    });

    return result;
  }

  /**
   * 加载分类数据 (Week 3 新增)
   * 按需加载指定分类的完整网站数据
   */
  async loadCategoryData(categoryIndex: number): Promise<CategoryLoadResult> {
    const startTime = performance.now();

    try {
      log.info(`🔄 ConfigManager: 开始加载分类 ${categoryIndex} 数据...`);

      // 验证配置是否已加载且为优化模式
      if (!this.isConfigLoaded()) {
        throw new Error("配置尚未加载，请先调用 loadConfig()");
      }

      if (!this.isOptimizedMode()) {
        throw new Error("当前配置不是优化模式，无需懒加载");
      }

      // 验证分类索引有效性
      if (categoryIndex < 0) {
        throw new Error(`无效的分类索引: ${categoryIndex}`);
      }

      // 构建分类数据文件路径
      const categoryPath = `/categories/${categoryIndex}.json`;

      // 发起带重试机制的网络请求
      const response = await this.fetchWithRetry(categoryPath);

      const categoryData: CategoryData = await response.json();
      const loadTime = performance.now() - startTime;

      // 验证数据完整性
      if (!categoryData.sites || !Array.isArray(categoryData.sites)) {
        throw new Error("分类数据格式错误: 缺少 sites 字段");
      }

      if (categoryData.categoryIndex !== categoryIndex) {
        log.warn(
          `⚠️ 分类索引不匹配: 期望 ${categoryIndex}, 实际 ${categoryData.categoryIndex}`,
        );
      }

      log.info(`✅ ConfigManager: 分类 ${categoryIndex} 数据加载成功`, {
        categoryName: categoryData.categoryName,
        siteCount: categoryData.sites.length,
        loadTime: `${loadTime.toFixed(2)}ms`,
        fileSizeKB: categoryData.metadata?.fileSizeKB,
      });

      return {
        success: true,
        data: categoryData,
        fromCache: false,
        loadTime,
      };
    } catch (error) {
      const loadTime = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : "未知错误";

      log.error(`❌ ConfigManager: 分类 ${categoryIndex} 数据加载失败`, {
        error: errorMessage,
        loadTime: `${loadTime.toFixed(2)}ms`,
      });

      return {
        success: false,
        error: errorMessage,
        fromCache: false,
        loadTime,
      };
    }
  }

  /**
   * 批量加载多个分类数据 (Week 3 新增)
   */
  async loadMultipleCategoryData(
    categoryIndexes: number[],
  ): Promise<Map<number, CategoryLoadResult>> {
    log.info(
      `🔄 ConfigManager: 开始批量加载 ${categoryIndexes.length} 个分类数据...`,
    );

    const results = new Map<number, CategoryLoadResult>();
    const promises = categoryIndexes.map(async (index) => {
      const result = await this.loadCategoryData(index);
      results.set(index, result);
      return { index, result };
    });

    await Promise.all(promises);

    const successCount = Array.from(results.values()).filter(
      (r) => r.success,
    ).length;
    log.info(`✅ ConfigManager: 批量加载完成`, {
      total: categoryIndexes.length,
      success: successCount,
      failed: categoryIndexes.length - successCount,
    });

    return results;
  }

  /**
   * 获取分类信息 (Week 3 新增)
   * 从主配置中获取指定分类的基本信息
   * 
   * @returns 包含分类完整信息的对象，如果未找到则返回 null
   */
  getCategoryInfo(categoryIndex: number): {
    name: string;
    icon: string;
    categoryIndex: number;
    siteCount: number;
    previewSites: any[];
    url?: string;
  } | null {
    // 如果没有配置，返回 null
    if (!this.currentConfig) {
      return null;
    }

    const menuItems = this.currentConfig.menuItems || [];

    // 递归查找分类
    const findCategory = (items: any[]): any | null => {
      for (const item of items) {
        // 只使用 categoryIndex 字段（符合类型定义）
        if (item.categoryIndex === categoryIndex) {
          return {
            name: item.name,
            icon: item.icon,
            categoryIndex: item.categoryIndex,
            siteCount: item.siteCount || 0,
            previewSites: item.previewSites || [],
            url: item.url,
          };
        }

        // 在 submenu 中查找
        if (item.submenu && Array.isArray(item.submenu)) {
          const found = findCategory(item.submenu);
          if (found) return found;
        }
      }
      return null;
    };

    return findCategory(menuItems);
  }

  /**
   * 获取所有分类索引 (Week 3 新增)
   */
  getAllCategoryIndexes(): number[] {
    // 如果没有配置，返回空数组
    if (!this.currentConfig) {
      return [];
    }

    const indexes: number[] = [];
    const menuItems = this.currentConfig.menuItems || [];

    // 递归收集所有索引
    const collectIndexes = (items: any[]) => {
      items.forEach((item) => {
        // 只使用 categoryIndex 字段（符合类型定义）
        if (typeof item.categoryIndex === 'number' && item.categoryIndex >= 0) {
          indexes.push(item.categoryIndex);
        }

        // 递归处理 submenu
        if (item.submenu && Array.isArray(item.submenu)) {
          collectIndexes(item.submenu);
        }
      });
    };

    collectIndexes(menuItems);

    // 去重并排序
    return [...new Set(indexes)].sort((a, b) => a - b);
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 更新重试配置 (Week 3 新增)
   */
  updateRetryConfig(config: Partial<typeof this.retryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
    log.info("🔧 ConfigManager: 重试配置已更新", this.retryConfig);
  }

  /**
   * 获取重试配置 (Week 3 新增)
   */
  getRetryConfig() {
    return { ...this.retryConfig };
  }
}

/**
 * 默认配置管理器实例
 */
export const defaultConfigManager = ConfigManager.getInstance();

/**
 * 便捷函数：加载配置
 */
export async function loadConfig(
  configPath?: string,
): Promise<ConfigLoadResult> {
  const manager = configPath
    ? new ConfigManager(configPath)
    : defaultConfigManager;
  return manager.loadConfig();
}

/**
 * 便捷函数：获取当前配置
 */
export function getCurrentConfig(): UnifiedConfig | null {
  return defaultConfigManager.getCurrentConfig();
}

/**
 * 便捷函数：检查是否为优化模式
 */
export function isOptimizedMode(): boolean {
  return defaultConfigManager.isOptimizedMode();
}

/**
 * 便捷函数：加载优化配置 (Week 3 新增)
 */
export async function loadOptimizedConfig(): Promise<ConfigLoadResult> {
  return defaultConfigManager.loadOptimizedConfig();
}

/**
 * 便捷函数：加载分类数据 (Week 3 新增)
 */
export async function loadCategoryData(
  categoryIndex: number,
): Promise<CategoryLoadResult> {
  return defaultConfigManager.loadCategoryData(categoryIndex);
}

/**
 * 便捷函数：获取分类信息 (Week 3 新增)
 */
export function getCategoryInfo(categoryIndex: number) {
  return defaultConfigManager.getCategoryInfo(categoryIndex);
}

/**
 * 便捷函数：获取所有分类索引 (Week 3 新增)
 */
export function getAllCategoryIndexes(): number[] {
  return defaultConfigManager.getAllCategoryIndexes();
}

