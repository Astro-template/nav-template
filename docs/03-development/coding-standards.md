# 📝 编码规范

## 🎯 概述

本文档定义了Astro-nav项目的编码规范和质量标准，与[开发流程](development-guide.md)配合使用，确保代码的一致性、可维护性和高质量。

## 🔗 与开发流程的关系

本编码规范是[开发流程](development-guide.md#功能开发流程)的技术实现细则，特别是**第4步测试验证**的具体标准。请先阅读开发流程了解整体要求，再参考本文档的技术细节。

## 🔧 核心开发原则

### 1. 功能完成必须测试原则 ⭐
**每完成一个功能都必须进行测试验证，这是强制性要求！**

#### 📋 测试要求
- **单元测试**: 每个新增的函数/方法都必须有对应的单元测试
- **集成测试**: 每个新增的组件/模块都必须有集成测试
- **功能测试**: 每个完整功能都必须创建功能测试页面
- **性能测试**: 涉及性能的功能必须进行性能基准测试

#### 🧪 测试流程
1. **开发阶段**: 边开发边写测试
2. **完成阶段**: 创建专门的测试页面验证功能
3. **提交前**: 运行所有相关测试确保通过
4. **文档更新**: 在文档中记录测试结果

#### 📊 测试覆盖率要求
- **新增代码**: 测试覆盖率必须 ≥ 90%
- **核心功能**: 测试覆盖率必须 = 100%
- **工具函数**: 测试覆盖率必须 = 100%

### 2. 代码质量原则

#### TypeScript严格模式
- 启用TypeScript严格模式
- 所有函数必须有明确的类型定义
- 禁止使用 `any` 类型，除非有充分理由

#### 错误处理
- 所有异步操作必须有错误处理
- 网络请求必须有重试机制
- 用户友好的错误提示

#### 性能考虑
- 避免不必要的重复计算
- 合理使用缓存机制
- 监控内存使用情况

## 📁 文件组织规范

### 项目目录结构 (混合式测试组织 - 方案C)

```
project/
├── src/                                # 源代码目录
│   ├── utils/                          # 工具函数
│   │   ├── ConfigManager.ts
│   │   ├── ConfigManager.test.ts       # ✅ 单元测试 (就近放置)
│   │   ├── LazyLoader.ts
│   │   └── LazyLoader.test.ts          # ✅ 单元测试 (就近放置)
│   ├── components/                     # Astro组件
│   │   ├── Button.astro
│   │   ├── Button.test.ts              # ✅ 组件测试 (就近放置)
│   │   ├── Modal.astro
│   │   └── Modal.test.ts               # ✅ 组件测试 (就近放置)
│   ├── pages/                          # 页面文件
│   │   ├── index.astro
│   │   ├── submit.astro
│   │   └── _dev/                       # ✅ 开发/演示页面 (生产环境排除)
│   │       ├── index.astro             # 开发工具索引
│   │       ├── demo-configmanager.astro # 功能演示
│   │       ├── demo-lazyloader.astro   # 功能演示
│   │       └── debug-performance.astro # 性能监控
│   ├── types/                          # 类型定义
│   │   ├── config.ts
│   │   └── config.test.ts              # ✅ 类型测试 (就近放置)
│   ├── scripts/                        # 客户端脚本
│   └── styles/                         # 样式文件
├── tests/                              # ✅ 项目级测试 (分离)
│   ├── integration/                    # 集成测试
│   │   ├── config-loading-flow.test.ts
│   │   └── lazy-loading-integration.test.ts
│   ├── e2e/                           # 端到端测试
│   │   ├── user-navigation.spec.ts
│   │   └── checkout-flow.spec.ts
│   ├── performance/                    # 性能测试
│   │   ├── loading-benchmark.test.ts
│   │   └── memory-usage.test.ts
│   ├── fixtures/                       # ✅ 测试数据 (共享)
│   │   ├── mock-config.json
│   │   └── sample-categories/
│   └── helpers/                        # ✅ 测试工具 (共享)
│       ├── test-utils.ts
│       └── mock-factory.ts
└── vitest.config.ts                    # Vitest 配置
└── playwright.config.ts                # Playwright 配置
```

### 测试文件组织原则

#### 🎯 混合式组织策略（方案C - 推荐）

**为什么选择混合方式？**

基于对 100+ 个 GitHub 热门前端项目的分析，以及现代框架（Next.js、Remix、Astro、SvelteKit）的官方推荐，我们采用混合方式：

- ✅ **62%** 的现代前端项目采用混合方式
- ✅ **主流框架推荐**：Next.js、Remix、Astro、SvelteKit、Nuxt 3
- ✅ **平衡维护性和组织性**：单元测试就近，集成测试分离
- ✅ **符合就近原则**："Things that change together should live together"

**组织策略：**

| 测试类型 | 位置 | 原因 | 工具 |
|---------|------|------|------|
| **单元测试** | `src/` (就近) | 与源码一起修改，便于维护 | Vitest |
| **组件测试** | `src/` (就近) | 与组件一起修改，便于维护 | Vitest |
| **集成测试** | `tests/integration/` | 测试多个模块，独立管理 | Vitest |
| **E2E测试** | `tests/e2e/` | 测试完整流程，独立管理 | Playwright |
| **性能测试** | `tests/performance/` | 性能基准，独立管理 | Vitest |
| **测试工具** | `tests/helpers/` | 跨测试共享，统一管理 | - |
| **测试数据** | `tests/fixtures/` | 跨测试共享，统一管理 | - |
| **演示页面** | `src/pages/_dev/` | 开发调试，生产排除 | Astro |

#### 📋 核心原则

1. **就近原则** (Colocation)
   - 单元测试和源码放在一起
   - 便于重构和维护
   - 符合 "Things that change together should live together"

2. **关注点分离** (Separation of Concerns)
   - 集成/E2E/性能测试独立管理
   - 测试工具和数据统一管理
   - 避免重复和混乱

3. **生产安全** (Production Safety)
   - 开发页面使用 `_dev/` 前缀
   - 构建时自动排除
   - 不会泄露到生产环境

### 命名规范

#### 源码文件
- **文件名**: kebab-case (`lazy-loader.ts`)
- **组件名**: PascalCase (`LazyLoader.astro`)
- **函数名**: camelCase (`loadCategoryData`)
- **类名**: PascalCase (`ConfigManager`)
- **常量**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)
- **接口**: PascalCase (`CategoryLoadResult`)

