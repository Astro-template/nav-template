# 🔧 开发指南

## 🎯 概述

本文档为开发者参与Astro-nav项目提供完整的指导，涵盖环境设置、架构理解和开发规范。

## 📋 文档分类

### 环境和架构
- [🛠️ 开发环境设置](development-setup.md) - 本地开发环境配置
- [🏗️ 项目架构](project-architecture.md) - 系统整体架构设计
- [⚡ 性能优化](performance-optimization.md) - 性能优化方案

### 开发规范
- [📝 编码规范](coding-standards.md) - 代码风格和质量标准
- [🧪 测试指南](testing-guide.md) - 测试策略和实践

## 🎯 开发流程

### 🆕 新开发者入门流程
1. **环境准备**: [开发环境设置](development-setup.md) - 配置本地开发环境
2. **架构理解**: [项目架构](project-architecture.md) - 理解系统整体架构
3. **规范学习**: [编码规范](coding-standards.md) - 学习代码风格和质量标准

### 🔧 功能开发流程

**核心原则: 测试驱动开发 (TDD) + 持续集成 (CI)** ⭐

#### 完整开发流程
```
1. 创建分支 → 2. 需求分析 → 3. 编写测试 → 4. 编码实现 → 5. 本地验证 → 6. 提交PR → 7. 代码审查 → 8. 合并部署
```

#### 详细步骤说明

**1. 创建功能分支**
```bash
# 从 develop 分支创建功能分支
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# 命名规范
feature/add-lazy-loading    # 新功能
fix/config-loading-bug      # 修复
refactor/optimize-cache     # 重构
```

**2. 需求分析**
- 查看 [功能文档](../04-features/_index.md) 了解现有功能
- 明确功能需求和验收标准
- 确定测试场景和预期结果
- 评估性能影响和技术方案

**3. 编写测试（TDD）**
```typescript
// ✅ 先写测试
describe('LazyLoader', () => {
  it('应该成功加载分类数据', async () => {
    const loader = new LazyLoader();
    const result = await loader.loadCategory(0);
    expect(result.success).toBe(true);
  });
});

// ✅ 再实现功能
class LazyLoader {
  async loadCategory(index: number) {
    // 实现代码...
  }
}
```

**4. 编码实现**
- 遵循 [编码规范](coding-standards.md) 进行开发
- 单元测试与源码就近放置（`*.test.ts`）
- 确保代码质量和类型安全
- 使用 TypeScript 严格模式

**5. 本地验证**
```bash
# 运行测试
pnpm test                    # 所有测试
pnpm test:unit              # 单元测试
pnpm test:coverage          # 覆盖率报告

# 代码检查
pnpm lint                   # ESLint 检查
pnpm type-check             # TypeScript 检查
pnpm format                 # 代码格式化

# 构建验证
pnpm build                  # 生产构建测试
```

**6. 提交 Pull Request**
```bash
# 提交代码（遵循 Conventional Commits）
git add .
git commit -m "feat: 添加懒加载功能"
git push origin feature/your-feature-name

# 在 GitHub 创建 PR
# - 填写 PR 模板
# - 关联相关 Issue
# - 等待 CI 检查通过
```

**7. 代码审查**
- 等待团队成员审查代码
- 回应审查意见并修改
- 确保所有 CI 检查通过
- 获得至少 1 个 Approve

**8. 合并和部署**
- 合并到 `develop` 分支
- 自动部署到测试环境
- 验证功能正常
- 定期发布到生产环境

## 🧪 测试策略

### 📋 测试金字塔

```
        /  \
       /E2E \         少量 - 端到端测试
      /------\
     /集成测试 \      适量 - 模块协作测试
    /----------\
   /  单元测试   \    大量 - 函数/组件测试
  /--------------\
```

### 测试类型和要求

#### 1. 单元测试（必须）✅

**位置**: `src/` (与源码就近)
**工具**: Vitest
**覆盖率**: 新增代码 ≥ 90%，核心功能 = 100%

```typescript
// src/utils/ConfigManager.test.ts
import { describe, it, expect } from 'vitest';
import { ConfigManager } from './ConfigManager';

describe('ConfigManager', () => {
  it('应该成功加载配置', async () => {
    const manager = new ConfigManager();
    const result = await manager.loadConfig();
    expect(result.success).toBe(true);
  });

  it('应该处理加载失败', async () => {
    const manager = new ConfigManager();
    const result = await manager.loadConfig('/invalid');
    expect(result.success).toBe(false);
  });
});
```

