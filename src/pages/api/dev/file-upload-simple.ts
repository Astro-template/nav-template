import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  console.log('=== File Upload Test ===');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  
  try {
    // 不检查Content-Type，直接尝试解析
    console.log('Attempting to parse FormData...');
    
    const formData = await request.formData();
    console.log('FormData parsed successfully!');
    
    const result: any = {
      success: true,
      message: 'File upload test successful',
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
        
        // 如果是小文件，读取前100个字符
        if (value.size < 1000) {
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
    console.error('Error processing request:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      headers: Object.fromEntries(request.headers.entries())
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