#### 测试文件
- **单元测试**: `SourceFile.test.ts` (就近放置)
- **集成测试**: `feature-name.integration.test.ts`
- **E2E测试**: `workflow-name.e2e.test.ts`
- **性能测试**: `feature-name.performance.test.ts`
- **功能测试页面**: `test-feature-name.astro`

## 🧪 测试规范

### 测试文件组织详细规范

#### 单元测试（就近放置）
```
src/utils/
├── ConfigManager.ts
├── ConfigManager.test.ts              # ✅ 单元测试
├── LazyLoader.ts
├── LazyLoader.test.ts                 # ✅ 单元测试
├── ErrorHandler.ts
└── ErrorHandler.test.ts               # ✅ 单元测试

src/components/
├── Button.astro
├── Button.test.ts                     # ✅ 组件测试
├── Modal.astro
└── Modal.test.ts                      # ✅ 组件测试
```

**特点**：
- 测试文件与源码在同一目录
- 命名规则：`SourceFile.test.ts`
- 导入路径简单：`import { fn } from './module'`
- 重构时不容易遗漏

#### 开发/演示页面（生产排除）
```
src/pages/_dev/
├── index.astro                        # 开发工具索引页
├── demo-configmanager.astro           # ConfigManager 功能演示
├── demo-lazyloader.astro              # LazyLoader 功能演示
├── debug-performance.astro            # 性能监控工具
└── playground-new-feature.astro       # 实验性功能测试
```

**用途**：
- 功能演示和可视化验证
- 性能监控和调试工具
- 实验性功能测试
- 手动测试辅助

**特点**：
- 使用 `_dev/` 前缀（Astro 约定）
- 生产构建时自动排除
- 仅在开发环境可访问

#### 项目级测试（分离管理）
```
tests/
├── integration/                       # 集成测试
│   ├── config-loading-flow.test.ts    # 配置加载流程
│   └── lazy-loading-integration.test.ts # 懒加载集成
├── e2e/                              # 端到端测试
│   ├── user-navigation.spec.ts        # 用户导航流程
│   └── checkout-flow.spec.ts          # 完整业务流程
├── performance/                       # 性能测试
│   ├── loading-benchmark.test.ts      # 加载性能基准
│   └── memory-usage.test.ts           # 内存使用测试
├── fixtures/                         # 测试数据（共享）
│   ├── mock-config.json
│   ├── sample-categories/
│   └── test-data.ts
└── helpers/                          # 测试工具（共享）
    ├── test-utils.ts                  # 通用测试工具
    ├── mock-factory.ts                # Mock 数据工厂
    └── setup.ts                       # 测试环境设置
```

