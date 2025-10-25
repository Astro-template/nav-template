import type { APIRoute } from "astro";

// 强制此API路由为服务器端渲染
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  console.log("=== Debug Headers ===");

  // 方法1: 使用 request.headers.get()
  const contentType1 = request.headers.get("content-type");
  console.log('Method 1 - request.headers.get("content-type"):', contentType1);

  // 方法2: 使用 request.headers.get() 大写
  const contentType2 = request.headers.get("Content-Type");
  console.log('Method 2 - request.headers.get("Content-Type"):', contentType2);

  // 方法3: 遍历所有headers
  const allHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    allHeaders[key] = value;
    console.log(`Header: ${key} = ${value}`);
  });

  // 方法4: 转换为对象
  const headersObject = Object.fromEntries(request.headers.entries());
  console.log("Headers object:", headersObject);

  // 方法5: 检查原始请求
  console.log("Request URL:", request.url);
  console.log("Request method:", request.method);

  // 尝试读取body信息
  let bodyInfo = "Could not read body";
  try {
    const clonedRequest = request.clone();
    const bodyText = await clonedRequest.text();
    bodyInfo = `Body length: ${bodyText.length}, starts with: ${bodyText.substring(0, 100)}`;
  } catch (e) {
    bodyInfo = `Body read error: ${e instanceof Error ? e.message : "Unknown"}`;
  }

  return new Response(
    JSON.stringify(
      {
        success: true,
        debug: {
          contentType1,
          contentType2,
          allHeaders,
          headersObject,
          url: request.url,
          method: request.method,
          bodyInfo,
          headerCount: Object.keys(allHeaders).length,
        },
      },
      null,
      2,
    ),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};
