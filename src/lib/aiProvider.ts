// AI Provider Module - Direct API calls, NO SDK dependency
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
const API_TIMEOUT = 30000; // 30 seconds

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

  // AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  // ===== Gemini uses a different API format =====
  if (provider === 'gemini') {
    const geminiMessages = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content }],
    }));

    const url = `${baseUrl}/models/${model}:generateContent?key=${apiKey}`;
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }),
        signal: controller.signal,
      });
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        throw new Error('Gemini API timeout (30s)');
      }
      throw fetchErr;
    }

    if (!res.ok) {
      clearTimeout(timeoutId);
      const errText = await res.text();
      throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = await res.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const tokensUsed = data.usageMetadata?.totalTokenCount || 0;
    clearTimeout(timeoutId);
    return { content, tokensUsed };
  }

  // ===== OpenAI-compatible format =====
  const url = `${baseUrl}/chat/completions`;
  let res: Response;
  try {
    res = await fetch(url, {
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
      signal: controller.signal,
    });
  } catch (fetchErr: unknown) {
    clearTimeout(timeoutId);
    if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
      throw new Error(`${provider} API timeout (30s)`);
    }
    throw fetchErr;
  }

  if (!res.ok) {
    clearTimeout(timeoutId);
    const errText = await res.text();
    throw new Error(`${provider} API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '';
  const tokensUsed = data.usage?.total_tokens || 0;
  clearTimeout(timeoutId);
  return { content, tokensUsed };
}

// ========== Main Function: Call AI with Load Balancer ==========
const MAX_RETRIES = 1;

export async function callAI(
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<AIResponse> {
  // Try Load Balancer keys
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
      try {
        const retryResult = await reportFailure(selectedKey.id, errMsg, 'retry');
        if (!retryResult.shouldRetry || !retryResult.nextKey) {
          break;
        }
      } catch (reportErr) {
        console.error('[AI] reportFailure error:', reportErr);
        break;
      }
    }
  }

  // No keys available - return clear message
  return {
    content: 'لا توجد مفاتيح API نشطة. يرجى إضافة مفتاح (مثل Groq أو DeepSeek) من لوحة الإدارة.',
    provider: 'None',
    tokensUsed: 0,
    loadBalanced: false,
  };
}