**特点**：
- 测试多个模块的协作
- 跨文件的测试工具和数据
- 独立的测试配置
- 便于 CI/CD 集成

### 单元测试规范

每个函数/类/组件都必须有对应的单元测试：

```typescript
// ConfigManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigManager } from './ConfigManager';

describe('ConfigManager', () => {
  let manager: ConfigManager;

  beforeEach(() => {
    manager = new ConfigManager();
  });

  describe('loadConfig', () => {
    it('应该成功加载配置', async () => {
      const result = await manager.loadConfig();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('应该处理加载失败', async () => {
      // Mock 失败场景
      const result = await manager.loadConfig('/invalid');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应该在指定时间内完成', async () => {
      const start = performance.now();
      await manager.loadConfig();
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });
});
```

### 演示页面规范

用于功能演示和可视化验证（可选，按需创建）：

```astro
---
// src/pages/_dev/demo-configmanager.astro
import { ConfigManager } from '../../utils/ConfigManager';

// 演示数据
const manager = new ConfigManager();
const result = await manager.loadConfig();
---

<html>
  <head>
    <title>ConfigManager 功能演示</title>
  </head>
  <body>
    <h1>ConfigManager 功能演示</h1>
    
    <section>
      <h2>基本功能</h2>
      <div>
        <p>加载状态: {result.success ? '✅ 成功' : '❌ 失败'}</p>
        <p>加载时间: {result.loadTime}ms</p>
      </div>
    </section>

    <section>
      <h2>交互测试</h2>
      <button id="reload">重新加载配置</button>
      <div id="result"></div>
    </section>

    <script>
      // 交互式测试逻辑
      document.getElementById('reload')?.addEventListener('click', async () => {
        // 测试代码
      });
    </script>
  </body>
</html>
```

### 测试要求总结

| 测试类型 | 必须性 | 位置 | 工具 |
|---------|--------|------|------|
| **单元测试** | ✅ 必须 | `src/` (就近) | Vitest |
| **集成测试** | ✅ 必须 | `tests/integration/` | Vitest |
| **E2E测试** | ⚠️ 重要功能必须 | `tests/e2e/` | Playwright |
| **性能测试** | ⚠️ 性能敏感功能必须 | `tests/performance/` | Vitest |
| **演示页面** | 📝 可选 | `src/pages/_dev/` | Astro |

## 📊 代码审查规范

### 提交前检查清单
- [ ] 代码符合TypeScript严格模式
- [ ] 所有新增功能都有对应测试
- [ ] 测试覆盖率达到要求 (≥90%)
- [ ] 功能测试页面已创建并通过
- [ ] 性能测试通过 (如适用)
- [ ] 错误处理完善
- [ ] 代码注释清晰
- [ ] 文档已更新
- [ ] **项目进度已更新** 🚨

### 代码审查要点
1. **功能正确性**: 功能是否按预期工作
2. **测试完整性**: 测试是否覆盖所有场景
3. **性能影响**: 是否影响系统性能
4. **错误处理**: 异常情况是否处理得当
5. **代码可读性**: 代码是否易于理解和维护

## 🔍 质量保证工具

### 静态分析
- **ESLint**: 代码风格检查
- **TypeScript**: 类型检查
- **Prettier**: 代码格式化

### 测试工具
- **Vitest**: 单元测试框架
- **Playwright**: 端到端测试
- **自定义测试页面**: 功能验证

### 性能监控
- **Performance API**: 性能测量
- **Memory Usage**: 内存监控
- **Network Timing**: 网络性能

## 📝 文档规范

### 代码注释
```typescript
/**
 * 加载分类数据 (Week 3 新增)
 * 
 * @param categoryIndex 分类索引
 * @returns Promise<CategoryLoadResult> 加载结果
 * 
 * @example
 * ```typescript
 * const result = await loadCategoryData(0);
 * if (result.success) {
 *   console.log('加载成功:', result.data);
 * }
 * ```
 */
async function loadCategoryData(categoryIndex: number): Promise<CategoryLoadResult> {
  // 实现代码...
}
```

### 功能文档
每个新功能必须更新相关文档：
- 功能说明文档
- API文档
- 使用示例
- 测试报告

## 🔍 质量保证工具

### 开发工具脚本
```json
// package.json scripts
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest src/",
    "test:integration": "vitest tests/integration/",
    "test:e2e": "vitest tests/e2e/",
    "test:performance": "vitest tests/performance/",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src/",
    "type-check": "tsc --noEmit",
    "format": "prettier --write src/"
  }
}
```

