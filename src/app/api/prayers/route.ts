import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Get all published prayers, optionally filtered by category
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const where: Record<string, unknown> = { isPublished: true };
    if (category && (category === 'دعاء' || category === 'زيارة')) {
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
      { error: 'حدث خطأ أثناء جلب الأدعية والزيارات' },
      { status: 500 }
    );
  }
}

// POST: Create a new prayer
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

    if (category && category !== 'دعاء' && category !== 'زيارة') {
      return NextResponse.json(
        { error: 'الفئة يجب أن تكون "دعاء" أو "زيارة"' },
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
      { message: 'تم إضافة الدعاء بنجاح', prayer },
      { status: 201 }
    );
  } catch (error) {
    console.error('Prayers POST Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إضافة الدعاء' },
      { status: 500 }
    );
  }
}

// PUT: Update a prayer
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, subtitle, category, text, isPublished } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'معرف الدعاء مطلوب' },
        { status: 400 }
      );
    }

    const existing = await db.prayer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'الدعاء غير موجود' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (subtitle !== undefined) updateData.subtitle = subtitle;
    if (category !== undefined) {
      if (category !== 'دعاء' && category !== 'زيارة') {
        return NextResponse.json(
          { error: 'الفئة يجب أن تكون "دعاء" أو "زيارة"' },
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
      message: 'تم تحديث الدعاء بنجاح',
      prayer,
    });
  } catch (error) {
    console.error('Prayers PUT Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحديث الدعاء' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a prayer
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'معرف الدعاء مطلوب' },
        { status: 400 }
      );
    }

    const existing = await db.prayer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'الدعاء غير موجود' },
        { status: 404 }
      );
    }

    await db.prayer.delete({ where: { id } });

    return NextResponse.json({ message: 'تم حذف الدعاء بنجاح' });
  } catch (error) {
    console.error('Prayers DELETE Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حذف الدعاء' },
      { status: 500 }
    );
  }
}
