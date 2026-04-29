// Smart Load Balancer for API Keys
// Round Robin with auto-failover on rate limit (429)
// Supports both: SQLite/PostgreSQL DB AND Environment Variables (for Vercel)

import { db } from '@/lib/db';
import { decrypt } from '@/lib/crypto';

interface SelectedKey {
  id: string;
  provider: string;
  providerLabel: string;
  providerBaseUrl: string | null;
  decryptedKey: string;
  fingerprint: string;
  keyLabel: string | null;
}

// ========== ENV VAR KEY SUPPORT (for Vercel / no-DB environments) ==========
const PROVIDER_LABELS: Record<string, string> = {
  groq: 'Groq',
  deepseek: 'DeepSeek',
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  openrouter: 'OpenRouter',
};

const PROVIDER_ENV_MAP: Record<string, string[]> = {
  groq: ['GROQ_API_KEY', 'GROQ_API_KEYS'],
  deepseek: ['DEEPSEEK_API_KEY', 'DEEPSEEK_API_KEYS'],
  openai: ['OPENAI_API_KEY', 'OPENAI_API_KEYS'],
  gemini: ['GEMINI_API_KEY', 'GEMINI_API_KEYS'],
  openrouter: ['OPENROUTER_API_KEY', 'OPENROUTER_API_KEYS'],
};

/**
 * Read API keys from environment variables
 * Supports: GROQ_API_KEY="gsk_xxx" or GROQ_API_KEYS="gsk_xxx1,gsk_xxx2"
 * Also supports: AI_KEYS="groq:gsk_xxx,deepseek:sk_xxx"
 */
export function getEnvKeys(): SelectedKey[] {
  const keys: SelectedKey[] = [];
  const seen = new Set<string>();

  // Method 1: Per-provider env vars
  for (const [provider, envNames] of Object.entries(PROVIDER_ENV_MAP)) {
    for (const envName of envNames) {
      const val = process.env[envName];
      if (!val) continue;

      // Support multiple keys separated by comma or newline
      const rawKeys = val.split(/[,\n]+/).map(k => k.trim()).filter(k => k.length > 10);
      for (const rawKey of rawKeys) {
        if (seen.has(rawKey)) continue;
        seen.add(rawKey);
        const fp = rawKey.length > 8 ? rawKey.slice(0, 8) + '••••••••' : '••••••••';
        keys.push({
          id: `env-${provider}-${fp.slice(0, 8)}`,
          provider,
          providerLabel: PROVIDER_LABELS[provider] || provider,
          providerBaseUrl: null,
          decryptedKey: rawKey,
          fingerprint: fp,
          keyLabel: `ENV: ${provider}`,
        });
      }
    }
  }

  // Method 2: AI_KEYS env var (groq:gsk_xxx,deepseek:sk_xxx)
  const aiKeys = process.env.AI_KEYS;
  if (aiKeys) {
    const pairs = aiKeys.split(',').map(p => p.trim()).filter(p => p.includes(':'));
    for (const pair of pairs) {
      const colonIdx = pair.indexOf(':');
      const provider = pair.slice(0, colonIdx).trim().toLowerCase();
      const rawKey = pair.slice(colonIdx + 1).trim();
      if (!rawKey || rawKey.length < 10 || seen.has(rawKey)) continue;
      seen.add(rawKey);
      const fp = rawKey.length > 8 ? rawKey.slice(0, 8) + '••••••••' : '••••••••';
      keys.push({
        id: `env-${provider}-${fp.slice(0, 8)}`,
        provider,
        providerLabel: PROVIDER_LABELS[provider] || provider,
        providerBaseUrl: null,
        decryptedKey: rawKey,
        fingerprint: fp,
        keyLabel: `ENV: ${provider}`,
      });
    }
  }

  return keys;
}

/**
 * Get stats from environment variable keys (for UI display)
 */
