/**
 * ConfigConverter - 配置格式转换工具
 * 将传统配置格式转换为优化格式
 */

import type { SiteConfig, MenuItem, SubMenuItem, Site } from "../types/config";
import type {
  OptimizedBaseConfig,
  OptimizedMenuItem,
  OptimizedSubMenuItem,
  CategoryFile,
  OptimizedConfigResult,
} from "../types/optimization";

/**
 * 配置转换器
 */
export class ConfigConverter {
  /**
   * 将传统配置转换为优化格式
   */
  static convertToOptimized(
    traditionalConfig: SiteConfig,
    options: {
      previewCount?: number;
      chunkSizeLimit?: number;
      enablePreload?: boolean;
    } = {},
  ): OptimizedConfigResult {
    const {
      previewCount = 3,
      chunkSizeLimit = 100,
      enablePreload = true,
    } = options;

    console.log("🔄 ConfigConverter: 开始转换传统配置为优化格式...");

    // 1. 收集所有分类和网站数据
    const categories: Array<{
      categoryIndex: number;
      categoryName: string;
      sites: Site[];
      menuType: "single" | "tabs";
      parentName?: string;
    }> = [];

    let categoryIndex = 0;

    // 处理菜单项
    traditionalConfig.menuItems.forEach((item) => {
      if (item.type === "single" && item.sites && item.sites.length > 0) {
        // 单级菜单
        categories.push({
          categoryIndex: categoryIndex++,
          categoryName: item.name,
          sites: item.sites,
          menuType: "single",
        });
      } else if (item.type === "tabs" && item.submenu) {
        // 多级菜单
        item.submenu.forEach((sub) => {
          if (sub.sites && sub.sites.length > 0) {
            categories.push({
              categoryIndex: categoryIndex++,
              categoryName: sub.name,
              sites: sub.sites,
              menuType: "tabs",
              parentName: item.name,
            });
          } else {
            // 空分类也要创建索引
            categories.push({
              categoryIndex: categoryIndex++,
              categoryName: sub.name,
              sites: [],
              menuType: "tabs",
              parentName: item.name,
            });
          }
        });
      }
    });

    console.log(
      `📊 发现 ${categories.length} 个分类，总共 ${categories.reduce((sum, cat) => sum + cat.sites.length, 0)} 个网站`,
    );

    // 2. 生成优化的菜单结构
    const optimizedMenuItems: OptimizedMenuItem[] = [];
    let currentCategoryIndex = 0;

    traditionalConfig.menuItems.forEach((item) => {
      if (item.type === "single") {
        const category = categories.find(
          (cat) => cat.categoryName === item.name,
        );
        const previewSites = category
          ? this.generatePreviewSites(category.sites, previewCount)
          : [];

        optimizedMenuItems.push({
          name: item.name,
          href: item.href,
          icon: item.icon,
          type: "single",
          categoryIndex: category ? category.categoryIndex : -1,
          siteCount: category ? category.sites.length : 0,
          previewSites,
        });
      } else if (item.type === "tabs" && item.submenu) {
        const submenuItems: OptimizedSubMenuItem[] = [];
        let totalSites = 0;

        item.submenu.forEach((sub) => {
          const category = categories.find(
            (cat) =>
              cat.categoryName === sub.name && cat.parentName === item.name,
          );
          const previewSites = category
            ? this.generatePreviewSites(category.sites, previewCount)
            : [];
          const siteCount = category ? category.sites.length : 0;
          totalSites += siteCount;

          submenuItems.push({
            name: sub.name,
            href: sub.href,
            icon: sub.icon,
            categoryIndex: category ? category.categoryIndex : -1,
            siteCount,
            previewSites,
          });
        });

        optimizedMenuItems.push({
          name: item.name,
          href: item.href,
          icon: item.icon,
          type: "tabs",
          categoryIndex: -1, // 父菜单不对应具体分类
          siteCount: totalSites,
          previewSites: [], // 父菜单没有预览数据
          submenu: submenuItems,
        });
      }
    });

    // 3. 生成基础配置
    const baseConfig: OptimizedBaseConfig = {
      site: traditionalConfig.site,
      menuItems: optimizedMenuItems,
      optimization: {
        enabled: true,
        totalCategories: categories.length,
        totalSites: categories.reduce((sum, cat) => sum + cat.sites.length, 0),
        previewCount,
        fileSizeKB: 0, // 将在后面计算
        compressionRatio: 0, // 将在后面计算
      },
    };

    // 4. 生成分类文件
    const categoryFiles: CategoryFile[] = categories.map((category) => {
      const content = {
        categoryIndex: category.categoryIndex,
        categoryName: category.categoryName,
        sites: category.sites,
        metadata: {
          lastUpdated: new Date().toISOString(),
          siteCount: category.sites.length,
          fileSizeKB: Math.ceil(JSON.stringify(category.sites).length / 1024),
        },
      };
      return {
        filename: `${category.categoryIndex}.json`,
        content: content,
        sizeKB: Math.ceil(JSON.stringify(content).length / 1024),
      };
    });

    // 5. 计算优化统计
    const originalSize = JSON.stringify(traditionalConfig).length;
    const optimizedSize =
      JSON.stringify(baseConfig).length +
      categoryFiles.reduce(
        (sum, file) => sum + JSON.stringify(file.content).length,
        0,
      );

    const compressionRatio = Math.round(
      (1 - optimizedSize / originalSize) * 100,
    );

    // 更新统计信息
    baseConfig.optimization.fileSizeKB = Math.ceil(optimizedSize / 1024);
    baseConfig.optimization.compressionRatio = compressionRatio;

    console.log("✅ ConfigConverter: 转换完成", {
      categories: categories.length,
      totalSites: baseConfig.optimization.totalSites,
      originalSizeKB: Math.ceil(originalSize / 1024),
      optimizedSizeKB: baseConfig.optimization.fileSizeKB,
      compressionRatio: `${compressionRatio}%`,
    });

    return {
      baseConfig,
      categoryFiles,
      optimization: {
        enabled: true,
        totalCategories: categories.length,
        totalSites: baseConfig.optimization.totalSites,
        originalSizeKB: Math.ceil(originalSize / 1024),
        optimizedSizeKB: baseConfig.optimization.fileSizeKB,
        compressionRatio,
        previewCount,
        chunkSizeLimit,
        enablePreload,
      },
    };
  }

