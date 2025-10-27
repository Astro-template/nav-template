/**
 * Vitest 全局测试设置
 * 用于 mock fetch 和其他全局配置
 */

import { vi } from 'vitest';

// 设置测试环境标识
process.env.NODE_ENV = 'test';

// Mock 配置数据（符合 UnifiedConfig 类型定义）
const mockConfig = {
  site: {
    title: 'Test Site',
    description: 'Test Description',
    logo: { text: 'T' },
  },
  optimization: {
    enabled: true,
    lazyLoad: true,
    preload: true,
  },
  menuItems: [
    {
      name: 'Test Category 1',
      icon: 'icon-test-1',
      categoryIndex: 0,
      url: '/category-0.json',
      siteCount: 10,
      previewSites: [],
    },
    {
      name: 'Test Category 2',
      icon: 'icon-test-2',
      categoryIndex: 1,
      url: '/category-1.json',
      siteCount: 15,
      previewSites: [],
    },
    {
      name: 'Test Category 3',
      icon: 'icon-test-3',
      categoryIndex: 2,
      url: '/category-2.json',
      siteCount: 20,
      previewSites: [],
      submenu: [
        {
          name: 'Child 1',
          icon: 'icon-child-1',
          categoryIndex: 3,
          url: '/category-3.json',
          siteCount: 5,
          previewSites: [],
        },
        {
          name: 'Child 2',
          icon: 'icon-child-2',
          categoryIndex: 4,
          url: '/category-4.json',
          siteCount: 8,
          previewSites: [],
        },
      ],
    },
  ],
  totalSiteCount: 58,
};

// Mock 分类数据
const mockCategoryData = (index: number) => ({
  categoryName: `Test Category ${index}`,
  categoryIndex: index,
  sites: [
    {
      title: `Site ${index}-1`,
      url: `https://example${index}-1.com`,
      description: `Test site ${index}-1`,
      icon: 'icon-site',
    },
    {
      title: `Site ${index}-2`,
      url: `https://example${index}-2.com`,
      description: `Test site ${index}-2`,
      icon: 'icon-site',
    },
  ],
});

// Mock global fetch
global.fetch = vi.fn((url: string | URL | Request, init?: RequestInit) => {
  const urlString = typeof url === 'string' ? url : url.toString();

  // Mock config.json
  if (urlString.includes('/config.json')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () => Promise.resolve(mockConfig),
      text: () => Promise.resolve(JSON.stringify(mockConfig)),
      blob: () => Promise.resolve(new Blob([JSON.stringify(mockConfig)])),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      clone: function() { return this; },
    } as Response);
  }

  // Mock category-*.json
  const categoryMatch = urlString.match(/category-(\d+)\.json/);
  if (categoryMatch) {
    const index = parseInt(categoryMatch[1], 10);
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      json: () => Promise.resolve(mockCategoryData(index)),
      text: () => Promise.resolve(JSON.stringify(mockCategoryData(index))),
      blob: () => Promise.resolve(new Blob([JSON.stringify(mockCategoryData(index))])),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      clone: function() { return this; },
    } as Response);
  }

  // Mock 404
  return Promise.resolve({
    ok: false,
    status: 404,
    statusText: 'Not Found',
    headers: new Headers(),
    json: () => Promise.reject(new Error('Not Found')),
    text: () => Promise.resolve('Not Found'),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    clone: function() { return this; },
  } as Response);
}) as any;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

global.localStorage = localStorageMock as Storage;

// Mock performance.now if not available
if (typeof performance === 'undefined') {
  (global as any).performance = {
    now: () => Date.now(),
  };
}

console.log('✅ Test setup completed: fetch, localStorage, and performance mocked');