export function getEnvKeyStats() {
  const envKeys = getEnvKeys();
  const providersMap: Record<string, { keys: typeof envKeys }> = {};

  for (const k of envKeys) {
    if (!providersMap[k.provider]) {
      providersMap[k.provider] = {
        keys: [],
      };
    }
    providersMap[k.provider].keys.push(k);
  }

  const providers = Object.entries(providersMap).map(([name, data]) => ({
    id: `env-${name}`,
    name,
    label: PROVIDER_LABELS[name] || name,
    baseUrl: null as string | null,
    isActive: true,
    keys: data.keys.map(k => ({
      id: k.id,
      keyFingerprint: k.fingerprint,
      label: k.keyLabel,
      status: 'active',
      tokensUsed: 0,
      tokensLimit: null,
      requestCount: 0,
      lastUsedAt: null,
      lastError: null,
      lastErrorAt: null,
      cooldownUntil: null,
      priority: 0,
      createdAt: new Date().toISOString(),
    })),
  }));

  return {
    total: envKeys.length,
    active: envKeys.length,
    standby: 0,
    cooldown: 0,
    exhausted: 0,
    totalTokens: 0,
    totalRequests: 0,
    providers,
    source: 'env' as const,
  };
}

// In-memory round-robin counter (resets on server restart)
let roundRobinIndex = 0;
let lastCooldownCheck = 0;
const COOLDOWN_CHECK_INTERVAL = 30_000; // 30 seconds

/**
 * Reactivate keys whose cooldown period has expired
 */
async function reactivateCooldownKeys() {
  try {
    const now = new Date();
    await db.apiKey.updateMany({
      where: {
        status: 'cooldown',
        cooldownUntil: { lte: now },
      },
      data: {
        status: 'active',
        cooldownUntil: null,
        lastError: null,
      },
    });
  } catch (err) {
    console.error('Failed to reactivate cooldown keys:', err);
  }
}

/**
 * Select the best available API key using Round Robin + Priority
 * Falls back to environment variables if database has no keys
 * @param preferredProvider - optionally prefer a specific provider
 * @returns SelectedKey with decrypted API key
 */
export async function selectKey(preferredProvider?: string): Promise<SelectedKey | null> {
  try {
    // Periodically check for keys to reactivate
    const now = Date.now();
    if (now - lastCooldownCheck > COOLDOWN_CHECK_INTERVAL) {
      await reactivateCooldownKeys();
      lastCooldownCheck = now;
    }

    // Build the where clause
    const where: Record<string, unknown> = {
      status: 'active',
      provider: preferredProvider
        ? { name: preferredProvider, isActive: true }
        : { isActive: true },
    };

    // Get all active keys with provider info
    const keys = await db.apiKey.findMany({
      where,
      include: { provider: true },
      orderBy: [{ priority: 'desc' }, { lastUsedAt: 'asc' }],
    });

    if (keys.length > 0) {
      // Round Robin selection
      const index = roundRobinIndex % keys.length;
      roundRobinIndex++;

      const selected = keys[index];

      return {
        id: selected.id,
        provider: selected.provider.name,
        providerLabel: selected.provider.label,
        providerBaseUrl: selected.provider.baseUrl,
        decryptedKey: decrypt(selected.encryptedKey),
        fingerprint: selected.keyFingerprint || '••••••••',
        keyLabel: selected.label,
      };
    }
  } catch (dbErr) {
    console.error('[LoadBalancer] Database unavailable, falling back to env vars:', dbErr instanceof Error ? dbErr.message : String(dbErr));
  }

  // FALLBACK: Read from environment variables (for Vercel / no-DB environments)
  const envKeys = getEnvKeys();
  if (envKeys.length === 0) return null;

  // Filter by preferred provider if specified
  const filtered = preferredProvider
    ? envKeys.filter(k => k.provider === preferredProvider)
    : envKeys;

  const pool = filtered.length > 0 ? filtered : envKeys;
  const index = roundRobinIndex % pool.length;
  roundRobinIndex++;

  console.log(`[LoadBalancer] Using env var key: ${pool[index].providerLabel} (${pool[index].fingerprint})`);
  return pool[index];
}

/**
 * Report a successful API call - update usage stats
 * (No-op for env var keys - they don't have DB tracking)
 */