  /**
   * 生成预览网站数据
   */
  private static generatePreviewSites(sites: Site[], count: number): Site[] {
    return sites.slice(0, count).map((site) => ({
      title: site.title,
      description: site.description,
      url: site.url,
      logo: site.logo,
    }));
  }

  /**
   * 验证传统配置格式
   */
  static validateTraditionalConfig(config: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!config.site) {
      errors.push("缺少 site 配置");
    }

    if (!config.menuItems || !Array.isArray(config.menuItems)) {
      errors.push("缺少 menuItems 或格式错误");
    } else {
      config.menuItems.forEach((item: any, index: number) => {
        if (!item.name) {
          errors.push(`菜单项 ${index} 缺少 name 字段`);
        }
        if (!item.type || !["single", "tabs"].includes(item.type)) {
          errors.push(`菜单项 ${index} 的 type 字段无效`);
        }
        if (
          item.type === "single" &&
          (!item.sites || !Array.isArray(item.sites))
        ) {
          errors.push(`单级菜单项 ${index} 缺少 sites 数组`);
        }
        if (
          item.type === "tabs" &&
          (!item.submenu || !Array.isArray(item.submenu))
        ) {
          errors.push(`多级菜单项 ${index} 缺少 submenu 数组`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 生成转换报告
   */
  static generateConversionReport(result: OptimizedConfigResult): string {
    const { baseConfig, categoryFiles, optimization } = result;

    return `# 配置转换报告

## 📊 转换统计

- **总分类数**: ${optimization.totalCategories}
- **总网站数**: ${optimization.totalSites}
- **原始大小**: ${optimization.originalSizeKB}KB
- **优化后大小**: ${optimization.optimizedSizeKB}KB
- **压缩比例**: ${optimization.compressionRatio}%
- **预览数量**: ${optimization.previewCount}

## 📁 文件结构

### 基础配置文件 (config.json)
- 大小: ${Math.ceil(JSON.stringify(baseConfig).length / 1024)}KB
- 菜单项: ${baseConfig.menuItems.length}
- 懒加载项: ${baseConfig.menuItems.filter((item) => item.categoryIndex >= 0 || (item.submenu && item.submenu.some((sub) => sub.categoryIndex >= 0))).length}

### 分类文件 (categories/*.json)
${categoryFiles
  .map(
    (file) =>
      `- ${file.filename}: ${file.content.siteCount} 个网站, ${file.content.metadata.fileSizeKB}KB`,
  )
  .join("\n")}

## 🎯 优化效果

1. **首次加载优化**: 只加载基础配置和预览数据
2. **按需加载**: 用户点击时才加载完整分类数据
3. **缓存友好**: 分类数据可以独立缓存
4. **网络优化**: 减少不必要的数据传输

## 📋 部署说明

1. 将 \`config.json\` 放到 \`public/\` 目录
2. 将 \`categories/\` 文件夹放到 \`public/\` 目录
3. 确保前端支持懒加载功能
4. 配置CDN加速分类文件访问

---
*转换时间: ${new Date().toLocaleString()}*
`;
  }
}

/**
 * 便捷函数：转换配置文件
 */
export async function convertConfigFile(
  inputPath: string,
  options?: {
    previewCount?: number;
    chunkSizeLimit?: number;
    enablePreload?: boolean;
  },
): Promise<OptimizedConfigResult> {
  try {
    // 加载传统配置
    const response = await fetch(inputPath);
    if (!response.ok) {
      throw new Error(
        `无法加载配置文件: ${response.status} ${response.statusText}`,
      );
    }

    const traditionalConfig = (await response.json()) as SiteConfig;

    // 验证配置格式
    const validation =
      ConfigConverter.validateTraditionalConfig(traditionalConfig);
    if (!validation.isValid) {
      throw new Error(`配置文件格式错误: ${validation.errors.join(", ")}`);
    }

    // 执行转换
    return ConfigConverter.convertToOptimized(traditionalConfig, options);
  } catch (error) {
    console.error("❌ 配置转换失败:", error);
    throw error;
  }
}

/**
 * 便捷函数：生成转换报告
 */
export function generateReport(result: OptimizedConfigResult): string {
  return ConfigConverter.generateConversionReport(result);
}
