/**
 * HuggingFace Provider Engine
 * - Smart Round-Robin rotation across all active HF tokens
 * - 10-minute auto cooldown on failure
 * - Request batching (queue + batch flush)
 * - Fallback to Gemini/Groq when all HF tokens exhausted
 * - Usage tracking per day
 */

import { db } from '@/lib/db';
import { decrypt, encrypt, fingerprint as makeFP } from '@/lib/crypto';

// ========== Types ==========
export interface HFKeyInfo {
  id: string;
  token: string;
  fingerprint: string;
  label: string | null;
  model: string;
  priority: number;
  status: string;
  requestCount: number;
  successCount: number;
  failCount: number;
  tokensUsed: number;
  tokensLimit: number | null;
  lastUsedAt: Date | null;
  lastError: string | null;
  cooldownUntil: Date | null;
}

export interface HFCallResult {
  content: string;
  provider: string;
  tokensUsed: number;
  loadBalanced: boolean;
  usedFallback: boolean;
}

// ========== Round-Robin Index ==========
let hfRobinIndex = 0;
let lastHFCooldownCheck = 0;
const HF_COOLDOWN_CHECK = 15_000; // 15 seconds

// ========== Cooldown Reactivation ==========
async function reactivateHFCooldownKeys(): Promise<void> {
  try {
    const count = await db.huggingFaceKey.updateMany({
      where: {
        status: 'cooldown',
        cooldownUntil: { lte: new Date() },
      },
      data: {
        status: 'active',
        cooldownUntil: null,
        lastError: null,
      },
    });
    if (count.count > 0) {
      console.log(`[HF] Reactivated ${count.count} cooldown keys`);
    }
  } catch (err) {
    console.error('[HF] Failed to reactivate cooldown keys:', err);
  }
}

// ========== Daily Usage Tracker ==========
const todayStr = () => new Date().toISOString().slice(0, 10);

export async function trackUsage(type: 'cacheHits' | 'aiCalls' | 'hfCalls' | 'fallbackCalls' | 'failedCalls', tokens: number = 0): Promise<void> {
  try {
    const date = todayStr();
    const update: Record<string, unknown> = { [type]: { increment: 1 }, totalRequests: { increment: 1 } };
    if (tokens > 0) update.totalTokens = { increment: tokens };

    await db.dailyUsage.upsert({
      where: { date },
      update: update,
      create: { date, ...update },
    });
  } catch {
    // silently fail - don't block the main flow
  }
}

export async function getDailyUsageStats(): Promise<{
  date: string;
  totalRequests: number;
  cacheHits: number;
  aiCalls: number;
  hfCalls: number;
  fallbackCalls: number;
  failedCalls: number;
  totalTokens: number;
} | null> {
  try {
    const stats = await db.dailyUsage.findUnique({ where: { date: todayStr() } });
    return stats ? {
      date: stats.date,
      totalRequests: stats.totalRequests,
      cacheHits: stats.cacheHits,
      aiCalls: stats.aiCalls,
      hfCalls: stats.hfCalls,
      fallbackCalls: stats.fallbackCalls,
      failedCalls: stats.failedCalls,
      totalTokens: stats.totalTokens,
    } : null;
  } catch {
    return null;
  }
}

// ========== Select HF Key (Smart Round-Robin) ==========
export async function selectHFKey(): Promise<HFKeyInfo | null> {
  try {
    // Periodic cooldown reactivation
    const now = Date.now();
    if (now - lastHFCooldownCheck > HF_COOLDOWN_CHECK) {
      await reactivateHFCooldownKeys();
      lastHFCooldownCheck = now;
    }

    // Get all active keys, ordered by priority (highest first), then by least recently used
    const keys = await db.huggingFaceKey.findMany({
      where: { status: 'active' },
      orderBy: [{ priority: 'desc' }, { lastUsedAt: 'asc' }],
    });

    if (keys.length === 0) return null;

    // Round-robin within same priority tier
    const index = hfRobinIndex % keys.length;
    hfRobinIndex++;

    const selected = keys[index];
    return {
      id: selected.id,
      token: decrypt(selected.accessToken),
      fingerprint: selected.fingerprint,
      label: selected.tokenLabel,
      model: selected.model,
      priority: selected.priority,
      status: selected.status,
      requestCount: selected.requestCount,
      successCount: selected.successCount,
      failCount: selected.failCount,
      tokensUsed: selected.tokensUsed,
      tokensLimit: selected.tokensLimit,
      lastUsedAt: selected.lastUsedAt,
      lastError: selected.lastError,
      cooldownUntil: selected.cooldownUntil,
    };
  } catch (err) {
    console.error('[HF] Failed to select key:', err);
    return null;
  }
}

