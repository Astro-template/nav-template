/**
 * 安全配置文件
 * 定义 Content Security Policy 和其他安全相关配置
 */

/**
 * Content Security Policy 配置
 * 用于防止 XSS 攻击和其他安全威胁
 */
export const CSP_DIRECTIVES = {
  // 默认策略
  'default-src': ["'self'"],

  // 脚本源
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Astro 内联脚本需要
    "'unsafe-eval'", // 开发环境可能需要
    'https://code.iconify.design',
  ],

  // 样式源
  'style-src': [
    "'self'",
    "'unsafe-inline'", // 内联样式
  ],

  // 图片源
  'img-src': [
    "'self'",
    'data:', // Base64 图片
    'https:', // 允许 HTTPS 图片
    'http:', // 生产环境应该移除
  ],

  // 字体源
  'font-src': [
    "'self'",
    'data:',
    'https://code.iconify.design',
  ],

  // 连接源（fetch、XHR、WebSocket 等）
  'connect-src': [
    "'self'",
    'https://code.iconify.design',
  ],

  // Frame 源
  'frame-src': ["'none'"],

  // 对象源（Flash、Java 等）
  'object-src': ["'none'"],

  // Base URI
  'base-uri': ["'self'"],

  // Form 提交目标
  'form-action': ["'self'"],

  // Frame 祖先（防止点击劫持）
  'frame-ancestors': ["'none'"],

  // 升级不安全请求
  'upgrade-insecure-requests': [],
};

/**
 * 生成 CSP 字符串
 */
export function generateCSPString(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([key, values]) => {
      if (values.length === 0) {
        return key;
      }
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * 安全响应头配置
 */
export const SECURITY_HEADERS = {
  // XSS 保护
  'X-XSS-Protection': '1; mode=block',

  // 内容类型嗅探保护
  'X-Content-Type-Options': 'nosniff',

  // 点击劫持保护
  'X-Frame-Options': 'DENY',

  // 引用来源策略
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // 权限策略
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()', // 禁用 FLoC
  ].join(', '),

  // HSTS（仅 HTTPS）
  // 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

/**
 * 允许的外部域名白名单
 */
export const ALLOWED_DOMAINS = [
  'code.iconify.design',
  'affnav.github.io',
  // 添加其他信任的域名
];

/**
 * 输入验证规则
 */
export const INPUT_VALIDATION = {
  // URL 验证
  url: {
    maxLength: 2048,
    pattern: /^https?:\/\/.+/,
  },

  // 标题验证
  title: {
    maxLength: 200,
    minLength: 1,
    pattern: /^[\s\S]+$/,
  },

  // 描述验证
  description: {
    maxLength: 1000,
    minLength: 0,
  },

  // 搜索查询验证
  searchQuery: {
    maxLength: 100,
    minLength: 1,
    // 防止 SQL 注入和 XSS
    pattern: /^[a-zA-Z0-9\s\u4e00-\u9fa5-_]+$/,
  },
};

/**
 * 速率限制配置
 */
export const RATE_LIMIT = {
  // API 调用限制
  api: {
    windowMs: 15 * 60 * 1000, // 15 分钟
    maxRequests: 100, // 最多 100 个请求
  },

  // 提交限制
  submit: {
    windowMs: 60 * 60 * 1000, // 1 小时
    maxRequests: 10, // 最多 10 次提交
  },

  // 搜索限制
  search: {
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 30, // 最多 30 次搜索
  },
};

/**
 * 敏感信息过滤
 * 防止在日志或错误消息中泄露敏感信息
 */
export const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /api[_-]?key/i,
  /authorization/i,
  /bearer/i,
  /\.env/i,
];

/**
 * 检查字符串是否包含敏感信息
 */
export function containsSensitiveInfo(text: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * 过滤敏感信息
 */
export function sanitizeSensitiveInfo(text: string): string {
  let sanitized = text;
  SENSITIVE_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  return sanitized;
}

/**
 * URL 清理函数
 * 移除潜在的恶意参数
 */
export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    // 移除 javascript: 协议
    if (urlObj.protocol === 'javascript:') {
      return '';
    }

    // 移除 data: 协议（除非是图片）
    if (urlObj.protocol === 'data:' && !url.startsWith('data:image/')) {
      return '';
    }

    return url;
  } catch {
    return '';
  }
}

/**
 * HTML 转义函数
 * 防止 XSS 攻击
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return text.replace(/[&<>"']/g, char => map[char] || char);
}

/**
 * 验证输入
 */
export function validateInput(
  value: string,
  type: keyof typeof INPUT_VALIDATION
): { valid: boolean; error?: string } {
  const rules = INPUT_VALIDATION[type];

  if (!rules) {
    return { valid: false, error: 'Unknown validation type' };
  }

  // 长度检查
  if ('maxLength' in rules && value.length > rules.maxLength) {
    return { valid: false, error: `Maximum length is ${rules.maxLength}` };
  }

  if ('minLength' in rules && value.length < rules.minLength) {
    return { valid: false, error: `Minimum length is ${rules.minLength}` };
  }

  // 模式检查
  if ('pattern' in rules && rules.pattern && !rules.pattern.test(value)) {
    return { valid: false, error: 'Invalid format' };
  }

  return { valid: true };
}

/**
 * 开发环境配置
 */
export const isDevelopment = import.meta.env.DEV;

/**
 * 生产环境的严格 CSP
 */
export function getProductionCSP(): Record<string, string[]> {
  if (!isDevelopment) {
    return {
      ...CSP_DIRECTIVES,
      'script-src': ["'self'", 'https://code.iconify.design'],
      // 移除 unsafe-inline 和 unsafe-eval
    };
  }
  return CSP_DIRECTIVES;
}

export default {
  CSP_DIRECTIVES,
  SECURITY_HEADERS,
  ALLOWED_DOMAINS,
  INPUT_VALIDATION,
  RATE_LIMIT,
  generateCSPString,
  sanitizeUrl,
  escapeHtml,
  validateInput,
  containsSensitiveInfo,
  sanitizeSensitiveInfo,
};
