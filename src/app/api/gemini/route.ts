import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // 1. Bảo vệ API khỏi các nguồn spam bên ngoài (CORS Protection)
    const origin = req.headers.get('origin') || '';
    const referer = req.headers.get('referer') || '';
    const host = req.headers.get('host') || '';

    const isForeignOrigin = origin !== '' && !origin.includes(host) && !host.includes('localhost') && !host.includes('127.0.0.1');
    const isForeignReferer = referer !== '' && !referer.includes(host) && !host.includes('localhost') && !host.includes('127.0.0.1');

    if (isForeignOrigin || isForeignReferer) {
      return NextResponse.json(
        { error: { message: 'Truy cập bị từ chối: Nguồn yêu cầu không được phép.' } },
        { status: 403 }
      );
    }

    // 2. Kiểm tra chữ ký xác thực từ React client
    const signature = req.headers.get('x-app-signature');
    if (signature !== 'ai-english-mentor-secure-v2') {
      return NextResponse.json(
        { error: { message: 'Yêu cầu không hợp lệ.' } },
        { status: 400 }
      );
    }

    const { prompt, systemPrompt, responseSchema } = await req.json();

    // Lấy API Key từ biến môi trường (ưu tiên OPENROUTER_API_KEY nếu có, hoặc dùng GEMINI_API_KEY)
    const apiKey = (process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return NextResponse.json(
        { 
          error: { 
            message: 'Chưa cấu hình API Key trên máy chủ (OPENROUTER_API_KEY hoặc GEMINI_API_KEY trong .env.local).' 
          } 
        },
        { status: 500 }
      );
    }

    // ------------------------------------------------------------------------
    // CASE A: OPENROUTER API (Key bắt đầu bằng "sk-or-")
    // ------------------------------------------------------------------------
    if (apiKey.startsWith('sk-or-')) {
      const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
      
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      // Danh sách các model MIỄN PHÍ chất lượng cao nhất & tốc độ nhanh nhất của OpenRouter
      const candidateModels = Array.from(new Set([
        process.env.OPENROUTER_MODEL,
        'google/gemma-4-26b-a4b-it:free',
        'openai/gpt-oss-20b:free',
        'deepseek/deepseek-r1:free',
        'qwen/qwen-2.5-72b-instruct:free',
        'meta-llama/llama-3.3-70b-instruct:free'
      ].filter(Boolean))) as string[];

      let lastErrorMessage = '';
      let successResponse: Response | null = null;

      for (const modelName of candidateModels) {
        const requestBody: any = {
          model: modelName,
          messages: messages,
          temperature: 0.7,
        };

        if (responseSchema) {
          requestBody.response_format = { type: 'json_object' };
        }

        try {
          const res = await fetch(openRouterUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'HTTP-Referer': 'https://github.com/DoVanThien/DoVanThien.github.io',
              'X-Title': 'AI English Mentor Pro'
            },
            body: JSON.stringify(requestBody)
          });

          if (res.ok) {
            successResponse = res;
            break;
          } else {
            const errorData = await res.json().catch(() => ({}));
            lastErrorMessage = errorData.error?.message || `Model ${modelName} returned status ${res.status}`;
            console.warn(`OpenRouter model ${modelName} failed: ${lastErrorMessage}. Trying next fallback model...`);
          }
        } catch (e: any) {
          lastErrorMessage = e.message || 'Fetch error';
        }
      }

      if (!successResponse) {
        return NextResponse.json(
          { error: { message: `OpenRouter API Error! ${lastErrorMessage}` } },
          { status: 500 }
        );
      }

      const routerData = await successResponse.json();
      let contentText = routerData.choices?.[0]?.message?.content || '{}';

      // Loại bỏ thẻ suy luận <think>...</think> của các model reasoning như DeepSeek R1 để JSON parse không bị lỗi
      contentText = contentText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

      // Chuyển đổi dữ liệu trả về thành cấu trúc tương thích Gemini Client
      const geminiCompatibleResponse = {
        candidates: [
          {
            content: {
              parts: [
                { text: contentText }
              ]
            }
          }
        ]
      };

      return NextResponse.json(geminiCompatibleResponse);
    }

    // ------------------------------------------------------------------------
    // CASE B: DEEPSEEK DIRECT / SILICONFLOW API (Key bắt đầu bằng "sk-")
    // ------------------------------------------------------------------------
    else if (apiKey.startsWith('sk-')) {
      const isSiliconFlow = apiKey.length > 40 || process.env.USE_SILICONFLOW === 'true';
      const endpointUrl = isSiliconFlow 
        ? 'https://api.siliconflow.cn/v1/chat/completions'
        : 'https://api.deepseek.com/v1/chat/completions';
      
      const modelName = isSiliconFlow ? 'deepseek-ai/DeepSeek-V3' : 'deepseek-chat';

      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const requestBody: any = {
        model: modelName,
        messages: messages,
        temperature: 0.7,
      };

      if (responseSchema) {
        requestBody.response_format = { type: 'json_object' };
      }

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          { error: { message: errorData.error?.message || `DeepSeek API Error! status: ${response.status}` } },
          { status: response.status }
        );
      }

      const deepseekData = await response.json();
      const contentText = deepseekData.choices?.[0]?.message?.content || '{}';

      const geminiCompatibleResponse = {
        candidates: [
          {
            content: {
              parts: [
                { text: contentText }
              ]
            }
          }
        ]
      };

      return NextResponse.json(geminiCompatibleResponse);
    }

    // ------------------------------------------------------------------------
    // CASE C: GROQ API (Key bắt đầu bằng "gsk_")
    // ------------------------------------------------------------------------
    else if (apiKey.startsWith('gsk_')) {
      const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
      
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const requestBody: any = {
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: 0.7,
      };

      if (responseSchema) {
        requestBody.response_format = { type: 'json_object' };
      }

      const response = await fetch(groqUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          { error: { message: errorData.error?.message || `Groq API Error! status: ${response.status}` } },
          { status: response.status }
        );
      }

      const groqData = await response.json();
      const contentText = groqData.choices?.[0]?.message?.content || '{}';

      const geminiCompatibleResponse = {
        candidates: [
          {
            content: {
              parts: [
                { text: contentText }
              ]
            }
          }
        ]
      };

      return NextResponse.json(geminiCompatibleResponse);
    } 
    
    // ------------------------------------------------------------------------
    // CASE D: GOOGLE GEMINI API (Key bắt đầu bằng "AIza...")
    // ------------------------------------------------------------------------
    else {
      const model = 'gemini-2.0-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      const body: any = {
        contents: [{ parts: [{ text: prompt }] }],
      };

      if (systemPrompt) {
        body.systemInstruction = { parts: [{ text: systemPrompt }] };
      }

      if (responseSchema) {
        body.generationConfig = {
          responseMimeType: 'application/json',
          temperature: 0.7,
          topP: 0.95,
          responseSchema: responseSchema
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          { error: { message: errorData.error?.message || `Google API Error! status: ${response.status}` } },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (error: any) {
    console.error('API Server Error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Internal Server Error' } },
      { status: 500 }
    );
  }
}

