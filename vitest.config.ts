import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 测试环境 - 使用 happy-dom 更快更轻量
    environment: "happy-dom",

    // 全局测试设置
    globals: true,

    // 覆盖率配置
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "dist/",
        ".astro/",
        "test-data/",
        "scripts/",
        "**/*.config.*",
        "**/mockData.ts",
        "**/*.d.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },

    // 包含的测试文件
    include: ["tests/**/*.{test,spec}.{js,ts}"],

    // 排除的文件
    exclude: ["node_modules", "dist", ".astro", ".git", "**/node_modules/**"],

    // 测试超时
    testTimeout: 15000,
    hookTimeout: 15000,

    // 设置文件
    setupFiles: ['./tests/setup.ts'],

    // 并发执行
    threads: true,
    isolate: true,

    // 监听模式
    watch: false,

    // 报告器
    reporters: ["verbose"],

    // Mock 配置
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
  },

  // 解析配置
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
