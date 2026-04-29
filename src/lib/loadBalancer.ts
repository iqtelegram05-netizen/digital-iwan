// Smart Load Balancer for API Keys
// Round Robin with auto-failover on rate limit (429)

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
 * @param preferredProvider - optionally prefer a specific provider
 * @returns SelectedKey with decrypted API key
 */
export async function selectKey(preferredProvider?: string): Promise<SelectedKey | null> {
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

  if (keys.length === 0) return null;

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

/**
 * Report a successful API call - update usage stats
 */
export async function reportSuccess(keyId: string, tokensUsed: number = 0) {
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
    };
  } catch (err) {
    console.error('Failed to get key stats:', err);
    return null;
  }
}
