// Usage limit constants and helpers (shared between API routes and components)

export const FREE_MESSAGE_LIMIT = 25; // daily limit - resets every 24h
export const SUBSCRIPTION_PRICE = 10; // $10/month
export const ADS_FOR_BONUS = 10;
export const BONUS_MESSAGES = 5;
export const RESET_HOURS = 24; // hours until daily reset

export interface UsageInfoData {
  messagesUsed: number;
  freeLimit: number;
  freeRemaining: number;
  bonusMessages: number;
  isPremium: boolean;
  subscriptionExpiry: string | null;
  adsWatchedToday: number;
  adsProgress: number;
  adsUntilBonus: number;
  ADS_FOR_BONUS: number;
  BONUS_MESSAGES: number;
  SUBSCRIPTION_PRICE: number;
  canSend: boolean;
  isAdmin: boolean;
  // 24h reset timer
  resetAt: string | null; // ISO string of when the counter resets
  resetCountdown: number; // seconds remaining until reset
}

/**
 * Check if 24 hours have passed since lastMessageResetDate.
 * If no resetDate exists or 24h passed, returns true (needs reset).
 */
export function needsDailyReset(lastResetDate?: Date | string | null): boolean {
  if (!lastResetDate) return true;
  const resetDate = new Date(lastResetDate);
  const now = new Date();
  const hoursDiff = (now.getTime() - resetDate.getTime()) / (1000 * 60 * 60);
  return hoursDiff >= RESET_HOURS;
}

/**
 * Calculate when the next reset will occur (ISO string)
 */
export function getNextResetTime(lastResetDate?: Date | string | null): string {
  const base = lastResetDate ? new Date(lastResetDate) : new Date();
  // If lastResetDate is more than 24h ago, the reset time is NOW + 24h
  const now = new Date();
  if (needsDailyReset(lastResetDate)) {
    const future = new Date(now.getTime() + RESET_HOURS * 60 * 60 * 1000);
    return future.toISOString();
  }
  const future = new Date(base.getTime() + RESET_HOURS * 60 * 60 * 1000);
  return future.toISOString();
}

/**
 * Calculate seconds remaining until reset
 */
export function getResetCountdown(lastResetDate?: Date | string | null): number {
  const resetAt = getNextResetTime(lastResetDate);
  const now = new Date();
  const ms = new Date(resetAt).getTime() - now.getTime();
  return Math.max(0, Math.floor(ms / 1000));
}

export function canUserSend(user: { role: string; messagesUsed: number; bonusMessages: number; subscriptionExpiry?: Date | string | null; lastMessageResetDate?: Date | string | null }): boolean {
  if (!user) return true; // Allow unauthenticated users (they'll be limited client-side)
  if (user.role === 'owner' || user.role === 'supervisor') return true;
  const expiry = user.subscriptionExpiry;
  const isPremium = expiry && new Date(expiry) > new Date();
  if (isPremium) return true;

  // Check if daily reset is needed
  const effectiveUsed = needsDailyReset(user.lastMessageResetDate) ? 0 : (user.messagesUsed || 0);
  return effectiveUsed < FREE_MESSAGE_LIMIT || (user.bonusMessages || 0) > 0;
}

export function getUserUsageInfo(user: any): UsageInfoData {
  if (!user) {
    return {
      messagesUsed: 0,
      freeLimit: FREE_MESSAGE_LIMIT,
      freeRemaining: FREE_MESSAGE_LIMIT,
      bonusMessages: 0,
      isPremium: false,
      subscriptionExpiry: null,
      adsWatchedToday: 0,
      adsProgress: 0,
      adsUntilBonus: ADS_FOR_BONUS,
      ADS_FOR_BONUS,
      BONUS_MESSAGES,
      SUBSCRIPTION_PRICE,
      canSend: true,
      isAdmin: false,
      resetAt: null,
      resetCountdown: 0,
    };
  }

  const isPremium = user.role === 'owner' || user.role === 'supervisor' ||
    (user.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date());

  // Daily reset check
  const shouldReset = !isPremium && needsDailyReset(user.lastMessageResetDate);
  const effectiveUsed = shouldReset ? 0 : (user.messagesUsed || 0);
  const freeRemaining = Math.max(0, FREE_MESSAGE_LIMIT - effectiveUsed);

  const adsWatchedTotal = user.adsWatchedTotal || 0;
  const adsProgress = adsWatchedTotal % ADS_FOR_BONUS;
  const adsUntilBonus = ADS_FOR_BONUS - adsProgress;

  // Reset timer info
  const resetAt = isPremium ? null : getNextResetTime(user.lastMessageResetDate);
  const resetCountdown = isPremium ? 0 : getResetCountdown(user.lastMessageResetDate);

  return {
    messagesUsed: effectiveUsed,
    freeLimit: FREE_MESSAGE_LIMIT,
    freeRemaining,
    bonusMessages: user.bonusMessages || 0,
    isPremium,
    subscriptionExpiry: user.subscriptionExpiry,
    adsWatchedToday: user.adsWatchedToday || 0,
    adsProgress,
    adsUntilBonus,
    ADS_FOR_BONUS,
    BONUS_MESSAGES,
    SUBSCRIPTION_PRICE,
    canSend: isPremium || freeRemaining > 0 || (user.bonusMessages || 0) > 0,
    isAdmin: user.role === 'owner' || user.role === 'supervisor',
    resetAt,
    resetCountdown,
  };
}
