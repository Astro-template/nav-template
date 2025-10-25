/**
 * 测试代码重组脚本
 * 将 src/pages/tests/ 重命名为 src/pages/dev-tools/
 * 移动临时测试文件到合适位置
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * 确保目录存在
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`✓ 创建目录: ${dirPath}`, 'green');
  }
}

/**
 * 移动文件或目录
 */
function moveItem(from, to) {
  if (!fs.existsSync(from)) {
    log(`⚠ 源不存在，跳过: ${from}`, 'yellow');
    return false;
  }

  if (fs.existsSync(to)) {
    log(`⚠ 目标已存在，跳过: ${to}`, 'yellow');
    return false;
  }

  // 确保目标目录存在
  const targetDir = path.dirname(to);
  ensureDir(targetDir);

  try {
    fs.renameSync(from, to);
    log(`✓ 移动: ${path.basename(from)} → ${path.basename(to)}`, 'green');
    return true;
  } catch (error) {
    log(`✗ 移动失败: ${error.message}`, 'red');
    return false;
  }
}

/**
 * 复制文件
 */
function copyFile(from, to) {
  if (!fs.existsSync(from)) {
    log(`⚠ 源文件不存在: ${from}`, 'yellow');
    return false;
  }

  ensureDir(path.dirname(to));

  try {
    fs.copyFileSync(from, to);
    log(`✓ 复制: ${path.basename(from)} → ${path.basename(to)}`, 'green');
    return true;
  } catch (error) {
    log(`✗ 复制失败: ${error.message}`, 'red');
    return false;
  }
}

/**
 * 重命名文件中的内容
 */
function updateFileContent(filePath, replacements) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    for (const [oldText, newText] of Object.entries(replacements)) {
      if (content.includes(oldText)) {
        content = content.replace(new RegExp(oldText, 'g'), newText);
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      log(`✓ 更新文件内容: ${path.basename(filePath)}`, 'green');
    }
  } catch (error) {
    log(`✗ 更新文件失败: ${error.message}`, 'red');
  }
}

/**
 * 递归遍历目录更新文件内容
 */
function updateDirectoryContent(dirPath, replacements) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  const items = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dirPath, item.name);

    if (item.isDirectory()) {
      updateDirectoryContent(fullPath, replacements);
    } else if (item.isFile() && (item.name.endsWith('.astro') || item.name.endsWith('.ts') || item.name.endsWith('.md'))) {
      updateFileContent(fullPath, replacements);
    }
  }
}

/**
 * 主要迁移流程
 */
