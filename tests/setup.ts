/**
 * Vitest 测试环境设置
 * 在所有测试运行前执行
 */

import { beforeAll, afterEach, afterAll, vi } from 'vitest';

// 模拟浏览器环境
beforeAll(() => {
  // 设置全局对象
  global.fetch = vi.fn();

  // 模拟 localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };
  global.localStorage = localStorageMock as Storage;

  // 模拟 sessionStorage
  global.sessionStorage = { ...localStorageMock } as Storage;

  // 模拟 console 方法（避免测试输出污染）
  if (process.env.VITEST_SILENT === 'true') {
    global.console = {
      ...console,
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    };
  }

  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.PUBLIC_SITE_URL = 'https://test.example.com';
  process.env.PUBLIC_ENABLE_PERFORMANCE_MONITOR = 'false';
  process.env.PUBLIC_CONFIG_PATH = '/config.json';
});

// 每个测试后清理
afterEach(() => {
  // 清除所有 mock
  vi.clearAllMocks();

  // 清除 localStorage
  localStorage.clear();
  sessionStorage.clear();
});

// 所有测试完成后清理
afterAll(() => {
  vi.restoreAllMocks();
});

// 全局测试工具函数
export const testUtils = {
  /**
   * 等待一段时间
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * 创建模拟的 Response 对象
   */
  createMockResponse: (data: any, ok = true, status = 200) => {
    return {
      ok,
      status,
      json: async () => data,
      text: async () => JSON.stringify(data),
      headers: new Headers(),
    } as Response;
  },

  /**
   * 模拟 fetch 成功响应
   */
  mockFetchSuccess: (data: any) => {
    (global.fetch as any).mockResolvedValueOnce(
      testUtils.createMockResponse(data, true, 200)
    );
  },

  /**
   * 模拟 fetch 失败响应
   */
  mockFetchError: (error: Error | string) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    (global.fetch as any).mockRejectedValueOnce(errorObj);
  },

  /**
   * 模拟 fetch 404 响应
   */
  mockFetch404: () => {
    (global.fetch as any).mockResolvedValueOnce(
      testUtils.createMockResponse(null, false, 404)
    );
  },
};

// 导出测试辅助类型
export type MockedFunction<T extends (...args: any[]) => any> = ReturnType<typeof vi.fn<T>>;