// ========== Report HF Key Result ==========
export async function reportHFSuccess(keyId: string, tokensUsed: number = 0): Promise<void> {
  try {
    await db.huggingFaceKey.update({
      where: { id: keyId },
      data: {
        requestCount: { increment: 1 },
        successCount: { increment: 1 },
        tokensUsed: { increment: tokensUsed },
        lastUsedAt: new Date(),
        lastError: null,
        lastErrorAt: null,
      },
    });
  } catch {
    // silently fail
  }
}

export async function reportHFFailure(keyId: string, error: string): Promise<boolean> {
  try {
    const isRateLimit = error.includes('429') || error.includes('rate') || error.includes('quota') || error.includes('overloaded');
    const isAuthError = error.includes('401') || error.includes('403') || error.includes('authorization');
    const isNotSupported = error.includes('Model not supported') || error.includes('Invalid username');

    // If model just not supported (HF free tier), keep active and let other providers try
    if (isNotSupported) {
      console.log(`[HF] Key ${keyId}: model not supported by this provider, will retry with other providers`);
      await db.huggingFaceKey.update({
        where: { id: keyId },
        data: {
          failCount: { increment: 1 },
          lastError: `Not supported - trying other providers`,
          lastErrorAt: new Date(),
        },
      });
      return true; // try next key
    }

    if (isAuthError) {
      // Auth errors = key is invalid for ALL providers, mark as exhausted
      // But only if ALL providers rejected it
      const allProvidersFailed = error.includes('all providers') || error.includes('جميع مزودي');
      if (allProvidersFailed) {
        await db.huggingFaceKey.update({
          where: { id: keyId },
          data: {
            status: 'exhausted',
            failCount: { increment: 1 },
            lastError: error.slice(0, 200),
            lastErrorAt: new Date(),
          },
        });
        return false;
      }
      // Individual provider auth error - keep active, try other providers
      return true;
    }

    if (isRateLimit) {
      // Rate limit = 10-minute cooldown
      const cooldownUntil = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await db.huggingFaceKey.update({
        where: { id: keyId },
        data: {
          status: 'cooldown',
          cooldownUntil,
          failCount: { increment: 1 },
          lastError: `Rate Limit - cooldown until ${cooldownUntil.toISOString()}`,
          lastErrorAt: new Date(),
        },
      });
      return true; // can try next key
    }

    // Other errors - mark but keep active
    await db.huggingFaceKey.update({
      where: { id: keyId },
      data: {
        failCount: { increment: 1 },
        lastError: error.slice(0, 200),
        lastErrorAt: new Date(),
      },
    });
    return true; // can try next key
  } catch {
    return false;
  }
}

// ========== Call HuggingFace API ==========
const HF_TIMEOUT = 45000; // 45 seconds

/**
 * Multi-provider call: tries multiple endpoints for maximum compatibility.
 * Tokens in the HF keys table can be ANY OpenAI-compatible API key:
 *   - HuggingFace (PRO subscription)
 *   - Groq (free at groq.com)
 *   - OpenRouter (free tier at openrouter.ai)
 *   - Together AI, DeepSeek, etc.
 *
 * We auto-detect the provider by trying endpoints in order.
 */
