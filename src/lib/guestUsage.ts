// Guest (unauthenticated) usage tracking via localStorage
import { FREE_MESSAGE_LIMIT, RESET_HOURS, ADS_FOR_BONUS, BONUS_MESSAGES, SUBSCRIPTION_PRICE } from './usageLimit';
import type { UsageInfoData } from './usageLimit';

const STORAGE_KEY = 'iwan_guest_usage';

interface GuestUsage {
  messagesUsed: number;
  lastResetDate: string; // ISO string
  adsWatchedTotal: number;
  bonusMessages: number;
}

function getGuestUsage(): GuestUsage {
  if (typeof window === 'undefined') {
    return { messagesUsed: 0, lastResetDate: '', adsWatchedTotal: 0, bonusMessages: 0 };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return { messagesUsed: 0, lastResetDate: '', adsWatchedTotal: 0, bonusMessages: 0 };
}

function saveGuestUsage(data: GuestUsage): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

function isExpired(resetDate: string): boolean {
  if (!resetDate) return true;
  const diff = (Date.now() - new Date(resetDate).getTime()) / (1000 * 60 * 60);
  return diff >= RESET_HOURS;
}

function getResetCountdown(resetDate: string): number {
  if (!resetDate) return 0;
  const resetAt = new Date(resetDate).getTime() + RESET_HOURS * 60 * 60 * 1000;
  const ms = resetAt - Date.now();
  return Math.max(0, Math.floor(ms / 1000));
}

function getNextReset(resetDate: string): string {
  if (!resetDate || isExpired(resetDate)) {
    return new Date(Date.now() + RESET_HOURS * 60 * 60 * 1000).toISOString();
  }
  return new Date(new Date(resetDate).getTime() + RESET_HOURS * 60 * 60 * 1000).toISOString();
}

/**
 * Get full UsageInfoData for guest (unauthenticated) users from localStorage.
 * Auto-resets if 24h have passed.
 */
export function getGuestUsageInfo(): UsageInfoData {
  const data = getGuestUsage();

  // Auto-reset if expired
  let messagesUsed = data.messagesUsed;
  let lastResetDate = data.lastResetDate;

  if (isExpired(lastResetDate)) {
    messagesUsed = 0;
    lastResetDate = new Date().toISOString();
    saveGuestUsage({ ...data, messagesUsed: 0, lastResetDate });
  }

  const freeRemaining = Math.max(0, FREE_MESSAGE_LIMIT - messagesUsed);
  const adsProgress = data.adsWatchedTotal % ADS_FOR_BONUS;
  const adsUntilBonus = ADS_FOR_BONUS - adsProgress;

  return {
    messagesUsed,
    freeLimit: FREE_MESSAGE_LIMIT,
    freeRemaining,
    bonusMessages: data.bonusMessages,
    isPremium: false,
    subscriptionExpiry: null,
    adsWatchedToday: 0,
    adsProgress,
    adsUntilBonus,
    ADS_FOR_BONUS,
    BONUS_MESSAGES,
    SUBSCRIPTION_PRICE,
    canSend: freeRemaining > 0 || data.bonusMessages > 0,
    isAdmin: false,
    resetAt: getNextReset(lastResetDate),
    resetCountdown: getResetCountdown(lastResetDate),
  };
}

/**
 * Increment guest message count after sending a message.
 * Uses bonus messages first if available.
 */
export function incrementGuestUsage(): UsageInfoData {
  const data = getGuestUsage();

  // Auto-reset if expired
  if (isExpired(data.lastResetDate)) {
    data.messagesUsed = 0;
    data.lastResetDate = new Date().toISOString();
  }

  if (data.bonusMessages > 0) {
    data.bonusMessages -= 1;
  } else {
    data.messagesUsed += 1;
    if (!data.lastResetDate) {
      data.lastResetDate = new Date().toISOString();
    }
  }

  saveGuestUsage(data);
  return getGuestUsageInfo();
}

/**
 * Reset guest usage (for testing or manual reset).
 */
export function resetGuestUsage(): void {
  saveGuestUsage({
    messagesUsed: 0,
    lastResetDate: new Date().toISOString(),
    adsWatchedTotal: 0,
    bonusMessages: 0,
  });
}
