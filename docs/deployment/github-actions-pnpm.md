# GitHub Actions 使用 pnpm 部署指南

本文档说明如何配置 GitHub Actions 使用 pnpm 进行自动化部署。

## 📋 目录

- [更新概述](#更新概述)
- [工作流配置](#工作流配置)
- [关键变更](#关键变更)
- [配置说明](#配置说明)
- [故障排查](#故障排查)

## 更新概述

### 更新时间
**2024-12-07**

### 更新原因
项目已从 npm 迁移到 pnpm，GitHub Actions 工作流需要相应更新以支持 pnpm。

### 主要变更
- ✅ 使用 `pnpm/action-setup@v2` 安装 pnpm
- ✅ 配置 pnpm 缓存以加速构建
- ✅ 使用 `pnpm install --frozen-lockfile` 安装依赖
- ✅ 配置 Astro action 使用 pnpm 作为包管理器
- ✅ 更新所有命令从 `npm` 改为 `pnpm`

## 工作流配置

### 完整配置文件

位置：`.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      # 1. 检出代码
      - name: Checkout source repo
        uses: actions/checkout@v4

      # 2. 设置 Node.js
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      # 3. 安装 pnpm
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      # 4. 获取 pnpm 存储目录
      - name: Get pnpm store directory
        shell: bash
        run: |
          echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

      # 5. 设置 pnpm 缓存
      - name: Setup pnpm cache
        uses: actions/cache@v3
        with:
          path: ${{ env.STORE_PATH }}
          key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
          restore-keys: |
            ${{ runner.os }}-pnpm-store-

      # 6. 安装依赖
      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      # 7. 复制配置文件
      - name: Copy config files to static directory
        run: pnpm run copy-config

      # 8. 使用 Astro action 构建
      - name: Build with Astro
        uses: withastro/action@v3
        with:
          package-manager: pnpm

      # 9. 调试输出（可选）
      - name: Debug Build Output
        run: |
          echo "=== Contents of dist directory ==="
          ls -la dist/
          echo "=== Contents of dist/sitemap* ==="
          find dist/ -name "sitemap*" -type f -exec ls -la {} \;
          echo "=== Sitemap contents ==="
          cat dist/sitemap-index.xml || true
          cat dist/sitemap-0.xml || true

      # 10. 部署到 GitHub Pages
      - name: Deploy to GitHub Pages repo
        uses: peaceiris/actions-gh-pages@v3
        with:
          personal_token: ${{ secrets.GIT_TOKEN }}
          external_repository: affnav/affnav.github.io
          publish_branch: main
          publish_dir: ./dist
          force_orphan: true
          user_name: "github-actions[bot]"
          user_email: "github-actions[bot]@users.noreply.github.com"
          commit_message: "Deploy to GitHub Pages"
          full_commit_message: "Deploy to GitHub Pages from ${{ github.sha }}"
```

## 关键变更

### 1. 安装 pnpm

**之前（npm）**:
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: "20"
    cache: npm
```

**现在（pnpm）**:
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: "20"

- name: Install pnpm
  uses: pnpm/action-setup@v2
  with:
    version: 8
```

### 2. 缓存策略

**之前（npm）**:
- Node.js action 自动处理 npm 缓存

**现在（pnpm）**:
```yaml
- name: Get pnpm store directory
  shell: bash
  run: |
    echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

- name: Setup pnpm cache
  uses: actions/cache@v3
  with:
    path: ${{ env.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-store-
```

**优势**：
- 缓存 pnpm 全局存储
- 使用 `pnpm-lock.yaml` 作为缓存键
- 支持部分缓存命中（restore-keys）

### 3. 安装依赖

**之前（npm）**:
```yaml
- name: Install dependencies
  run: npm ci
```

**现在（pnpm）**:
```yaml
- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

**对比**：
| 特性 | npm ci | pnpm install --frozen-lockfile |
|------|--------|-------------------------------|
| 锁文件严格 | ✅ | ✅ |
| 速度 | 基准 | **快 2-3 倍** |
| 磁盘空间 | 基准 | **节省 50-70%** |
| CI 推荐 | ✅ | ✅ |

### 4. Astro 构建

**之前（npm）**:
```yaml
- name: Install and Build
  uses: withastro/action@v3
```

**现在（pnpm）**:
```yaml
- name: Build with Astro
  uses: withastro/action@v3
  with:
    package-manager: pnpm
```

**关键**：必须指定 `package-manager: pnpm`，否则 action 会默认使用 npm。

### 5. 运行脚本

**之前（npm）**:
```yaml
- name: Copy config files
  run: npm run copy-config
```

**现在（pnpm）**:
```yaml
- name: Copy config files
  run: pnpm run copy-config
```

## 配置说明

### pnpm 版本选择

```yaml
- name: Install pnpm
  uses: pnpm/action-setup@v2
  with:
    version: 8  # 主版本号
```

**选项**：
- `version: 8` - 使用 pnpm 8.x 最新版（推荐）
- `version: 8.15.0` - 使用特定版本
- `version: latest` - 使用最新版本（不推荐，可能不稳定）

**本项目使用**：`version: 8`（与本地开发保持一致）

### frozen-lockfile 标志

```yaml
pnpm install --frozen-lockfile
```

**作用**：
- 不修改 `pnpm-lock.yaml`
- 如果 `package.json` 与锁文件不匹配，构建失败
- 确保 CI 环境与本地环境一致

**等同于**：
- `npm ci`（npm）
- `yarn install --frozen-lockfile`（yarn）

### 缓存配置详解

```yaml
- name: Setup pnpm cache
  uses: actions/cache@v3
  with:
    path: ${{ env.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-store-
```

**字段说明**：

1. **path**: pnpm 全局存储位置
   - 通过 `pnpm store path` 获取
   - 通常是 `~/.local/share/pnpm/store`

2. **key**: 缓存键
   - 格式：`{OS}-pnpm-store-{锁文件哈希}`
   - 锁文件变化时，缓存失效

3. **restore-keys**: 回退键
   - 如果精确匹配失败，使用前缀匹配
   - 可以复用部分缓存

**缓存效果**：
- 首次构建：下载所有依赖（~2-3 分钟）
- 后续构建：使用缓存（~30 秒）

## 故障排查

### 问题 1：pnpm 命令未找到

**错误信息**：
```
pnpm: command not found
```

**原因**：
- 未安装 pnpm
- pnpm action 未正确执行

**解决方案**：
```yaml
# 确保在使用 pnpm 之前安装
- name: Install pnpm
  uses: pnpm/action-setup@v2
  with:
    version: 8
```

### 问题 2：依赖安装失败

**错误信息**：
```
ERR_PNPM_LOCKFILE_MISSING_DEPENDENCY
```

**原因**：
- `pnpm-lock.yaml` 与 `package.json` 不同步

**解决方案**：
```bash
# 本地重新生成锁文件
rm pnpm-lock.yaml
pnpm install
git add pnpm-lock.yaml
git commit -m "Update pnpm lock file"
```

### 问题 3：Astro 构建使用 npm

**现象**：
- 构建日志显示 `npm install`
- 忽略了 pnpm 配置

**原因**：
- 未配置 `package-manager`

**解决方案**：
```yaml
- name: Build with Astro
  uses: withastro/action@v3
  with:
    package-manager: pnpm  # 必须指定
```

### 问题 4：缓存未生效

**现象**：
- 每次构建都重新下载依赖

**检查点**：
1. 确认 `pnpm-lock.yaml` 已提交
2. 检查缓存键配置
3. 查看 Actions 日志中的缓存状态

**解决方案**：
```yaml
# 确保缓存键正确
key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
```

### 问题 5：构建慢

**优化建议**：

1. **使用缓存**（已配置）
2. **减少依赖**：
   ```bash
   pnpm why <package>  # 检查为什么安装了某个包
   ```

3. **并行构建**：
   ```yaml
   # 如果有多个任务，使用矩阵策略
   strategy:
     matrix:
       node-version: [18, 20]
   ```

4. **跳过可选依赖**：
   ```yaml
   - name: Install dependencies
     run: pnpm install --frozen-lockfile --ignore-scripts
   ```

## 性能对比

### 构建时间对比（预估）

| 阶段 | npm | pnpm | 改善 |
|------|-----|------|------|
| 安装依赖（无缓存）| 120s | 50s | **58% 提升** |
| 安装依赖（有缓存）| 60s | 20s | **67% 提升** |
| 总构建时间 | 180s | 90s | **50% 提升** |

### 磁盘空间使用

| 项目 | npm | pnpm | 节省 |
|------|-----|------|------|
| node_modules | 200MB | 100MB | 50% |
| 缓存大小 | 500MB | 300MB | 40% |

## 最佳实践

### 1. 锁文件管理

```bash
# ✅ 始终提交 pnpm-lock.yaml
git add pnpm-lock.yaml
git commit -m "Update dependencies"

# ❌ 不要提交 package-lock.json 或 yarn.lock
```

### 2. 版本一致性

```yaml
# package.json
{
  "engines": {
    "node": ">=18",
    "pnpm": ">=8"
  }
}
```

### 3. CI 环境变量

```yaml
env:
  CI: true
  PNPM_HOME: /root/.local/share/pnpm
```

### 4. 安全性

```yaml
# 使用 secrets 管理敏感信息
- name: Deploy
  env:
    GITHUB_TOKEN: ${{ secrets.GIT_TOKEN }}
```

### 5. 调试

```yaml
# 添加调试步骤
- name: Debug Info
  run: |
    echo "Node version: $(node -v)"
    echo "pnpm version: $(pnpm -v)"
    echo "pnpm store: $(pnpm store path)"
    pnpm list --depth 0
```

## 相关链接

- [pnpm 官方文档](https://pnpm.io/)
- [pnpm GitHub Action](https://github.com/pnpm/action-setup)
- [Astro GitHub Action](https://github.com/withastro/action)
- [GitHub Actions 缓存文档](https://docs.github.com/en/actions/using-workflows/caching-dependencies-to-speed-up-workflows)
- [项目 pnpm 使用指南](../pnpm-guide.md)

## 更新日志

- **2024-12-07**: 初始版本，从 npm 迁移到 pnpm
- 更新了所有工作流步骤
- 添加了 pnpm 缓存配置
- 配置 Astro action 使用 pnpm

## 贡献

如果发现工作流配置有问题或需要优化，请：
1. 创建 Issue 报告问题
2. 提交 PR 改进配置
3. 更新本文档

---

**维护者**: Astro-nav Team  
**最后更新**: 2024-12-07  
**状态**: ✅ 已验证