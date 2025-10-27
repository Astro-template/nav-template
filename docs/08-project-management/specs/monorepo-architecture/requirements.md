# Monorepo 架构重构需求文档

## 简介

将现有的 Astro 导航网站项目重构为 Monorepo 架构，实现用户网站和管理后台的职责分离，提高代码复用性和开发效率。通过 pnpm workspace 和 Turborepo 实现统一的构建和开发流程。

**迁移策略：** 采用渐进式迁移方法，在独立分支上进行，每个步骤都进行验证，确保项目始终可用。迁移顺序为：基础架构 → shared 包 → website 包 → admin 包，每个阶段完成后都验证构建和运行状态。

## 需求

### 需求 1：创建 Monorepo 基础架构

**用户故事：** 作为开发者，我希望建立 Monorepo 基础架构，以便能够管理多个相关的子项目。

#### 验收标准

1. WHEN 项目初始化时 THEN 系统 SHALL 创建 pnpm workspace 配置文件
2. WHEN 项目初始化时 THEN 系统 SHALL 创建 Turborepo 配置文件
3. WHEN 项目初始化时 THEN 系统 SHALL 创建 packages 目录结构
4. WHEN 开发者运行构建命令时 THEN 系统 SHALL 支持并行构建和缓存优化
5. WHEN 开发者查看项目结构时 THEN 系统 SHALL 提供清晰的目录组织和文档说明

### 需求 2：创建用户网站子包

**用户故事：** 作为最终用户，我希望有一个专注于导航功能的网站，以便快速找到需要的资源。

#### 验收标准

1. WHEN 创建用户网站包时 THEN 系统 SHALL 配置独立的 package.json
2. WHEN 用户网站启动时 THEN 系统 SHALL 在端口 4321 上运行
3. WHEN 用户访问网站时 THEN 系统 SHALL 提供导航、搜索和详情页功能
4. WHEN 构建用户网站时 THEN 系统 SHALL 只包含用户相关的功能和资源
5. WHEN 部署用户网站时 THEN 系统 SHALL 支持独立部署到生产域名

### 需求 3：创建管理后台子包

**用户故事：** 作为开发者，我希望有一个独立的管理后台，以便管理配置和使用开发工具。

#### 验收标准

1. WHEN 创建管理后台包时 THEN 系统 SHALL 配置独立的 package.json
2. WHEN 管理后台启动时 THEN 系统 SHALL 在端口 4322 上运行
3. WHEN 开发者访问管理后台时 THEN 系统 SHALL 提供配置生成、表格导入和开发工具功能
4. WHEN 构建管理后台时 THEN 系统 SHALL 只包含管理相关的功能和资源
5. WHEN 部署管理后台时 THEN 系统 SHALL 支持独立部署到管理域名
6. IF 用户访问生产网站 THEN 系统 SHALL NOT 暴露管理后台功能

### 需求 4：创建共享代码库

**用户故事：** 作为开发者，我希望有一个共享代码库，以便在多个子项目间复用类型定义和工具函数。

#### 验收标准

1. WHEN 创建共享库时 THEN 系统 SHALL 配置为 TypeScript 库项目
2. WHEN 共享库构建时 THEN 系统 SHALL 生成类型定义文件和 ES 模块
3. WHEN 其他包引用共享库时 THEN 系统 SHALL 通过 workspace 协议引用
4. WHEN 共享库更新时 THEN 系统 SHALL 自动触发依赖包的重新构建
5. WHEN 开发者使用共享库时 THEN 系统 SHALL 提供完整的类型提示和文档

### 需求 5：迁移现有代码

**用户故事：** 作为开发者，我希望将现有代码迁移到新的 Monorepo 结构中，以便保持功能完整性。

#### 验收标准

1. WHEN 迁移用户功能时 THEN 系统 SHALL 将所有用户相关页面和组件移至 website 包
2. WHEN 迁移管理功能时 THEN 系统 SHALL 将所有管理相关页面和工具移至 admin 包
3. WHEN 迁移共享代码时 THEN 系统 SHALL 将类型定义和工具函数移至 shared 包
4. WHEN 迁移完成后 THEN 系统 SHALL 保持所有原有功能正常工作
5. WHEN 迁移完成后 THEN 系统 SHALL 删除旧的代码结构
6. IF 存在路径引用 THEN 系统 SHALL 更新所有导入路径
7. WHEN 迁移过程中 THEN 系统 SHALL 在独立分支上进行，不影响主分支
8. WHEN 每个迁移步骤完成时 THEN 系统 SHALL 验证构建成功
9. WHEN 每个迁移步骤完成时 THEN 系统 SHALL 验证开发服务器可正常启动
10. WHEN 迁移完成后 THEN 系统 SHALL 通过所有现有测试用例
11. IF 迁移过程中发现问题 THEN 系统 SHALL 支持回滚到上一个稳定状态

