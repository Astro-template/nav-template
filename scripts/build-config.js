/**
 * 构建时配置转换脚本
 * 从 CSV 文件生成优化配置
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Papa from "papaparse";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const srcDataDir = path.join(projectRoot, "src", "data");
const staticDir = path.join(projectRoot, "static");

/**
 * 读取CSV文件
 */
function readCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV文件不存在: ${filePath}`);
  }

  const csvContent = fs.readFileSync(filePath, "utf8");
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0) {
    console.warn("⚠️ CSV解析警告:", result.errors);
  }

  return result.data;
}

/**
 * 获取网站基本信息
 * 直接返回配置，无需额外文件
 */
function getSiteInfo() {
  return {
    title: "Affiliate导航",
    description: "专业的Affiliate营销导航网站",
    logoText: "Affiliate导航",
  };
}

/**
 * 生成优化配置
 */
function generateOptimizedConfig(menuData, siteData, siteInfo) {
  console.log("🏗️ 构建菜单结构...");

  // 1. 构建菜单结构
  const menuItems = buildMenuStructure(menuData, siteData);

  // 2. 生成分类文件
  console.log("📁 生成分类文件...");
  const categoryFiles = generateCategoryFiles(menuItems);

  // 3. 生成基础配置
  console.log("📄 生成基础配置...");
  const baseConfig = generateBaseConfig(
    menuItems,
    siteInfo,
    categoryFiles.length,
  );

  // 4. 计算优化统计
  const optimization = calculateOptimization(menuItems, categoryFiles);
  baseConfig.optimization = optimization;

  return {
    baseConfig,
    categoryFiles,
    optimization,
  };
}

/**
 * 构建菜单结构
 */
function buildMenuStructure(menuData, siteData) {
  // 按menuType和parentMenuId分组
  const topLevelMenus = menuData.filter((menu) => !menu.parentMenuId);
  const subMenus = menuData.filter((menu) => menu.parentMenuId);

  // 按sortOrder排序
  topLevelMenus.sort((a, b) => a.sortOrder - b.sortOrder);

  return topLevelMenus.map((menu) => {
    const menuItem = {
      name: menu.menuName,
      icon: menu.menuIcon,
      categoryIndex: null, // 将在后面分配
    };

    // 如果是tabs类型，添加子菜单
    if (menu.menuType === "tabs") {
      const children = subMenus
        .filter((sub) => sub.parentMenuId === menu.menuId)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      menuItem.submenu = children.map((child) => ({
        name: child.menuName,
        icon: child.menuIcon,
        categoryIndex: null, // 将在后面分配
      }));
    }

    return menuItem;
  });
}

/**
 * 生成分类文件
 */
function generateCategoryFiles(menuItems) {
  const categoryFiles = [];
  let categoryIndex = 0;

  menuItems.forEach((item) => {
    if (item.submenu) {
      // 有子菜单的情况
      item.submenu.forEach((subItem) => {
        subItem.categoryIndex = categoryIndex;
        const sites = getSitesForMenu(subItem.name);

        categoryFiles.push({
          filename: `${categoryIndex}.json`,
          content: {
            categoryId: categoryIndex,
            categoryName: subItem.name,
            sites: sites,
          },
        });

        categoryIndex++;
      });
    } else {
      // 单级菜单
      item.categoryIndex = categoryIndex;
      const sites = getSitesForMenu(item.name);

      categoryFiles.push({
        filename: `${categoryIndex}.json`,
        content: {
          categoryId: categoryIndex,
          categoryName: item.name,
          sites: sites,
        },
      });

      categoryIndex++;
    }
  });

  return categoryFiles;
}

/**
 * 根据菜单名称获取对应的网站数据
 * 需要访问全局的siteData
 */
let globalSiteData = [];

function setSiteData(siteData) {
  globalSiteData = siteData;
}

function getSitesForMenu(menuName) {
  // 根据菜单名称找到对应的menuId
  const menuIdMap = {
    追踪系统: "tracking",
    SPY服务: "spy",
    PoP流量: "traffic-pop",
    原生广告流量: "traffic-native",
    Push流量: "traffic-push",
    社交流量: "traffic-social",
    搜索流量: "traffic-search",
    Adult流量: "traffic-adult",
    综合性联盟: "networks",
    CPA联盟: "cpa",
    广告论坛: "forum",
    SEO工具: "seo",
    邮件营销: "email",
    电商平台: "ecommerce",
    联盟后台: "backend",
    域名注册: "domain",
    云服务器: "hosting",
    独立服务器: "dedicated",
    支付服务: "payment",
    VPS代理: "vps",
    落地页工具: "tools",
  };

  const menuId = menuIdMap[menuName];
  if (!menuId) {
    console.warn(`⚠️ 未找到菜单 "${menuName}" 对应的menuId`);
    return [];
  }

  // 过滤出属于该menuId的网站
  const sites = globalSiteData.filter((site) => site.menuId === menuId);

  // 转换为标准格式
  return sites.map((site) => ({
    title: site.title || "",
    description: site.description || "",
    url: site.url || "",
    logo: site.logo || "",
    advantages:
      site.advantages && typeof site.advantages === "string"
        ? site.advantages.split(";")
        : [],
    features:
      site.features && typeof site.features === "string"
        ? site.features.split(";")
        : [],
    details: {
      intro: site.intro || "",
      pricing: site.pricing || "",
      pros:
        site.pros && typeof site.pros === "string" ? site.pros.split(";") : [],
      cons:
        site.cons && typeof site.cons === "string" ? site.cons.split(";") : [],
      tips:
        site.tips && typeof site.tips === "string" ? site.tips.split(";") : [],
    },
    related: parseRelatedSites(site.relatedTitles, site.relatedDescriptions),
  }));
}

/**
 * 解析相关网站数据
 */
function parseRelatedSites(titles, descriptions) {
  if (!titles || !descriptions) return [];

  const titleArray = titles.split(";");
  const descArray = descriptions.split(";");

  return titleArray
    .map((title, index) => ({
      title: title.trim(),
      description: (descArray[index] || "").trim(),
    }))
    .filter((item) => item.title);
}

/**
 * 生成基础配置
 */
function generateBaseConfig(menuItems, siteInfo, totalCategories) {
  return {
    site: {
      title: siteInfo.title,
      description: siteInfo.description,
      logo: {
        text: siteInfo.logoText,
      },
    },
    menuItems: menuItems,
    optimization: {
      enabled: true,
      version: "2.0",
      totalCategories: totalCategories,
      totalSites: 0, // 将在后面计算
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * 计算优化统计
 */
function calculateOptimization(menuItems, categoryFiles) {
  const totalSites = categoryFiles.reduce(
    (sum, file) => sum + file.content.sites.length,
    0,
  );

  return {
    enabled: true,
    version: "2.0",
    totalCategories: categoryFiles.length,
    totalSites: totalSites,
    originalSizeKB: Math.round(totalSites * 0.5), // 估算
    optimizedSizeKB: Math.round(categoryFiles.length * 0.1), // 估算
    compressionRatio: 80, // 估算
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 转换菜单数据
 */
function transformMenuData(menuRows) {
  return menuRows.map((row) => ({
    menuId: row.menuId || row["菜单ID"] || "",
    menuName: row.menuName || row["菜单名称"] || "",
    menuIcon: row.menuIcon || row["菜单图标"] || "mdi:folder",
    menuType: row.menuType || row["菜单类型"] || "single",
    parentMenuId: row.parentMenuId || row["父菜单ID"] || "",
    sortOrder: parseInt(row.sortOrder || row["排序"] || "0"),
  }));
}

/**
 * 转换网站数据
 */
function transformSiteData(siteRows) {
  return siteRows.map((row) => ({
    menuId: row.menuId || row["菜单ID"] || "",
    title: row.title || row["网站标题"] || "",
    description: row.description || row["网站描述"] || "",
    url: row.url || row["网站链接"] || "",
    logo: row.logo || row["网站图标"] || "",
    advantages: parseArrayField(row.advantages || row["优势"] || ""),
    features: parseArrayField(row.features || row["功能特点"] || ""),
    details: parseDetailsField(row),
    related: parseRelatedField(row),
  }));
}

/**
 * 解析数组字段 (用分号分隔)
 */
function parseArrayField(value) {
  if (!value || typeof value !== "string") return [];
  return value
    .split(";")
    .map((item) => item.trim())
    .filter((item) => item);
}

/**
 * 解析详细信息字段
 */
function parseDetailsField(row) {
  const details = {};

  if (row.intro || row["详细介绍"]) {
    details.intro = row.intro || row["详细介绍"];
  }

  if (row.pricing || row["价格信息"]) {
    details.pricing = row.pricing || row["价格信息"];
  }

  if (row.pros || row["优点"]) {
    details.pros = parseArrayField(row.pros || row["优点"]);
  }

  if (row.cons || row["缺点"]) {
    details.cons = parseArrayField(row.cons || row["缺点"]);
  }

  if (row.tips || row["使用技巧"]) {
    details.tips = parseArrayField(row.tips || row["使用技巧"]);
  }

  return Object.keys(details).length > 0 ? details : undefined;
}

/**
 * 解析相关网站字段
 */
function parseRelatedField(row) {
  const relatedStr = row.related || row["相关网站"] || "";
  if (!relatedStr) return [];

  try {
    // 尝试解析JSON格式
    return JSON.parse(relatedStr);
  } catch {
    // 如果不是JSON，按分号分隔处理
    return relatedStr
      .split(";")
      .map((item) => {
        const parts = item.trim().split(":");
        return {
          title: parts[0] || "",
          description: parts[1] || "",
        };
      })
      .filter((item) => item.title);
  }
}

/**
 * 主要的配置生成流程
 */
async function runConfigGeneration() {
  console.log("🔄 开始从CSV生成优化配置...");

  try {
    // 1. 读取源数据
    const menuPath = path.join(srcDataDir, "menu.csv");
    const sitesPath = path.join(srcDataDir, "sites.csv");

    console.log("📖 读取CSV文件...");
    const menuRows = readCSV(menuPath);
    const siteRows = readCSV(sitesPath);
    const siteInfo = getSiteInfo();

    console.log(`   - 菜单数据: ${menuRows.length} 条`);
    console.log(`   - 网站数据: ${siteRows.length} 条`);

    // 2. 转换数据格式
    console.log("🔄 转换数据格式...");
    const menuData = transformMenuData(menuRows);
    // 注意：这里不再使用 transformSiteData，直接使用原始数据
    // const siteData = transformSiteData(siteRows);

    // 设置全局网站数据供后续使用（使用原始CSV数据）
    setSiteData(siteRows);

    // 3. 生成优化配置
    console.log("⚡ 生成优化配置...");
    const result = generateOptimizedConfig(menuData, siteRows, siteInfo);

    // 4. 确保static目录存在
    if (!fs.existsSync(staticDir)) {
      fs.mkdirSync(staticDir, { recursive: true });
      console.log("📁 创建目录: static/");
    }

    // 5. 写入基础配置文件
    const configPath = path.join(staticDir, "config.json");
    fs.writeFileSync(configPath, JSON.stringify(result.baseConfig, null, 2));
    console.log("✅ 生成 static/config.json");

    // 6. 创建categories目录并写入分类文件
    const categoriesDir = path.join(staticDir, "categories");
    if (!fs.existsSync(categoriesDir)) {
      fs.mkdirSync(categoriesDir, { recursive: true });
      console.log("📁 创建目录: static/categories/");
    }

    result.categoryFiles.forEach((file) => {
      const filePath = path.join(categoriesDir, file.filename);
      fs.writeFileSync(filePath, JSON.stringify(file.content, null, 2));
      console.log(`✅ 生成 static/categories/${file.filename}`);
    });

    // 7. 显示统计信息
    console.log("🎉 优化配置生成完成！");
    console.log("📊 统计信息:");
    console.log(`   - 总分类数: ${result.optimization.totalCategories}`);
    console.log(`   - 总网站数: ${result.optimization.totalSites}`);
    console.log(`   - 原始大小: ${result.optimization.originalSizeKB}KB`);
    console.log(`   - 优化后大小: ${result.optimization.optimizedSizeKB}KB`);
    console.log(`   - 压缩比例: ${result.optimization.compressionRatio}%`);
  } catch (error) {
    console.error("❌ 配置生成失败:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * 检查CSV文件是否存在
 */
function checkCSVFiles() {
  const menuPath = path.join(srcDataDir, "menu.csv");
  const sitesPath = path.join(srcDataDir, "sites.csv");

  const menuExists = fs.existsSync(menuPath);
  const sitesExists = fs.existsSync(sitesPath);

  if (!menuExists || !sitesExists) {
    console.log("ℹ️ CSV文件检查:");
    console.log(`   - menu.csv: ${menuExists ? "✅ 存在" : "❌ 不存在"}`);
    console.log(`   - sites.csv: ${sitesExists ? "✅ 存在" : "❌ 不存在"}`);

    if (!menuExists || !sitesExists) {
      console.log("");
      console.log("📋 请创建以下CSV文件:");
      console.log("   - src/data/menu.csv (菜单配置)");
      console.log("   - src/data/sites.csv (网站数据)");
      return false;
    }
  }

  return true;
}

/**
 * 主函数
 */
async function main() {
  console.log("🚀 构建时配置生成器");

  // 检查CSV文件
  if (!checkCSVFiles()) {
    process.exit(1);
  }

  // 生成优化配置
  await runConfigGeneration();
}

// 执行主函数
main().catch((error) => {
  console.error("❌ 执行失败:", error);
  process.exit(1);
});
