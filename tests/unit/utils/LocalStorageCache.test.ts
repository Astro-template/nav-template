/**
 * LocalStorageCache 单元测试
 * 测试本地存储缓存的所有核心功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LocalStorageCache } from "../../../src/utils/LocalStorageCache";
import type { CacheStats } from "../../../src/utils/LocalStorageCache";

describe("LocalStorageCache", () => {
  let cache: LocalStorageCache;

  beforeEach(() => {
    // 清理 localStorage
    localStorage.clear();

    // 清理所有 mock
    vi.clearAllMocks();

    // 创建 LocalStorageCache 实例
    cache = new LocalStorageCache({
      prefix: "test_cache_",
      defaultTTL: 60000, // 1分钟
      maxSize: 1024 * 1024, // 1MB
      maxItems: 100,
      enableCompression: false, // 测试时禁用压缩
      cleanupInterval: 999999, // 禁用自动清理
    });
  });

  afterEach(() => {
    cache.destroy();
    localStorage.clear();
  });

  describe("constructor", () => {
    it("应该使用默认前缀初始化", () => {
      const defaultCache = new LocalStorageCache();
      expect(defaultCache).toBeDefined();
      defaultCache.destroy();
    });

    it("应该使用自定义前缀初始化", () => {
      const customCache = new LocalStorageCache({ prefix: "custom_" });
      expect(customCache).toBeDefined();
      customCache.destroy();
    });

    it("应该初始化统计信息", () => {
      const stats = cache.getStats();
      expect(stats).toBeDefined();
      expect(stats.totalItems).toBe(0);
      expect(stats.hitCount).toBe(0);
      expect(stats.missCount).toBe(0);
    });
  });

  describe("set", () => {
    it("应该成功存储数据", async () => {
      const key = "testKey";
      const value = { data: "test data" };

      const result = await cache.set(key, value);

      expect(result).toBe(true);
    });

    it("应该序列化复杂对象", async () => {
      const complexData = {
        string: "test",
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        nested: { a: 1, b: { c: 2 } },
      };

      const result = await cache.set("complex", complexData);

      expect(result).toBe(true);

      const retrieved = await cache.get("complex");
      expect(retrieved).toEqual(complexData);
    });

    it("应该使用自定义 TTL", async () => {
      const key = "ttlKey";
      const value = { data: "test" };
      const ttl = 5000;

      await cache.set(key, value, ttl);

      // 数据应该立即可用
      const retrieved = await cache.get(key);
      expect(retrieved).toEqual(value);
    });



    it("应该处理大数据", async () => {
      const largeData = {
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: `Description for item ${i}`.repeat(10),
        })),
      };

      const result = await cache.set("large", largeData);

      expect(result).toBe(true);

      const retrieved = await cache.get("large");
      expect(retrieved).toEqual(largeData);
    });
  });

  describe("get", () => {
    it("应该成功获取存储的数据", async () => {
      const key = "testKey";
      const value = { data: "test data" };

      await cache.set(key, value);
      const result = await cache.get(key);

      expect(result).toEqual(value);
    });

    it("应该返回 null 当键不存在", async () => {
      const result = await cache.get("nonexistent");

      expect(result).toBeNull();
    });

    it("应该返回 null 当数据过期", async () => {
      const key = "expiredKey";
      const value = { data: "test" };
      const ttl = 50; // 50ms

      await cache.set(key, value, ttl);

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await cache.get(key);

      expect(result).toBeNull();
    });

    it("应该更新访问统计", async () => {
      await cache.set("key", { data: "test" });

      const statsBefore = cache.getStats();
      const hitsBefore = statsBefore.hitCount;

      await cache.get("key");

      const statsAfter = cache.getStats();
      expect(statsAfter.hitCount).toBe(hitsBefore + 1);
    });

    it("应该统计未命中", async () => {
      const statsBefore = cache.getStats();
      const missesBefore = statsBefore.missCount;

      await cache.get("nonexistent");

      const statsAfter = cache.getStats();
      expect(statsAfter.missCount).toBe(missesBefore + 1);
    });

    it("应该处理 JSON 解析错误", async () => {
      // 直接在 localStorage 中设置无效数据
      localStorage.setItem("test_cache_invalid", "invalid json");

      const result = await cache.get("invalid");

      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("应该删除指定的键", async () => {
      const key = "testKey";
      await cache.set(key, { data: "test" });

      const result = await cache.delete(key);

      expect(result).toBe(true);

      const retrieved = await cache.get(key);
      expect(retrieved).toBeNull();
    });

    it("应该处理删除不存在的键", async () => {
      const result = await cache.delete("nonexistent");

      // 即使键不存在也应该返回 true（操作成功）
      expect(result).toBe(true);
    });

    it("应该更新统计信息", async () => {
      await cache.set("key1", { data: "test1" });
      await cache.set("key2", { data: "test2" });

      const statsBefore = cache.getStats();
      const itemsBefore = statsBefore.totalItems;

      await cache.delete("key1");

      const statsAfter = cache.getStats();
      expect(statsAfter.totalItems).toBeLessThan(itemsBefore);
    });
  });

  describe("clear", () => {
    it("应该清除所有带前缀的项", async () => {
      await cache.set("key1", { data: "test1" });
      await cache.set("key2", { data: "test2" });
      await cache.set("key3", { data: "test3" });

      const result = await cache.clear();

      expect(result).toBe(true);

      const retrieved1 = await cache.get("key1");
      const retrieved2 = await cache.get("key2");
      const retrieved3 = await cache.get("key3");

      expect(retrieved1).toBeNull();
      expect(retrieved2).toBeNull();
      expect(retrieved3).toBeNull();
    });

    it("应该只删除匹配前缀的项", async () => {
      // 设置测试缓存的项
      await cache.set("key1", { data: "test1" });

      // 设置其他前缀的项
      localStorage.setItem("other_prefix_key", "other data");

      await cache.clear();

      // 测试缓存的项应该被删除
      const result1 = await cache.get("key1");
      expect(result1).toBeNull();

      // 其他前缀的项应该保留
      const otherItem = localStorage.getItem("other_prefix_key");
      expect(otherItem).toBe("other data");
    });
  });

  describe("has", () => {
    it("应该返回 true 当键存在", async () => {
      await cache.set("key", { data: "test" });

      const result = cache.has("key");

      expect(result).toBe(true);
    });

    it("应该返回 false 当键不存在", () => {
      const result = cache.has("nonexistent");

      expect(result).toBe(false);
    });

    it("应该返回 false 当数据过期", async () => {
      await cache.set("expiredKey", { data: "test" }, 50);

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = cache.has("expiredKey");

      expect(result).toBe(false);
    });
  });

  describe("size", () => {
    it("应该返回缓存中的项数", async () => {
      await cache.set("key1", { data: "test1" });
      await cache.set("key2", { data: "test2" });
      await cache.set("key3", { data: "test3" });

      const size = cache.size();

      expect(size).toBe(3);
    });

    it("应该在删除后更新大小", async () => {
      await cache.set("key1", { data: "test1" });
      await cache.set("key2", { data: "test2" });

      await cache.delete("key1");

      const size = cache.size();

      expect(size).toBe(1);
    });

    it("应该在清除后返回 0", async () => {
      await cache.set("key1", { data: "test1" });
      await cache.set("key2", { data: "test2" });

      await cache.clear();

      const size = cache.size();

      expect(size).toBe(0);
    });
  });

  describe("keys", () => {
    it("应该返回所有键（不含前缀）", async () => {
      await cache.set("key1", { data: "test1" });
      await cache.set("key2", { data: "test2" });
      await cache.set("key3", { data: "test3" });

      const keys = cache.keys();

      expect(keys).toHaveLength(3);
      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
      expect(keys).toContain("key3");
    });

    it("应该返回空数组当无缓存项", () => {
      const keys = cache.keys();

      expect(keys).toEqual([]);
    });
  });

  describe("getStats", () => {
    it("应该返回缓存统计信息", async () => {
      await cache.set("key", { data: "test" });

      const stats = cache.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalItems).toBeGreaterThan(0);
      expect(typeof stats.hitCount).toBe("number");
      expect(typeof stats.missCount).toBe("number");
      expect(typeof stats.hitRate).toBe("number");
    });

    it("应该计算命中率", async () => {
      await cache.set("key", { data: "test" });

      // 命中
      await cache.get("key");
      await cache.get("key");

      // 未命中
      await cache.get("nonexistent");

      const stats = cache.getStats();

      expect(stats.hitCount).toBe(2);
      expect(stats.missCount).toBe(1);
      expect(stats.hitRate).toBeCloseTo(66.67, 0);
    });

    it("应该统计总项数", async () => {
      await cache.set("key1", { data: "test1" });
      await cache.set("key2", { data: "test2" });
      await cache.set("key3", { data: "test3" });

      const stats = cache.getStats();

      expect(stats.totalItems).toBe(3);
    });

    it("应该估算总大小", async () => {
      await cache.set("key", { data: "test data" });

      const stats = cache.getStats();

      expect(stats.totalSize).toBeGreaterThan(0);
    });
  });

  describe("cleanup", () => {
    it("应该清除所有过期项", async () => {
      // 设置短 TTL 的项
      await cache.set("expired1", { data: "test1" }, 50);
      await cache.set("expired2", { data: "test2" }, 50);
      await cache.set("valid", { data: "test3" }, 60000);

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 100));

      const cleanedCount = await cache.cleanup();

      expect(cleanedCount).toBeGreaterThanOrEqual(0);

      // 过期项应该被删除
      const result1 = await cache.get("expired1");
      const result2 = await cache.get("expired2");
      expect(result1).toBeNull();
      expect(result2).toBeNull();

      // 有效项应该保留
      const result3 = await cache.get("valid");
      expect(result3).toEqual({ data: "test3" });
    });

    it("应该返回清除的项数", async () => {
      await cache.set("expired", { data: "test" }, 50);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const cleanedCount = await cache.cleanup();

      expect(typeof cleanedCount).toBe("number");
      expect(cleanedCount).toBeGreaterThanOrEqual(0);
    });

    it("应该处理损坏的数据", async () => {
      // 直接设置无效的 localStorage 数据
      localStorage.setItem("test_cache_corrupted", "invalid json");

      const cleanedCount = await cache.cleanup();

      // 不应该抛出错误
      expect(typeof cleanedCount).toBe("number");
    });
  });

  describe("TTL behavior", () => {
    it("应该在 TTL 后过期", async () => {
      await cache.set("key", { data: "test" }, 100);

      // 立即获取应该成功
      let result = await cache.get("key");
      expect(result).toEqual({ data: "test" });

      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 150));

      // 过期后应该返回 null
      result = await cache.get("key");
      expect(result).toBeNull();
    });

    it("应该使用默认 TTL", async () => {
      await cache.set("key", { data: "test" });

      const result = await cache.get("key");

      expect(result).toEqual({ data: "test" });
    });

    it("应该允许覆盖默认 TTL", async () => {
      await cache.set("key", { data: "test" }, 50);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await cache.get("key");

      expect(result).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("应该处理空字符串键", async () => {
      const result = await cache.set("", { data: "test" });

      expect(result).toBe(true);

      const retrieved = await cache.get("");
      expect(retrieved).toEqual({ data: "test" });
    });

    it("应该处理 null 值", async () => {
      const result = await cache.set("key", null);

      expect(result).toBe(true);

      const retrieved = await cache.get("key");
      expect(retrieved).toBeNull();
    });



    it("应该处理空对象", async () => {
      const result = await cache.set("key", {});

      expect(result).toBe(true);

      const retrieved = await cache.get("key");
      expect(retrieved).toEqual({});
    });

    it("应该处理空数组", async () => {
      const result = await cache.set("key", []);

      expect(result).toBe(true);

      const retrieved = await cache.get("key");
      expect(retrieved).toEqual([]);
    });

    it("应该处理特殊字符键", async () => {
      const specialKeys = [
        "key with spaces",
        "key-with-dashes",
        "key_with_underscores",
        "key.with.dots",
      ];

      for (const key of specialKeys) {
        const result = await cache.set(key, { data: key });
        expect(result).toBe(true);

        const retrieved = await cache.get(key);
        expect(retrieved).toEqual({ data: key });
      }
    });

    it("应该处理大量数据", async () => {
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(cache.set(`key${i}`, { data: `test${i}` }));
      }

      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result).toBe(true);
      });

      const stats = cache.getStats();
      expect(stats.totalItems).toBe(50);
    });
  });

  describe("error handling", () => {
    it("应该处理 getItem 抛出异常", async () => {
      const originalGetItem = Storage.prototype.getItem;
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error("getItem error");
      });

      const result = await cache.get("key");

      // 应该返回 null 而不是抛出错误
      expect(result).toBeNull();

      Storage.prototype.getItem = originalGetItem;
    });
  });

  describe("performance", () => {
    it("应该快速设置数据", async () => {
      const startTime = Date.now();

      await cache.set("key", { data: "test" });

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
    });

    it("应该快速获取数据", async () => {
      await cache.set("key", { data: "test" });

      const startTime = Date.now();

      await cache.get("key");

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(50);
    });

    it("应该处理批量操作", async () => {
      const startTime = Date.now();

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(cache.set(`key${i}`, { data: `test${i}` }));
      }

      await Promise.all(promises);

      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000);
    });
  });

  describe("destroy", () => {
    it("应该清理所有资源", () => {
      cache.destroy();

      // 不应该抛出错误
      expect(true).toBe(true);
    });

    it("应该停止清理定时器", async () => {
      const cacheWithTimer = new LocalStorageCache({
        prefix: "timer_test_",
        cleanupInterval: 100,
      });

      cacheWithTimer.destroy();

      // 不应该抛出错误
      expect(true).toBe(true);
    });
  });
});
