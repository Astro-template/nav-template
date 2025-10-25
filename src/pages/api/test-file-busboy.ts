import type { APIRoute } from "astro";
import busboy from "busboy";
import { Readable } from "stream";

// 强制此API路由为服务器端渲染
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  console.log("=== Busboy File Upload Test ===");
  console.log("Request URL:", request.url);
  console.log("Request method:", request.method);

  try {
    // 获取Content-Type
    const contentType = request.headers.get("content-type");
    console.log("Content-Type:", contentType);

    if (!contentType || !contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid Content-Type: ${contentType}. Expected multipart/form-data.`,
          receivedContentType: contentType,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // 获取请求体
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log("Request body size:", buffer.length);

    // 创建可读流
    const stream = Readable.from(buffer);

    // 使用busboy解析
    const bb = busboy({
      headers: { "content-type": contentType },
    });

    const result: any = {
      success: true,
      message: "File upload successful with busboy!",
      formFields: {},
      files: {},
    };

    // 处理文件字段
    bb.on("file", (fieldname, file, info) => {
      console.log(`File field: ${fieldname}`);
      console.log("File info:", info);

      const { filename, encoding, mimeType } = info;

      result.files[fieldname] = {
        filename,
        encoding,
        mimeType,
        size: 0,
        preview: "",
      };

      let fileData = Buffer.alloc(0);

      file.on("data", (data) => {
        fileData = Buffer.concat([fileData, data]);
        result.files[fieldname].size = fileData.length;
      });

      file.on("end", () => {
        console.log(
          `File ${fieldname} upload complete, size: ${fileData.length}`,
        );

        // 如果是小文件，添加预览
        if (fileData.length < 1000 && fileData.length > 0) {
          try {
            result.files[fieldname].preview = fileData
              .toString("utf8")
              .substring(0, 100);
          } catch (e) {
            result.files[fieldname].preview = "Binary file or encoding error";
          }
        }
      });
    });

    // 处理文本字段
    bb.on("field", (fieldname, value) => {
      console.log(`Text field: ${fieldname} = ${value}`);
      result.formFields[fieldname] = value;
    });

    // 解析完成
    return new Promise((resolve) => {
      bb.on("finish", () => {
        console.log("Busboy parsing complete:", result);

        resolve(
          new Response(JSON.stringify(result, null, 2), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      });

      bb.on("error", (error) => {
        console.error("Busboy error:", error);

        resolve(
          new Response(
            JSON.stringify({
              success: false,
              error: "Busboy parsing failed",
              message: error instanceof Error ? error.message : "Unknown error",
              contentType,
            }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      });

      // 将流数据传给busboy
      stream.pipe(bb);
    });
  } catch (error) {
    console.error("Unexpected error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Unexpected server error",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
