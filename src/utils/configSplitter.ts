// 配置文件拆分工具
import type {
  OptimizationOptions,
  OptimizedBaseConfig,
  OptimizedMenuItem,
  CategoryData,
  CategoryFile,
  OptimizedConfigResult,
  Site,
  PreviewSite,
} from "../types/optimization";
import { DEFAULT_OPTIMIZATION_OPTIONS } from "../types/optimization";
import type { MenuTableRow, SiteTableRow } from "../types/tableImport";

/**
 * 将完整配置拆分为基础配置和分类文件
 */
export function splitConfig(
  menuData: MenuTableRow[],
  siteData: SiteTableRow[],
  siteInfo: { title: string; description: string; logoText: string },
  options: OptimizationOptions = DEFAULT_OPTIMIZATION_OPTIONS,
): OptimizedConfigResult {
  // 生成基础配置
  const baseConfig = generateBaseConfig(menuData, siteData, siteInfo, options);

  // 生成分类文件
  const categoryFiles = generateCategoryFiles(menuData, siteData, options);

  // 计算优化统计信息
  const optimization = calculateOptimizationStats(
    baseConfig,
    categoryFiles,
    menuData,
    siteData,
  );

  return {
    baseConfig,
    categoryFiles,
    optimization,
  };
}

/**
 * 生成基础配置文件
 */
function generateBaseConfig(
  menuData: MenuTableRow[],
  siteData: SiteTableRow[],
  siteInfo: { title: string; description: string; logoText: string },
  options: OptimizationOptions,
): OptimizedBaseConfig {
  // 按sortOrder排序菜单
  const sortedMenus = [...menuData].sort((a, b) => a.sortOrder - b.sortOrder);

  // 分离顶级菜单和子菜单
  const topMenus = sortedMenus.filter((menu) => !menu.parentMenuId);
  const subMenus = sortedMenus.filter((menu) => menu.parentMenuId);

  let categoryIndex = 0;

  // 生成menuItems
  const menuItems: OptimizedMenuItem[] = topMenus.map((topMenu) => {
    const children = subMenus
      .filter((sub) => sub.parentMenuId === topMenu.menuId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (children.length > 0) {
      // 有子菜单的情况
      const submenu = children.map((child) => {
        const childSites = getSitesForMenu(child.menuId, siteData);
        const previewSites = generatePreviewSites(
          childSites,
          options.previewCount,
        );

        return {
          name: child.menuName,
          href: `#${child.menuId}`,
          icon: child.menuIcon,
          categoryIndex: categoryIndex++,
          siteCount: childSites.length,
          previewSites,
        };
      });

      return {
        name: topMenu.menuName,
        href: `#${topMenu.menuId}`,
        icon: topMenu.menuIcon,
        type: "tabs" as const,
        categoryIndex: -1, // 父菜单不对应具体分类
        siteCount: submenu.reduce((sum, sub) => sum + sub.siteCount, 0),
        submenu,
      };
    } else {
      // 单级菜单的情况
      const menuSites = getSitesForMenu(topMenu.menuId, siteData);
      const previewSites = generatePreviewSites(
        menuSites,
        options.previewCount,
      );

      return {
        name: topMenu.menuName,
        href: `#${topMenu.menuId}`,
        icon: topMenu.menuIcon,
        type: "single" as const,
        categoryIndex: categoryIndex++,
        siteCount: menuSites.length,
        previewSites,
      };
    }
  });

  return {
    site: {
      title: siteInfo.title,
      description: siteInfo.description,
      logo: {
        text: siteInfo.logoText,
        href: "/",
      },
    },
    menuItems,
    optimization: {
      enabled: true,
      totalCategories: categoryIndex,
      totalSites: siteData.length,
      previewCount: options.previewCount,
      fileSizeKB: 0, // 将在后面计算
      compressionRatio: 0, // 将在后面计算
    },
  };
}

/**
 * 生成分类文件
 */
function generateCategoryFiles(
  menuData: MenuTableRow[],
  siteData: SiteTableRow[],
  options: OptimizationOptions,
): CategoryFile[] {
  const categoryFiles: CategoryFile[] = [];
  const sortedMenus = [...menuData].sort((a, b) => a.sortOrder - b.sortOrder);

  // 分离顶级菜单和子菜单
  const topMenus = sortedMenus.filter((menu) => !menu.parentMenuId);
  const subMenus = sortedMenus.filter((menu) => menu.parentMenuId);

  let categoryIndex = 0;

  topMenus.forEach((topMenu) => {
    const children = subMenus
      .filter((sub) => sub.parentMenuId === topMenu.menuId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (children.length > 0) {
      // 有子菜单的情况，为每个子菜单生成分类文件
      children.forEach((child) => {
        const sites = getSitesForMenu(child.menuId, siteData);
        const categoryData = createCategoryData(
          categoryIndex,
          child.menuName,
          sites,
        );
        const categoryFile = createCategoryFile(categoryIndex, categoryData);

        categoryFiles.push(categoryFile);
        categoryIndex++;
      });
    } else {
      // 单级菜单的情况
      const sites = getSitesForMenu(topMenu.menuId, siteData);
      const categoryData = createCategoryData(
        categoryIndex,
        topMenu.menuName,
        sites,
      );
      const categoryFile = createCategoryFile(categoryIndex, categoryData);

      categoryFiles.push(categoryFile);
      categoryIndex++;
    }
  });

  return categoryFiles;
}

/**
 * 为指定菜单获取网站数据
 */
function getSitesForMenu(menuId: string, siteData: SiteTableRow[]): Site[] {
  const menuSites = siteData
    .filter((site) => site.menuId === menuId)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  return menuSites.map((siteRow) => convertSiteRowToSite(siteRow));
}

/**
 * 转换网站表格行为网站对象
 */
function convertSiteRowToSite(siteRow: SiteTableRow): Site {
  const site: Site = {
    title: siteRow.title,
    description: siteRow.description,
  };

  // 可选字段
  if (siteRow.url) site.url = siteRow.url;
  if (siteRow.logo) site.logo = siteRow.logo;

  // 数组字段（分号分隔）
  if (siteRow.advantages) {
    site.advantages = siteRow.advantages
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s);
  }
  if (siteRow.features) {
    site.features = siteRow.features
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s);
  }

  // 详细信息
  const details: any = {};
  if (siteRow.intro) details.intro = siteRow.intro;
  if (siteRow.pricing) details.pricing = siteRow.pricing;
  if (siteRow.pros) {
    details.pros = siteRow.pros
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s);
  }
  if (siteRow.cons) {
    details.cons = siteRow.cons
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s);
  }
  if (siteRow.tips) {
    details.tips = siteRow.tips
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s);
  }

  if (Object.keys(details).length > 0) {
    site.details = details;
  }

  // 相关网站
  if (siteRow.relatedTitles && siteRow.relatedDescriptions) {
    const titles = siteRow.relatedTitles
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s);
    const descriptions = siteRow.relatedDescriptions
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s);

    if (titles.length === descriptions.length && titles.length > 0) {
      site.related = titles.map((title, index) => ({
        title,
        description: descriptions[index],
      }));
    }
  }

  return site;
}

