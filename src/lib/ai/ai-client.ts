export interface AICallOptions {
  prompt: string;
  systemPrompt?: string;
  responseSchema?: any;
  isJsonOutput?: boolean;
}

export interface AICallResult {
  text: string;
  raw?: any;
}

// ----------------------------------------------------------------------------
// 1. TỰ ĐỘNG THU GOM TẤT CẢ API KEYS TỪ ENVIRONMENT VARIABLES
// ----------------------------------------------------------------------------
export function getApiKeysPool(): string[] {
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
// 2. DANH SÁCH MODEL OPENROUTER ACTIVE VÀ KHẢ DỤNG
// ----------------------------------------------------------------------------
const OPENROUTER_CANDIDATE_MODELS = [
  process.env.OPENROUTER_MODEL,
  'openrouter/auto',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-001',
  'deepseek/deepseek-chat:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2.5-coder-32b-instruct:free'
].filter(Boolean) as string[];

// ----------------------------------------------------------------------------
// 3. THỰC THI GỌI API VỚI 1 KEY CỤ THỂ THEO PROVIDER
// ----------------------------------------------------------------------------
export async function executeCallWithKey(
  key: string,
  options: AICallOptions
): Promise<AICallResult> {
  const { prompt, systemPrompt, responseSchema, isJsonOutput } = options;
  const wantJson = Boolean(responseSchema || isJsonOutput);

  // A. GROQ API (gsk_...) - Rất nhanh & ổn định
  if (key.startsWith('gsk_')) {
    const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(groqUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.7,
        ...(wantJson ? { response_format: { type: 'json_object' } } : {})
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Groq status ${res.status}`);
    }

    const data = await res.json();
    const contentText = data.choices?.[0]?.message?.content || '{}';
    return { text: contentText, raw: data };
  }

  // B. CEREBRAS API (csk-...)
  if (key.startsWith('csk-')) {
    const url = 'https://api.cerebras.ai/v1/chat/completions';
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama3.3-70b',
        messages,
        temperature: 0.7,
        ...(wantJson ? { response_format: { type: 'json_object' } } : {})
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Cerebras status ${res.status}`);
    }

    const data = await res.json();
    const contentText = data.choices?.[0]?.message?.content || '{}';
    return { text: contentText, raw: data };
  }

  // C. GITHUB MODELS API (ghp_... hoặc github_pat_...)
  if (key.startsWith('ghp_') || key.startsWith('github_pat_')) {
    const url = 'https://models.inference.ai.azure.com/chat/completions';
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'Llama-3.3-70B-Instruct',
        messages,
        temperature: 0.7,
        ...(wantJson ? { response_format: { type: 'json_object' } } : {})
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `GitHub Models status ${res.status}`);
    }

    const data = await res.json();
    const contentText = data.choices?.[0]?.message?.content || '{}';
    return { text: contentText, raw: data };
  }

  // D. GOOGLE GEMINI DIRECT API (AIza...)
  if (key.startsWith('AIza')) {
    const model = 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const body: any = { contents: [{ parts: [{ text: prompt }] }] };
    if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };
    if (responseSchema) {
      body.generationConfig = { responseMimeType: 'application/json', temperature: 0.7, topP: 0.95, responseSchema };
    } else if (wantJson) {
      body.generationConfig = { responseMimeType: 'application/json', temperature: 0.7 };
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

    const data = await res.json();
    const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return { text: contentText, raw: data };
  }

  // E. OPENROUTER API (sk-or-...)
  if (key.startsWith('sk-or-')) {
    const openRouterUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    let lastError = '';
    for (const modelName of OPENROUTER_CANDIDATE_MODELS) {
      try {
        const res = await fetch(openRouterUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
            'HTTP-Referer': 'https://github.com/DoVanThien/DoVanThien.github.io',
            'X-Title': 'AI English Mentor Pro'
          },
          body: JSON.stringify({
            model: modelName,
            messages,
            temperature: 0.7,
            ...(wantJson ? { response_format: { type: 'json_object' } } : {})
          })
        });

        if (res.ok) {
          const routerData = await res.json();
          let contentText = routerData.choices?.[0]?.message?.content || '{}';
          contentText = contentText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
          return { text: contentText, raw: routerData };
        } else {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || `Status ${res.status}`;
          lastError = errMsg;
          // Nếu model không tồn tại hoặc lỗi endpoint, thử tiếp model khác
          console.warn(`[OpenRouter Model Failover] Model ${modelName} failed: ${errMsg}. Trying next model...`);
        }
      } catch (e: any) {
        lastError = e.message || 'Fetch error';
      }
    }
    throw new Error(`OpenRouter (${lastError})`);
  }

  // F. SILICONFLOW / DEEPSEEK DIRECT (sk-...)
  if (key.startsWith('sk-')) {
    const isSiliconFlow = key.length > 40 || process.env.USE_SILICONFLOW === 'true';
    const endpointUrl = isSiliconFlow
      ? 'https://api.siliconflow.cn/v1/chat/completions'
      : 'https://api.deepseek.com/v1/chat/completions';
    const modelName = isSiliconFlow ? 'deepseek-ai/DeepSeek-V3' : 'deepseek-chat';
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature: 0.7,
        ...(wantJson ? { response_format: { type: 'json_object' } } : {})
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `DeepSeek/SiliconFlow status ${res.status}`);
    }

    const data = await res.json();
    const contentText = data.choices?.[0]?.message?.content || '{}';
    return { text: contentText, raw: data };
  }

  throw new Error(`Không nhận diện được định dạng API Key: ${key.slice(0, 6)}...`);
}

// ----------------------------------------------------------------------------
// 4. GỌI AI THÔNG MINH TỰ ĐỘNG XOAY VÒNG KEY (FAILOVER RUNNER)
// ----------------------------------------------------------------------------
export async function executeAiCall(options: AICallOptions): Promise<AICallResult> {
  const keysPool = getApiKeysPool();

  if (keysPool.length === 0) {
    throw new Error(
      'Chưa cấu hình API Key nào trên máy chủ/Vercel (Cấu hình AI_API_KEYS hoặc OPENROUTER_API_KEY trong .env.local / Vercel Environment Variables).'
    );
  }

  let lastErrorMessage = '';

  for (let i = 0; i < keysPool.length; i++) {
    const key = keysPool[i];
    try {
      return await executeCallWithKey(key, options);
    } catch (err: any) {
      lastErrorMessage = err.message || 'Unspecified Error';
      console.warn(
        `[Key Failover ${i + 1}/${keysPool.length}] Key "${key.slice(0, 6)}..." failed: ${lastErrorMessage}. Rotating to next key...`
      );
    }
  }

  throw new Error(
    `Tất cả ${keysPool.length} API Key trên hệ thống đều dính lỗi hoặc hết lượt sử dụng! (Lỗi gần nhất: ${lastErrorMessage}). Vui lòng kiểm tra lại Key trong file .env.local hoặc Vercel Settings.`
  );
}
