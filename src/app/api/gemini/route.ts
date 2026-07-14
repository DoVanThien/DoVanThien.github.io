import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

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
