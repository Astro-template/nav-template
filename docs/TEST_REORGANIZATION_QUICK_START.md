# 🚀 测试代码重组 - 快速执行指南

> 5分钟快速执行测试代码重组  
> 日期：2025-01-XX

---

## 📋 执行前检查清单

```bash
# 1. 确保代码已提交
git status
git add .
git commit -m "backup: before test reorganization"

# 2. 确保依赖已安装
pnpm install

# 3. 确保当前测试通过
pnpm test
```

---

## ⚡ 一键执行（推荐）

### 方法 1：自动化脚本

```bash
# 运行重组脚本
node scripts/reorganize-tests.js

# 验证结果
pnpm dev        # 启动开发服务器
pnpm test       # 运行测试
pnpm type-check # 类型检查

# 提交更改
git add .
git commit -m "refactor: reorganize test code structure

- Rename src/pages/tests → src/pages/dev-tools
- Move week3 test files to playground
- Reorganize API endpoints to api/dev
- Update config files and path references
"
```

---

## 🔧 手动执行（备用）

### 步骤 1: 重命名主目录（30秒）

```bash
# Windows (PowerShell)
Rename-Item "src\pages\tests" "src\pages\dev-tools"

# macOS/Linux
mv src/pages/tests src/pages/dev-tools
```

### 步骤 2: 移动临时文件（1分钟）

```bash
# 创建 playground 目录
mkdir src/pages/dev-tools/playground

# 移动文件
mv src/pages/week3-*.astro src/pages/dev-tools/playground/
mv src/pages/config-demo.astro src/pages/dev-tools/playground/
```

### 步骤 3: 重组 API 端点（1分钟）

```bash
# 创建 dev 目录
mkdir src/pages/api/dev

# 重命名并移动（Windows PowerShell）
Move-Item "src\pages\api\test-file-fixed.ts" "src\pages\api\dev\file-upload-fixed.ts"
Move-Item "src\pages\api\test-file-simple.ts" "src\pages\api\dev\file-upload-simple.ts"
Move-Item "src\pages\api\test-upload.ts" "src\pages\api\dev\file-upload.ts"

# macOS/Linux
mv src/pages/api/test-file-fixed.ts src/pages/api/dev/file-upload-fixed.ts
mv src/pages/api/test-file-simple.ts src/pages/api/dev/file-upload-simple.ts
mv src/pages/api/test-upload.ts src/pages/api/dev/file-upload.ts
```

### 步骤 4: 验证和测试（2分钟）

```bash
# 启动开发服务器
pnpm dev

# 在浏览器中访问
# http://localhost:4321/dev-tools

# 运行测试
pnpm test

# 类型检查
pnpm type-check
```

---

## 📊 变更总览

### 目录变更

```diff
src/pages/
- ├── tests/                    ← 删除
+ ├── dev-tools/                ← 新建（重命名自 tests/）
  │   ├── unit/
  │   ├── integration/
  │   ├── e2e/
  │   ├── performance/
+ │   ├── playground/           ← 新建
+ │   │   ├── week3-final-test.astro
+ │   │   ├── week3-integration-test.astro
+ │   │   └── config-demo.astro
+ │   └── index.astro           ← 新建（导航页）
  │
  ├── api/
+ │   ├── dev/                  ← 新建
+ │   │   ├── file-upload-fixed.ts
+ │   │   ├── file-upload-simple.ts
+ │   │   └── file-upload.ts
  │   └── import/
  │
- ├── week3-final-test.astro    ← 移除
- ├── week3-integration-test.astro
- ├── config-demo.astro
  ├── index.astro
  └── submit.astro
```

### URL 变更

```diff
访问路径变更：

- /tests/unit/test-basic-functionality
+ /dev-tools/unit/test-basic-functionality

- /tests/integration/test-config-converter-integration
+ /dev-tools/integration/test-config-converter-integration

新增导航页：
+ /dev-tools
+ /dev-tools/playground/week3-final-test

API 端点变更：
- /api/test-file-fixed
+ /api/dev/file-upload-fixed
```

---

## ✅ 验证检查点

### 功能验证

```bash
# ✓ 开发服务器启动
pnpm dev
# 预期：无错误，正常启动

# ✓ 访问开发工具页面
# 打开浏览器：http://localhost:4321/dev-tools
# 预期：显示工具导航页面

# ✓ 测试几个演示页面
# http://localhost:4321/dev-tools/unit/test-basic-functionality
# 预期：页面正常显示

# ✓ 自动化测试通过
pnpm test
# 预期：All tests passed

# ✓ 类型检查通过
pnpm type-check
# 预期：No errors found

# ✓ 构建成功
pnpm build
# 预期：Build completed
```

### 目录验证

```bash
# ✓ 旧目录已删除
ls src/pages/tests
# 预期：directory not found

# ✓ 新目录已创建
ls src/pages/dev-tools
# 预期：列出目录内容

# ✓ API 目录已重组
ls src/pages/api/dev
# 预期：file-upload-*.ts 文件
```