### 需求 6：渐进式迁移和验证策略

**用户故事：** 作为开发者，我希望采用渐进式迁移策略，以便在迁移过程中保证项目始终可用。

#### 验收标准

1. WHEN 开始迁移时 THEN 系统 SHALL 先创建完整的 Monorepo 基础架构
2. WHEN 基础架构创建后 THEN 系统 SHALL 验证 pnpm install 成功执行
3. WHEN 迁移每个子包时 THEN 系统 SHALL 按照以下顺序进行：shared → website → admin
4. WHEN 迁移 shared 包时 THEN 系统 SHALL 先迁移类型定义，再迁移工具函数
5. WHEN shared 包迁移完成时 THEN 系统 SHALL 验证构建成功并生成类型文件
6. WHEN 迁移 website 包时 THEN 系统 SHALL 先配置 Astro，再迁移页面和组件
7. WHEN website 包迁移完成时 THEN 系统 SHALL 验证开发服务器在 4321 端口正常运行
8. WHEN 迁移 admin 包时 THEN 系统 SHALL 先配置 Astro，再迁移管理页面和工具
9. WHEN admin 包迁移完成时 THEN 系统 SHALL 验证开发服务器在 4322 端口正常运行
10. WHEN 所有包迁移完成时 THEN 系统 SHALL 验证 turbo dev 可同时启动所有服务
11. WHEN 所有包迁移完成时 THEN 系统 SHALL 验证 turbo build 可成功构建所有包
12. WHEN 验证失败时 THEN 系统 SHALL 提供详细的错误信息和修复建议
13. IF 关键功能失效 THEN 系统 SHALL 暂停迁移并修复问题后再继续

### 需求 7：配置开发工具链

**用户故事：** 作为开发者，我希望有统一的开发工具链配置，以便提高开发效率和代码质量。

#### 验收标准

1. WHEN 配置工具链时 THEN 系统 SHALL 提供统一的 ESLint 配置
2. WHEN 配置工具链时 THEN 系统 SHALL 提供统一的 TypeScript 配置
3. WHEN 配置工具链时 THEN 系统 SHALL 提供统一的 Prettier 配置
4. WHEN 配置工具链时 THEN 系统 SHALL 提供统一的测试配置
5. WHEN 运行代码检查时 THEN 系统 SHALL 支持在所有包中执行
6. WHEN 运行测试时 THEN 系统 SHALL 支持并行执行和覆盖率报告

### 需求 8：更新 CI/CD 流程

**用户故事：** 作为开发者，我希望 CI/CD 流程支持 Monorepo，以便实现自动化构建和部署。

#### 验收标准

1. WHEN 配置 GitHub Actions 时 THEN 系统 SHALL 支持 Monorepo 结构
2. WHEN 代码提交时 THEN 系统 SHALL 只构建和测试变更的包
3. WHEN 构建完成时 THEN 系统 SHALL 支持独立部署不同的子包
4. WHEN 使用缓存时 THEN 系统 SHALL 利用 Turborepo 的缓存机制
5. WHEN 部署用户网站时 THEN 系统 SHALL 部署到生产域名
6. WHEN 部署管理后台时 THEN 系统 SHALL 部署到管理域名

### 需求 9：更新项目文档

**用户故事：** 作为开发者，我希望有完整的项目文档，以便快速了解和使用新的 Monorepo 架构。

#### 验收标准

1. WHEN 更新文档时 THEN 系统 SHALL 提供 Monorepo 架构说明
2. WHEN 更新文档时 THEN 系统 SHALL 提供快速开始指南
3. WHEN 更新文档时 THEN 系统 SHALL 提供开发工作流说明
4. WHEN 更新文档时 THEN 系统 SHALL 提供构建和部署指南
5. WHEN 更新文档时 THEN 系统 SHALL 提供各子包的职责说明
6. WHEN 开发者查看文档时 THEN 系统 SHALL 提供清晰的示例和命令
