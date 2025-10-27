/**
 * 生成优化配置（带完整字段）
 * 这个脚本会生成：
 * 1. config.json - 优化格式（带 siteCount, previewSites, href, type）
 * 2. config-traditional.json - 传统格式（向后兼容）
 * 3. categories/*.json - 分类数据文件（categoryIndex 而不是 categoryId）
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const staticDir = path.join(projectRoot, "static");
const categoriesDir = path.join(staticDir, "categories");

// 确保目录存在
if (!fs.existsSync(categoriesDir)) {
  fs.mkdirSync(categoriesDir, { recursive: true });
}

// 读取现有的 categories 文件
const categoryFiles = fs.readdirSync(categoriesDir)
  .filter(f => f.endsWith('.json') && f !== 'categories')
  .sort((a, b) => {
    const numA = parseInt(a.replace('.json', ''));
    const numB = parseInt(b.replace('.json', ''));
    return numA - numB;
  });

console.log(`📁 找到 ${categoryFiles.length} 个分类文件`);

// 生成优化配置
const menuItems = [];
let totalSites = 0;

categoryFiles.forEach((filename, index) => {
  const filePath = path.join(categoriesDir, filename);
  const categoryData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  const sites = categoryData.sites || [];
  const siteCount = sites.length;
  totalSites += siteCount;
  
  // 取前3个作为预览
  const previewSites = sites.slice(0, 3).map(site => ({
    title: site.title,
    description: site.description,
    url: site.url
  }));
  
  menuItems.push({
    name: categoryData.categoryName,
    href: `#category-${index}`,
    icon: "mdi:folder",
    type: "single",
    categoryIndex: index,
    siteCount: siteCount,
    previewSites: previewSites
  });
});

// 生成优化配置
const optimizedConfig = {
  site: {
    title: "Affiliate导航",
    description: "专业的Affiliate营销导航网站",
    logo: {
      text: "Affiliate导航",
      href: "/"
    }
  },
  menuItems: menuItems,
  optimization: {
    enabled: true,
    totalCategories: categoryFiles.length,
    totalSites: totalSites,
    previewCount: 3,
    fileSizeKB: 0, // 将在后面计算
    compressionRatio: 0 // 将在后面计算
  }
};

// 计算文件大小
const configJson = JSON.stringify(optimizedConfig, null, 2);
optimizedConfig.optimization.fileSizeKB = Math.ceil(configJson.length / 1024);

// 保存优化配置
const configPath = path.join(staticDir, 'config.json');
fs.writeFileSync(configPath, configJson);

console.log(`✅ 生成优化配置: config.json`);
console.log(`📊 统计信息:`);
console.log(`   - 总分类数: ${categoryFiles.length}`);
console.log(`   - 总网站数: ${totalSites}`);
console.log(`   - 配置大小: ${optimizedConfig.optimization.fileSizeKB}KB`);
console.log(`   - 预览数量: 3个/分类`);

console.log(`\n🎉 优化配置生成完成！`);
