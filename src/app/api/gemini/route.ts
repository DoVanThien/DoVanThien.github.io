import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // 1. Protect API from external sites (Allow same-origin or empty headers like standalone PWAs)
    const origin = req.headers.get('origin') || '';
    const referer = req.headers.get('referer') || '';
    const host = req.headers.get('host') || '';

    // Block only if origin or referer is explicitly from a foreign domain
    const isForeignOrigin = origin !== '' && !origin.includes(host) && !host.includes('localhost') && !host.includes('127.0.0.1');
    const isForeignReferer = referer !== '' && !referer.includes(host) && !host.includes('localhost') && !host.includes('127.0.0.1');

    if (isForeignOrigin || isForeignReferer) {
      return NextResponse.json(
        { error: { message: 'Truy cập bị từ chối: Nguồn yêu cầu không được phép.' } },
        { status: 403 }
      );
    }

    // 2. Validate simple app signature to ensure request comes from our React app
    const signature = req.headers.get('x-app-signature');
    if (signature !== 'ai-english-mentor-secure-v2') {
      return NextResponse.json(
        { error: { message: 'Yêu cầu không hợp lệ: Thiếu chữ ký xác thực ứng dụng.' } },
        { status: 400 }
      );
    }

    const { prompt, systemPrompt, modelName, responseMimeType, responseSchema } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { 
          error: { 
            message: 'Chưa cấu hình GEMINI_API_KEY trên máy chủ (Vercel/.env.local). Vui lòng thêm biến môi trường này để gọi AI.' 
          } 
        },
        { status: 500 }
      );
    }

    const model = modelName || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const body: any = {
      contents: [{ parts: [{ text: prompt }] }],
    };

    if (systemPrompt) {
      body.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    if (responseMimeType || responseSchema) {
      body.generationConfig = {
        responseMimeType: responseMimeType || 'application/json',
        temperature: 0.9,
        topP: 0.95,
      };
      if (responseSchema) {
        body.generationConfig.responseSchema = responseSchema;
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey.trim(),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: { message: errorData.error?.message || `HTTP error! status: ${response.status}` } },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Gemini API Server Error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Internal Server Error' } },
      { status: 500 }
    );
  }
}