**测试内容**:
- ✅ 函数逻辑正确性
- ✅ 边界条件处理
- ✅ 异常情况处理
- ✅ 返回值类型检查

#### 2. 集成测试（推荐）⚠️

**位置**: `tests/integration/`
**工具**: Vitest
**用途**: 测试多个模块协作

```typescript
// tests/integration/config-loading-flow.test.ts
import { describe, it, expect } from 'vitest';
import { ConfigManager } from '../../src/utils/ConfigManager';
import { LazyLoader } from '../../src/utils/LazyLoader';

describe('配置加载流程', () => {
  it('应该完整加载配置并初始化懒加载', async () => {
    const manager = new ConfigManager();
    await manager.loadConfig();
    
    const loader = new LazyLoader(manager);
    const result = await loader.loadCategory(0);
    
    expect(result.success).toBe(true);
  });
});
```

#### 3. E2E 测试（重要功能必须）⚠️

**位置**: `tests/e2e/`
**工具**: Playwright
**用途**: 测试完整用户流程

```typescript
// tests/e2e/user-navigation.spec.ts
import { test, expect } from '@playwright/test';

test('用户应该能够浏览分类', async ({ page }) => {
  await page.goto('/');
  await page.click('text=浏览平台');
  await expect(page).toHaveURL('/#category-2');
  await expect(page.locator('.category-card')).toBeVisible();
});
```

#### 4. 性能测试（性能敏感功能必须）⚠️

**位置**: `tests/performance/`
**工具**: Vitest + Performance API

```typescript
// tests/performance/loading-benchmark.test.ts
import { describe, it, expect } from 'vitest';
import { PerformanceBenchmark } from '../../src/utils/PerformanceBenchmark';

describe('加载性能基准', () => {
  it('配置加载应该在 1 秒内完成', async () => {
    const benchmark = new PerformanceBenchmark();
    const result = await benchmark.runBenchmark(
      'config-loading',
      async () => await loadConfig(),
      10
    );
    expect(result.avgTime).toBeLessThan(1000);
  });
});
```

#### 5. 演示页面（可选）📝

**位置**: `src/pages/_dev/`
**用途**: 功能演示、可视化调试、手动测试

```astro
---
// src/pages/_dev/demo-lazyloader.astro
import { LazyLoader } from '../../utils/LazyLoader';

const loader = new LazyLoader();
const result = await loader.loadCategory(0);
---

<html>
  <head>
    <title>LazyLoader 功能演示</title>
  </head>
  <body>
    <h1>LazyLoader 功能演示</h1>
    <div>
      <p>加载状态: {result.success ? '✅' : '❌'}</p>
      <p>加载时间: {result.loadTime}ms</p>
    </div>
    <!-- 交互式演示 -->
  </body>
</html>
```

**何时需要演示页面**:
- ✅ 复杂的 UI 组件
- ✅ 需要可视化验证的功能
- ✅ 性能监控工具
- ❌ 简单的工具函数（不需要）
- ❌ API 接口（不需要）

### 🚨 提交前检查清单

每个 PR 提交前必须确认：

- [ ] **单元测试已编写** - 与源码就近放置
- [ ] **所有测试通过** - `pnpm test` 全部通过
- [ ] **代码覆盖率达标** - ≥ 90%
- [ ] **类型检查通过** - `pnpm type-check` 无错误
- [ ] **代码格式正确** - `pnpm lint` 无错误
- [ ] **构建成功** - `pnpm build` 无错误
- [ ] **性能测试通过** - 性能敏感功能必须
- [ ] **文档已更新** - README、API 文档等

## � Git 工作程流

### 分支策略

```
main (生产环境)
  ↑
develop (开发主分支)
  ↑
feature/* (功能分支)
fix/* (修复分支)
hotfix/* (紧急修复)
```

#### 分支说明

| 分支 | 用途 | 保护 | 部署 |
|------|------|------|------|
| `main` | 生产环境代码 | ✅ 受保护 | 自动部署到生产 |
| `develop` | 开发主分支 | ✅ 受保护 | 自动部署到测试 |
| `feature/*` | 新功能开发 | ❌ | 本地预览 |
| `fix/*` | Bug 修复 | ❌ | 本地预览 |
| `hotfix/*` | 紧急修复 | ❌ | 直接到生产 |

