import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  console.log('=== Fixed File Upload Test ===');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  
  // 打印所有headers
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  console.log('Request headers:', headers);
  
  try {
    // 方法1: 检查Content-Type并手动处理
    const contentType = request.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);
    
    if (!contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({
        success: false,
        error: `Invalid Content-Type: ${contentType}. Expected multipart/form-data.`,
        receivedHeaders: headers
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 方法2: 使用try-catch包装formData()调用
    let formData;
    try {
      console.log('Attempting to parse FormData with proper Content-Type...');
      formData = await request.formData();
      console.log('FormData parsed successfully!');
    } catch (formDataError) {
      console.error('FormData parsing failed:', formDataError);
      
      // 如果formData()失败，尝试读取原始body
      try {
        console.log('Trying to read raw body...');
        const body = await request.text();
        console.log('Raw body length:', body.length);
        console.log('Raw body preview:', body.substring(0, 200));
        
        return new Response(JSON.stringify({
          success: false,
          error: 'FormData parsing failed, but raw body was readable',
          formDataError: formDataError instanceof Error ? formDataError.message : 'Unknown FormData error',
          bodyLength: body.length,
          bodyPreview: body.substring(0, 200),
          headers
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (bodyError) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Both FormData and raw body parsing failed',
          formDataError: formDataError instanceof Error ? formDataError.message : 'Unknown FormData error',
          bodyError: bodyError instanceof Error ? bodyError.message : 'Unknown body error',
          headers
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // 如果成功解析FormData，处理数据
    const result: any = {
      success: true,
      message: 'File upload successful!',
      formFields: {},
      files: {}
    };
    
    // 遍历所有表单字段
    for (const [key, value] of formData.entries()) {
      console.log(`Processing field: ${key}`);
      
      if (value instanceof File) {
        console.log(`File found: ${value.name}, size: ${value.size}, type: ${value.type}`);
        
        result.files[key] = {
          name: value.name,
          size: value.size,
          type: value.type,
          lastModified: value.lastModified
        };
        
        // 如果是小文件，读取内容预览
        if (value.size < 1000 && value.size > 0) {
          try {
            const text = await value.text();
            result.files[key].preview = text.substring(0, 100);
          } catch (e) {
            result.files[key].preview = 'Could not read file content';
          }
        }
      } else {
        console.log(`Text field: ${key} = ${value}`);
        result.formFields[key] = value;
      }
    }
    
    console.log('Processing complete:', result);
    
    return new Response(JSON.stringify(result, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: 'Unexpected server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      headers
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
