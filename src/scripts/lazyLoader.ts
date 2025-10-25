/**
 * 客户端懒加载脚本
 * Week 2: 前端懒加载机制实现
 */

// 类型定义 (简化版，用于客户端)
interface CategoryData {
  categoryIndex: number;
  categoryName: string;
  sites: Site[];
  metadata: {
    siteCount: number;
    fileSizeKB: number;
  };
}

interface Site {
  title: string;
  description: string;
  url?: string;
  advantages?: string[];
  details?: {
    pricing?: string;
    pros?: string[];
    cons?: string[];
  };
}

interface LoadingState {
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  error?: string;
  retryCount: number;
}

/**
 * 懒加载管理器 (客户端版本)
 */
class ClientLazyLoader {
  private cache = new Map<number, CategoryData>();
  private loadingStates = new Map<number, LoadingState>();
  private loadingPromises = new Map<number, Promise<CategoryData>>();
  private config = {
    maxRetries: 3,
    retryDelay: 1000,
    timeout: 10000,
    cacheExpiry: 30 * 60 * 1000, // 30分钟
  };

  constructor() {
    this.initializeEventListeners();
    this.loadFromCache();
  }

  /**
   * 初始化事件监听器
   */
  private initializeEventListeners(): void {
    document.addEventListener("click", this.handleClick.bind(this));
    document.addEventListener(
      "DOMContentLoaded",
      this.handleDOMReady.bind(this),
    );

    // 监听页面可见性变化，清理过期缓存
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        this.cleanExpiredCache();
      }
    });
  }

  /**
   * 处理点击事件
   */
  private async handleClick(event: Event): Promise<void> {
    const target = event.target as HTMLElement;
    const button = target.closest("[data-action]") as HTMLElement;

    if (!button) return;

    const action = button.dataset.action;
    const categoryIndex = parseInt(button.dataset.categoryIndex || "0");

    switch (action) {
      case "load-category":
        event.preventDefault();
        await this.loadCategory(categoryIndex);
        break;
      case "retry-load":
        event.preventDefault();
        await this.retryLoad(categoryIndex);
        break;
    }
  }

  /**
   * 处理DOM就绪事件
   */
  private handleDOMReady(): void {
    console.log("🚀 懒加载器已初始化");

    // 预加载第一个分类 (如果存在)
    const firstCategory = document.querySelector('[data-category-index="0"]');
    if (firstCategory) {
      console.log("🔮 预加载第一个分类");
      this.loadCategory(0).catch(console.warn);
    }
  }

  /**
   * 加载分类数据
   */
  async loadCategory(categoryIndex: number): Promise<void> {
    console.log(`🔄 开始加载分类 ${categoryIndex}`);

    // 检查是否已在加载中
    if (this.loadingPromises.has(categoryIndex)) {
      console.log(`⏳ 分类 ${categoryIndex} 正在加载中`);
      await this.loadingPromises.get(categoryIndex);
      return;
    }

    // 检查缓存
    if (this.cache.has(categoryIndex)) {
      console.log(`📦 从缓存加载分类 ${categoryIndex}`);
      this.renderCategory(categoryIndex, this.cache.get(categoryIndex)!);
      return;
    }

    // 更新UI状态
    this.updateLoadingState(categoryIndex, {
      isLoading: true,
      isLoaded: false,
      hasError: false,
      retryCount: 0,
    });
    this.showLoadingUI(categoryIndex);

    // 创建加载Promise
    const loadPromise = this.performLoad(categoryIndex);
    this.loadingPromises.set(categoryIndex, loadPromise);

    try {
      const data = await loadPromise;
      this.cache.set(categoryIndex, data);
      this.saveToCache();
      this.renderCategory(categoryIndex, data);

      this.updateLoadingState(categoryIndex, {
        isLoading: false,
        isLoaded: true,
        hasError: false,
        retryCount: 0,
      });

      console.log(`✅ 分类 ${categoryIndex} 加载成功`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "未知错误";
      console.error(`❌ 分类 ${categoryIndex} 加载失败:`, errorMessage);

      this.updateLoadingState(categoryIndex, {
        isLoading: false,
        isLoaded: false,
        hasError: true,
        error: errorMessage,
        retryCount:
          (this.loadingStates.get(categoryIndex)?.retryCount || 0) + 1,
      });

      this.showErrorUI(categoryIndex, errorMessage);
    } finally {
      this.loadingPromises.delete(categoryIndex);
    }
  }

  /**
   * 执行实际的网络请求
   */
  private async performLoad(categoryIndex: number): Promise<CategoryData> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`/categories/${categoryIndex}.json`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // 验证数据格式
      if (!this.validateCategoryData(data)) {
        throw new Error("分类数据格式无效");
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 重试加载
   */
  private async retryLoad(categoryIndex: number): Promise<void> {
    const state = this.loadingStates.get(categoryIndex);
    if (state && state.retryCount >= this.config.maxRetries) {
      console.warn(`⚠️ 分类 ${categoryIndex} 已达到最大重试次数`);
      return;
    }

    // 等待一段时间后重试
    const delay = this.config.retryDelay * (state?.retryCount || 0);
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    await this.loadCategory(categoryIndex);
  }

  /**
   * 验证分类数据
   */
  private validateCategoryData(data: any): data is CategoryData {
    return (
      typeof data === "object" &&
      typeof data.categoryIndex === "number" &&
      typeof data.categoryName === "string" &&
      Array.isArray(data.sites) &&
      typeof data.metadata === "object"
    );
  }

  /**
   * 更新加载状态
   */
  private updateLoadingState(categoryIndex: number, state: LoadingState): void {
    this.loadingStates.set(categoryIndex, state);
  }

  /**
   * 显示加载UI
   */
  private showLoadingUI(categoryIndex: number): void {
    const container = document.querySelector(
      `[data-category-index="${categoryIndex}"]`,
    );
    if (!container) return;

    const lazyContent = container.querySelector(".lazy-content") as HTMLElement;
    const loadingState = container.querySelector(
      ".loading-state",
    ) as HTMLElement;
    const loadedContent = container.querySelector(
      ".loaded-content",
    ) as HTMLElement;
    const errorState = container.querySelector(".error-state") as HTMLElement;
    const loadButton = container.querySelector(".load-more-btn") as HTMLElement;

    if (lazyContent) lazyContent.style.display = "block";
    if (loadingState) loadingState.style.display = "block";
    if (loadedContent) loadedContent.style.display = "none";
    if (errorState) errorState.style.display = "none";

    if (loadButton) {
      loadButton.classList.add("loading");
      (loadButton as HTMLButtonElement).disabled = true;
    }
  }

  /**
   * 显示错误UI
   */
  private showErrorUI(categoryIndex: number, error: string): void {
    const container = document.querySelector(
      `[data-category-index="${categoryIndex}"]`,
    );
    if (!container) return;

    const loadingState = container.querySelector(
      ".loading-state",
    ) as HTMLElement;
    const errorState = container.querySelector(".error-state") as HTMLElement;
    const errorText = container.querySelector(".error-text") as HTMLElement;
    const loadButton = container.querySelector(".load-more-btn") as HTMLElement;

    if (loadingState) loadingState.style.display = "none";
    if (errorState) errorState.style.display = "block";
    if (errorText) errorText.textContent = error;

    if (loadButton) {
      loadButton.classList.remove("loading");
      (loadButton as HTMLButtonElement).disabled = false;
    }
  }

  /**
   * 渲染分类内容
   */
  private renderCategory(categoryIndex: number, data: CategoryData): void {
    const container = document.querySelector(
      `[data-category-index="${categoryIndex}"]`,
    );
    if (!container) return;

    const loadingState = container.querySelector(
      ".loading-state",
    ) as HTMLElement;
    const loadedContent = container.querySelector(
      ".loaded-content",
    ) as HTMLElement;
    const errorState = container.querySelector(".error-state") as HTMLElement;
    const loadButton = container.querySelector(".load-more-btn") as HTMLElement;

    // 隐藏加载和错误状态
    if (loadingState) loadingState.style.display = "none";
    if (errorState) errorState.style.display = "none";

    // 生成网站HTML
    const sitesHTML = this.generateSitesHTML(data.sites);
    if (loadedContent) {
      loadedContent.innerHTML = sitesHTML;
      loadedContent.style.display = "block";
    }

    // 隐藏加载按钮
    if (loadButton) {
      loadButton.style.display = "none";
    }

    // 添加加载完成的动画
    if (loadedContent) {
      loadedContent.style.opacity = "0";
      loadedContent.style.transform = "translateY(20px)";

      requestAnimationFrame(() => {
        loadedContent.style.transition =
          "opacity 0.3s ease, transform 0.3s ease";
        loadedContent.style.opacity = "1";
        loadedContent.style.transform = "translateY(0)";
      });
    }
  }

  /**
   * 生成网站HTML
   */
  private generateSitesHTML(sites: Site[]): string {
    return `
      <div class="sites-grid">
        ${sites
          .map(
            (site) => `
          <div class="site-card loaded">
            <div class="site-header">
              <h4 class="site-title">${this.escapeHtml(site.title)}</h4>
              ${
                site.url
                  ? `
                <a href="${this.escapeHtml(site.url)}" target="_blank" rel="noopener noreferrer" class="site-link">
                  <i class="icon-external-link"></i>
                </a>
              `
                  : ""
              }
            </div>
            <p class="site-description">${this.escapeHtml(site.description)}</p>
            ${
              site.advantages && site.advantages.length > 0
                ? `
              <div class="site-tags">
                ${site.advantages
                  .map(
                    (tag) => `
                  <span class="tag">${this.escapeHtml(tag)}</span>
                `,
                  )
                  .join("")}
              </div>
            `
                : ""
            }
            ${
              site.details?.pricing
                ? `
              <div class="site-details">
                <span class="pricing">${this.escapeHtml(site.details.pricing)}</span>
              </div>
            `
                : ""
            }
          </div>
        `,
          )
          .join("")}
      </div>
    `;
  }

  /**
   * HTML转义
   */
  private escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 从本地存储加载缓存
   */
  private loadFromCache(): void {
    try {
      const cached = localStorage.getItem("astro-nav-category-cache");
      if (cached) {
        const data = JSON.parse(cached);
        const now = Date.now();

        Object.entries(data).forEach(([key, value]: [string, any]) => {
          if (
            value.timestamp &&
            now - value.timestamp < this.config.cacheExpiry
          ) {
            this.cache.set(parseInt(key), value.data);
          }
        });

        console.log(`📦 从缓存恢复 ${this.cache.size} 个分类`);
      }
    } catch (error) {
      console.warn("⚠️ 缓存加载失败:", error);
    }
  }

  /**
   * 保存到本地存储
   */
  private saveToCache(): void {
    try {
      const cacheData: any = {};
      const now = Date.now();

      this.cache.forEach((data, index) => {
        cacheData[index] = {
          data,
          timestamp: now,
        };
      });

      localStorage.setItem(
        "astro-nav-category-cache",
        JSON.stringify(cacheData),
      );
    } catch (error) {
      console.warn("⚠️ 缓存保存失败:", error);
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    let cleaned = 0;

    this.cache.forEach((data, index) => {
      // 这里可以添加更复杂的过期逻辑
      // 目前简单保留所有缓存
    });

    if (cleaned > 0) {
      console.log(`🗑️ 清理了 ${cleaned} 个过期缓存`);
      this.saveToCache();
    }
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): any {
    return {
      cachedCategories: this.cache.size,
      loadingStates: Object.fromEntries(this.loadingStates),
      cacheSize: JSON.stringify(Object.fromEntries(this.cache)).length,
    };
  }
}

// 初始化懒加载器
const lazyLoader = new ClientLazyLoader();

// 导出到全局作用域 (用于调试)
(window as any).lazyLoader = lazyLoader;

console.log("🚀 客户端懒加载器已加载");