### 提交规范（Conventional Commits）

```bash
<type>(<scope>): <subject>

<body>

<footer>
```

#### Type 类型

| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: 添加懒加载功能` |
| `fix` | 修复 Bug | `fix: 修复配置加载失败` |
| `docs` | 文档更新 | `docs: 更新开发指南` |
| `style` | 代码格式 | `style: 格式化代码` |
| `refactor` | 重构 | `refactor: 优化缓存逻辑` |
| `perf` | 性能优化 | `perf: 优化加载速度` |
| `test` | 测试 | `test: 添加单元测试` |
| `chore` | 构建/工具 | `chore: 更新依赖` |
| `ci` | CI 配置 | `ci: 添加测试流程` |

#### 示例

```bash
# 好的提交
feat(lazy-loader): 添加 LRU 缓存淘汰机制

实现了基于 LRU 算法的缓存淘汰，当缓存超过最大值时自动删除最久未使用的项。

Closes #123

# 不好的提交
update code
fix bug
修改文件
```

### 工作流程

#### 1. 开始新功能

```bash
# 1. 更新 develop 分支
git checkout develop
git pull origin develop

# 2. 创建功能分支
git checkout -b feature/add-lazy-loading

# 3. 开发 + 提交
git add .
git commit -m "feat: 添加懒加载功能"

# 4. 推送到远程
git push origin feature/add-lazy-loading
```

#### 2. 创建 Pull Request

在 GitHub 上创建 PR：
- 标题：清晰描述功能
- 描述：使用 PR 模板
- 关联：关联相关 Issue
- 审查者：指定审查人员

#### 3. 代码审查

审查者检查：
- ✅ 代码质量
- ✅ 测试覆盖率
- ✅ 性能影响
- ✅ 文档完整性

#### 4. 合并代码

```bash
# CI 检查通过 + 审查通过后
# 使用 Squash and Merge 合并到 develop
```

### PR 模板

```markdown
## 📝 变更说明
<!-- 描述这个 PR 做了什么 -->

## 🎯 相关 Issue
<!-- 关联的 Issue，如 Closes #123 -->

## 🧪 测试
- [ ] 单元测试已添加
- [ ] 集成测试已添加（如需要）
- [ ] 所有测试通过
- [ ] 代码覆盖率 ≥ 90%

## 📸 截图/演示
<!-- 如果是 UI 变更，添加截图或 GIF -->

## ✅ 检查清单
- [ ] 代码符合编码规范
- [ ] 测试覆盖率达标
- [ ] 文档已更新
- [ ] 无 TypeScript 错误
- [ ] 无 ESLint 错误
- [ ] 构建成功
```

## 🚀 CI/CD 流程

### 自动化检查（GitHub Actions）

每次 Push 和 PR 都会触发：

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      
      # 1. 安装依赖
      - run: pnpm install
      
      # 2. 代码检查
      - run: pnpm lint
      - run: pnpm type-check
      
      # 3. 运行测试
      - run: pnpm test:coverage
      
      # 4. 构建测试
      - run: pnpm build
      
      # 5. 上传覆盖率报告
      - uses: codecov/codecov-action@v3
```

### 检查项目

| 检查项 | 工具 | 失败处理 |
|--------|------|----------|
| 代码格式 | Prettier | ❌ 阻止合并 |
| 代码质量 | ESLint | ❌ 阻止合并 |
| 类型检查 | TypeScript | ❌ 阻止合并 |
| 单元测试 | Vitest | ❌ 阻止合并 |
| 覆盖率 | Vitest | ⚠️ 警告 |
| 构建测试 | Astro | ❌ 阻止合并 |
| E2E 测试 | Playwright | ⚠️ 警告 |

### 部署流程

```
develop 分支
  ↓ (自动)
测试环境
  ↓ (手动)
main 分支
  ↓ (自动)
生产环境
```

#### 测试环境部署

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm build
      - run: pnpm deploy:staging
```

#### 生产环境部署

```yaml
# .github/workflows/deploy-production.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm build
      - run: pnpm deploy:production
