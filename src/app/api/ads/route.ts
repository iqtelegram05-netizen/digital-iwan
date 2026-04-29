import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ADS_FOR_BONUS, BONUS_MESSAGES } from '@/lib/usageLimit';

/**
 * GET: Get available ads
 */
export async function GET() {
  try {
    let activeAds = [];
    try {
      activeAds = await db.ad.findMany({
        where: { isActive: true },
        orderBy: { priority: 'desc' },
      });
      // Increment impressions
      if (activeAds.length > 0) {
        await db.ad.updateMany({
          where: { isActive: true },
          data: { impressions: { increment: 1 } },
        }).catch(() => {});
      }
    } catch {
      // Table might not exist yet - return empty
    }

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

    // Record ad click
    if (adId) {
      try {
        await db.ad.update({
          where: { id: adId },
          data: { clicks: { increment: 1 } },
        }).catch(() => {});
      } catch {
        // Ad table might not exist
      }
    }

    // Update user ad stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastAdDate = user.lastAdDate ? new Date(user.lastAdDate) : null;
    const isNewDay = !lastAdDate || lastAdDate < today;
    const todayCount = isNewDay ? 1 : (user.adsWatchedToday || 0) + 1;

    const totalWatched = (user.adsWatchedTotal || 0) + 1;
    const bonusEarned = totalWatched % ADS_FOR_BONUS === 0;

    const updateData: any = {
      adsWatchedToday: todayCount,
      adsWatchedTotal: { increment: 1 },
      lastAdDate: new Date(),
    };

    if (bonusEarned) {
      updateData.bonusMessages = { increment: BONUS_MESSAGES };
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
