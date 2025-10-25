# pnpm 使用指南

本项目已从 npm 迁移到 pnpm，以获得更好的性能、更小的磁盘占用和更严格的依赖管理。

## 📋 目录

- [为什么选择 pnpm](#为什么选择-pnpm)
- [pnpm 的核心特性](#pnpm-的核心特性)
- [安装和配置](#安装和配置)
- [常用命令](#常用命令)
- [依赖管理](#依赖管理)
- [故障排查](#故障排查)

## 为什么选择 pnpm

### 🚀 性能优势

| 特性 | npm | pnpm | 优势 |
|------|-----|------|------|
| 安装速度 | 基准 | **快 2-3 倍** | ⚡ 并行下载 + 硬链接 |
| 磁盘空间 | 基准 | **节省 50-70%** | 💾 内容寻址存储 |
| node_modules 大小 | ~200MB | **~100MB** | 📦 符号链接共享 |

### 🔒 安全性

- **防止幽灵依赖**: 只能访问 `package.json` 中声明的依赖
- **严格的依赖树**: 避免意外的版本冲突
- **确定性安装**: 锁文件保证环境一致性

### 💡 开发体验

- **更快的 CI/CD**: 安装速度提升显著
- **更小的镜像**: Docker 镜像体积减小
- **更清晰的依赖关系**: 依赖结构一目了然

## pnpm 的核心特性

### 1. 内容寻址存储 (Content-Addressable Storage)

```
全局存储位置: D:\MCP-Services\pnpm-store

项目A: node_modules → 硬链接 → 全局存储
项目B: node_modules → 硬链接 → 同一个全局存储
项目C: node_modules → 硬链接 → 同一个全局存储

✅ 相同版本的包只存储一次
✅ 节省大量磁盘空间
✅ 安装速度极快
```

**工作原理**:
- 所有包的文件都存储在全局存储目录中
- 每个项目使用**硬链接**指向存储中的文件
- 相同版本的包在所有项目间共享
- 即使有 100 个项目使用同一个包，磁盘上也只存储一份

### 2. 非扁平化的 node_modules

**npm/yarn 的结构** (扁平化):
```
node_modules/
├── package-a/
├── package-b/
├── package-c/          # package-a 的依赖
└── package-d/          # package-b 的依赖
```
❌ 问题: 可以直接 `import 'package-c'`，即使没在 package.json 中声明（幽灵依赖）

**pnpm 的结构** (符号链接):
```
node_modules/
├── .pnpm/
│   ├── package-a@1.0.0/
│   │   └── node_modules/
│   │       ├── package-a/     # 真实文件
│   │       └── package-c/     # 符号链接到 .pnpm/package-c@1.0.0
│   ├── package-b@1.0.0/
│   └── package-c@1.0.0/
├── package-a -> .pnpm/package-a@1.0.0/node_modules/package-a
└── package-b -> .pnpm/package-b@1.0.0/node_modules/package-b
```
✅ 只能访问声明的依赖
✅ 防止幽灵依赖
✅ 更清晰的依赖树

### 3. 符号链接 vs 硬链接

```
符号链接 (Symbolic Link)
├── 作用: node_modules/ 中的包指向 .pnpm/ 中的包
├── 特点: 类似快捷方式，指向另一个位置
└── 目的: 构建正确的依赖关系

硬链接 (Hard Link)
├── 作用: .pnpm/ 中的文件指向全局存储中的文件
├── 特点: 多个路径指向同一个 inode（真实文件）
└── 目的: 节省磁盘空间
```

**查看链接**:
```bash
# 查看根目录的符号链接
ls -la node_modules/ | grep "^l"

# 输出示例:
# lrwxrwxrwx ... astro -> .pnpm/astro@4.16.19/.../astro
# lrwxrwxrwx ... jszip -> .pnpm/jszip@3.10.1/.../jszip
```

## 安装和配置

### 安装 pnpm

```bash
# 使用 npm 安装（全局）
npm install -g pnpm

# 验证安装
pnpm --version
```

### 项目配置文件

#### `.npmrc` - pnpm 配置

项目根目录的 `.npmrc` 文件配置了 pnpm 的行为:

```ini
# 严格依赖管理
strict-peer-dependencies=true
auto-install-peers=true
resolve-peers-from-workspace-root=true

# 防止幽灵依赖（核心配置）
shamefully-hoist=false
hoist=false

# 性能优化
package-import-method=auto
network-concurrency=16
lockfile=true

# 安全性
verify-store-integrity=true
engine-strict=true

# 其他
symlink=true
loglevel=info
```

**关键配置说明**:

| 配置项 | 值 | 说明 |
|-------|---|------|
| `strict-peer-dependencies` | `true` | 严格检查 peer dependencies |
| `shamefully-hoist` | `false` | 不提升依赖到根目录（防止幽灵依赖）|
| `hoist` | `false` | 禁用依赖提升（防止幽灵依赖）|
| `package-import-method` | `auto` | 自动选择最佳导入方式（硬链接）|
| `network-concurrency` | `16` | 并行下载 16 个包 |

## 常用命令

### 基础命令对照

| 任务 | npm | pnpm |
|-----|-----|------|
| 安装依赖 | `npm install` | `pnpm install` |
| 添加依赖 | `npm install pkg` | `pnpm add pkg` |
| 添加开发依赖 | `npm install -D pkg` | `pnpm add -D pkg` |
| 删除依赖 | `npm uninstall pkg` | `pnpm remove pkg` |
| 更新依赖 | `npm update` | `pnpm update` |
| 运行脚本 | `npm run script` | `pnpm run script` |
| 全局安装 | `npm install -g pkg` | `pnpm add -g pkg` |

### 本项目的脚本命令

```bash
# 开发
pnpm run dev              # 启动开发服务器
pnpm run dev:watch        # 带配置监听的开发模式
pnpm run start            # 同 dev

# 构建
pnpm run build            # 构建生产版本
pnpm run build-config     # 生成优化配置
pnpm run preview          # 预览构建结果

# 检查
pnpm run check            # 运行 Astro 类型检查和依赖检查
pnpm run check-deps       # 检查幽灵依赖

# 配置管理
pnpm run prepare-config   # 准备配置文件
pnpm run copy-config      # 复制配置文件
```

### pnpm 特有命令

```bash
# 查看依赖树
pnpm list --depth=0       # 查看直接依赖
pnpm list --depth=1       # 查看一层依赖树

# 为什么安装了这个包？
pnpm why package-name

# 检查过期的包
pnpm outdated

# 更新交互式
pnpm update --interactive

# 清理未使用的包
pnpm prune

# 存储管理
pnpm store status         # 查看存储状态
pnpm store prune          # 清理未使用的包（全局）
```

## 依赖管理

### 检查幽灵依赖

项目提供了自动检查工具:

```bash
pnpm run check-deps
```

**输出示例**:
```
╔════════════════════════════════════════╗
║    pnpm 依赖检查 - 幽灵依赖检测      ║
╚════════════════════════════════════════╝

📋 检查 pnpm 配置
✓ strict-peer-dependencies 已启用
✓ shamefully-hoist 已禁用（推荐）
✓ hoist 已禁用（推荐）

📦 分析 package.json
ℹ 声明的依赖数量: 13

🔍 扫描代码中的导入语句
ℹ 发现的导入数量: 5

🔬 分析结果
✓ 未发现幽灵依赖！

📊 总结
声明的依赖:     13
使用的包:       5
幽灵依赖:       0
可能未使用:     1
配置状态:       ✓ 良好
```

### 什么是幽灵依赖？

**定义**: 代码中使用了某个包，但该包没有在 `package.json` 中声明，而是通过其他依赖间接安装的。

**问题**:
1. ❌ 代码在其他环境可能无法运行
2. ❌ 依赖版本不可控（可能随时变化）
3. ❌ 难以追踪问题来源
4. ❌ 团队协作时容易出现 "我这里能跑" 的问题

**示例**:

```javascript
// package.json 中只声明了 'express'
{
  "dependencies": {
    "express": "^4.18.0"
  }
}

// 但代码中使用了 body-parser（express 的依赖）
import bodyParser from 'body-parser';  // ❌ 幽灵依赖！

// 正确做法：明确声明
{
  "dependencies": {
    "express": "^4.18.0",
    "body-parser": "^1.20.0"  // ✅ 明确声明
  }
}
```

**pnpm 如何防止**:

在 npm/yarn 中，`body-parser` 会被提升到 `node_modules/` 根目录，可以直接导入。

在 pnpm 中，只有 `package.json` 中声明的包会被链接到 `node_modules/` 根目录，未声明的包无法直接访问。

### 添加新依赖

```bash
# 生产依赖
pnpm add package-name

# 开发依赖
pnpm add -D package-name

# 指定版本
pnpm add package-name@1.2.3

# 添加多个
pnpm add pkg1 pkg2 pkg3

# 从其他项目复制依赖
pnpm import  # 从 package-lock.json 导入
```

### 更新依赖

```bash
# 更新所有依赖到允许的最新版本
pnpm update

# 更新特定包
pnpm update package-name

# 更新到最新版本（包括主版本）
pnpm update package-name --latest

# 交互式更新
pnpm update --interactive
pnpm update --interactive --latest
```

### 锁文件管理

```bash
# 使用锁文件安装（CI/CD 推荐）
pnpm install --frozen-lockfile

# 更新锁文件
pnpm install --no-frozen-lockfile

# 查看锁文件差异
git diff pnpm-lock.yaml
```

## 故障排查

### 常见问题

#### 1. 安装失败

```bash
# 清理缓存
pnpm store prune
rm -rf node_modules
rm pnpm-lock.yaml

# 重新安装
pnpm install
```

#### 2. 找不到模块

**错误**: `Cannot find module 'xxx'`

**原因**: 可能是幽灵依赖

**解决**:
```bash
# 检查是否是幽灵依赖
pnpm run check-deps

# 如果是，添加到 package.json
pnpm add xxx
```

#### 3. peer dependency 警告

```bash
# 自动安装 peer dependencies
pnpm install --strict-peer-dependencies=false

# 或在 .npmrc 中配置
auto-install-peers=true
```

#### 4. 权限问题

**Windows**:
```bash
# 以管理员权限运行终端
```

**Linux/Mac**:
```bash
# 不要使用 sudo
# 配置正确的 npm 全局目录权限
```

#### 5. 符号链接不工作

**Windows**: 需要开启开发者模式或以管理员权限运行

**检查**:
```bash
ls -la node_modules/ | grep "^l"
# 应该看到 lrwxrwxrwx 开头的符号链接
```

### 性能优化

#### 查看存储使用情况

```bash
# 查看全局存储状态
pnpm store status

# 输出示例:
# Content-addressable store: D:\MCP-Services\pnpm-store
# Used: 1.2 GB
# Files: 12,345
```

#### 清理未使用的包

```bash
# 清理全局存储中未被任何项目使用的包
pnpm store prune

# 清理当前项目的 node_modules
pnpm prune
```

#### 加速安装

```bash
# 使用国内镜像（如果需要）
pnpm config set registry https://registry.npmmirror.com

# 增加并发数
pnpm config set network-concurrency 32

# 使用本地缓存
pnpm config set store-dir /path/to/local/store
```

### 迁移回 npm（如果需要）

```bash
# 1. 删除 pnpm 文件
rm -rf node_modules pnpm-lock.yaml .npmrc

# 2. 从 package.json 安装
npm install

# 3. 更新 package.json 中的脚本
# 将 pnpm run 改回 npm run
```

## 最佳实践

### 1. 版本控制

**提交到 Git**:
- ✅ `pnpm-lock.yaml` - 锁定依赖版本
- ✅ `.npmrc` - 项目配置
- ✅ `package.json` - 依赖声明
- ❌ `node_modules/` - 太大，不要提交

### 2. CI/CD 配置

```yaml
# GitHub Actions 示例
- name: Install pnpm
  uses: pnpm/action-setup@v2
  with:
    version: 8

- name: Install dependencies
  run: pnpm install --frozen-lockfile

- name: Build
  run: pnpm run build
```

### 3. 团队协作

1. **统一工具**: 确保团队成员都使用 pnpm
2. **锁文件**: 始终提交 `pnpm-lock.yaml`
3. **配置同步**: `.npmrc` 配置保持一致
4. **文档**: 在 README 中说明使用 pnpm

### 4. monorepo 支持

虽然当前项目是单仓库，但 pnpm 对 monorepo 有很好的支持:

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

### 5. 定期维护

```bash
# 每周/每月运行
pnpm outdated           # 检查过期包
pnpm update             # 更新依赖
pnpm run check-deps     # 检查幽灵依赖
pnpm store prune        # 清理存储
```

## 参考资源

- [pnpm 官方文档](https://pnpm.io/)
- [pnpm vs npm vs yarn](https://pnpm.io/benchmarks)
- [pnpm 工作原理](https://pnpm.io/symlinked-node-modules-structure)
- [处理幽灵依赖](https://pnpm.io/blog/2021/05/17/when-you-should-use-pnpm)

## 总结

### 🎯 关键要点

1. **pnpm 节省磁盘空间**: 通过硬链接和内容寻址存储
2. **防止幽灵依赖**: 严格的依赖隔离机制
3. **更快的安装速度**: 并行下载 + 硬链接
4. **更安全的依赖管理**: 明确的依赖关系

### ✅ 检查清单

- [ ] 团队成员都安装了 pnpm
- [ ] `.npmrc` 配置正确
- [ ] `pnpm-lock.yaml` 已提交到 Git
- [ ] 运行 `pnpm run check-deps` 无幽灵依赖
- [ ] CI/CD 配置已更新
- [ ] 团队文档已更新

---

**维护者**: Astro-nav Team  
**最后更新**: 2024-12-07  
**pnpm 版本**: 10.19.0