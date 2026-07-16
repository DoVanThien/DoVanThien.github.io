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

    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      return NextResponse.json(
        { 
          error: { 
            message: 'Chưa cấu hình API Key trên máy chủ (Vercel/.env.local). Vui lòng cấu hình biến GEMINI_API_KEY.' 
          } 
        },
        { status: 500 }
      );
    }

    // CHUYỂN ĐỔI THÔNG MINH SANG GROQ API (NẾU KEY LÀ GSK_)
    if (apiKey.startsWith('gsk_')) {
      const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
      
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });

      const requestBody: any = {
        model: 'llama-3.3-70b-versatile', // Model Llama thế hệ mới nhất, cực kỳ thông minh và miễn phí
        messages: messages,
        temperature: 0.8,
      };

      // Nếu yêu cầu trả về JSON schema, cấu hình JSON mode cho Groq
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

      // Chuyển đổi dữ liệu trả về của Groq thành định dạng tương thích với Gemini
      // giúp Client-side React hoạt động bình thường mà không cần sửa đổi mã nguồn.
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
    
    // GỌI GOOGLE GEMINI API NHƯ CŨ (NẾU DÙNG KEY GOOGLE AIZA/AQ)
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
          temperature: 0.9,
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
