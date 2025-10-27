# Monorepo 架构重构 - 任务列表

## 实施任务

- [ ] 1. 创建 Monorepo 基础架构
  - 创建根目录配置文件（pnpm-workspace.yaml、turbo.json、package.json）
  - 创建 packages 目录结构
  - 配置 Turborepo 的构建管道和缓存策略
  - 验证 pnpm install 成功执行
  - _需求: 1.1, 1.2, 1.3, 1.4_

- [ ] 2. 创建共享代码库 (shared)
  - _需求: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 2.1 初始化 shared 包结构
  - 创建 packages/shared 目录和 package.json
  - 配置 TypeScript（tsconfig.json）
  - 创建 src 目录结构（types、utils、constants、validators）
  - 创建 config 目录用于存储配置文件
  - _需求: 4.1, 4.2_

- [ ] 2.2 迁移类型定义
  - 从 src/types/ 迁移所有类型定义到 packages/shared/src/types/
  - 创建统一的导出文件（index.ts）
  - 更新类型定义以支持 Monorepo 结构
  - _需求: 4.3, 4.5_

- [ ] 2.3 迁移工具函数
  - 从 src/utils/ 迁移通用工具函数到 packages/shared/src/utils/
  - 创建配置验证函数
  - 创建 URL 格式化和 ID 生成函数
  - 创建统一的导出文件（index.ts）
  - _需求: 4.3, 4.5_

- [ ] 2.4 迁移常量定义
  - 创建 packages/shared/src/constants/index.ts
  - 定义默认配置常量
  - 定义错误消息常量
  - _需求: 4.3_

- [ ] 2.5 配置 shared 包构建
  - 配置 TypeScript 编译选项（生成声明文件）
  - 配置 package.json 的 exports 字段
  - 添加构建和开发脚本
  - 验证构建成功并生成类型文件
  - _需求: 4.2, 4.4_

- [ ]* 2.6 为 shared 包编写单元测试
  - 为类型验证函数编写测试
  - 为工具函数编写测试
  - 配置 Vitest 测试环境
  - _需求: 4.5_

- [ ] 3. 创建用户网站包 (website)
  - _需求: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.4, 5.6, 6.2, 6.7_

- [ ] 3.1 初始化 website 包结构
  - 创建 packages/website 目录和 package.json
  - 配置依赖（astro、@astro-nav/shared）
  - 配置 Astro（astro.config.mjs，端口 4321）
  - 配置 TypeScript（tsconfig.json）
  - 创建 src 目录结构（pages、components、layouts）
  - 创建 static 目录
  - _需求: 2.1, 2.2_

- [ ] 3.2 迁移用户页面
  - 迁移 src/pages/index.astro 到 packages/website/src/pages/
  - 迁移 src/pages/sites/[id].astro 到 packages/website/src/pages/sites/
  - 迁移 src/pages/submit.astro 到 packages/website/src/pages/
  - 更新导入路径使用 @astro-nav/shared
  - _需求: 5.1, 5.6_

- [ ] 3.3 迁移用户组件和布局
  - 迁移用户相关组件到 packages/website/src/components/
  - 迁移布局文件到 packages/website/src/layouts/
  - 更新组件中的导入路径
  - _需求: 5.1, 5.6_

- [ ] 3.4 迁移静态资源
  - 从 static/ 复制用户相关的静态资源到 packages/website/static/
  - 保留 robots.txt、manifest.json 等必要文件
  - 不复制配置文件（将通过脚本同步）
  - _需求: 5.1_

- [ ] 3.5 创建配置同步脚本
  - 创建 packages/website/scripts/sync-config.js
  - 实现从 shared/config 复制配置到 website/static
  - 实现开发模式的文件监听和自动同步
  - 在 package.json 中添加 prebuild 脚本
  - _需求: 5.4, 6.2_

- [ ] 3.6 验证 website 包
  - 运行 pnpm --filter @astro-nav/website dev
  - 验证开发服务器在 4321 端口正常启动
  - 验证所有页面可以正常访问
  - 验证配置文件正确加载
  - _需求: 2.3, 6.7, 6.9_

- [ ]* 3.7 为 website 包编写测试
  - 编写页面渲染测试
  - 编写组件单元测试
  - 配置 Vitest 测试环境
  - _需求: 2.3_

- [ ] 4. 创建管理后台包 (admin)
  - _需求: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.2, 5.4, 5.6, 6.3, 6.8_

- [ ] 4.1 初始化 admin 包结构
  - 创建 packages/admin 目录和 package.json
  - 配置依赖（astro、@astro-nav/shared、papaparse、xlsx、jszip、qrcode、busboy）
  - 配置 Astro（astro.config.mjs，端口 4322）
  - 配置 TypeScript（tsconfig.json）
  - 创建 src 目录结构（pages、components、utils）
  - 创建 static 目录
  - _需求: 3.1, 3.2_

