// 性能优化相关的类型定义

export interface OptimizationOptions {
  enabled: boolean;
  previewCount: number; // 预览网站数量 (默认3)
  chunkSizeLimit: number; // 单个分类文件大小限制(KB) (默认100)
  enablePreload: boolean; // 是否启用预加载 (默认true)
}

export interface OptimizedMenuItem {
  name: string;
  href: string;
  icon: string;
  type: "single" | "tabs";
  categoryIndex: number; // 对应 categories/N.json
  siteCount: number; // 网站总数
  previewSites?: PreviewSite[]; // 预览网站数据
  submenu?: OptimizedSubMenuItem[];
}

export interface OptimizedSubMenuItem {
  name: string;
  href: string;
  icon: string;
  categoryIndex: number;
  siteCount: number;
  previewSites?: PreviewSite[];
}

export interface PreviewSite {
  title: string;
  description: string;
  url?: string;
  logo?: string;
}

export interface OptimizedBaseConfig {
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
    totalCategories: number;
    totalSites: number;
    previewCount: number;
    fileSizeKB: number;
    compressionRatio: number;
  };
}

export interface CategoryData {
  categoryIndex: number;
  categoryName: string;
  sites: Site[];
  metadata: {
    lastUpdated: string;
    siteCount: number;
    fileSizeKB: number;
  };
}

export interface Site {
  title: string;
  description: string;
  url?: string;
  logo?: string;
  advantages?: string[];
  features?: string[];
  details?: {
    intro?: string;
    pricing?: string;
    pros?: string[];
    cons?: string[];
    tips?: string[];
  };
  related?: RelatedSite[];
}

export interface RelatedSite {
  title: string;
  description: string;
  url?: string;
}

export interface CategoryFile {
  filename: string; // "0.json", "1.json", etc.
  content: CategoryData;
  sizeKB: number;
}

export interface OptimizedConfigResult {
  baseConfig: OptimizedBaseConfig;
  categoryFiles: CategoryFile[];
  optimization: {
    enabled: true;
    originalSizeKB: number;
    optimizedSizeKB: number;
    compressionRatio: number;
    totalCategories: number;
    totalSites: number;
    previewCount?: number;
    chunkSizeLimit?: number;
    enablePreload?: boolean;
  };
}

export interface TraditionalConfigResult {
  config: any; // 传统的完整配置
  optimization: {
    enabled: false;
  };
}

export type ConfigResult = OptimizedConfigResult | TraditionalConfigResult;

// API 请求/响应类型
export interface GenerateConfigRequest {
  menuFile: File;
  siteFile: File;
  siteInfo: {
    title: string;
    description: string;
    logoText: string;
  };
  optimization: OptimizationOptions;
}

export interface GenerateConfigResponse {
  success: boolean;
  data?: {
    downloadUrl: string;
    fileType: "json" | "zip";
    filename: string;
    optimization: {
      enabled: boolean;
      originalSizeKB?: number;
      optimizedSizeKB?: number;
      compressionRatio?: number;
      totalCategories?: number;
      totalSites?: number;
    };
  };
  error?: string;
}

// 验证规则
export interface ValidationRules {
  maxCategorySize: number; // KB
  maxSiteCount: number; // 每个分类最大网站数
  maxPreviewCount: number; // 最大预览网站数
  requiredFields: string[]; // 网站必填字段
}

export const DEFAULT_VALIDATION_RULES: ValidationRules = {
  maxCategorySize: 100,
  maxSiteCount: 50,
  maxPreviewCount: 5,
  requiredFields: ["title", "description"],
};

export const DEFAULT_OPTIMIZATION_OPTIONS: OptimizationOptions = {
  enabled: true,
  previewCount: 3,
  chunkSizeLimit: 100,
  enablePreload: true,
};

// 缓存相关类型
export interface CacheStatus {
  totalCategories: number;
  cachedCategories: number;
  cacheHitRate: number;
  totalSizeKB: number;
}

export interface LoadingState {
  categoryIndex: number;
  status: "idle" | "loading" | "loaded" | "error";
  error?: string;
  progress?: number;
}

// 性能监控类型
export interface PerformanceMetrics {
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  categoryLoadTime: Record<number, number>;
  cacheHitRate: number;
}

export interface OptimizationStats {
  enabled: boolean;
  configSizeReduction: number;
  loadTimeImprovement: number;
  memoryUsageReduction: number;
  userExperienceScore: number;
}