const HF_PROVIDERS = [
  {
    name: 'Groq',
    // Free tier: unlimited requests, very fast
    url: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    buildBody: (model: string, sys: string, user: string, maxTok: number, temp: number) => JSON.stringify({
      model,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      max_tokens: maxTok,
      temperature: temp,
      top_p: 0.9,
    }),
    parseResponse: (data: any) => ({
      content: data.choices?.[0]?.message?.content || '',
      tokensUsed: data.usage?.total_tokens || 0,
    }),
    isNotSupported: () => false,
    detectByError: (err: string) => false,
  },
  {
    name: 'Together AI',
    url: 'https://api.together.xyz/v1/chat/completions',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    buildBody: (model: string, sys: string, user: string, maxTok: number, temp: number) => JSON.stringify({
      model,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      max_tokens: maxTok,
      temperature: temp,
      top_p: 0.9,
    }),
    parseResponse: (data: any) => ({
      content: data.choices?.[0]?.message?.content || '',
      tokensUsed: data.usage?.total_tokens || 0,
    }),
    isNotSupported: () => false,
    detectByError: () => false,
  },
  {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'qwen/qwen-2.5-72b-instruct:free',
    buildBody: (model: string, sys: string, user: string, maxTok: number, temp: number) => JSON.stringify({
      model,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      max_tokens: maxTok,
      temperature: temp,
      top_p: 0.9,
      route: 'fallback',
    }),
    parseResponse: (data: any) => ({
      content: data.choices?.[0]?.message?.content || '',
      tokensUsed: data.usage?.total_tokens || 0,
    }),
    isNotSupported: () => false,
    detectByError: (err: string) => err.includes('Invalid API key') && !err.includes('groq'),
  },
  {
    name: 'HuggingFace Router',
    // Requires PRO subscription
    url: 'https://router.huggingface.co/hf-inference/v1/chat/completions',
    defaultModel: 'Qwen/Qwen2.5-72B-Instruct',
    buildBody: (model: string, sys: string, user: string, maxTok: number, temp: number) => JSON.stringify({
      model,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      max_tokens: maxTok,
      temperature: temp,
      top_p: 0.9,
    }),
    parseResponse: (data: any) => ({
      content: data.choices?.[0]?.message?.content || '',
      tokensUsed: data.usage?.total_tokens || 0,
    }),
    isNotSupported: (err: string) => err.includes('Model not supported') || err.includes('Invalid username'),
  },
];

async function callHuggingFaceAPI(
  keyInfo: HFKeyInfo,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 512,
  temperature: number = 0.8
): Promise<{ content: string; tokensUsed: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HF_TIMEOUT);

  try {
    // Try each provider in order until one works
    for (const provider of HF_PROVIDERS) {
      try {
        const url = provider.url;
        // Use the provider's default model if the configured model is HF-specific
        // and this is not the HF provider
        const model = provider.name === 'HuggingFace Router' 
          ? keyInfo.model 
          : (provider as any).defaultModel;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${keyInfo.token}`,
            'Content-Type': 'application/json',
            ...(provider.name === 'OpenRouter' ? { 'HTTP-Referer': 'https://digital-iwan.vercel.app' } : {}),
          },
          body: provider.buildBody(model, systemPrompt, userMessage, maxTokens, temperature),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errText = await res.text();
          // If model not supported by this provider, try next
          if (provider.isNotSupported(errText)) {
            console.log(`[HF] ${provider.name}: model not supported, trying next provider...`);
            continue;
          }
          throw new Error(`${provider.name} API ${res.status}: ${errText.slice(0, 200)}`);
        }

        const data = await res.json();
        const parsed = provider.parseResponse(data);

        if (!parsed.content) {
          continue; // Empty response, try next provider
        }

        if (parsed.tokensUsed === 0) {
          parsed.tokensUsed = estimateTokens(userMessage) + estimateTokens(parsed.content);
        }

        return parsed;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw new Error('HF API timeout (45s)');
        }
        // If this provider failed, try next
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`[HF] ${provider.name} failed: ${msg.slice(0, 100)}`);
        continue;
      }
    }

    // All providers failed
    throw new Error('جميع مزودي API فشلوا. تأكد من صلاحية المفاتيح.');
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('HF API timeout (45s)');
    }
    throw err;
  }
}

// ========== BATCH QUEUE ==========
interface BatchItem {
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
  temperature: number;
  resolve: (value: string) => void;
  reject: (reason: Error) => void;
}

let batchQueue: BatchItem[] = [];
let batchFlushScheduled = false;
const BATCH_MAX_SIZE = 5; // Max items per batch
const BATCH_MAX_WAIT = 800; // Max 800ms wait for batch accumulation
const BATCH_MIN_SIZE = 2; // Min items to trigger batch flush

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

async function flushBatch(): Promise<void> {
  if (batchQueue.length === 0) {
    batchFlushScheduled = false;
    return;
  }

  // Take items from queue
  const batch = batchQueue.splice(0, BATCH_MAX_SIZE);
  batchFlushScheduled = false;

  if (batch.length === 1) {
    // Single item - call directly
    const item = batch[0];
    await executeHFCall(item);
    return;
  }

  // Multiple items - process as batch (parallel calls to different keys if available)
  console.log(`[HF BATCH] Processing ${batch.length} items`);
  await Promise.allSettled(batch.map(item => executeHFCall(item)));
}

async function executeHFCall(item: BatchItem): Promise<void> {
  const maxRetries = 2;
  let lastError = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const keyInfo = await selectHFKey();
    if (!keyInfo) {
      // No HF keys available - use fallback
      await executeFallback(item.systemPrompt, item.userMessage, item.maxTokens, item.temperature)
        .then(item.resolve)
        .catch(item.reject);
      await trackUsage('fallbackCalls');
      return;
    }

    try {
      console.log(`[HF] Call attempt ${attempt + 1}: ${keyInfo.fingerprint}`);
      const result = await callHuggingFaceAPI(
        keyInfo,
        item.systemPrompt,
        item.userMessage,
        item.maxTokens,
        item.temperature
      );

      if (result.content) {
        await reportHFSuccess(keyInfo.id, result.tokensUsed);
        await trackUsage('hfCalls', result.tokensUsed);
        item.resolve(result.content);
        return;
      }
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[HF] Key ${keyInfo.fingerprint} failed: ${lastError}`);
      const shouldRetry = await reportHFFailure(keyInfo.id, lastError);
      if (!shouldRetry) break; // Key exhausted/auth error, try next
    }
  }

  // All HF keys failed - fallback
  await trackUsage('failedCalls');
  try {
    const fallbackResult = await executeFallback(item.systemPrompt, item.userMessage, item.maxTokens, item.temperature);
    item.resolve(fallbackResult);
    await trackUsage('fallbackCalls');
  } catch (err) {
    item.reject(err instanceof Error ? err : new Error(String(err)));
  }
}

