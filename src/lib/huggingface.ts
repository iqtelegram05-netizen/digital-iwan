/**
 * ====================================================
 * HuggingFace Provider Engine v2 — Serverless Inference
 * ====================================================
 *
 * Uses HF FREE Serverless Inference API:
 *   Endpoint: https://router.huggingface.co/hf-inference/models/{model}
 *   Format:   { inputs, parameters }
 *   Response: [{ generated_text }]
 *
 * Features:
 *   - Smart Round-Robin rotation across all active hf_xxx tokens
 *   - 10-minute auto cooldown on 429 rate limits
 *   - Batching: collects 10-20 questions, processes in parallel
 *   - Fallback to Gemini/Groq when all HF tokens fail
 *   - Daily usage tracking per day
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

// ========== Configuration ==========
const DEFAULT_MODEL = 'Qwen/Qwen2.5-7B-Instruct';
const HF_INFERENCE_URL = 'https://router.huggingface.co/hf-inference/models/';
const HF_TIMEOUT = 60000; // 60 seconds for serverless inference (cold starts)
const COOLDOWN_DURATION = 10 * 60 * 1000; // 10 minutes

// ========== Round-Robin State ==========
let robinIndex = 0;
let lastCooldownCheck = 0;
const COOLDOWN_CHECK_INTERVAL = 15_000; // 15 seconds

// ========== Batching State ==========
interface BatchItem {
  id: string;               // unique batch item ID for debugging
  systemPrompt: string;
  userMessage: string;
  maxTokens: number;
  temperature: number;
  createdAt: number;         // timestamp when added
  resolve: (value: string) => void;
  reject: (reason: Error) => void;
}

let batchQueue: BatchItem[] = [];
let batchFlushScheduled = false;

// Batching config: collect 10-20 items, max wait 1.5s
const BATCH_MIN_SIZE = 10;
const BATCH_MAX_SIZE = 20;
const BATCH_MAX_WAIT_MS = 1500;

// ========== Utility ==========
let batchIdCounter = 0;
function nextBatchId(): string {
  return `batch-${++batchIdCounter}-${Date.now()}`;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5); // Qwen tokenizer ~3.5 chars/token
}

// ========== Cooldown Reactivation ==========
async function reactivateCooldownKeys(): Promise<void> {
  try {
    const result = await db.huggingFaceKey.updateMany({
      where: {
        status: 'cooldown',
        cooldownUntil: { lte: new Date() },
      },
      data: {
        status: 'active',
        cooldownUntil: null,
        lastError: null,
        lastErrorAt: null,
      },
    });
    if (result.count > 0) {
      console.log(`[HF] Reactivated ${result.count} cooldown keys`);
    }
  } catch (err) {
    console.error('[HF] Cooldown reactivation error:', err);
  }
}

// ========== Daily Usage Tracker ==========
const todayStr = () => new Date().toISOString().slice(0, 10);

export async function trackUsage(
  type: 'cacheHits' | 'aiCalls' | 'hfCalls' | 'fallbackCalls' | 'failedCalls',
  tokens: number = 0
): Promise<void> {
  try {
    const date = todayStr();
    const update: Record<string, unknown> = {
      [type]: { increment: 1 },
      totalRequests: { increment: 1 },
    };
    if (tokens > 0) update.totalTokens = { increment: tokens };

    await db.dailyUsage.upsert({
      where: { date },
      update: update,
      create: { date, ...update },
    });
  } catch {
    // Silent - don't block main flow
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
    return stats
      ? {
          date: stats.date,
          totalRequests: stats.totalRequests,
          cacheHits: stats.cacheHits,
          aiCalls: stats.aiCalls,
          hfCalls: stats.hfCalls,
          fallbackCalls: stats.fallbackCalls,
          failedCalls: stats.failedCalls,
          totalTokens: stats.totalTokens,
        }
      : null;
  } catch {
    return null;
  }
}

// ========== Select HF Key (Smart Round-Robin) ==========
export async function selectHFKey(): Promise<HFKeyInfo | null> {
  try {
    // Periodic cooldown reactivation
    const now = Date.now();
    if (now - lastCooldownCheck > COOLDOWN_CHECK_INTERVAL) {
      await reactivateCooldownKeys();
      lastCooldownCheck = now;
    }

    // Get all active keys ordered by priority (desc), then least recently used
    const keys = await db.huggingFaceKey.findMany({
      where: { status: 'active' },
      orderBy: [{ priority: 'desc' }, { lastUsedAt: 'asc' }],
    });

    if (keys.length === 0) return null;

    // Round-robin within same priority tier
    const index = robinIndex % keys.length;
    robinIndex++;

    const selected = keys[index];
    return {
      id: selected.id,
      token: decrypt(selected.accessToken),
      fingerprint: selected.fingerprint,
      label: selected.tokenLabel,
      model: selected.model || DEFAULT_MODEL,
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
    console.error('[HF] Key selection error:', err);
    return null;
  }
}

// ========== Report Key Result ==========
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
    // Silent
  }
}

export async function reportHFFailure(keyId: string, error: string): Promise<boolean> {
  try {
    const isRateLimit =
      error.includes('429') ||
      error.includes('rate') ||
      error.includes('quota') ||
      error.includes('overloaded') ||
      error.includes('Too Many Requests');

    const isAuthError =
      error.includes('401') ||
      error.includes('403') ||
      error.includes('authorization') ||
      error.includes('Unauthorized') ||
      error.includes('invalid token');

    const isModelNotFound =
      error.includes('404') ||
      error.includes('not found') ||
      error.includes('does not exist') ||
      error.includes('Model not found');

    const isServerError =
      error.includes('500') ||
      error.includes('502') ||
      error.includes('503') ||
      error.includes('loading') ||
      error.includes('currently loading');

    // Auth error = token is permanently invalid, mark exhausted
    if (isAuthError) {
      await db.huggingFaceKey.update({
        where: { id: keyId },
        data: {
          status: 'exhausted',
          failCount: { increment: 1 },
          lastError: `Auth Error: ${error.slice(0, 150)}`,
          lastErrorAt: new Date(),
        },
      });
      return true; // Can try next key
    }

    // Rate limit = temporary cooldown
    if (isRateLimit) {
      const cooldownUntil = new Date(Date.now() + COOLDOWN_DURATION);
      await db.huggingFaceKey.update({
        where: { id: keyId },
        data: {
          status: 'cooldown',
          cooldownUntil,
          failCount: { increment: 1 },
          lastError: `Rate Limited - cooldown until ${cooldownUntil.toISOString()}`,
          lastErrorAt: new Date(),
        },
      });
      return true; // Can try next key
    }

    // Server error / model loading = temporary, keep active
    if (isServerError || isModelNotFound) {
      await db.huggingFaceKey.update({
        where: { id: keyId },
        data: {
          failCount: { increment: 1 },
          lastError: `Server: ${error.slice(0, 150)}`,
          lastErrorAt: new Date(),
        },
      });
      return true; // Can try next key
    }

    // Unknown error - keep active but log
    await db.huggingFaceKey.update({
      where: { id: keyId },
      data: {
        failCount: { increment: 1 },
        lastError: error.slice(0, 200),
        lastErrorAt: new Date(),
      },
    });
    return true;
  } catch {
    return false;
  }
}

// ========== Call HF Serverless Inference API ==========
async function callHFServerlessAPI(
  keyInfo: HFKeyInfo,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 512,
  temperature: number = 0.8
): Promise<{ content: string; tokensUsed: number }> {
  const model = keyInfo.model || DEFAULT_MODEL;
  const url = `${HF_INFERENCE_URL}${model}`;

  // Build the prompt: combine system + user message
  // For text-generation models, we include system context in the user prompt
  const fullPrompt = systemPrompt
    ? `[التعليمات]: ${systemPrompt}\n\n[السؤال]: ${userMessage}\n\n[الإجابة]:`
    : userMessage;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HF_TIMEOUT);

  try {
    console.log(`[HF] Serverless API call: ${model} via key ${keyInfo.fingerprint}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${keyInfo.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: maxTokens,
          temperature: temperature,
          top_p: 0.9,
          return_full_text: false, // Only return generated text
          do_sample: true,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      const errStatus = response.status;

      console.error(`[HF] API Error ${errStatus}: ${errText.slice(0, 300)}`);

      // Special handling for model loading
      if (errStatus === 503 && errText.includes('loading')) {
        throw new Error(`503: Model "${model}" is currently loading. Please wait 20-30 seconds and retry.`);
      }

      throw new Error(`${errStatus}: ${errText.slice(0, 200)}`);
    }

    const data = await response.json();

    // Parse Serverless Inference response format: [{ generated_text: "..." }]
    let content = '';
    if (Array.isArray(data) && data.length > 0) {
      content = data[0]?.generated_text || '';
    } else if (data?.generated_text) {
      content = data.generated_text;
    } else if (data?.[0]?.generated_text) {
      content = data[0].generated_text;
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Empty response from HF API');
    }

    // Clean up the response
    content = content.trim();

    // Estimate tokens
    const tokensUsed = estimateTokens(fullPrompt) + estimateTokens(content);

    console.log(`[HF] Success: ${content.length} chars, ~${tokensUsed} tokens via ${keyInfo.fingerprint}`);
    return { content, tokensUsed };
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`HF API timeout (${HF_TIMEOUT / 1000}s) - model may be cold starting`);
    }

    throw err;
  }
}

// ========== BATCH QUEUE ==========
async function flushBatch(): Promise<void> {
  if (batchQueue.length === 0) {
    batchFlushScheduled = false;
    return;
  }

  // Take items from queue (up to BATCH_MAX_SIZE)
  const batch = batchQueue.splice(0, BATCH_MAX_SIZE);
  batchFlushScheduled = false;

  console.log(`[HF BATCH] Flushing ${batch.length} items (queue remaining: ${batchQueue.length})`);

  // Process all items in parallel - each gets its own key via round-robin
  const results = await Promise.allSettled(
    batch.map((item) => executeSingleCall(item))
  );

  // Log any failures
  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    console.log(`[HF BATCH] ${failures.length}/${batch.length} items failed`);
  }

  // If there are still items in queue, schedule another flush
  if (batchQueue.length > 0 && !batchFlushScheduled) {
    batchFlushScheduled = true;
    setTimeout(flushBatch, 100); // Immediate flush for remaining items
  }
}

async function executeSingleCall(item: BatchItem): Promise<void> {
  const maxRetries = 3; // Try up to 3 different keys
  let lastError = '';

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const keyInfo = await selectHFKey();

    if (!keyInfo) {
      // No HF keys available - use fallback
      console.log(`[HF] No active keys, falling back for item ${item.id}`);
      await executeFallback(item.systemPrompt, item.userMessage, item.maxTokens, item.temperature)
        .then(item.resolve)
        .catch(item.reject);
      await trackUsage('fallbackCalls');
      return;
    }

    try {
      console.log(`[HF] Item ${item.id} attempt ${attempt + 1}: key ${keyInfo.fingerprint}`);

      const result = await callHFServerlessAPI(
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
      console.error(`[HF] Item ${item.id} key ${keyInfo.fingerprint} failed: ${lastError.slice(0, 100)}`);

      const shouldRetry = await reportHFFailure(keyInfo.id, lastError);
      if (!shouldRetry) break; // Key exhausted, don't retry with same type of error

      // If model loading, wait and retry
      if (lastError.includes('loading') || lastError.includes('503')) {
        await new Promise((r) => setTimeout(r, 2000)); // Wait 2s for model to load
      }
    }
  }

  // All HF keys failed - fallback to Gemini/Groq
  console.log(`[HF] All keys failed for item ${item.id}, using fallback`);
  await trackUsage('failedCalls');

  try {
    const fallbackResult = await executeFallback(
      item.systemPrompt,
      item.userMessage,
      item.maxTokens,
      item.temperature
    );
    item.resolve(fallbackResult);
    await trackUsage('fallbackCalls');
  } catch (fbErr) {
    const errMsg = fbErr instanceof Error ? fbErr.message : String(fbErr);
    console.error(`[HF] Fallback also failed for item ${item.id}: ${errMsg}`);
    item.reject(fbErr instanceof Error ? fbErr : new Error(errMsg));
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

  return new Promise<HFCallResult>((resolve) => {
    const batchItem: BatchItem = {
      id: nextBatchId(),
      systemPrompt,
      userMessage,
      maxTokens,
      temperature,
      createdAt: Date.now(),
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
        // On rejection, return error message (don't actually reject - always resolve)
        resolve({
          content: `عذرًا، حدث خطأ في الاتصال بمحرك Qwen: ${err.message.slice(0, 80)}. يرجى المحاولة مرة أخرى.`,
          provider: 'HuggingFace',
          tokensUsed: 0,
          loadBalanced: false,
          usedFallback: true,
        });
      },
    };

    batchQueue.push(batchItem);

    // Schedule batch flush based on queue size
    if (!batchFlushScheduled) {
      batchFlushScheduled = true;

      if (batchQueue.length >= BATCH_MAX_SIZE) {
        // Queue full - flush immediately
        setTimeout(flushBatch, 10);
      } else if (batchQueue.length >= BATCH_MIN_SIZE) {
        // Min batch reached - flush soon
        setTimeout(flushBatch, 200);
      } else {
        // Below min - wait for more items up to max wait time
        setTimeout(flushBatch, BATCH_MAX_WAIT_MS);
      }
    } else {
      // Flush already scheduled - check if queue is now full
      if (batchQueue.length >= BATCH_MAX_SIZE) {
        // Force immediate flush by cancelling scheduled and flushing now
        clearTimeout(undefined); // Can't clear named timeout, but flushBatch will handle it
        // The scheduled flush will pick up items when it runs
      }
    }
  });
}

// ========== FALLBACK: Gemini/Groq from aiProvider ==========
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
    throw new Error('لا توجد مفاتيح API بديلة نشطة');
  }

  return result.content;
}

// ========== HF Key Stats (Admin Dashboard) ==========
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
      active: keys.filter((k) => k.status === 'active').length,
      cooldown: keys.filter((k) => k.status === 'cooldown').length,
      exhausted: keys.filter((k) => k.status === 'exhausted').length,
      disabled: keys.filter((k) => k.status === 'disabled').length,
      totalTokens: aggTokens._sum.tokensUsed || 0,
      totalRequests: aggRequests._sum.requestCount || 0,
      totalSuccess: aggSuccess._sum.successCount || 0,
      totalFail: aggFail._sum.failCount || 0,
      keys: keys.map((k) => ({
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
      total: 0,
      active: 0,
      cooldown: 0,
      exhausted: 0,
      disabled: 0,
      totalTokens: 0,
      totalRequests: 0,
      totalSuccess: 0,
      totalFail: 0,
      keys: [],
    };
  }
}

// ========== HF Key Management (CRUD) ==========
export async function addHFKey(
  token: string,
  label?: string,
  model?: string
): Promise<HFKeyInfo | null> {
  try {
    // Validate token format
    if (!token || token.trim().length < 10) {
      console.error('[HF] Token too short');
      return null;
    }

    const trimmedToken = token.trim();
    const fp = makeFP(trimmedToken);
    const selectedModel = model || DEFAULT_MODEL;

    const key = await db.huggingFaceKey.create({
      data: {
        accessToken: encrypt(trimmedToken),
        fingerprint: fp,
        tokenLabel: label || null,
        model: selectedModel,
        status: 'active',
      },
    });

    console.log(`[HF] Added key: ${fp} model=${selectedModel}`);

    return {
      id: key.id,
      token: trimmedToken,
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

export async function bulkAddHFKeys(
  tokens: string[],
  model?: string
): Promise<{ added: number; errors: number }> {
  let added = 0;
  let errors = 0;

  for (const token of tokens) {
    const trimmed = token.trim();
    if (trimmed.length < 10) {
      errors++;
      continue;
    }
    const result = await addHFKey(trimmed, undefined, model);
    if (result) added++;
    else errors++;
  }

  console.log(`[HF] Bulk add: ${added} added, ${errors} errors`);
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
      data: { status: 'active', cooldownUntil: null, lastError: null, lastErrorAt: null },
    });
    console.log(`[HF] Reactivated ${result.count} keys`);
    return result.count;
  } catch {
    return 0;
  }
}

export async function hasActiveHFKeys(): Promise<boolean> {
  try {
    const count = await db.huggingFaceKey.count({ where: { status: 'active' } });
    return count > 0;
  } catch {
    return false;
  }
}
