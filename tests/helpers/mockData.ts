/**
 * 测试辅助函数 - 创建 mock 数据
 */

import type { OptimizedConfig, UnifiedConfig, OptimizedMenuItem, UnifiedMenuItem } from '../../src/types/lazyLoading';

/**
 * 创建完整的 OptimizedMenuItem
 */
export function createOptimizedMenuItem(partial: Partial<OptimizedMenuItem> & { name: string }): OptimizedMenuItem {
  return {
    name: partial.name,
    href: partial.href || `/${partial.name.toLowerCase().replace(/\s+/g, '-')}`,
    icon: partial.icon || 'default-icon',
    type: partial.type || 'single',
    categoryIndex: partial.categoryIndex ?? 0,
    siteCount: partial.siteCount ?? 0,
    previewSites: partial.previewSites || [],
    submenu: partial.submenu,
  };
}

/**
 * 创建完整的 UnifiedMenuItem
 */
export function createUnifiedMenuItem(partial: Partial<UnifiedMenuItem> & { name: string }): UnifiedMenuItem {
  return {
    name: partial.name,
    href: partial.href || `/${partial.name.toLowerCase().replace(/\s+/g, '-')}`,
    icon: partial.icon || 'default-icon',
    type: partial.type || 'single',
    sites: partial.sites,
    submenu: partial.submenu,
    categoryIndex: partial.categoryIndex,
    siteCount: partial.siteCount,
    previewSites: partial.previewSites,
    isLazyLoaded: partial.isLazyLoaded,
  };
}

/**
 * 创建完整的 OptimizedConfig
 */
export function createOptimizedConfig(partial?: Partial<OptimizedConfig>): OptimizedConfig {
  return {
    site: partial?.site || {
      title: 'Test Site',
      description: 'Test Description',
      logo: { text: 'TS', href: '/' },
    },
    menuItems: partial?.menuItems || [],
    optimization: partial?.optimization || {
      enabled: true,
      totalCategories: 0,
      totalSites: 0,
      previewCount: 3,
      fileSizeKB: 50,
      compressionRatio: 0.5,
    },
  };
}

/**
 * 创建完整的 UnifiedConfig
 */
export function createUnifiedConfig(partial?: Partial<UnifiedConfig>): UnifiedConfig {
  return {
    site: partial?.site || {
      title: 'Test Site',
      description: 'Test Description',
      logo: { text: 'TS', href: '/' },
    },
    menuItems: partial?.menuItems || [],
    isOptimized: partial?.isOptimized ?? false,
    optimization: partial?.optimization,
  };
}