// ========== MAIN ENTRY POINT ==========
export async function callHuggingFace(
  systemPrompt: string,
  userMessage: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<HFCallResult> {
  const temperature = options.temperature ?? 0.8;
  const maxTokens = options.maxTokens ?? 512;

  return new Promise<HFCallResult>((resolve, reject) => {
    const batchItem: BatchItem = {
      systemPrompt,
      userMessage,
      maxTokens,
      temperature,
      resolve: (content: string) => {
        resolve({
          content,
          provider: 'HuggingFace',
          tokensUsed: estimateTokens(userMessage) + estimateTokens(content),
          loadBalanced: true,
          usedFallback: false,
        });
      },
      reject: (err: Error) => {
        resolve({
          content: `عذرًا، حدث خطأ: ${err.message.slice(0, 80)}. حاول مرة أخرى.`,
          provider: 'HuggingFace',
          tokensUsed: 0,
          loadBalanced: false,
          usedFallback: true,
        });
      },
    };

    batchQueue.push(batchItem);

    // Schedule batch flush
    if (!batchFlushScheduled) {
      batchFlushScheduled = true;
      const waitTime = batchQueue.length >= BATCH_MIN_SIZE ? 50 : BATCH_MAX_WAIT;
      setTimeout(flushBatch, waitTime);
    }
  });
}

// ========== FALLBACK: Gemini/Groq (from existing aiProvider) ==========
async function executeFallback(
  systemPrompt: string,
  userMessage: string,
  maxTokens: number,
  temperature: number
): Promise<string> {
  // Dynamic import to avoid circular dependency
  const { callAI } = await import('@/lib/aiProvider');

  const result = await callAI(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    { temperature, maxTokens }
  );

  if (!result.content || result.provider === 'None') {
    throw new Error('لا توجد مفاتيح API نشطة');
  }

  return result.content;
}

// ========== Get HF Key Stats (for Admin Dashboard) ==========
export async function getHFKeyStats(): Promise<{
  total: number;
  active: number;
  cooldown: number;
  exhausted: number;
  disabled: number;
  totalTokens: number;
  totalRequests: number;
  totalSuccess: number;
  totalFail: number;
  keys: Array<{
    id: string;
    fingerprint: string;
    label: string | null;
    model: string;
    status: string;
    priority: number;
    requestCount: number;
    successCount: number;
    failCount: number;
    tokensUsed: number;
    tokensLimit: number | null;
    lastUsedAt: Date | null;
    lastError: string | null;
    lastErrorAt: Date | null;
    cooldownUntil: Date | null;
  }>;
}> {
  try {
    const [keys, aggTokens, aggRequests, aggSuccess, aggFail] = await Promise.all([
      db.huggingFaceKey.findMany({
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      db.huggingFaceKey.aggregate({ _sum: { tokensUsed: true } }),
      db.huggingFaceKey.aggregate({ _sum: { requestCount: true } }),
      db.huggingFaceKey.aggregate({ _sum: { successCount: true } }),
      db.huggingFaceKey.aggregate({ _sum: { failCount: true } }),
    ]);

    return {
      total: keys.length,
      active: keys.filter(k => k.status === 'active').length,
      cooldown: keys.filter(k => k.status === 'cooldown').length,
      exhausted: keys.filter(k => k.status === 'exhausted').length,
      disabled: keys.filter(k => k.status === 'disabled').length,
      totalTokens: aggTokens._sum.tokensUsed || 0,
      totalRequests: aggRequests._sum.requestCount || 0,
      totalSuccess: aggSuccess._sum.successCount || 0,
      totalFail: aggFail._sum.failCount || 0,
      keys: keys.map(k => ({
        id: k.id,
        fingerprint: k.fingerprint,
        label: k.tokenLabel,
        model: k.model,
        status: k.status,
        priority: k.priority,
        requestCount: k.requestCount,
        successCount: k.successCount,
        failCount: k.failCount,
        tokensUsed: k.tokensUsed,
        tokensLimit: k.tokensLimit,
        lastUsedAt: k.lastUsedAt,
        lastError: k.lastError,
        lastErrorAt: k.lastErrorAt,
        cooldownUntil: k.cooldownUntil,
      })),
    };
  } catch (err) {
    console.error('[HF] Failed to get stats:', err);
    return {
      total: 0, active: 0, cooldown: 0, exhausted: 0, disabled: 0,
      totalTokens: 0, totalRequests: 0, totalSuccess: 0, totalFail: 0,
      keys: [],
    };
  }
}

// ========== HF Key Management (CRUD) ==========
export async function addHFKey(token: string, label?: string, model?: string): Promise<HFKeyInfo | null> {
  try {
    const fp = makeFP(token);
    const key = await db.huggingFaceKey.create({
      data: {
        accessToken: encrypt(token),
        fingerprint: fp,
        tokenLabel: label || null,
        model: model || 'Qwen/Qwen2.5-72B-Instruct',
        status: 'active',
      },
    });
    return {
      id: key.id,
      token,
      fingerprint: key.fingerprint,
      label: key.tokenLabel,
      model: key.model,
      priority: key.priority,
      status: key.status,
      requestCount: 0,
      successCount: 0,
      failCount: 0,
      tokensUsed: 0,
      tokensLimit: null,
      lastUsedAt: null,
      lastError: null,
      cooldownUntil: null,
    };
  } catch (err) {
    console.error('[HF] Failed to add key:', err);
    return null;
  }
}

export async function bulkAddHFKeys(tokens: string[], model?: string): Promise<{ added: number; errors: number }> {
  let added = 0;
  let errors = 0;

  for (const token of tokens) {
    const result = await addHFKey(token.trim(), undefined, model);
    if (result) added++;
    else errors++;
  }

  return { added, errors };
}

export async function deleteHFKey(id: string): Promise<boolean> {
  try {
    await db.huggingFaceKey.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function toggleHFKeyStatus(id: string): Promise<boolean> {
  try {
    const key = await db.huggingFaceKey.findUnique({ where: { id } });
    if (!key) return false;

    const newStatus = key.status === 'disabled' ? 'active' : 'disabled';
    await db.huggingFaceKey.update({
      where: { id },
      data: { status: newStatus },
    });
    return true;
  } catch {
    return false;
  }
}

export async function reactivateAllHFKeys(): Promise<number> {
  try {
    const result = await db.huggingFaceKey.updateMany({
      where: { status: { in: ['cooldown', 'exhausted'] } },
      data: { status: 'active', cooldownUntil: null, lastError: null },
    });
    return result.count;
  } catch {
    return 0;
  }
}

// ========== Has Active HF Keys? ==========
export async function hasActiveHFKeys(): Promise<boolean> {
  try {
    const count = await db.huggingFaceKey.count({ where: { status: 'active' } });
    return count > 0;
  } catch {
    return false;
  }
}