- [ ] 4.2 迁移管理页面
  - 迁移 src/pages/config-generator.astro 到 packages/admin/src/pages/
  - 迁移 src/pages/table-import.astro 到 packages/admin/src/pages/
  - 迁移 src/pages/dev-tools/ 到 packages/admin/src/pages/dev-tools/
  - 创建管理首页 packages/admin/src/pages/index.astro
  - 更新导入路径使用 @astro-nav/shared
  - _需求: 5.2, 5.6_

- [ ] 4.3 迁移管理组件和工具
  - 迁移管理相关组件到 packages/admin/src/components/
  - 迁移管理工具函数到 packages/admin/src/utils/
  - 更新组件和工具中的导入路径
  - _需求: 5.2, 5.6_

- [ ] 4.4 更新配置生成逻辑
  - 修改配置生成器，输出到 ../shared/config/config.json
  - 修改表格导入工具，输出到 ../shared/config/
  - 确保生成的配置文件格式正确
  - _需求: 3.3, 5.4_

- [ ] 4.5 迁移管理后台静态资源
  - 从 static/ 复制管理相关的静态资源到 packages/admin/static/
  - 复制模板文件（static/templates/）
  - 复制分类图标（static/categories/）
  - _需求: 5.2_

- [ ] 4.6 验证 admin 包
  - 运行 pnpm --filter @astro-nav/admin dev
  - 验证开发服务器在 4322 端口正常启动
  - 验证配置生成功能正常工作
  - 验证表格导入功能正常工作
  - 验证生成的配置文件保存到 shared/config/
  - _需求: 3.4, 6.3, 6.8_

- [ ]* 4.7 为 admin 包编写测试
  - 编写配置生成器测试
  - 编写表格导入测试
  - 编写数据验证测试
  - 配置 Vitest 测试环境
  - _需求: 3.4_

- [ ] 5. 验证 Monorepo 整体功能
  - _需求: 5.4, 5.10, 6.4, 6.5, 6.10, 6.11_

- [ ] 5.1 验证并行开发
  - 运行 pnpm dev（同时启动所有服务）
  - 验证 website 在 4321 端口运行
  - 验证 admin 在 4322 端口运行
  - 验证 shared 包的热重载功能
  - _需求: 6.10_

- [ ] 5.2 验证配置同步流程
  - 在 admin 中生成新配置
  - 验证配置保存到 shared/config/
  - 验证 website 自动同步配置（开发模式）
  - 验证 website 页面自动刷新显示新配置
  - _需求: 5.4, 6.2_

- [ ] 5.3 验证构建流程
  - 运行 pnpm build（构建所有包）
  - 验证 shared 包先构建完成
  - 验证 website 和 admin 并行构建
  - 验证所有构建产物正确生成
  - 验证 Turborepo 缓存功能
  - _需求: 6.4, 6.5, 6.11_

- [ ] 5.4 验证功能完整性
  - 测试 website 的所有用户功能（导航、搜索、详情、提交）
  - 测试 admin 的所有管理功能（配置生成、表格导入、开发工具）
  - 验证所有原有功能正常工作
  - _需求: 5.4, 5.10_

- [ ]* 5.5 运行完整测试套件
  - 运行 pnpm test（所有包的测试）
  - 验证所有测试通过
  - 生成测试覆盖率报告
  - _需求: 5.10_

- [ ] 6. 清理旧代码结构
  - _需求: 5.5, 5.11_

- [ ] 6.1 备份当前状态
  - 创建 Git 标签标记迁移前的状态
  - 确保所有更改已提交
  - _需求: 5.11_

- [ ] 6.2 删除旧的 src 目录
  - 删除根目录的 src/ 目录
  - 验证没有遗漏的文件
  - _需求: 5.5_

- [ ] 6.3 更新根目录配置
  - 更新根 package.json（移除旧的脚本和依赖）
  - 更新 .gitignore（添加 Monorepo 相关的忽略规则）
  - 更新 tsconfig.json（配置为 Monorepo 根配置）
  - _需求: 5.5_

- [ ] 6.4 清理旧的配置文件
  - 移除根目录的 astro.config.mjs（已迁移到各子包）
  - 清理不再需要的脚本文件
  - _需求: 5.5_

- [ ] 6.5 最终验证
  - 运行 pnpm install 确保依赖正确
  - 运行 pnpm dev 确保开发模式正常
  - 运行 pnpm build 确保构建成功
  - 验证所有功能正常工作
  - _需求: 5.4, 6.10, 6.11_

- [ ] 7. 配置开发工具链
  - _需求: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 7.1 配置统一的 ESLint
  - 在根目录创建 .eslintrc.json
  - 配置适用于 Astro 和 TypeScript 的规则
  - 在各子包中继承根配置
  - 添加 lint 和 lint:fix 脚本到 turbo.json
  - _需求: 7.1, 7.5_

