import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ADS_FOR_BONUS, BONUS_MESSAGES } from '../usage/route';

/**
 * GET: Get available ads (for display to users)
 */
export async function GET(request: NextRequest) {
  try {
    const activeAds = await db.ad.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' },
    });

    // Increment impressions for all shown ads
    await db.ad.updateMany({
      where: { isActive: true },
      data: { impressions: { increment: 1 } },
    });

    return NextResponse.json({
      ads: activeAds.map(ad => ({
        id: ad.id,
        title: ad.title,
        imageUrl: ad.imageUrl,
        linkUrl: ad.linkUrl,
        htmlCode: ad.htmlCode,
      })),
      ADS_FOR_BONUS,
      BONUS_MESSAGES,
    });
  } catch (error) {
    console.error('Ads fetch error:', error);
    return NextResponse.json({ ads: [], ADS_FOR_BONUS, BONUS_MESSAGES });
  }
}

/**
 * POST: Record that user watched an ad
 * After every ADS_FOR_BONUS ads, user gets BONUS_MESSAGES
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, adId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    // Increment ad click
    if (adId) {
      await db.ad.update({
        where: { id: adId },
        data: { clicks: { increment: 1 } },
      });
    }

    // Reset daily counter if new day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastAdDate = user.lastAdDate ? new Date(user.lastAdDate) : null;
    const isNewDay = !lastAdDate || lastAdDate < today;

    const todayCount = isNewDay ? 1 : (user.adsWatchedToday || 0) + 1;

    const updateData: any = {
      adsWatchedToday: todayCount,
      adsWatchedTotal: { increment: 1 },
      lastAdDate: new Date(),
    };

    // Check if user earned bonus (every ADS_FOR_BONUS ads)
    let bonusEarned = false;
    const totalBeforeThis = isNewDay ? 0 : (user.adsWatchedToday || 0);
    const newTotal = totalBeforeThis + 1;

    // Use total (not daily) for bonus calculation - more consistent
    const totalWatched = (user.adsWatchedTotal || 0) + 1;
    if (totalWatched % ADS_FOR_BONUS === 0) {
      updateData.bonusMessages = { increment: BONUS_MESSAGES };
      bonusEarned = true;
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      adsWatchedToday: updatedUser.adsWatchedToday,
      adsWatchedTotal: updatedUser.adsWatchedTotal,
      bonusMessages: updatedUser.bonusMessages,
      bonusEarned,
      bonusEarnedAmount: bonusEarned ? BONUS_MESSAGES : 0,
      nextBonusIn: ADS_FOR_BONUS - (totalWatched % ADS_FOR_BONUS),
      message: bonusEarned
        ? `ممتاز! حصلت على ${BONUS_MESSAGES} رسائل إضافية!`
        : `تبقّى ${ADS_FOR_BONUS - (totalWatched % ADS_FOR_BONUS)} إعلانات للحصول على ${BONUS_MESSAGES} رسائل مجانية.`,
    });
  } catch (error) {
    console.error('Ad watch error:', error);
    return NextResponse.json({ error: 'خطأ في تسجيل المشاهدة' }, { status: 500 });
  }
}
