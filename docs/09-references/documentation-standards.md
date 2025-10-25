# 📚 Astro-nav 文档规范标准

## 🎯 规范目的

本文档定义了Astro-nav项目的文档编写、组织和维护标准，确保文档体系的一致性、可维护性和用户友好性。

**⚠️ 重要**: 所有文档工作必须遵循本规范，编写文档前请先参考此标准。

## 🏗️ 目录结构规范

### 1. 分层架构原则

```
📚 三层文档架构
├── 🎯 用户导向层 (01-02, 06)  # 面向最终用户
├── 🔧 开发技术层 (03-05, 07)  # 面向开发者
└── 📊 项目管理层 (08-09)      # 面向项目管理
```

### 2. 标准目录结构

```
docs/
├── _index.md                           #  文档总入口 (纯索引)
│
├── 01-getting-started/                 # 🚀 快速开始
├── 02-user-guides/                     # 👥 用户指南
├── 03-development/                     # 🔧 开发文档
├── 04-features/                        # ✨ 功能文档
├── 05-technical/                       # 🔬 技术规范
├── 06-deployment/                      # 🚀 部署文档
├── 07-design/                          # 🎨 设计文档
├── 08-project-management/              # 📊 项目管理
└── 09-references/                      # 📖 参考资料
    ├── documentation-standards.md      # 📋 文档规范 (本文件)
    └── directory-structure.md          # 🏗️ 目录结构设计
```

**核心原则**:
- docs根目录只有一个_index.md文件 (纯索引)
- 所有其他md文件都归类到相应的子目录中
- 每个子目录都有自己的_index.md (纯索引)
- 概览和指南内容放在xxx-overview.md文件中

## 📝 文件命名规范

### 1. 核心原则

#### ✅ 必须遵循
- **kebab-case**: 小写字母 + 连字符
- **描述性**: 文件名清楚表达内容
- **一致性**: 同类文件使用相同命名模式
- **避免缩写**: 使用完整单词

#### ❌ 禁止使用
- **CamelCase**: `LazyLoadingDesign.md`
- **snake_case**: `lazy_loading_design.md`
- **空格**: `lazy loading design.md`
- **特殊字符**: `lazy-loading@design.md`

### 2. 文件类型命名

#### 导航文件
```
✅ 正确命名
├── _index.md          # 目录索引文件 (纯索引)
├── OVERVIEW.md        # 功能概览文件
└── xxx-overview.md    # 分类概览文件

❌ 禁止使用
├── README.md          # 仅项目根目录可用
├── INDEX.md           # 已废弃，使用_index.md
├── index.md           # 大写规范
└── overview.md        # 大写规范
```

#### 内容文件
```
✅ 正确命名
├── lazy-loading-design.md
├── csv-import-guide.md
├── performance-optimization.md
└── github-actions-deployment.md

❌ 错误命名
├── LazyLoadingDesign.md
├── CSV_Import_Guide.md
├── performance optimization.md
└── github-actions@deployment.md
```

### 3. 目录命名

#### 主目录
```
✅ 标准格式: 数字前缀 + 描述
01-getting-started/
02-user-guides/
03-development/
...
09-references/

❌ 错误格式
getting-started/        # 缺少数字前缀
1-getting-started/      # 数字格式错误
01_getting_started/     # 使用下划线
```

#### 子目录
```
✅ 正确格式
lazy-loading/
csv-import-system/
weekly-plans/
todo-lists/

❌ 错误格式
LazyLoading/
CSV_Import/
weekly plans/
```

## 📋 内容组织规范

### 1. 文档层次结构

```
Level 1: docs/_index.md              # 文档总入口 (纯索引)
Level 2: XX-category/_index.md       # 分类索引 (纯索引)
Level 3: specific-document.md        # 具体文档
Level 4: sub-feature/OVERVIEW.md     # 子功能概览
Level 5: xxx-overview.md             # 分类概览文档
```

### 2. 导航文件职责

#### _index.md (纯索引文件)
- **位置**: `docs/_index.md` 或 `XX-category/_index.md`
- **职责**: 纯索引，仅列出当前目录下的文件和子目录
- **内容**: 目录标题 + 文件/目录列表 (无其他内容)
- **原则**: 不包含概述、使用指南、相关链接等内容

