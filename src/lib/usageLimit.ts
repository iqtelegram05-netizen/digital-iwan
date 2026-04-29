// Usage limit constants and helpers (shared between API routes and components)

export const FREE_MESSAGE_LIMIT = 25;
export const SUBSCRIPTION_PRICE = 10; // $10/month
export const ADS_FOR_BONUS = 10;
export const BONUS_MESSAGES = 5;

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
}

export function canUserSend(user: { role: string; messagesUsed: number; bonusMessages: number; subscriptionExpiry?: Date | string | null }): boolean {
  if (!user) return true; // Allow unauthenticated users (they'll be limited client-side)
  if (user.role === 'owner' || user.role === 'supervisor') return true;
  const expiry = user.subscriptionExpiry;
  const isPremium = expiry && new Date(expiry) > new Date();
  if (isPremium) return true;
  return (user.messagesUsed < FREE_MESSAGE_LIMIT) || (user.bonusMessages > 0);
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
    };
  }

  const isPremium = user.role === 'owner' || user.role === 'supervisor' ||
    (user.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date());

  const freeRemaining = Math.max(0, FREE_MESSAGE_LIMIT - (user.messagesUsed || 0));
  const adsWatchedTotal = user.adsWatchedTotal || 0;
  const adsProgress = adsWatchedTotal % ADS_FOR_BONUS;
  const adsUntilBonus = ADS_FOR_BONUS - adsProgress;

  return {
    messagesUsed: user.messagesUsed || 0,
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
  };
}
