/**
 * 懒加载相关类型定义
 * Week 2: 前端懒加载机制实现
 */

import type { Site, MenuItem } from "./config";

// ============ 优化配置类型 ============

/**
 * 优化配置的菜单项 (包含预览数据和懒加载信息)
 */
export interface OptimizedMenuItem {
  name: string;
  href: string;
  icon: string;
  type: "single" | "tabs";

  // 懒加载相关字段
  categoryIndex: number; // 分类文件索引
  siteCount: number; // 总网站数量
  previewSites: Site[]; // 预览网站 (前N个)

  // 可选的子菜单 (如果是tabs类型)
  submenu?: OptimizedSubMenuItem[];
}

/**
 * 优化配置的子菜单项
 */
export interface OptimizedSubMenuItem {
  name: string;
  href: string;
  icon: string;
  categoryIndex: number;
  siteCount: number;
  previewSites: Site[];
}

/**
 * 优化配置的主配置文件
 */
export interface OptimizedConfig {
  site: {
    title: string;
    description: string;
    logo: {
      text: string;
      href: string;
    };
  };
  menuItems: OptimizedMenuItem[];
  optimization: {
    enabled: true;
    totalCategories: number; // 总分类数量
    totalSites: number; // 总网站数量
    previewCount: number; // 每个分类的预览数量
    fileSizeKB: number; // 主配置文件大小
    compressionRatio: number; // 压缩比例
  };
}

/**
 * 分类数据文件
 */
export interface CategoryData {
  categoryIndex: number; // 分类索引
  categoryName: string; // 分类名称
  sites: Site[]; // 完整的网站数据
  metadata: {
    siteCount: number; // 网站数量
    fileSizeKB: number; // 文件大小
    lastModified?: string; // 最后修改时间
  };
}

// ============ 统一配置类型 ============

/**
 * 统一的配置类型 (支持传统和优化两种格式)
 */
export type UnifiedConfig = {
  site: {
    title: string;
    description: string;
    logo: {
      text: string;
      href: string;
    };
  };
  menuItems: UnifiedMenuItem[];
  isOptimized: boolean; // 标识是否为优化配置
  optimization?: {
    enabled: boolean;
    totalCategories: number;
    totalSites: number;
    previewCount: number;
    fileSizeKB: number;
    compressionRatio: number;
  };
};

/**
 * 统一的菜单项类型
 */
export type UnifiedMenuItem = {
  name: string;
  href: string;
  icon: string;
  type: "single" | "tabs";

  // 传统配置字段
  sites?: Site[];
  submenu?: UnifiedSubMenuItem[];

  // 优化配置字段
  categoryIndex?: number;
  siteCount?: number;
  previewSites?: Site[];
  isLazyLoaded?: boolean; // 标识是否需要懒加载
};

/**
 * 统一的子菜单项类型
 */
export type UnifiedSubMenuItem = {
  name: string;
  href: string;
  icon: string;

  // 传统配置字段
  sites?: Site[];

  // 优化配置字段
  categoryIndex?: number;
  siteCount?: number;
  previewSites?: Site[];
  isLazyLoaded?: boolean;
};

// ============ 懒加载状态管理 ============

/**
 * 懒加载状态
 */
export type LoadingState = "idle" | "loading" | "success" | "error";

/**
 * 分类加载状态
 */
export interface CategoryLoadState {
  categoryIndex: number;
  state: LoadingState;
  data?: CategoryData;
  error?: string;
  loadedAt?: Date;
  retryCount?: number;
}

/**
 * 懒加载管理器状态
 */
export interface LazyLoadManager {
  loadedCategories: Map<number, CategoryData>;
  loadingStates: Map<number, CategoryLoadState>;
  cacheExpiry: number; // 缓存过期时间 (毫秒)
  maxRetries: number; // 最大重试次数
}

// ============ 配置加载器 ============

/**
 * 配置加载结果
 */
export interface ConfigLoadResult {
  success: boolean;
  config?: UnifiedConfig;
  error?: string;
  isOptimized: boolean;
  loadTime: number; // 加载时间 (毫秒)
  detection?: ConfigDetectionResult; // 检测结果
}

/**
 * 分类数据加载结果
 */
export interface CategoryLoadResult {
  success: boolean;
  data?: CategoryData;
  error?: string;
  fromCache: boolean;
  loadTime: number;
  cacheSource?: "memory" | "localStorage" | "network"; // 缓存来源
}

// ============ 性能监控 ============

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  configLoadTime: number; // 配置加载时间
  firstRenderTime: number; // 首次渲染时间
  categoryLoadTimes: number[]; // 各分类加载时间
  cacheHitRate: number; // 缓存命中率
  errorRate: number; // 错误率
  totalDataSize: number; // 总数据大小
  compressedSize: number; // 压缩后大小
}

/**
 * 加载事件
 */
export interface LoadEvent {
  type: "config" | "category";
  categoryIndex?: number;
  startTime: number;
  endTime: number;
  success: boolean;
  error?: string;
  fromCache?: boolean;
  dataSize?: number;
}

// ============ 工具类型 ============

/**
 * 配置格式类型
 */
export type ConfigFormat = "traditional" | "optimized" | "unknown";

/**
 * 配置检测结果
 */
export interface ConfigDetectionResult {
  isOptimized: boolean;
  hasOptimizationField: boolean;
  hasCategoryIndexes: boolean;
  hasPreviewSites?: boolean;
  estimatedCategories: number;
  confidence: number; // 检测置信度 (0-1)
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  maxSize: number; // 最大缓存大小 (MB)
  expiry: number; // 过期时间 (毫秒)
  enablePersistence: boolean; // 是否启用持久化
  storageKey: string; // 存储键名
}

/**
 * 懒加载配置
 */
export interface LazyLoadConfig {
  preloadNext: boolean; // 是否预加载下一个分类
  retryAttempts: number; // 重试次数
  retryDelay: number; // 重试延迟 (毫秒)
  timeout: number; // 请求超时 (毫秒)
  enableCache: boolean; // 是否启用缓存
  cacheConfig: CacheConfig; // 缓存配置
}