```

### 🚀 性能优化流程
1. **性能分析**: 阅读 [性能优化](performance-optimization.md) 了解优化策略
2. **性能测试**: 使用 Vitest 进行性能基准测试
3. **优化实施**: 应用性能优化最佳实践
4. **测试验证**: 验证优化效果和性能提升

## 🔗 相关资源

### 项目文档
- [✨ 功能文档](../04-features/_index.md) - 了解项目功能
- [🔬 技术规范](../05-technical/_index.md) - API和技术标准
- [🎨 设计文档](../07-design/_index.md) - 系统设计文档

### 项目管理
- [📊 项目管理](../08-project-management/_index.md) - 项目进度和计划
- [📖 参考资料](../09-references/_index.md) - 外部资源和最佳实践

## 💡 开发建议

### 最佳实践
- **测试驱动开发**: 先写测试，再实现功能
- **持续集成**: 每次提交都要通过所有测试
- **文档同步**: 代码和文档保持同步更新
- **性能意识**: 时刻关注性能影响
- **错误处理**: 完善的异常处理机制

### 质量保证
- **代码审查**: 每个PR都要经过代码审查
- **自动化测试**: 建立完善的自动化测试体系
- **性能监控**: 持续监控系统性能指标
- **用户反馈**: 重视用户体验和反馈

### 常见问题
- **环境配置问题**: 参考 [开发环境设置](development-setup.md)
- **架构疑问**: 查阅 [项目架构](project-architecture.md)
- **性能问题**: 参考 [性能优化](performance-optimization.md)
- **测试问题**: 查看 [测试指南](testing-guide.md)

## 📚 快速参考

### 常用命令

```bash
# 开发
pnpm dev                    # 启动开发服务器
pnpm build                  # 生产构建
pnpm preview                # 预览构建结果

# 测试
pnpm test                   # 运行所有测试
pnpm test:unit              # 单元测试
pnpm test:integration       # 集成测试
pnpm test:e2e               # E2E 测试
pnpm test:coverage          # 覆盖率报告

# 代码检查
pnpm lint                   # ESLint 检查
pnpm lint:fix               # 自动修复
pnpm type-check             # TypeScript 检查
pnpm format                 # 代码格式化

# Git
git checkout -b feature/xxx # 创建功能分支
git commit -m "feat: xxx"   # 提交代码
git push origin feature/xxx # 推送到远程
```

### 工作流速查

```
1. git checkout -b feature/xxx
2. 编写测试 (*.test.ts)
3. 实现功能
4. pnpm test && pnpm lint
5. git commit -m "feat: xxx"
6. git push origin feature/xxx
7. 创建 PR
8. 等待审查和 CI
9. 合并到 develop
```

### 文件组织速查

```
src/
├── utils/
│   ├── ConfigManager.ts
│   └── ConfigManager.test.ts      # ✅ 单元测试
├── components/
│   ├── Button.astro
│   └── Button.test.ts             # ✅ 组件测试
└── pages/
    └── _dev/
        └── demo-feature.astro     # 📝 演示页面（可选）

tests/
├── integration/                   # ✅ 集成测试
├── e2e/                          # ✅ E2E 测试
└── performance/                   # ✅ 性能测试
```

## ⚠️ 重要提醒

### 🔥 核心原则

1. **测试驱动开发** - 先写测试，再写代码
2. **持续集成** - 每次提交都要通过 CI
3. **代码审查** - 所有代码都要经过审查
4. **文档同步** - 代码和文档保持同步

### ✅ 合并标准

代码只有满足以下条件才能合并：

- ✅ 所有测试通过
- ✅ 代码覆盖率 ≥ 90%
- ✅ 无 TypeScript 错误
- ✅ 无 ESLint 错误
- ✅ 构建成功
- ✅ 至少 1 个 Approve
- ✅ 文档已更新

### 🚫 禁止行为

- ❌ 直接推送到 `main` 或 `develop`
- ❌ 跳过测试
- ❌ 提交未格式化的代码
- ❌ 使用 `any` 类型（除非必要）
- ❌ 提交包含 `console.log` 的代码

## 📚 相关资源

### 内部文档
- [编码规范](coding-standards.md) - 代码风格和质量标准
- [测试指南](testing-guide.md) - 测试策略和实践
- [项目架构](project-architecture.md) - 系统架构设计

### 外部资源
- [Astro 文档](https://docs.astro.build/)
- [Vitest 文档](https://vitest.dev/)
- [Playwright 文档](https://playwright.dev/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**文档版本**: v2.0  
**更新日期**: 2024-12-07  
**维护者**: Augment Agent  
**变更**: 重写开发流程，符合前端最佳实践
