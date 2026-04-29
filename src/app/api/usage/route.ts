import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserUsageInfo, needsDailyReset } from '@/lib/usageLimit';

/**
 * Check user's remaining messages and subscription status.
 * Auto-resets daily counter if 24h have passed.
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

    // Auto-reset daily counter if 24h passed
    if (user.role !== 'owner' && user.role !== 'supervisor') {
      const isPremium = user.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date();
      if (!isPremium && needsDailyReset(user.lastMessageResetDate)) {
        await db.user.update({
          where: { id: userId },
          data: {
            messagesUsed: 0,
            lastMessageResetDate: new Date(),
          },
        });
        // Re-fetch with fresh data
        const refreshedUser = await db.user.findUnique({ where: { id: userId } });
        return NextResponse.json(getUserUsageInfo(refreshedUser));
      }
    }

    return NextResponse.json(getUserUsageInfo(user));
  } catch (error) {
    console.error('Usage check error:', error);
    return NextResponse.json({ error: 'خطأ في التحقق' }, { status: 500 });
  }
}
