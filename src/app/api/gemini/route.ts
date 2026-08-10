import { NextRequest, NextResponse } from 'next/server';

// ----------------------------------------------------------------------------
// 1. TỰ ĐỘNG THU GOM TẤT CẢ API KEYS TỪ ENVIRONMENT VARIABLES
// ----------------------------------------------------------------------------
function getApiKeysPool(): string[] {
  const keysStr = process.env.AI_API_KEYS || process.env.OPENROUTER_API_KEYS || '';
  const parsedKeys = keysStr.split(/[\n,;]+/).map(k => k.trim()).filter(Boolean);

  const individualKeys = [
    process.env.GROQ_API_KEY,
    process.env.CEREBRAS_API_KEY,
    process.env.GITHUB_API_KEY,
    process.env.OPENROUTER_API_KEY,
    process.env.GEMINI_API_KEY,
    process.env.DEEPSEEK_API_KEY,
  ].map(k => (k || '').trim()).filter(Boolean);

  return Array.from(new Set([...parsedKeys, ...individualKeys]));
}

// ----------------------------------------------------------------------------
// 2. THỰC THI GỌI API THEO ĐÚNG LOẠI KEY CỦA TỪNG NHÀ CUNG CẤP
// ----------------------------------------------------------------------------
async function executeCallWithKey(key: string, prompt: string, systemPrompt?: string, responseSchema?: any) {
  // A. GROQ API (gsk_...) - 14,400 requests/ngày
  if (key.startsWith('gsk_')) {
    const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(groqUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        ...(responseSchema ? { response_format: { type: 'json_object' } } : {})
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Groq status ${res.status}`);
    }

    const data = await res.json();
    const contentText = data.choices?.[0]?.message?.content || '{}';
    return { candidates: [{ content: { parts: [{ text: contentText }] } }] };
  }

  // B. CEREBRAS API (csk-...) - 14,400 requests/ngày
  if (key.startsWith('csk-')) {
    const url = 'https://api.cerebras.ai/v1/chat/completions';
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama3.3-70b',
        messages,
        temperature: 0.7,
        ...(responseSchema ? { response_format: { type: 'json_object' } } : {})
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Cerebras status ${res.status}`);
    }

    const data = await res.json();
    const contentText = data.choices?.[0]?.message?.content || '{}';
    return { candidates: [{ content: { parts: [{ text: contentText }] } }] };
  }

  // C. GITHUB MODELS API (ghp_... hoăc github_pat_...) - 1,000 requests/ngày
  if (key.startsWith('ghp_') || key.startsWith('github_pat_')) {
    const url = 'https://models.inference.ai.azure.com/chat/completions';
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'Llama-3.3-70B-Instruct',
        messages,
        temperature: 0.7,
        ...(responseSchema ? { response_format: { type: 'json_object' } } : {})
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `GitHub Models status ${res.status}`);
    }

    const data = await res.json();
    const contentText = data.choices?.[0]?.message?.content || '{}';
    return { candidates: [{ content: { parts: [{ text: contentText }] } }] };
  }

  // D. GOOGLE GEMINI DIRECT API (AIza...)
  if (key.startsWith('AIza')) {
    const model = 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const body: any = { contents: [{ parts: [{ text: prompt }] }] };
    if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };
    if (responseSchema) {
      body.generationConfig = { responseMimeType: 'application/json', temperature: 0.7, topP: 0.95, responseSchema };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Google Gemini status ${res.status}`);
    }

    return await res.json();
  }

  // E. OPENROUTER API (sk-or-...)
  if (key.startsWith('sk-or-')) {
    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const candidateModels = Array.from(new Set([
      process.env.OPENROUTER_MODEL,
      'google/gemini-2.0-pro-exp-02-05:free',
      'google/gemini-2.0-flash-lite-preview-02-05:free',
      'deepseek/deepseek-r1:free',
      'qwen/qwen-2.5-72b-instruct:free',
      'cognitivecomputations/dolphin3.0-r1-mistral-24b:free'
    ].filter(Boolean))) as string[];

    let openRouterError = '';
    for (const modelName of candidateModels) {
      try {
        const res = await fetch(openRouterUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
            'HTTP-Referer': 'https://github.com/DoVanThien/DoVanThien.github.io',
            'X-Title': 'AI English Mentor Pro'
          },
          body: JSON.stringify({
            model: modelName,
            messages,
            temperature: 0.7,
            ...(responseSchema ? { response_format: { type: 'json_object' } } : {})
          })
        });

        if (res.ok) {
          const routerData = await res.json();
          let contentText = routerData.choices?.[0]?.message?.content || '{}';
          contentText = contentText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
          return { candidates: [{ content: { parts: [{ text: contentText }] } }] };
        } else {
          const errData = await res.json().catch(() => ({}));
          openRouterError = errData.error?.message || `Status ${res.status}`;
        }
      } catch (e: any) {
        openRouterError = e.message || 'Fetch error';
      }
    }
    throw new Error(`OpenRouter (${openRouterError})`);
  }

  // F. SILICONFLOW / DEEPSEEK DIRECT (sk-...)
  if (key.startsWith('sk-')) {
    const isSiliconFlow = key.length > 40 || process.env.USE_SILICONFLOW === 'true';
    const endpointUrl = isSiliconFlow ? 'https://api.siliconflow.cn/v1/chat/completions' : 'https://api.deepseek.com/v1/chat/completions';
    const modelName = isSiliconFlow ? 'deepseek-ai/DeepSeek-V3' : 'deepseek-chat';
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature: 0.7,
        ...(responseSchema ? { response_format: { type: 'json_object' } } : {})
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `DeepSeek status ${res.status}`);
    }

    const data = await res.json();
    const contentText = data.choices?.[0]?.message?.content || '{}';
    return { candidates: [{ content: { parts: [{ text: contentText }] } }] };
  }

  throw new Error(`Không nhận diện được định dạng API Key: ${key.slice(0, 6)}...`);
}

// ----------------------------------------------------------------------------
// 3. MAIN ROUTE HANDLER CHO ROUTE /api/gemini
// ----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    // A. CORS Protection
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

    // B. App Signature Check
    const signature = req.headers.get('x-app-signature');
    if (signature !== 'ai-english-mentor-secure-v2') {
      return NextResponse.json(
        { error: { message: 'Yêu cầu không hợp lệ.' } },
        { status: 400 }
      );
    }

    const { prompt, systemPrompt, responseSchema } = await req.json();

    // C. Thu gom danh sách Key
    const keysPool = getApiKeysPool();

    if (keysPool.length === 0) {
      return NextResponse.json(
        { error: { message: 'Chưa cấu hình API Key nào trên máy chủ/Vercel (Cấu hình AI_API_KEYS hoặc OPENROUTER_API_KEY trong .env.local / Vercel Environment Variables).' } },
        { status: 500 }
      );
    }

    // D. VÒNG LẶP THỬ LẦN LƯỢT TỪNG KEY TRONG POOL (KEY ROTATION & FAILOVER)
    let lastErrorMessage = '';

    for (let i = 0; i < keysPool.length; i++) {
      const key = keysPool[i];
      try {
        const result = await executeCallWithKey(key, prompt, systemPrompt, responseSchema);
        return NextResponse.json(result);
      } catch (err: any) {
        lastErrorMessage = err.message || 'Unspecified Error';
        console.warn(`[Key Failover ${i + 1}/${keysPool.length}] Key prefix "${key.slice(0, 6)}..." failed: ${lastErrorMessage}. Rotating to next key...`);
      }
    }

    // E. Nếu tất cả các Key đều dính lỗi/Rate Limit
    return NextResponse.json(
      { 
        error: { 
          message: `Tất cả ${keysPool.length} API Key trên hệ thống đều dính lỗi hoặc hết lượt sử dụng! (Lỗi gần nhất: ${lastErrorMessage}). Vui lòng thêm Key mới vào AI_API_KEYS trong file .env.local hoặc Vercel Settings.` 
        } 
      },
      { status: 429 }
    );
  } catch (error: any) {
    console.error('API Server Error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Internal Server Error' } },
      { status: 500 }
    );
  }
}