#### OVERVIEW.md (功能概览文件)
- **位置**: `feature-name/OVERVIEW.md`
- **职责**: 功能概览，介绍特定功能模块
- **内容**: 功能介绍、相关文档、快速链接

#### xxx-overview.md (分类概览文件)
- **位置**: `XX-category/xxx-overview.md`
- **职责**: 分类概览，提供该分类的详细指南
- **内容**: 概述、使用指南、最佳实践、相关链接

### 3. 文档分类原则

#### 按用户角色分类
- **01-getting-started**: 新用户入门
- **02-user-guides**: 最终用户操作
- **03-development**: 开发者技术文档
- **06-deployment**: 运维部署文档

#### 按内容类型分类
- **04-features**: 功能说明和实现
- **05-technical**: 技术规范和API
- **07-design**: 设计文档和架构
- **08-project-management**: 项目管理文档

#### 按使用频率分类
- **常用文档**: 放在前面的目录 (01-06)
- **参考文档**: 放在后面的目录 (07-09)

## 📂 _index.md 纯索引原则

### 🎯 核心原则
**_index.md文件必须是纯索引，只列出当前目录下的文件和子目录，不包含任何其他内容。**

### ✅ _index.md应该包含的内容
- **目录标题**: 简洁的目录名称
- **文件列表**: 当前目录下的所有.md文件
- **子目录列表**: 当前目录下的所有子目录
- **状态标注**: 标明计划中但尚未创建的文档

### ❌ _index.md禁止包含的内容
- **概述说明**: 目录用途和内容介绍
- **使用指南**: 推荐阅读顺序、使用场景
- **相关链接**: 指向其他目录的链接
- **项目状态**: 进度、指标等信息
- **最佳实践**: 开发流程、技术指导

### 📋 _index.md标准模板
```markdown
# 📚 目录名称

## 📂 目录内容

### 📄 文档文件
- [📖 document-name.md](document-name.md) - 文档描述

### 📁 子目录
- [📁 subdirectory/](subdirectory/) - 子目录描述

> ⚠️ **注意**: 以下文档计划中，尚未创建
> - [📝 planned-doc.md](planned-doc.md) - 计划文档描述
```

### 🔄 内容迁移原则
当整改_index.md时，原有的有价值内容必须迁移到合适位置：

#### 迁移目标
- **概述和指南** → 创建 `xxx-overview.md` 文件
- **使用场景** → 合并到相关的概览文档
- **技术指标** → 移动到项目管理或技术规范文档
- **相关链接** → 整合到概览文档的相关章节

#### 迁移示例
```
原 03-development/_index.md 内容:
├── 概述说明 → 03-development/development-guide.md
├── 开发流程 → 03-development/development-guide.md
├── 使用场景 → 03-development/development-guide.md
└── 相关链接 → 03-development/development-guide.md

新 03-development/_index.md:
└── 纯文件和目录索引
```

## ✍️ 文档编写规范

### 1. Markdown格式标准

#### 标题层次
```markdown
# 📚 一级标题 (文档标题)
## 🎯 二级标题 (主要章节)
### 📋 三级标题 (子章节)
#### 🔧 四级标题 (详细内容)
```

#### Emoji使用规范
```markdown
📚 文档/知识    🎯 目标/重点    📋 列表/清单
🔧 工具/技术    ✨ 功能/特性    🚀 开始/部署
👥 用户/团队    📊 数据/统计    🔍 搜索/检查
✅ 完成/正确    ❌ 错误/禁止    🔄 进行中
⚠️ 警告/注意    💡 提示/想法    🎉 成功/庆祝
```

#### 代码块格式
```markdown
# 行内代码
使用 `npm install` 安装依赖

# 代码块
```bash
npm install
npm run dev
```

# 带语言标识
```typescript
interface Config {
  name: string;
  version: string;
}
```
```

### 2. 内容结构标准

#### 文档模板
```markdown
# 📚 文档标题

## 🎯 概述
简要说明文档目的和内容

## 📋 目录
- [章节1](#章节1)
- [章节2](#章节2)

## 🔧 主要内容
详细内容...

## 📊 示例
代码示例和截图...

## 🚀 下一步
相关链接和后续步骤...

---
**文档版本**: v1.0
**最后更新**: YYYY-MM-DD
**维护者**: 维护者名称
```

