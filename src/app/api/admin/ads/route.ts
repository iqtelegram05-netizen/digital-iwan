import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET: List all ads (including inactive) for admin management
 */
export async function GET() {
  try {
    const ads = await db.ad.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      ads: ads.map(ad => ({
        id: ad.id,
        title: ad.title,
        imageUrl: ad.imageUrl,
        linkUrl: ad.linkUrl,
        htmlCode: ad.htmlCode,
        isActive: ad.isActive,
        priority: ad.priority,
        impressions: ad.impressions,
        clicks: ad.clicks,
        createdAt: ad.createdAt,
      })),
    });
  } catch (error) {
    console.error('Admin ads fetch error:', error);
    return NextResponse.json({ ads: [] });
  }
}

/**
 * POST: Create new ad
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, imageUrl, linkUrl, priority } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'عنوان الإعلان مطلوب' }, { status: 400 });
    }

    const ad = await db.ad.create({
      data: {
        title: title.trim(),
        imageUrl: imageUrl?.trim() || null,
        linkUrl: linkUrl?.trim() || null,
        priority: typeof priority === 'number' ? priority : 0,
        isActive: true,
      },
    });

    return NextResponse.json({ ad });
  } catch (error) {
    console.error('Admin ad create error:', error);
    return NextResponse.json({ error: 'خطأ في إنشاء الإعلان' }, { status: 500 });
  }
}

/**
 * PUT: Toggle ad active status
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف الإعلان مطلوب' }, { status: 400 });
    }

    const ad = await db.ad.update({
      where: { id },
      data: { isActive: typeof isActive === 'boolean' ? isActive : true },
    });

    return NextResponse.json({ ad });
  } catch (error) {
    console.error('Admin ad update error:', error);
    return NextResponse.json({ error: 'خطأ في تحديث الإعلان' }, { status: 500 });
  }
}

/**
 * DELETE: Delete ad
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف الإعلان مطلوب' }, { status: 400 });
    }

    await db.ad.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin ad delete error:', error);
    return NextResponse.json({ error: 'خطأ في حذف الإعلان' }, { status: 500 });
  }
}
