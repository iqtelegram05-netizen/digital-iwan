// AI Provider Module - Direct API calls without SDK dependency
// Supports: Groq, DeepSeek, OpenAI, Gemini, OpenRouter, and custom providers

import { selectKey, reportSuccess, reportFailure } from './loadBalancer';

// ========== Provider Configuration ==========
const PROVIDER_CONFIG: Record<string, {
  baseUrl: string;
  model: string;
}> = {
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.0-flash',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o-mini',
  },
};

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  provider: string;
  tokensUsed: number;
  loadBalanced: boolean;
}

// ========== Direct API Call ==========
async function callProviderApi(
  provider: string,
  apiKey: string,
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number },
  customBaseUrl?: string | null
): Promise<{ content: string; tokensUsed: number }> {
  const config = PROVIDER_CONFIG[provider];
  const baseUrl = customBaseUrl || config?.baseUrl;
  const model = config?.model || 'gpt-4o-mini';
  const temperature = options.temperature ?? 0.8;
  const maxTokens = options.maxTokens ?? 2048;

  if (!baseUrl) {
    throw new Error(`Provider not supported and no custom baseUrl: ${provider}`);
  }

  // ===== Gemini uses a different API format =====
  if (provider === 'gemini') {
    const geminiMessages = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }],
    }));

    const url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const tokensUsed = data.usageMetadata?.totalTokenCount || 0;
    return { content, tokensUsed };
  }

  // ===== OpenAI-compatible format =====
  const url = `${baseUrl}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`${provider} API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  const tokensUsed = data.usage?.total_tokens || 0;
  return { content, tokensUsed };
}

// ========== Main Function: Call AI with Load Balancer ==========
const MAX_RETRIES = 3;

export async function callAI(
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<AIResponse> {
  // Step 1: Try Load Balancer keys
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const selectedKey = await selectKey();

    if (!selectedKey) {
      break; // No keys available
    }

    try {
      console.log(`[AI] Attempt ${attempt + 1}: ${selectedKey.providerLabel} (${selectedKey.fingerprint})`);

      const result = await callProviderApi(
        selectedKey.provider,
        selectedKey.decryptedKey,
        messages,
        options,
        selectedKey.providerBaseUrl
      );

      if (result.content) {
        await reportSuccess(selectedKey.id, result.tokensUsed);
        console.log(`[AI] Success: ${selectedKey.providerLabel} (${result.tokensUsed} tokens)`);
        return {
          content: result.content,
          provider: selectedKey.providerLabel,
          tokensUsed: result.tokensUsed,
          loadBalanced: true,
        };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[AI] Failed: ${selectedKey.providerLabel} - ${errMsg}`);
      const retryResult = await reportFailure(selectedKey.id, errMsg, 'retry');
      if (!retryResult.shouldRetry || !retryResult.nextKey) {
        break;
      }
    }
  }

  // Step 2: Fallback to ZAI SDK (only if .z-ai-config exists)
  try {
    console.log('[AI] Fallback to ZAI SDK');
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: options.temperature ?? 0.8,
      max_tokens: options.maxTokens ?? 2048,
    });

    const content = completion.choices?.[0]?.message?.content || '';
    if (content) {
      return {
        content,
        provider: 'Z.ai Default',
        tokensUsed: completion.usage?.total_tokens || 0,
        loadBalanced: false,
      };
    }
  } catch (sdkErr: unknown) {
    const msg = sdkErr instanceof Error ? sdkErr.message : String(sdkErr);
    console.error('[AI] ZAI SDK fallback failed:', msg);
    // If SDK fails (e.g., no .z-ai-config), return a helpful error
  }

  // Step 3: All failed
  return {
    content: 'عذرًا، لم أتمكن من توليد إجابة. يرجى إضافة مفاتيح API من لوحة الإدارة أو التحقق من اتصال الإنترنت.',
    provider: 'None',
    tokensUsed: 0,
    loadBalanced: false,
  };
}
