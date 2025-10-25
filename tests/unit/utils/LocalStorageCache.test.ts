/**
 * LocalStorageCache 单元测试
 * 测试本地存储缓存的所有核心功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LocalStorageCache } from '../../../src/utils/LocalStorageCache';

describe('LocalStorageCache', () => {
  let cache: LocalStorageCache;
  let localStorageMock: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
    length: number;
    key: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    global.localStorage = localStorageMock as any;

    cache = new LocalStorageCache('test-prefix');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('应该使用默认前缀初始化', () => {
      const defaultCache = new LocalStorageCache();
      expect(defaultCache).toBeDefined();
    });

    it('应该使用自定义前缀初始化', () => {
      const customCache = new LocalStorageCache('custom');
      expect(customCache).toBeDefined();
    });

    it('应该设置默认 TTL', () => {
      const stats = cache.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('set', () => {
    it('应该成功存储数据', async () => {
      const key = 'testKey';
      const value = { data: 'test data' };

      await cache.set(key, value);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        expect.stringContaining(key),
        expect.any(String)
      );
    });

    it('应该序列化复杂对象', async () => {
      const complexData = {
        string: 'test',
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        nested: { a: 1, b: { c: 2 } },
      };

      await cache.set('complex', complexData);

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('应该使用自定义 TTL', async () => {
      const key = 'ttlKey';
      const value = { data: 'test' };
      const ttl = 5000;

      await cache.set(key, value, ttl);

      const callArgs = localStorageMock.setItem.mock.calls[0];
      const storedData = JSON.parse(callArgs[1]);

      expect(storedData.expiresAt).toBeGreaterThan(Date.now());
      expect(storedData.expiresAt).toBeLessThanOrEqual(Date.now() + ttl + 100);
    });

    it('应该包含时间戳', async () => {
      await cache.set('key', { data: 'test' });

      const callArgs = localStorageMock.setItem.mock.calls[0];
      const storedData = JSON.parse(callArgs[1]);

      expect(storedData.timestamp).toBeDefined();
      expect(storedData.timestamp).toBeGreaterThan(0);
    });

    it('应该处理存储失败', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      await expect(cache.set('key', { data: 'test' })).rejects.toThrow();
    });

    it('应该添加版本信息', async () => {
      await cache.set('key', { data: 'test' });

      const callArgs = localStorageMock.setItem.mock.calls[0];
      const storedData = JSON.parse(callArgs[1]);

      expect(storedData.version).toBeDefined();
    });
  });

  describe('get', () => {
    it('应该成功获取存储的数据', async () => {
      const key = 'testKey';
      const value = { data: 'test data' };
      const storedData = {
        value,
        timestamp: Date.now(),
        expiresAt: Date.now() + 3600000,
        version: '1.0',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      const result = await cache.get(key);

      expect(result).toEqual(value);
    });

    it('应该返回 null 如果键不存在', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = await cache.get('nonexistent');

      expect(result).toBeNull();
    });

    it('应该检查过期时间', async () => {
      const key = 'expiredKey';
      const storedData = {
        value: { data: 'test' },
        timestamp: Date.now() - 10000,
        expiresAt: Date.now() - 5000, // 已过期
        version: '1.0',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      const result = await cache.get(key);

      expect(result).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        expect.stringContaining(key)
      );
    });

    it('应该处理损坏的数据', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json{');

      const result = await cache.get('corrupted');

      expect(result).toBeNull();
    });

    it('应该处理缺少必需字段的数据', async () => {
      localStorageMock.getItem.mockReturnValue(
        JSON.stringify({ value: 'test' }) // 缺少 timestamp 等
      );

      const result = await cache.get('incomplete');

      expect(result).toBeNull();
    });

    it('应该更新访问统计', async () => {
      const storedData = {
        value: { data: 'test' },
        timestamp: Date.now(),
        expiresAt: Date.now() + 3600000,
        version: '1.0',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      await cache.get('key');

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
    });

    it('应该统计未命中', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      await cache.get('missing');

      const stats = cache.getStats();
      expect(stats.misses).toBe(1);
    });
  });

  describe('has', () => {
    it('应该检查键是否存在且未过期', async () => {
      const storedData = {
        value: { data: 'test' },
        timestamp: Date.now(),
        expiresAt: Date.now() + 3600000,
        version: '1.0',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      const exists = await cache.has('key');

      expect(exists).toBe(true);
    });

    it('应该返回 false 如果键不存在', async () => {
      localStorageMock.getItem.mockReturnValue(null);

      const exists = await cache.has('missing');

      expect(exists).toBe(false);
    });

    it('应该返回 false 如果数据已过期', async () => {
      const storedData = {
        value: { data: 'test' },
        timestamp: Date.now() - 10000,
        expiresAt: Date.now() - 5000,
        version: '1.0',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      const exists = await cache.has('expired');

      expect(exists).toBe(false);
    });
  });

  describe('remove', () => {
    it('应该删除指定的键', async () => {
      await cache.remove('testKey');

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        expect.stringContaining('testKey')
      );
    });

    it('应该处理删除不存在的键', async () => {
      await cache.remove('nonexistent');

      expect(localStorageMock.removeItem).toHaveBeenCalled();
    });

    it('应该更新统计信息', async () => {
      await cache.remove('key');

      const stats = cache.getStats();
      expect(stats).toBeDefined();
    });
  });

  describe('clear', () => {
    it('应该清除所有带前缀的项', async () => {
      const keys = ['key1', 'key2', 'key3'];

      // 模拟 localStorage 中有多个项
      localStorageMock.length = 5;
      localStorageMock.key.mockImplementation((index) => {
        const allKeys = [
          'test-prefix-key1',
          'test-prefix-key2',
          'other-prefix-key',
          'test-prefix-key3',
          'another-key',
        ];
        return allKeys[index] || null;
      });

      await cache.clear();

      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(3);
    });

    it('应该只删除匹配前缀的项', async () => {
      localStorageMock.length = 3;
      localStorageMock.key.mockImplementation((index) => {
        const keys = ['test-prefix-key1', 'other-prefix-key', 'test-prefix-key2'];
        return keys[index] || null;
      });

      await cache.clear();

      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(2);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-prefix-key1');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-prefix-key2');
    });

    it('应该重置统计信息', async () => {
      localStorageMock.length = 0;

      await cache.clear();

      const stats = cache.getStats();
      expect(stats.totalItems).toBe(0);
    });
  });

  describe('getStats', () => {
    it('应该返回缓存统计信息', () => {
      const stats = cache.getStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('totalItems');
      expect(stats).toHaveProperty('totalSize');
    });

    it('应该计算命中率', async () => {
      const storedData = {
        value: { data: 'test' },
        timestamp: Date.now(),
        expiresAt: Date.now() + 3600000,
        version: '1.0',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      await cache.get('key1'); // hit
      await cache.get('key2'); // hit

      localStorageMock.getItem.mockReturnValue(null);
      await cache.get('key3'); // miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(66.67, 1);
    });

    it('应该统计总项数', () => {
      localStorageMock.length = 10;
      localStorageMock.key.mockImplementation((index) => {
        if (index < 5) return `test-prefix-key${index}`;
        return `other-prefix-key${index}`;
      });

      const stats = cache.getStats();
      expect(stats.totalItems).toBe(5);
    });

    it('应该估算总大小', () => {
      localStorageMock.length = 2;
      localStorageMock.key.mockImplementation((index) =>
        index === 0 ? 'test-prefix-key1' : 'test-prefix-key2'
      );
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        value: { data: 'test' },
        timestamp: Date.now(),
        expiresAt: Date.now() + 3600000,
        version: '1.0',
      }));

      const stats = cache.getStats();
      expect(stats.totalSize).toBeGreaterThan(0);
    });
  });

  describe('cleanExpired', () => {
    it('应该清除所有过期项', async () => {
      const now = Date.now();

      localStorageMock.length = 3;
      localStorageMock.key.mockImplementation((index) => {
        const keys = ['test-prefix-key1', 'test-prefix-key2', 'test-prefix-key3'];
        return keys[index] || null;
      });

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'test-prefix-key1') {
          return JSON.stringify({
            value: 'data',
            timestamp: now - 10000,
            expiresAt: now - 5000, // 过期
            version: '1.0',
          });
        }
        if (key === 'test-prefix-key2') {
          return JSON.stringify({
            value: 'data',
            timestamp: now,
            expiresAt: now + 3600000, // 未过期
            version: '1.0',
          });
        }
        if (key === 'test-prefix-key3') {
          return JSON.stringify({
            value: 'data',
            timestamp: now - 7200000,
            expiresAt: now - 3600000, // 过期
            version: '1.0',
          });
        }
        return null;
      });

      await cache.cleanExpired();

      expect(localStorageMock.removeItem).toHaveBeenCalledTimes(2);
    });

    it('应该返回清除的项数', async () => {
      const now = Date.now();

      localStorageMock.length = 2;
      localStorageMock.key.mockImplementation((index) =>
        index === 0 ? 'test-prefix-key1' : 'test-prefix-key2'
      );

      localStorageMock.getItem.mockImplementation(() =>
        JSON.stringify({
          value: 'data',
          timestamp: now - 10000,
          expiresAt: now - 5000,
          version: '1.0',
        })
      );

      const count = await cache.cleanExpired();

      expect(count).toBe(2);
    });

    it('应该处理损坏的数据', async () => {
      localStorageMock.length = 2;
      localStorageMock.key.mockImplementation((index) =>
        `test-prefix-key${index}`
      );
      localStorageMock.getItem.mockReturnValue('invalid json');

      await expect(cache.cleanExpired()).resolves.not.toThrow();
    });
  });

  describe('keys', () => {
    it('应该返回所有键（不含前缀）', () => {
      localStorageMock.length = 3;
      localStorageMock.key.mockImplementation((index) => {
        const keys = ['test-prefix-key1', 'test-prefix-key2', 'other-prefix-key'];
        return keys[index] || null;
      });

      const keys = cache.keys();

      expect(keys).toEqual(['key1', 'key2']);
    });

    it('应该返回空数组如果没有项', () => {
      localStorageMock.length = 0;

      const keys = cache.keys();

      expect(keys).toEqual([]);
    });
  });

  describe('size', () => {
    it('应该返回缓存中的项数', () => {
      localStorageMock.length = 5;
      localStorageMock.key.mockImplementation((index) => {
        if (index < 3) return `test-prefix-key${index}`;
        return `other-prefix-key${index}`;
      });

      const size = cache.size();

      expect(size).toBe(3);
    });

    it('应该返回 0 如果缓存为空', () => {
      localStorageMock.length = 0;

      const size = cache.size();

      expect(size).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('应该处理 null 值', async () => {
      await cache.set('nullKey', null);

      const result = await cache.get('nullKey');
      expect(result).toBeNull();
    });

    it('应该处理 undefined 值', async () => {
      await cache.set('undefinedKey', undefined);

      const result = await cache.get('undefinedKey');
      expect(result).toBeNull();
    });

    it('应该处理空字符串键', async () => {
      await cache.set('', { data: 'test' });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('应该处理非常大的值', async () => {
      const largeValue = { data: 'x'.repeat(100000) };

      await cache.set('large', largeValue);

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('应该处理特殊字符在键中', async () => {
      const specialKey = 'key-with-!@#$%^&*()_+';

      await cache.set(specialKey, { data: 'test' });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        expect.stringContaining(specialKey),
        expect.any(String)
      );
    });

    it('应该处理中文键', async () => {
      const chineseKey = '中文键名';

      await cache.set(chineseKey, { data: 'test' });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('应该处理循环引用', async () => {
      const obj: any = { name: 'test' };
      obj.self = obj; // 循环引用

      await expect(cache.set('circular', obj)).rejects.toThrow();
    });
  });

  describe('performance', () => {
    it('应该快速存储数据', async () => {
      const start = Date.now();

      await cache.set('key', { data: 'test' });

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50);
    });

    it('应该快速检索数据', async () => {
      const storedData = {
        value: { data: 'test' },
        timestamp: Date.now(),
        expiresAt: Date.now() + 3600000,
        version: '1.0',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));

      const start = Date.now();
      await cache.get('key');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });

    it('应该能处理大量操作', async () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        await cache.set(`key${i}`, { data: `value${i}` });
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('TTL behavior', () => {
    it('应该使用默认 TTL', async () => {
      await cache.set('key', { data: 'test' });

      const callArgs = localStorageMock.setItem.mock.calls[0];
      const storedData = JSON.parse(callArgs[1]);

      expect(storedData.expiresAt).toBeGreaterThan(Date.now());
    });

    it('应该支持永不过期（TTL = 0）', async () => {
      await cache.set('key', { data: 'test' }, 0);

      const callArgs = localStorageMock.setItem.mock.calls[0];
      const storedData = JSON.parse(callArgs[1]);

      expect(storedData.expiresAt).toBe(0);
    });

    it('应该支持短 TTL', async () => {
      const shortTTL = 100; // 100ms
      await cache.set('key', { data: 'test' }, shortTTL);

      const callArgs = localStorageMock.setItem.mock.calls[0];
      const storedData = JSON.parse(callArgs[1]);

      expect(storedData.expiresAt).toBeLessThanOrEqual(Date.now() + shortTTL + 50);
    });

    it('应该支持长 TTL', async () => {
      const longTTL = 86400000; // 24小时
      await cache.set('key', { data: 'test' }, longTTL);

      const callArgs = localStorageMock.setItem.mock.calls[0];
      const storedData = JSON.parse(callArgs[1]);

      expect(storedData.expiresAt).toBeGreaterThan(Date.now() + longTTL - 1000);
    });
  });

  describe('error handling', () => {
    it('应该处理 localStorage 不可用', () => {
      delete (global as any).localStorage;

      expect(() => new LocalStorageCache()).not.toThrow();
    });

    it('应该处理 setItem 抛出异常', async () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      await expect(cache.set('key', { data: 'test' })).rejects.toThrow();
    });

    it('应该处理 getItem 抛出异常', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Access denied');
      });

      const result = await cache.get('key');
      expect(result).toBeNull();
    });

    it('应该处理 removeItem 抛出异常', async () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Access denied');
      });

      await expect(cache.remove('key')).resolves.not.toThrow();
    });
  });
});
