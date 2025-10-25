import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request }) => {
  try {
    console.log("=== API Test Debug ===");
    console.log("Method:", request.method);
    console.log("URL:", request.url);

    // 检查所有headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log("Headers:", headers);

    const contentType = request.headers.get("content-type");
    console.log("Content-Type:", contentType);

    if (!contentType) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing Content-Type header",
          debug: { headers },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid Content-Type: ${contentType}`,
          debug: { headers, contentType },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // 尝试解析FormData
    let formData;
    try {
      formData = await request.formData();
      console.log("FormData parsed successfully");
    } catch (error) {
      console.error("FormData parsing error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: `FormData parsing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          debug: { headers, contentType },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // 检查FormData内容
    const formEntries: Record<string, any> = {};
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        formEntries[key] = {
          type: "File",
          name: value.name,
          size: value.size,
          mimeType: value.type,
        };
      } else {
        formEntries[key] = value;
      }
    }

    console.log("Form entries:", formEntries);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Upload test successful",
        data: {
          contentType,
          formEntries,
          headers: Object.fromEntries(request.headers.entries()),
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("API Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: `Server error: ${error instanceof Error ? error.message : "Unknown error"}`,
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