/**
 * 生成预览网站数据
 */
function generatePreviewSites(
  sites: Site[],
  previewCount: number,
): PreviewSite[] {
  return sites.slice(0, previewCount).map((site) => ({
    title: site.title,
    description: site.description,
    url: site.url,
    logo: site.logo,
  }));
}

/**
 * 创建分类数据对象
 */
function createCategoryData(
  categoryIndex: number,
  categoryName: string,
  sites: Site[],
): CategoryData {
  return {
    categoryIndex,
    categoryName,
    sites,
    metadata: {
      lastUpdated: new Date().toISOString(),
      siteCount: sites.length,
      fileSizeKB: Math.round(JSON.stringify(sites).length / 1024),
    },
  };
}

/**
 * 创建分类文件对象
 */
function createCategoryFile(
  categoryIndex: number,
  categoryData: CategoryData,
): CategoryFile {
  const content = JSON.stringify(categoryData, null, 2);

  return {
    filename: `${categoryIndex}.json`,
    content: categoryData,
    sizeKB: Math.round(content.length / 1024),
  };
}

/**
 * 计算优化统计信息
 */
function calculateOptimizationStats(
  baseConfig: OptimizedBaseConfig,
  categoryFiles: CategoryFile[],
  menuData: MenuTableRow[],
  siteData: SiteTableRow[],
): OptimizedConfigResult["optimization"] {
  // 计算原始大小（模拟传统完整配置）
  const originalConfig = {
    site: baseConfig.site,
    menuItems: baseConfig.menuItems.map((item) => ({
      ...item,
      sites: [], // 这里应该包含完整的网站数据
    })),
  };

  const originalSizeKB =
    Math.round(
      JSON.stringify({
        ...originalConfig,
        // 模拟包含所有网站数据
        totalSites: siteData.length,
      }).length / 1024,
    ) + categoryFiles.reduce((sum, file) => sum + file.sizeKB, 0);

  const optimizedSizeKB = Math.round(JSON.stringify(baseConfig).length / 1024);
  const compressionRatio = Math.round(
    (1 - optimizedSizeKB / originalSizeKB) * 100,
  );

  return {
    enabled: true,
    originalSizeKB,
    optimizedSizeKB,
    compressionRatio,
    totalCategories: categoryFiles.length,
    totalSites: siteData.length,
  };
}
