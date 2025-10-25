# 🚀 Astro-nav - 高性能导航网站

[![GitHub Stars](https://img.shields.io/github/stars/51nav/Astro-nav?style=flat-square)](https://github.com/51nav/Astro-nav)
[![GitHub Issues](https://img.shields.io/github/issues/51nav/Astro-nav?style=flat-square)](https://github.com/51nav/Astro-nav/issues)
[![License](https://img.shields.io/github/license/51nav/Astro-nav?style=flat-square)](LICENSE)

基于Astro构建的高性能导航网站，具有**95%文件压缩**和**毫秒级加载**的极致性能优化。

## ✨ 核心特性

### 🚀 极致性能
- **95%文件压缩**: 从33KB压缩到1.6KB
- **毫秒级响应**: 14ms分类切换，12ms完整流程
- **智能懒加载**: 按需加载分类数据
- **双层缓存**: 内存缓存 + 本地存储

### 🔧 智能管理
- **格式自动检测**: 80%置信度识别配置格式
- **CSV构建系统**: 自动化配置生成
- **版本兼容**: 同时支持传统和优化格式
- **错误处理**: 完善的降级和重试机制

### 📊 数据管理
- **CSV导入**: 支持菜单和网站数据批量导入
- **配置优化**: 自动拆分和压缩配置文件
- **数据验证**: 完整的数据格式验证
- **实时监控**: 性能指标实时统计

## 🎯 性能对比

| 指标 | 传统方式 | Astro-nav | 改善幅度 |
|------|---------|-----------|---------|
| 配置文件大小 | 33,271字符 | 1,588字符 | **95.2%减少** |
| 首屏加载时间 | ~2000ms | <500ms | **75%提升** |
| 分类切换时间 | ~500ms | 14ms | **97%提升** |
| 缓存命中率 | 0% | >80% | **全新功能** |

## 🚀 快速开始

### 环境要求
- Node.js 18+
- pnpm (推荐) 或 npm

### 安装步骤

```bash
# 克隆项目
git clone https://github.com/51nav/Astro-nav.git
cd Astro-nav

# 安装 pnpm (如果还没有)
npm install -g pnpm

# 安装依赖
pnpm install

# 生成配置文件
pnpm run build-config

# 启动开发服务器
pnpm run dev
```

> 💡 本项目使用 **pnpm** 作为包管理器，提供更快的安装速度和更小的磁盘占用。详见 [pnpm 使用指南](docs/pnpm-guide.md)。

### 访问项目
- 开发服务器: http://localhost:4321
- 配置生成器: http://localhost:4321/config-generator

## 📁 项目结构

```text
Astro-nav/
├── src/
│   ├── components/          # Astro组件
│   ├── pages/              # 页面文件
│   ├── utils/              # 工具函数
│   ├── types/              # TypeScript类型
│   └── data/               # 源数据文件
├── static/                 # 静态资源
│   ├── config.json         # 优化配置文件
│   └── categories/         # 分类数据文件
├── scripts/                # 构建脚本
├── docs/                   # 项目文档
└── test-data/              # 测试数据
```

## 🧞 命令说明

| 命令 | 功能 |
|------|------|
| `pnpm run dev` | 启动开发服务器 |
| `pnpm run build` | 构建生产版本 |
| `pnpm run build-config` | 生成优化配置 |
| `pnpm run copy-config` | 复制配置文件 |
| `pnpm run preview` | 预览构建结果 |
| `pnpm run check-deps` | 检查幽灵依赖 |

## 📚 文档

本项目采用分层文档架构，便于不同角色用户快速找到所需信息：

- 📋 **[文档索引](docs/_index.md)** - 完整的文档导航和结构说明
- 📚 **[文档规范](docs/09-references/documentation-standards.md)** - 文档编写标准 (贡献者必读)
- 🏗️ **[文档架构](docs/09-references/directory-structure.md)** - 详细的目录结构设计

### 🚀 快速导航
- 👥 **新用户**: [用户指南](docs/user/user-guide.md) | [配置指南](docs/user/config-guide.md)
- 👨‍💻 **开发者**: [项目架构](docs/development/project-architecture.md) | [开发计划](docs/development/development-plan.md)
- 🚀 **部署**: [GitHub Actions](docs/deployment/github-actions-deployment.md)
- ✨ **功能**: [懒加载](docs/features/) | [CSV导入](docs/csv-import/)
- 📦 **包管理**: [pnpm 使用指南](docs/pnpm-guide.md)
- 📊 **进度**: [Week 3 TODO](docs/TODO-week3-frontend-integration.md)

## 🏗️ 技术架构

### 前端技术栈
- **Astro**: 现代静态站点生成器
- **TypeScript**: 类型安全的JavaScript
- **CSS**: 原生CSS，无框架依赖

### 核心组件
- **ConfigManager**: 智能配置管理
- **LazyLoader**: 懒加载组件
- **PerformanceMonitor**: 性能监控
- **CacheManager**: 缓存管理

### 数据流程
```
CSV文件 → 构建脚本 → 优化配置 → 懒加载 → 用户界面
```

## 🎨 核心功能

### 1. 懒加载系统 (Week 2 ✅)
- 按需加载分类数据
- 智能缓存机制
- 95%文件压缩
- 毫秒级响应

### 2. 前端集成 (Week 3 🔄)
- ConfigManager增强
- 用户体验优化
- 性能监控面板
- 错误处理机制

### 3. CSV导入系统 ✅
- 菜单结构导入
- 网站数据导入
- 格式验证
- 自动化构建

## 🚀 部署

项目支持GitHub Actions自动部署。详细配置请参考 [部署指南](docs/deployment/github-actions-deployment.md)。

## 🤝 贡献指南

欢迎贡献代码！请查看 [开发文档](docs/development/development-setup.md) 了解详细信息。

## 📊 项目状态

### 开发进度

- ✅ **Week 1**: 项目架构和基础功能
- ✅ **Week 2**: 懒加载系统和性能优化 (95%文件压缩)
- 🔄 **Week 3**: 前端集成和用户体验优化
- ⏳ **Week 4**: 测试和文档完善

### 版本历史

- **v2.0** (进行中): 前端集成和用户体验优化
- **v1.0** (已完成): 懒加载系统和95%性能提升

## 🐛 问题反馈

- [GitHub Issues](https://github.com/51nav/Astro-nav/issues) - 报告bug或功能请求
- [GitHub Discussions](https://github.com/51nav/Astro-nav/discussions) - 讨论和交流

## 📄 许可证

本项目采用 [MIT License](LICENSE) 许可证。

## 🙏 致谢

- [Astro](https://astro.build/) - 现代静态站点生成器
- [TypeScript](https://www.typescriptlang.org/) - JavaScript的超集
- 所有贡献者和用户的支持

---

**项目维护者**: [51nav Team](https://github.com/51nav)
**最后更新**: 2025-10-25
**项目状态**: 积极开发中
