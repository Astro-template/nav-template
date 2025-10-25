import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  // 站点 URL（用于生成规范链接和 sitemap）
  site: "https://affnav.github.io",

  // 集成插件
  integrations: [
    sitemap({
      // Sitemap 配置
      changefreq: "weekly",
      priority: 0.7,
      lastmod: new Date(),
      // 排除开发工具页面和 API 路由
      filter: (page) =>
        !page.includes("/dev-tools/") &&
        !page.includes("/api/dev/") &&
        !page.includes("/config-generator") &&
        !page.includes("/table-import"),
    }),
  ],

  // 输出模式
  output: "static",

  // 静态文件配置
  publicDir: "./static",

  // 构建配置
  build: {
    // 静态资源目录
    assets: "_astro",

    // 内联小于 4KB 的资源
    inlineStylesheets: "auto",

    // 代码分割
    splitting: true,

    // 格式化输出（生产环境建议关闭）
    format: "directory",
  },

  // Vite 配置
  vite: {
    // 构建优化
    build: {
      // 压缩代码
      minify: "esbuild",

      // 代码分割策略
      rollupOptions: {
        output: {
          manualChunks: {
            // 将大型依赖分离到单独的 chunk
            "vendor-utils": ["papaparse", "qrcode"],
            "vendor-office": ["xlsx", "jszip"],
          },
        },
      },

      // CSS 代码分割
      cssCodeSplit: true,

      // 目标浏览器
      target: "es2020",
    },

    // 优化依赖
    optimizeDeps: {
      include: ["papaparse", "qrcode"],
    },

    // 开发服务器配置
    server: {
      // 端口
      port: 4321,

      // 自动打开浏览器
      open: false,

      // CORS
      cors: true,
    },

    // JSON 文件处理
    json: {
      stringify: true,
    },
  },

  // Markdown 配置
  markdown: {
    // 代码高亮
    shikiConfig: {
      theme: "github-dark",
      wrap: true,
    },
  },

  // 实验性特性
  experimental: {
    // 可根据需要启用
  },

  // 安全配置
  security: {
    checkOrigin: true,
  },

  // 压缩配置
  compressHTML: true,

  // 预获取配置
  prefetch: {
    prefetchAll: false,
    defaultStrategy: "hover",
  },

  // 开发工具栏（开发环境）
  devToolbar: {
    enabled: true,
  },
});
