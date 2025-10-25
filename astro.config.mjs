import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://affnav.github.io",
  integrations: [sitemap()],
  output: "static", // 临时改为静态模式测试构建

  // 静态文件配置 - 支持GitHub Actions部署
  publicDir: "./static", // 使用 static/ 文件夹作为静态资源目录

  // 构建配置
  build: {
    assets: "_astro",
  },
});