export async function reportSuccess(keyId: string, tokensUsed: number = 0) {
  // Skip if this is an env var key
  if (keyId.startsWith('env-')) return;

  try {
    await db.apiKey.update({
      where: { id: keyId },
      data: {
        requestCount: { increment: 1 },
        tokensUsed: { increment: tokensUsed },
        lastUsedAt: new Date(),
        lastError: null,
        lastErrorAt: null,
      },
    });
  } catch (err) {
    console.error('Failed to report key success:', err);
  }
}

/**
 * Report a failed API call - handle rate limiting
 * @param keyId - the key that failed
 * @param error - error message or status code
 * @param action - "retry" to try next key, "fail" to give up
 */
export async function reportFailure(
  keyId: string,
  error: string,
  action: 'retry' | 'fail' = 'retry'
): Promise<{ shouldRetry: boolean; nextKey?: SelectedKey | null }> {
  // For env var keys, just log and potentially retry
  if (keyId.startsWith('env-')) {
    const isRateLimit = error.includes('429') || error.includes('rate') || error.includes('quota');
    console.error(`[LoadBalancer] Env var key failed: ${error}`);
    if (isRateLimit && action === 'retry') {
      const envKeys = getEnvKeys().filter(k => k.id !== keyId);
      if (envKeys.length > 0) {
        const index = roundRobinIndex % envKeys.length;
        roundRobinIndex++;
        return { shouldRetry: true, nextKey: envKeys[index] };
      }
    }
    return { shouldRetry: false };
  }

  try {
    const isRateLimit = error.includes('429') || error.includes('rate') || error.includes('quota');

    if (isRateLimit) {
      // Put key in cooldown for 60 minutes
      const cooldownUntil = new Date(Date.now() + 60 * 60 * 1000);
      await db.apiKey.update({
        where: { id: keyId },
        data: {
          status: 'cooldown',
          cooldownUntil,
          lastError: 'Rate Limit (429)',
          lastErrorAt: new Date(),
        },
      });

      if (action === 'retry') {
        // Try next key
        const nextKey = await selectKey();
        return { shouldRetry: true, nextKey };
      }
    } else {
      // Other errors - mark but don't deactivate
      await db.apiKey.update({
        where: { id: keyId },
        data: {
          lastError: error.slice(0, 200),
          lastErrorAt: new Date(),
        },
      });
    }

    return { shouldRetry: false };
  } catch (err) {
    console.error('Failed to report key failure:', err);
    return { shouldRetry: false };
  }
}

/**
 * Get dashboard stats for the admin panel
 * Falls back to env var stats if database is unavailable
 */
export async function getKeyStats() {
  try {
    const [total, active, standby, cooldown, exhausted, providers] = await Promise.all([
      db.apiKey.count(),
      db.apiKey.count({ where: { status: 'active' } }),
      db.apiKey.count({ where: { status: 'standby' } }),
      db.apiKey.count({ where: { status: 'cooldown' } }),
      db.apiKey.count({ where: { status: 'exhausted' } }),
      db.apiProvider.findMany({
        include: {
          keys: {
            select: {
              id: true,
              keyFingerprint: true,
              label: true,
              status: true,
              tokensUsed: true,
              tokensLimit: true,
              requestCount: true,
              lastUsedAt: true,
              lastError: true,
              lastErrorAt: true,
              cooldownUntil: true,
              priority: true,
              createdAt: true,
            },
            orderBy: [{ priority: 'desc' }, { lastUsedAt: 'asc' }],
          },
        },
        orderBy: { label: 'asc' },
      }),
    ]);

    const totalTokens = await db.apiKey.aggregate({ _sum: { tokensUsed: true } });
    const totalRequests = await db.apiKey.aggregate({ _sum: { requestCount: true } });

    return {
      total,
      active,
      standby,
      cooldown,
      exhausted,
      totalTokens: totalTokens._sum.tokensUsed || 0,
      totalRequests: totalRequests._sum.requestCount || 0,
      providers,
      source: 'db' as const,
    };
  } catch (err) {
    console.error('Failed to get key stats from DB, falling back to env vars:', err);
    // Fallback to env var keys
    const envStats = getEnvKeyStats();
    if (envStats.total > 0) return envStats;
    return null;
  }
}
