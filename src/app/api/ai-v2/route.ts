import { NextRequest, NextResponse } from 'next/server';
import { AIServiceV2 } from '@/lib/ai-v2/services/ai.service';
import { MemoryService } from '@/lib/ai-v2/services/memory.service';

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin') || '';
    const referer = req.headers.get('referer') || '';
    const host = req.headers.get('host') || '';

    const isForeignOrigin = origin !== '' && !origin.includes(host) && !host.includes('localhost') && !host.includes('127.0.0.1');
    const isForeignReferer = referer !== '' && !referer.includes(host) && !host.includes('localhost') && !host.includes('127.0.0.1');

    if (isForeignOrigin || isForeignReferer) {
      return NextResponse.json(
        { error: { message: 'Access Denied: Invalid Request Origin.' } },
        { status: 403 }
      );
    }

    const signature = req.headers.get('x-app-signature');
    if (signature !== 'ai-english-mentor-secure-v2') {
      return NextResponse.json(
        { error: { message: 'Unauthorized Request Signature.' } },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { action, topic, tone, vietnameseContent, contextDescription, studentTranslation, memory } = body;

    const userMemory = memory || MemoryService.createDefaultMemory();

    if (action === 'generate_scenario') {
      const scenario = await AIServiceV2.generateScenario(topic || 'Small Talk', tone || 'Casual', userMemory);
      return NextResponse.json({ scenario });
    }

    if (action === 'evaluate_translation') {
      if (!studentTranslation || !vietnameseContent) {
        return NextResponse.json(
          { error: { message: 'Missing studentTranslation or vietnameseContent' } },
          { status: 400 }
        );
      }

      const result = await AIServiceV2.evaluateStudentTranslation(
        vietnameseContent,
        contextDescription || 'General Conversation',
        studentTranslation,
        userMemory
      );

      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: { message: 'Invalid Action. Supported: generate_scenario, evaluate_translation' } },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('AI V2 API Error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Internal Server Error' } },
      { status: 500 }
    );
  }
}
