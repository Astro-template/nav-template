/**
 * 依赖检查脚本 - 检测幽灵依赖问题
 *
 * 什么是幽灵依赖？
 * 幽灵依赖是指代码中使用了某个包，但这个包并没有在 package.json 中声明，
 * 而是通过其他依赖的依赖间接安装的。这会导致：
 * 1. 代码在其他环境可能无法运行
 * 2. 依赖版本不可控
 * 3. 难以追踪问题来源
 *
 * pnpm 通过严格的依赖隔离机制自动防止幽灵依赖
 */

const fs = require('fs');
const path = require('path');

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// 日志函数
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}\n`)
};

/**
 * 读取 package.json
 */
function readPackageJson() {
  const packagePath = path.join(process.cwd(), 'package.json');
  try {
    const content = fs.readFileSync(packagePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    log.error(`无法读取 package.json: ${error.message}`);
    process.exit(1);
  }
}

/**
 * 获取所有声明的依赖
 */
function getDeclaredDependencies(packageJson) {
  const deps = new Set();

  // 收集所有类型的依赖
  const depTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

  depTypes.forEach(type => {
    if (packageJson[type]) {
      Object.keys(packageJson[type]).forEach(dep => deps.add(dep));
    }
  });

  return deps;
}

/**
 * 扫描源代码中的 import/require 语句
 */
function scanImports(dir, extensions = ['.js', '.ts', '.jsx', '.tsx', '.astro', '.mjs']) {
  const imports = new Set();
  const excludeDirs = ['node_modules', 'dist', '.astro', '.git'];

  function walk(currentDir) {
    const files = fs.readdirSync(currentDir);

    files.forEach(file => {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        if (!excludeDirs.includes(file)) {
          walk(filePath);
        }
      } else if (stat.isFile()) {
        const ext = path.extname(file);
        if (extensions.includes(ext)) {
          scanFileImports(filePath, imports);
        }
      }
    });
  }

  walk(dir);
  return imports;
}

/**
 * 扫描单个文件中的 import
 */
function scanFileImports(filePath, imports) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // 匹配 import 语句
    // import XXX from 'package'
    // import { XXX } from 'package'
    // import * as XXX from 'package'
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;

    // 匹配 require 语句
    // require('package')
    const requireRegex = /require\s*\(['"]([^'"]+)['"]\)/g;

    // 匹配动态 import
    // import('package')
    const dynamicImportRegex = /import\s*\(['"]([^'"]+)['"]\)/g;

    let match;

    // 扫描 import 语句
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      const packageName = extractPackageName(importPath);
      if (packageName) {
        imports.add(packageName);
      }
    }

    // 扫描 require 语句
    while ((match = requireRegex.exec(content)) !== null) {
      const importPath = match[1];
      const packageName = extractPackageName(importPath);
      if (packageName) {
        imports.add(packageName);
      }
    }

    // 扫描动态 import
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      const importPath = match[1];
      const packageName = extractPackageName(importPath);
      if (packageName) {
        imports.add(packageName);
      }
    }
  } catch (error) {
    log.warning(`扫描文件失败 ${filePath}: ${error.message}`);
  }
}

/**
 * 从 import 路径中提取包名
 */
function extractPackageName(importPath) {
  // 忽略相对路径
  if (importPath.startsWith('.') || importPath.startsWith('/')) {
    return null;
  }

  // 忽略 Node.js 内置模块
  const builtinModules = [
    'fs', 'path', 'http', 'https', 'stream', 'util', 'url', 'crypto',
    'events', 'buffer', 'child_process', 'os', 'net', 'zlib', 'assert',
    'querystring', 'string_decoder', 'timers', 'tty', 'dgram', 'dns',
    'readline', 'repl', 'vm', 'domain', 'punycode', 'cluster'
  ];

  if (builtinModules.includes(importPath)) {
    return null;
  }

  // 提取包名
  // 处理 @scope/package 形式
  if (importPath.startsWith('@')) {
    const parts = importPath.split('/');
    if (parts.length >= 2) {
      return `${parts[0]}/${parts[1]}`;
    }
  }

  // 普通包名
  const parts = importPath.split('/');
  return parts[0];
}

/**
 * 检查 pnpm 配置
 */
function checkPnpmConfig() {
  log.title('📋 检查 pnpm 配置');

  const npmrcPath = path.join(process.cwd(), '.npmrc');

  if (!fs.existsSync(npmrcPath)) {
    log.warning('.npmrc 文件不存在');
    log.info('建议创建 .npmrc 文件来配置 pnpm 严格模式');
    return false;
  }

  const content = fs.readFileSync(npmrcPath, 'utf-8');
  const configs = {
    'strict-peer-dependencies': false,
    'shamefully-hoist': true, // 应该是 false
    'hoist': true // 应该是 false
  };

  let hasIssues = false;

  // 检查配置项
  if (content.includes('strict-peer-dependencies=true')) {
    log.success('strict-peer-dependencies 已启用');
    configs['strict-peer-dependencies'] = true;
  } else {
    log.warning('strict-peer-dependencies 未启用');
    hasIssues = true;
  }

  if (content.includes('shamefully-hoist=false')) {
    log.success('shamefully-hoist 已禁用（推荐）');
    configs['shamefully-hoist'] = false;
  } else if (content.includes('shamefully-hoist=true')) {
    log.warning('shamefully-hoist 已启用（可能导致幽灵依赖）');
    hasIssues = true;
  }

  if (content.includes('hoist=false')) {
    log.success('hoist 已禁用（推荐）');
    configs['hoist'] = false;
  } else if (content.includes('hoist=true')) {
    log.warning('hoist 已启用（可能导致幽灵依赖）');
    hasIssues = true;
  }

  return !hasIssues;
}

/**
 * 主函数
 */
function main() {
  console.log(`${colors.bold}${colors.magenta}`);
  console.log('╔════════════════════════════════════════╗');
  console.log('║    pnpm 依赖检查 - 幽灵依赖检测      ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(colors.reset);

  // 1. 检查 pnpm 配置
  const configOk = checkPnpmConfig();

  // 2. 读取 package.json
  log.title('📦 分析 package.json');
  const packageJson = readPackageJson();
  const declaredDeps = getDeclaredDependencies(packageJson);
  log.info(`声明的依赖数量: ${declaredDeps.size}`);

  // 3. 扫描代码中的导入
  log.title('🔍 扫描代码中的导入语句');
  const srcDir = path.join(process.cwd(), 'src');
  const scriptsDir = path.join(process.cwd(), 'scripts');

  const imports = new Set();

  if (fs.existsSync(srcDir)) {
    log.info('扫描 src/ 目录...');
    scanImports(srcDir).forEach(imp => imports.add(imp));
  }

  if (fs.existsSync(scriptsDir)) {
    log.info('扫描 scripts/ 目录...');
    scanImports(scriptsDir).forEach(imp => imports.add(imp));
  }

  log.info(`发现的导入数量: ${imports.size}`);

  // 4. 对比分析
  log.title('🔬 分析结果');

  const ghostDeps = [];
  const unusedDeps = [];

  // 检查幽灵依赖
  imports.forEach(imp => {
    if (!declaredDeps.has(imp)) {
      ghostDeps.push(imp);
    }
  });

  // 检查未使用的依赖
  declaredDeps.forEach(dep => {
    if (!imports.has(dep) && !isMetaDependency(dep)) {
      unusedDeps.push(dep);
    }
  });

  // 5. 输出结果
  if (ghostDeps.length > 0) {
    log.error(`发现 ${ghostDeps.length} 个幽灵依赖:`);
    ghostDeps.forEach(dep => {
      console.log(`  ${colors.red}•${colors.reset} ${dep}`);
    });
    console.log(`\n${colors.yellow}解决方法:${colors.reset}`);
    console.log(`  运行: ${colors.cyan}pnpm add ${ghostDeps.join(' ')}${colors.reset}`);
  } else {
    log.success('未发现幽灵依赖！');
  }

  console.log();

  if (unusedDeps.length > 0) {
    log.warning(`发现 ${unusedDeps.length} 个可能未使用的依赖:`);
    unusedDeps.forEach(dep => {
      console.log(`  ${colors.yellow}•${colors.reset} ${dep}`);
    });
    console.log(`\n${colors.yellow}注意:${colors.reset} 这些依赖可能在运行时使用或被其他工具需要，请谨慎删除`);
  } else {
    log.success('所有声明的依赖都在使用中！');
  }

  // 6. 总结
  log.title('📊 总结');
  console.log(`声明的依赖:     ${declaredDeps.size}`);
  console.log(`使用的包:       ${imports.size}`);
  console.log(`幽灵依赖:       ${colors.red}${ghostDeps.length}${colors.reset}`);
  console.log(`可能未使用:     ${colors.yellow}${unusedDeps.length}${colors.reset}`);
  console.log(`配置状态:       ${configOk ? `${colors.green}✓ 良好${colors.reset}` : `${colors.yellow}⚠ 需要优化${colors.reset}`}`);

  // 7. pnpm 优势说明
  log.title('💡 pnpm 如何防止幽灵依赖');
  console.log('1. 使用符号链接创建非扁平的 node_modules 结构');
  console.log('2. 只有在 package.json 中声明的依赖才能被直接访问');
  console.log('3. 通过内容寻址存储实现磁盘空间共享');
  console.log('4. 严格的依赖隔离防止意外使用间接依赖');

  console.log(`\n${colors.green}${colors.bold}✓ 检查完成！${colors.reset}\n`);

  // 如果有幽灵依赖，返回错误码
  if (ghostDeps.length > 0) {
    process.exit(1);
  }
}

/**
 * 判断是否是元依赖（工具类依赖，可能不会被直接导入）
 */
function isMetaDependency(dep) {
  const metaDeps = [
    '@astrojs/check',
    '@astrojs/ts-plugin',
    'typescript',
    'astro' // Astro 本身通常不在代码中导入
  ];

  // 类型定义包
  if (dep.startsWith('@types/')) {
    return true;
  }

  return metaDeps.includes(dep);
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { scanImports, getDeclaredDependencies, extractPackageName };
