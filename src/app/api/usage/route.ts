import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Usage limits
export const FREE_MESSAGE_LIMIT = 25;
export const SUBSCRIPTION_PRICE = 10; // $10/month
export const ADS_FOR_BONUS = 10;
export const BONUS_MESSAGES = 5;

/**
 * Check user's remaining messages and subscription status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    const result = getUserUsageInfo(user);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Usage check error:', error);
    return NextResponse.json({ error: 'خطأ في التحقق' }, { status: 500 });
  }
}

/**
 * Record a message usage (called from chat API)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    // Check if user can send
    if (!canUserSend(user)) {
      return NextResponse.json({
        canSend: false,
        reason: 'limit_reached',
        message: 'وصلت للحد الأقصى من الرسائل المجانية. اشترك أو شاهد إعلانات للمتابعة.',
      }, { status: 403 });
    }

    // Deduct message (bonus first, then free)
    let updatedUser;
    if (user.role !== 'owner' && user.role !== 'supervisor') {
      const isPremium = user.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date();
      if (!isPremium) {
        if (user.bonusMessages > 0) {
          updatedUser = await db.user.update({
            where: { id: userId },
            data: { bonusMessages: { decrement: 1 } },
          });
        } else if (user.messagesUsed < FREE_MESSAGE_LIMIT) {
          updatedUser = await db.user.update({
            where: { id: userId },
            data: { messagesUsed: { increment: 1 } },
          });
        }
      }
    }

    return NextResponse.json({
      canSend: true,
      messagesUsed: updatedUser?.messagesUsed ?? user.messagesUsed,
      bonusMessages: updatedUser?.bonusMessages ?? user.bonusMessages,
    });
  } catch (error) {
    console.error('Usage record error:', error);
    return NextResponse.json({ error: 'خطأ في تسجيل الاستخدام' }, { status: 500 });
  }
}

// Helper functions (also used by chat API)
export function canUserSend(user: { role: string; messagesUsed: number; bonusMessages: number; subscriptionExpiry?: Date | null }): boolean {
  if (user.role === 'owner' || user.role === 'supervisor') return true;
  const isPremium = user.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date();
  if (isPremium) return true;
  return (user.messagesUsed < FREE_MESSAGE_LIMIT) || (user.bonusMessages > 0);
}

export function getUserUsageInfo(user: any) {
  const isPremium = user.role === 'owner' || user.role === 'supervisor' ||
    (user.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date());

  const freeRemaining = Math.max(0, FREE_MESSAGE_LIMIT - user.messagesUsed);
  const adsProgress = (user.adsWatchedToday || 0) % ADS_FOR_BONUS;
  const adsUntilBonus = ADS_FOR_BONUS - adsProgress;

  return {
    messagesUsed: user.messagesUsed,
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