#### 链接格式
```markdown
# 内部链接 (相对路径)
[用户指南](../02-user-guides/user-manual.md)
[项目架构](../03-development/project-architecture.md)

# 外部链接
[Astro官网](https://astro.build/)
[GitHub仓库](https://github.com/51nav/Astro-nav)

# 锚点链接
[跳转到安装章节](#安装步骤)
```

### 3. 图片和资源规范

#### 图片存储
```
docs/
├── assets/                    # 静态资源目录
│   ├── images/               # 图片文件
│   │   ├── screenshots/      # 截图
│   │   ├── diagrams/         # 图表
│   │   └── logos/           # 标志
│   └── files/               # 其他文件
```

#### 图片引用
```markdown
# 相对路径引用
![架构图](../assets/images/diagrams/architecture.png)

# 带说明的图片
![项目架构图](../assets/images/diagrams/architecture.png)
*图1: Astro-nav项目整体架构*
```

## 🔄 文档维护规范

### 1. 版本控制

#### 版本号规则
- **主版本**: 重大架构变更 (v2.0)
- **次版本**: 功能增加或重要更新 (v1.1)
- **修订版**: 内容修正和小更新 (v1.0.1)

#### 更新记录
```markdown
---
**文档版本**: v1.2
**创建日期**: 2024-12-07
**最后更新**: 2024-12-08
**维护者**: Augment Agent
**更新内容**: 添加新的API规范
---
```

### 2. 质量检查清单

#### 内容质量
- [ ] 标题层次清晰
- [ ] 内容准确完整
- [ ] 示例代码可运行
- [ ] 链接全部有效
- [ ] 格式符合规范

#### 结构质量
- [ ] 文件命名符合规范
- [ ] 目录结构正确
- [ ] 导航链接完整
- [ ] 交叉引用准确

### 3. 审核流程

#### 新文档审核
1. **内容审核**: 技术准确性和完整性
2. **格式审核**: 符合文档规范
3. **链接审核**: 所有链接有效性
4. **用户测试**: 可读性和易用性

#### 更新文档审核
1. **变更影响**: 评估对其他文档的影响
2. **版本更新**: 更新版本号和日期
3. **链接检查**: 确保相关链接仍然有效

## 🚀 实施指南

### 1. 新建文档流程

```bash
1. 确定文档类型和目标目录
2. 检查文档规范 (本文件)
3. 使用标准模板创建文档
4. 遵循命名规范
5. 更新相应的_index.md索引 (仅添加文件条目)
6. 如需概览内容，创建xxx-overview.md文件
7. 提交前进行质量检查
```

### 2. 文档重构流程

```bash
1. 评估现有文档结构
2. 制定重构计划
3. 按规范重新组织
4. 更新所有链接引用
5. 验证导航完整性
6. 删除过时文档
```

### 3. 日常维护流程

```bash
1. 定期检查链接有效性
2. 更新过时内容
3. 补充缺失文档
4. 优化用户体验
5. 收集用户反馈
6. 持续改进规范
```

## 📊 规范执行检查

### 自检清单

在创建或修改文档时，请检查：

#### 文件层面
- [ ] 文件名使用kebab-case
- [ ] 文件放在正确的目录
- [ ] 包含必要的元数据
- [ ] 遵循内容模板

#### 目录层面
- [ ] 目录名使用数字前缀
- [ ] 包含_index.md纯索引文件
- [ ] _index.md只包含文件和目录列表
- [ ] 目录结构符合分层原则

#### 内容层面
- [ ] 标题使用emoji
- [ ] 链接使用相对路径
- [ ] 代码块有语言标识
- [ ] 图片有说明文字

#### 导航层面
- [ ] 更新了相关的_index.md (仅添加文件条目)
- [ ] 更新了docs/_index.md总索引
- [ ] 所有链接可以正常访问
- [ ] _index.md保持纯索引原则

---

**规范版本**: v2.0
**制定日期**: 2024-12-07
**最后更新**: 2024-12-07
**更新内容**: 添加_index.md纯索引原则和内容迁移规范
**适用范围**: Astro-nav项目所有文档
**维护者**: Augment Agent
**状态**: 正式生效