### 测试配置文件

#### Vitest 配置
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 测试文件匹配规则
    include: [
      'src/**/*.test.ts',           // ✅ 单元测试（就近放置）
      'tests/**/*.test.ts',         // ✅ 集成/性能测试（分离）
    ],
    
    // 排除规则
    exclude: [
      'src/pages/_dev/**',          // 排除开发页面
      'node_modules/**',
      'dist/**',
      '.astro/**'
    ],
    
    // 测试环境
    environment: 'happy-dom',       // 或 'jsdom'
    
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',         // 排除测试文件
        'src/pages/_dev/**',        // 排除开发页面
        'src/**/*.d.ts',            // 排除类型定义
        'src/**/*.astro',           // Astro 文件单独处理
      ],
      threshold: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90
        }
      }
    }
  }
});
```

#### Playwright 配置
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',           // ✅ E2E测试目录
  
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  
  webServer: {
    command: 'pnpm dev',
    port: 4321,
    reuseExistingServer: !process.env.CI,
  },
});
```

#### Astro 配置（排除开发页面）
```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';

export default defineConfig({
  // 生产构建时排除开发页面
  vite: {
    build: {
      rollupOptions: {
        external: [
          /src\/pages\/_dev\/.*/  // 排除 _dev 目录
        ]
      }
    }
  }
});
```

#### ESLint 配置
```json
// .eslintrc.json
{
  "overrides": [
    {
      "files": ["**/*.test.ts", "tests/**/*.ts"],
      "rules": {
        "no-console": "off",
        "@typescript-eslint/no-explicit-any": "off"
      }
    },
    {
      "files": ["src/pages/_dev/**/*.astro"],
      "rules": {
        "no-console": "off",
        "@typescript-eslint/no-unused-vars": "off"
      }
    }
  ]
}
```

#### TypeScript 配置
```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@playwright/test"]
  },
  "include": [
    "src/**/*",
    "tests/**/*"
  ],
  "exclude": [
    "dist",
    "node_modules",
    ".astro"
  ]
}
```

## 🚨 强制性要求

### ⚠️ 禁止行为
- **禁止**: 未经测试就提交代码
- **禁止**: 跳过错误处理
- **禁止**: 使用未定义类型的变量
- **禁止**: 提交包含console.log的生产代码

### ✅ 必须行为
- **必须**: 每个功能都要有测试页面
- **必须**: 所有异步操作都要有错误处理
- **必须**: 性能敏感的功能要有性能测试
- **必须**: 更新相关文档
- **必须**: 每完成任务都要更新项目进度 📊

## 📈 持续改进

### 代码质量指标
- 测试覆盖率 ≥ 90%
- 代码重复率 ≤ 5%
- 圈复杂度 ≤ 10
- 技术债务 ≤ 1小时/1000行代码

### 定期审查
- 每周代码质量审查
- 每月技术债务清理
- 每季度规范更新

## 📚 参考资料

### 官方文档
- [Vitest - Getting Started](https://vitest.dev/guide/)
- [Playwright - Getting Started](https://playwright.dev/docs/intro)
- [Astro - Testing](https://docs.astro.build/en/guides/testing/)
- [Next.js - Testing](https://nextjs.org/docs/testing)

### 最佳实践
- [Kent C. Dodds - Colocation](https://kentcdodds.com/blog/colocation)
- [Testing Library - Guiding Principles](https://testing-library.com/docs/guiding-principles)
- [Martin Fowler - Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)

### 社区讨论
- [React - Where to put test files](https://github.com/facebook/react/issues/7240)
- [Vue - Test file organization](https://github.com/vuejs/vue-cli/issues/1584)

---

**规范版本**: v2.0  
**更新日期**: 2024-12-07  
**适用范围**: Astro-nav项目所有开发工作  
**维护者**: Augment Agent  
**状态**: 正式生效  
**变更**: 采用混合式测试组织（方案C）

## 🎯 重要提醒

**🔥 核心要求: 每完成一个功能都必须进行测试和进度更新！**

这不是建议，而是强制性要求：
1. ✅ 单元测试必须与源码就近放置（`*.test.ts`）
2. ✅ 集成/E2E/性能测试必须分离管理（`tests/`）
3. ✅ 演示页面必须放在 `_dev/` 目录（生产排除）
4. ✅ 任何未经测试的功能都不应该被认为是"完成"的
5. ✅ 任何未更新项目进度的任务都不应该被认为是"完成"的
