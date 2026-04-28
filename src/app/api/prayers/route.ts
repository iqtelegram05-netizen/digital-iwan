import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

const VALID_CATEGORIES = ['دعاء', 'زيارة', 'خطب'];

// GET: Get all published prayers, optionally filtered by category
// Pass ?all=true to get all prayers including drafts (for admin panel)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const all = searchParams.get('all') === 'true';

    const where: Record<string, unknown> = {};
    if (!all) {
      where.isPublished = true;
    }
    if (category && VALID_CATEGORIES.includes(category)) {
      where.category = category;
    }

    const prayers = await db.prayer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ prayers });
  } catch (error) {
    console.error('Prayers GET Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب البيانات' },
      { status: 500 }
    );
  }
}

// POST: Create a new prayer/sermon
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, subtitle, category, text } = body;

    if (!title || !text) {
      return NextResponse.json(
        { error: 'العنوان والنص مطلوبان' },
        { status: 400 }
      );
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `الفئة يجب أن تكون إحدى: ${VALID_CATEGORIES.join('، ')}` },
        { status: 400 }
      );
    }

    const prayer = await db.prayer.create({
      data: {
        title,
        subtitle: subtitle || null,
        category: category || 'دعاء',
        text,
        isPublished: true,
      },
    });

    return NextResponse.json(
      { message: 'تم الإضافة بنجاح', prayer },
      { status: 201 }
    );
  } catch (error) {
    console.error('Prayers POST Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء الإضافة' },
      { status: 500 }
    );
  }
}

// PUT: Update a prayer/sermon
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, subtitle, category, text, isPublished } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'المعرف مطلوب' },
        { status: 400 }
      );
    }

    const existing = await db.prayer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'غير موجود' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (subtitle !== undefined) updateData.subtitle = subtitle;
    if (category !== undefined) {
      if (!VALID_CATEGORIES.includes(category)) {
        return NextResponse.json(
          { error: `الفئة يجب أن تكون إحدى: ${VALID_CATEGORIES.join('، ')}` },
          { status: 400 }
        );
      }
      updateData.category = category;
    }
    if (text !== undefined) updateData.text = text;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    const prayer = await db.prayer.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      message: 'تم التحديث بنجاح',
      prayer,
    });
  } catch (error) {
    console.error('Prayers PUT Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء التحديث' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a prayer/sermon
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'المعرف مطلوب' },
        { status: 400 }
      );
    }

    const existing = await db.prayer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'غير موجود' },
        { status: 404 }
      );
    }

    await db.prayer.delete({ where: { id } });

    return NextResponse.json({ message: 'تم الحذف بنجاح' });
  } catch (error) {
    console.error('Prayers DELETE Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء الحذف' },
      { status: 500 }
    );
  }
}