### 配置验证

```bash
# ✓ 检查 astro.config.mjs
grep "dev-tools" astro.config.mjs
# 预期：!page.includes("/dev-tools/")

# ✓ 检查 tsconfig.json
grep "dev-tools" tsconfig.json
# 预期：src/pages/dev-tools/**/*

# ✓ 检查 sitemap（构建后）
cat dist/sitemap-0.xml | grep "dev-tools"
# 预期：无结果（已排除）
```

---

## 🔄 回滚方案

如果遇到问题，可以快速回滚：

```bash
# 回滚到迁移前的状态
git reset --hard HEAD~1

# 或者恢复特定文件
git checkout HEAD~1 -- src/pages/
```

---

## 📝 需要手动更新的文件

### 1. 前端代码中的 API 调用

```typescript
// 搜索并替换
查找：/api/test-
替换：/api/dev/file-

// 示例
// ❌ 旧代码
fetch('/api/test-upload', { ... })

// ✅ 新代码
fetch('/api/dev/file-upload', { ... })
```

### 2. 文档中的路径引用

```bash
# 全局搜索 "pages/tests" 或 "/tests/"
# 替换为 "pages/dev-tools" 或 "/dev-tools/"

# VS Code 快捷键：Ctrl+Shift+F (Windows) / Cmd+Shift+F (macOS)
```

### 3. README.md

```markdown
# 更新测试页面链接
- 开发工具: http://localhost:4321/dev-tools
- 配置生成器: http://localhost:4321/config-generator
```

---

## ⚠️ 常见问题

### Q1: 运行脚本后报错 "Cannot find module"

**解决方案**：
```bash
# 清理并重新安装依赖
rm -rf node_modules
pnpm install
```

### Q2: 页面 404 Not Found

**原因**：路径已更改
**解决**：使用新路径 `/dev-tools/` 而不是 `/tests/`

### Q3: 类型检查报错

**解决方案**：
```bash
# 清理 TypeScript 缓存
rm -rf .astro
rm -rf dist
pnpm type-check
```

### Q4: Git 冲突

**解决方案**：
```bash
# 如果有未提交的更改
git stash
# 执行迁移
node scripts/reorganize-tests.js
# 恢复暂存的更改
git stash pop
# 手动解决冲突
```

---

## 📞 获取帮助

如果遇到问题：

1. **查看详细文档**：
   - `docs/TEST_CODE_ANALYSIS.md` - 问题分析
   - `docs/TEST_REORGANIZATION_GUIDE.md` - 详细指南

2. **检查日志**：
   ```bash
   # 查看详细错误信息
   node scripts/reorganize-tests.js 2>&1 | tee reorganize.log
   ```

3. **提交 Issue**：
   - 包含错误信息
   - 提供系统信息（OS, Node版本）
   - 描述执行的步骤

---

## 🎉 完成后的工作

### 1. 更新团队

```markdown
📢 通知团队成员：

重要变更：测试代码目录结构已更新

变更内容：
- src/pages/tests/ → src/pages/dev-tools/
- 临时测试文件已移至 playground/
- API 端点已重组到 api/dev/

影响：
- 开发工具页面 URL 已更改
- API 调用路径需要更新
- 文档已同步更新

操作：
1. 拉取最新代码：git pull
2. 重新安装依赖：pnpm install
3. 查看新的开发工具：/dev-tools
4. 更新本地代码中的 API 调用路径

问题反馈：请联系 [维护者]
```

### 2. CI/CD 配置

```yaml
# .github/workflows/deploy.yml
# 确保不部署 dev-tools

- name: Remove dev tools before deployment
  run: |
    rm -rf dist/dev-tools
    rm -rf dist/api/dev
```

### 3. 更新文档

- [ ] README.md - 更新路径引用
- [ ] 开发指南 - 更新开发工具说明
- [ ] API 文档 - 更新端点路径
- [ ] 贡献指南 - 添加重组说明

---

## 📊 执行时间估算

| 方法 | 准备 | 执行 | 验证 | 总计 |
|------|------|------|------|------|
| 自动化脚本 | 1分钟 | 30秒 | 2分钟 | ~4分钟 |
| 手动执行 | 1分钟 | 4分钟 | 2分钟 | ~7分钟 |

**推荐**：使用自动化脚本，节省时间且减少错误。

---

## ✨ 预期收益

重组完成后：
- ✅ 概念清晰：开发工具 vs 自动化测试
- ✅ 结构合理：目录组织更符合直觉
- ✅ 维护简单：新人更容易理解
- ✅ 文档清晰：描述更准确
- ✅ 部署干净：生产环境不包含开发工具

---

**创建时间**：2025-01-XX  
**最后更新**：2025-01-XX  
**维护者**：Astro-nav Team  
**状态**：✅ 可立即执行  
**难度**：⭐⭐☆☆☆ 简单