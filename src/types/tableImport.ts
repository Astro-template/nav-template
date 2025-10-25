// 表格导入相关类型定义

// 菜单表格行结构
export interface MenuTableRow {
  menuId: string; // 菜单唯一标识
  menuName: string; // 菜单显示名称
  menuIcon: string; // 菜单图标
  menuType: "single" | "tabs"; // 菜单类型
  parentMenuId?: string; // 父菜单ID（子菜单用）
  sortOrder: number; // 排序顺序
}

// 网站表格行结构
export interface SiteTableRow {
  menuId: string; // 所属菜单ID
  title: string; // 网站标题
  description: string; // 简短描述
  url?: string; // 网站链接
  logo?: string; // Logo路径
  advantages?: string; // 优势特点（分号分隔）
  features?: string; // 功能特性（分号分隔）
  intro?: string; // 详细介绍
  pricing?: string; // 价格信息
  pros?: string; // 优点列表（分号分隔）
  cons?: string; // 缺点列表（分号分隔）
  tips?: string; // 使用技巧（分号分隔）
  relatedTitles?: string; // 相关网站标题（分号分隔）
  relatedDescriptions?: string; // 相关网站描述（分号分隔）
  sortOrder?: number; // 排序顺序
}

// 通用表格行类型（用于示例数据）
export type TableRow =
  | MenuTableRow
  | SiteTableRow
  | {
      category?: string;
      title: string;
      description: string;
      url?: string;
      logo?: string;
      advantages?: string;
      features?: string;
      intro?: string;
      pricing?: string;
      pros?: string;
      cons?: string;
      tips?: string;
      relatedTitles?: string;
      relatedDescriptions?: string;
      sortOrder?: number;
    };

export interface TableImportResult<T = any> {
  success: boolean;
  data?: T[];
  error?: string;
  rowCount?: number;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// 表格模板定义
export const TABLE_TEMPLATE_HEADERS = [
  "category", // 分类名称 (必填)
  "subcategory", // 子分类名称 (可选)
  "title", // 网站标题 (必填)
  "description", // 网站描述 (必填)
  "url", // 网站链接 (可选)
  "logo", // Logo链接 (可选)
  "advantages", // 优势特点 (用分号分隔)
  "pricing", // 价格信息 (可选)
  "pros", // 优点 (用分号分隔)
  "cons", // 缺点 (用分号分隔)
  "tips", // 使用技巧 (用分号分隔)
  "intro", // 详细介绍 (可选)
  "relatedTitles", // 相关网站标题 (用分号分隔)
  "relatedDescriptions", // 相关网站描述 (用分号分隔)
] as const;

export type TableHeader = (typeof TABLE_TEMPLATE_HEADERS)[number];

// 必填字段
export const REQUIRED_FIELDS: TableHeader[] = [
  "category",
  "title",
  "description",
];

// 字段说明
export const FIELD_DESCRIPTIONS: Record<TableHeader, string> = {
  category: '分类名称，如"追踪系统"、"SPY服务"等',
  subcategory: '子分类名称，如"PoP流量"、"原生广告流量"等（可选）',
  title: "网站或工具的名称",
  description: "网站或工具的简短描述",
  url: "网站链接（可选）",
  logo: "Logo图片链接（可选）",
  advantages: "优势特点，多个用分号(;)分隔",
  pricing: "价格信息描述",
  pros: "优点，多个用分号(;)分隔",
  cons: "缺点，多个用分号(;)分隔",
  tips: "使用技巧，多个用分号(;)分隔",
  intro: "详细介绍",
  relatedTitles: "相关网站标题，多个用分号(;)分隔",
  relatedDescriptions:
    "相关网站描述，多个用分号(;)分隔，需与relatedTitles一一对应",
};

// 示例数据
export const EXAMPLE_TABLE_DATA: TableRow[] = [
  {
    category: "追踪系统",
    title: "Binom",
    description: "老毛子写的高性能tracker",
    url: "https://binom.org",
    logo: "/logos/binom.png",
    advantages: "跳转速度快;价格基于服务器而非点击量;生成报表速度快",
    pricing: "基础版本起价约$100/月",
    pros: "性价比极高;响应速度快;安装简单",
    cons: "需要自己管理服务器;界面相对简单",
    tips: "建议选择SSD服务器;新手可先使用共享服务器方案",
    intro: "Binom是由俄罗斯开发团队开发的高性能追踪系统",
    relatedTitles: "Voluum;FunnelFlux",
    relatedDescriptions: "业界成名较早的tracker之一;价格昂贵但功能强大",
  },
  {
    menuId: "traffic-platforms-pop",
    title: "PropellerAds",
    description: "很多人都在用的平台",
    url: "https://propellerads.com",
    advantages: "全球流量覆盖广;支持多种广告形式;最低充值门槛低",
    pricing: "最低充值$100",
    pros: "流量质量稳定;覆盖地区广;优化工具完善",
    cons: "部分地区竞争激烈;优质流量成本高",
    tips: "建议从小预算开始测试;注意使用黑名单过滤",
  },
];
