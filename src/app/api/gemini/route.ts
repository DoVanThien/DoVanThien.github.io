import { NextRequest, NextResponse } from 'next/server';
import { executeAiCall } from '@/lib/ai/ai-client';

export async function POST(req: NextRequest) {
  try {
    // A. CORS Protection
    const origin = req.headers.get('origin') || '';
    const referer = req.headers.get('referer') || '';
    const host = req.headers.get('host') || '';

    const isForeignOrigin =
      origin !== '' &&
      !origin.includes(host) &&
      !host.includes('localhost') &&
      !host.includes('127.0.0.1');
    const isForeignReferer =
      referer !== '' &&
      !referer.includes(host) &&
      !host.includes('localhost') &&
      !host.includes('127.0.0.1');

    if (isForeignOrigin || isForeignReferer) {
      return NextResponse.json(
        { error: { message: 'Truy cập bị từ chối: Nguồn yêu cầu không được phép.' } },
        { status: 403 }
      );
    }

    // B. App Signature Check
    const signature = req.headers.get('x-app-signature');
    if (signature !== 'ai-english-mentor-secure-v2') {
      return NextResponse.json(
        { error: { message: 'Yêu cầu không hợp lệ.' } },
        { status: 400 }
      );
    }

    const { prompt, systemPrompt, responseSchema } = await req.json();

    const result = await executeAiCall({
      prompt,
      systemPrompt,
      responseSchema,
      isJsonOutput: Boolean(responseSchema)
    });

    return NextResponse.json({
      candidates: [{ content: { parts: [{ text: result.text }] } }]
    });
  } catch (error: any) {
    console.error('API Server Error:', error);
    const status = error.message?.includes('Chưa cấu hình API Key')
      ? 500
      : error.message?.includes('hết lượt sử dụng') || error.message?.includes('dính lỗi')
      ? 429
      : 500;

    return NextResponse.json(
      { error: { message: error.message || 'Internal Server Error' } },
      { status }
    );
  }
}