- [ ] 7.2 配置统一的 Prettier
  - 在根目录创建 .prettierrc.json
  - 配置代码格式化规则
  - 添加 .prettierignore 文件
  - 添加 format 脚本到根 package.json
  - _需求: 7.3, 7.5_

- [ ] 7.3 配置统一的 TypeScript
  - 在根目录创建 tsconfig.base.json
  - 配置各子包继承基础配置
  - 配置路径映射（path mapping）
  - 添加 type-check 脚本到 turbo.json
  - _需求: 7.2, 7.5_

- [ ] 7.4 配置统一的测试环境
  - 在根目录创建 vitest.config.ts
  - 配置各子包的测试环境
  - 配置测试覆盖率报告
  - 添加 test 和 test:coverage 脚本到 turbo.json
  - _需求: 7.4, 7.6_

- [ ] 7.5 验证工具链
  - 运行 pnpm lint 验证代码检查
  - 运行 pnpm type-check 验证类型检查
  - 运行 pnpm format 验证代码格式化
  - 运行 pnpm test 验证测试执行
  - _需求: 7.5, 7.6_

- [ ] 8. 更新 CI/CD 流程
  - _需求: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 8.1 更新 GitHub Actions 工作流
  - 修改 .github/workflows/ 中的工作流文件
  - 添加 pnpm 安装步骤
  - 配置 Turborepo 远程缓存（可选）
  - 配置并行构建和测试
  - _需求: 8.1, 8.4_

- [ ] 8.2 配置变更检测
  - 使用 dorny/paths-filter 检测变更的包
  - 配置只构建和部署变更的包
  - 配置 shared 包变更时构建所有依赖包
  - _需求: 8.2_

- [ ] 8.3 配置独立部署流程
  - 配置 website 包的部署任务
  - 配置 admin 包的部署任务
  - 配置不同的部署目标（域名/环境）
  - _需求: 8.3, 8.5, 8.6_

- [ ] 8.4 测试 CI/CD 流程
  - 创建测试分支并推送
  - 验证 GitHub Actions 正确执行
  - 验证构建和测试成功
  - 验证部署流程正常
  - _需求: 8.1, 8.2, 8.3_

- [ ] 9. 更新项目文档
  - _需求: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 9.1 更新根 README.md
  - 添加 Monorepo 架构说明
  - 添加项目结构图
  - 添加快速开始指南
  - 添加各子包的简介
  - 添加常用命令列表
  - _需求: 9.1, 9.2, 9.6_

- [ ] 9.2 创建架构文档
  - 创建 docs/architecture.md
  - 说明 Monorepo 架构设计
  - 说明各子包的职责和关系
  - 说明配置文件管理策略
  - 添加架构图和数据流图
  - _需求: 9.1, 9.5_

- [ ] 9.3 更新开发指南
  - 更新 docs/development.md
  - 添加 Monorepo 开发工作流
  - 添加如何添加新功能的指南
  - 添加如何调试的指南
  - 添加常见问题解答
  - _需求: 9.3, 9.6_

- [ ] 9.4 更新部署指南
  - 更新 docs/deployment.md
  - 添加独立部署的说明
  - 添加环境配置说明
  - 添加域名配置说明
  - _需求: 9.4_

- [ ] 9.5 为各子包创建 README
  - 创建 packages/shared/README.md
  - 创建 packages/website/README.md
  - 创建 packages/admin/README.md
  - 说明各包的用途、API 和使用方法
  - _需求: 9.5_

- [ ] 9.6 创建迁移指南
  - 创建 docs/migration-guide.md
  - 记录迁移过程和关键决策
  - 提供回滚指南
  - 提供故障排查指南
  - _需求: 9.1, 9.3_

- [ ] 10. 最终验证和发布
  - _需求: 5.4, 5.10, 6.10, 6.11, 6.12_

- [ ] 10.1 完整功能测试
  - 测试所有用户功能
  - 测试所有管理功能
  - 测试配置同步流程
  - 测试构建和部署流程
  - _需求: 5.4, 5.10_

- [ ] 10.2 性能测试
  - 测试开发服务器启动时间
  - 测试构建时间
  - 测试热重载速度
  - 对比迁移前后的性能
  - _需求: 6.10_

- [ ] 10.3 代码审查
  - 审查所有迁移的代码
  - 确保代码质量和一致性
  - 确保没有遗留的旧代码引用
  - _需求: 5.4_

- [ ] 10.4 创建发布标签
  - 提交所有更改
  - 创建 Git 标签（如 v2.0.0-monorepo）
  - 推送到远程仓库
  - _需求: 6.12_

- [ ] 10.5 合并到主分支
  - 创建 Pull Request
  - 进行代码审查
  - 合并到主分支
  - 部署到生产环境
  - _需求: 6.12_