async function main() {
  log('\n🚀 开始重组测试代码结构...\n', 'blue');

  const srcPages = path.join(projectRoot, 'src', 'pages');
  const srcPagesTests = path.join(srcPages, 'tests');
  const srcPagesDevTools = path.join(srcPages, 'dev-tools');
  const srcPagesApi = path.join(srcPages, 'api');
  const srcPagesApiDev = path.join(srcPagesApi, 'dev');

  // === 步骤 1: 重命名 src/pages/tests → src/pages/dev-tools ===
  log('步骤 1: 重命名测试页面目录', 'blue');
  if (fs.existsSync(srcPagesTests)) {
    if (fs.existsSync(srcPagesDevTools)) {
      log('⚠ dev-tools 目录已存在，需要手动处理', 'yellow');
    } else {
      moveItem(srcPagesTests, srcPagesDevTools);
    }
  } else {
    log('⚠ src/pages/tests 目录不存在，可能已经迁移', 'yellow');
  }

  // === 步骤 2: 移动 week3 测试文件 ===
  log('\n步骤 2: 移动临时测试文件', 'blue');

  const week3Files = [
    'week3-final-test.astro',
    'week3-integration-test.astro',
    'config-demo.astro',
  ];

  ensureDir(path.join(srcPagesDevTools, 'playground'));

  for (const file of week3Files) {
    const from = path.join(srcPages, file);
    const to = path.join(srcPagesDevTools, 'playground', file);
    moveItem(from, to);
  }

  // === 步骤 3: 重组 API 测试端点 ===
  log('\n步骤 3: 重组 API 端点', 'blue');

  ensureDir(srcPagesApiDev);

  const apiTestFiles = [
    { from: 'test-file-fixed.ts', to: 'file-upload-fixed.ts' },
    { from: 'test-file-simple.ts', to: 'file-upload-simple.ts' },
    { from: 'test-upload.ts', to: 'file-upload.ts' },
  ];

  for (const { from, to } of apiTestFiles) {
    const fromPath = path.join(srcPagesApi, from);
    const toPath = path.join(srcPagesApiDev, to);
    moveItem(fromPath, toPath);
  }

  // === 步骤 4: 更新文件内容中的路径引用 ===
  log('\n步骤 4: 更新文件内容中的路径引用', 'blue');

  const replacements = {
    '/tests/': '/dev-tools/',
    'src/pages/tests': 'src/pages/dev-tools',
    'pages/tests': 'pages/dev-tools',
    '/api/test-': '/api/dev/file-',
  };

  // 更新 dev-tools 目录下的文件
  if (fs.existsSync(srcPagesDevTools)) {
    updateDirectoryContent(srcPagesDevTools, replacements);
  }

  // 更新 astro.config.mjs
  const astroConfig = path.join(projectRoot, 'astro.config.mjs');
  updateFileContent(astroConfig, {
    '!page.includes("/tests/")': '!page.includes("/dev-tools/")',
  });

  // 更新 tsconfig.json
  const tsConfig = path.join(projectRoot, 'tsconfig.json');
  updateFileContent(tsConfig, {
    '"src/pages/tests/**/*"': '"src/pages/dev-tools/**/*"',
  });

  // === 步骤 5: 创建 dev-tools 索引页 ===
  log('\n步骤 5: 创建开发工具导航页', 'blue');

  const indexPath = path.join(srcPagesDevTools, 'index.astro');
  if (!fs.existsSync(indexPath)) {
    const indexContent = `---
/**
 * 开发工具和演示页面导航
 * 仅用于开发环境，生产环境应排除
 */
---

<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>开发工具 | Astro-nav</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: #f5f5f5;
    }
    h1 { color: #2937f0; }
    .category {
      background: white;
      padding: 1.5rem;
      margin: 1rem 0;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .links {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    .links a {
      display: block;
      padding: 0.75rem 1rem;
      background: #f0f0f0;
      border-radius: 4px;
      text-decoration: none;
      color: #333;
      transition: all 0.2s;
    }
    .links a:hover {
      background: #2937f0;
      color: white;
    }
    .warning {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 1rem;
      margin: 1rem 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <h1>🛠️ Astro-nav 开发工具</h1>

  <div class="warning">
    <strong>⚠️ 注意：</strong> 这些页面仅用于开发和测试，不应部署到生产环境。
  </div>

  <div class="category">
    <h2>单元功能演示</h2>
    <div class="links">
      <!-- 根据实际文件动态生成链接 -->
      <a href="/dev-tools/unit/test-basic-functionality">基础功能测试</a>
      <a href="/dev-tools/unit/test-config-manager-basic">ConfigManager 基础</a>
      <a href="/dev-tools/unit/test-lazyloader">LazyLoader 演示</a>
      <a href="/dev-tools/unit/test-performance-monitor">性能监控</a>
    </div>
  </div>

  <div class="category">
    <h2>集成功能演示</h2>
    <div class="links">
      <a href="/dev-tools/integration/test-config-converter-integration">配置转换集成</a>
      <a href="/dev-tools/integration/test-dual-cache-integration">双层缓存集成</a>
      <a href="/dev-tools/integration/test-error-integration">错误处理集成</a>
    </div>
  </div>

  <div class="category">
    <h2>端到端测试</h2>
    <div class="links">
      <a href="/dev-tools/e2e/test-complete-workflow">完整工作流程</a>
      <a href="/dev-tools/e2e/test-comprehensive-e2e">综合端到端测试</a>
    </div>
  </div>

  <div class="category">
    <h2>综合测试平台</h2>
    <div class="links">
      <a href="/dev-tools/playground/week3-final-test">Week 3 最终测试</a>
      <a href="/dev-tools/playground/week3-integration-test">Week 3 集成测试</a>
    </div>
  </div>

  <div class="category">
    <h2>工具页面</h2>
    <div class="links">
      <a href="/config-generator">配置生成器</a>
      <a href="/table-import">表格导入工具</a>
    </div>
  </div>

  <div class="category">
    <h2>返回</h2>
    <div class="links">
      <a href="/">← 返回首页</a>
    </div>
  </div>
</body>
</html>
`;

    fs.writeFileSync(indexPath, indexContent, 'utf8');
    log('✓ 创建 dev-tools/index.astro', 'green');
  }

  // === 步骤 6: 创建 .gitignore 排除规则建议 ===
  log('\n步骤 6: 生成配置更新建议', 'blue');

  const suggestions = `
╔════════════════════════════════════════════════════════════╗
║           📋 需要手动更新的配置文件                        ║
╚════════════════════════════════════════════════════════════╝

1️⃣  astro.config.mjs - 排除 dev-tools（已自动更新）
   在 sitemap 配置中排除 dev-tools 页面

2️⃣  .gitignore - 可选择性忽略
   # 如果不想提交开发工具页面到版本控制
   # src/pages/dev-tools/

3️⃣  GitHub Actions - 构建时排除
   在 .github/workflows/deploy.yml 中确保不部署 dev-tools

4️⃣  文档更新
   - 更新 README.md 中的路径引用
   - 更新文档中的测试页面链接

5️⃣  清理工作
   检查是否还有遗留的测试文件需要移动或删除：
   - src/pages/week3-*.astro
   - src/pages/api/test-*.ts

═══════════════════════════════════════════════════════════

📁 新的目录结构：

src/pages/
  ├── dev-tools/          ← 开发和演示页面（不部署）
  │   ├── unit/
  │   ├── integration/
  │   ├── e2e/
  │   ├── performance/
  │   ├── playground/
  │   └── index.astro
  │
  ├── api/
  │   ├── dev/            ← 开发专用 API（不部署）
  │   └── import/         ← 生产 API
  │
  ├── index.astro         ← 生产页面
  ├── submit.astro
  └── ...

tests/                    ← 自动化测试（不部署）
  ├── unit/
  ├── integration/
  ├── e2e/
  ├── performance/
  └── setup.ts

═══════════════════════════════════════════════════════════
`;

  console.log(suggestions);

  log('\n✅ 重组完成！', 'green');
  log('📝 请检查上述建议并手动完成剩余配置更新\n', 'blue');
}

// 执行迁移
main().catch((error) => {
  log(`\n❌ 执行失败: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
