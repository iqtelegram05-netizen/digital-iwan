import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: جلب جميع مصادر مرجع معين أو جميع المصادر
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scholarName = searchParams.get('scholar');

    const whereClause = scholarName
      ? { scholarName, isActive: true }
      : { isActive: true };

    const sources = await db.scholarSource.findMany({
      where: whereClause,
      orderBy: [{ sourceType: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error('Scholar Sources GET Error:', error);
    return NextResponse.json({ error: 'خطأ في جلب المصادر' }, { status: 500 });
  }
}

// POST: إضافة مصدر جديد لمرجع
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scholarName, title, sourceType = 'book', url, description } = body;

    if (!scholarName || !title) {
      return NextResponse.json(
        { error: 'اسم المرجع واسم المصدر مطلوبان' },
        { status: 400 }
      );
    }

    if (sourceType === 'link' && !url) {
      return NextResponse.json(
        { error: 'الرابط مطلوب للمصادر من نوع رابط' },
        { status: 400 }
      );
    }

    const source = await db.scholarSource.create({
      data: {
        scholarName: scholarName.trim(),
        title: title.trim(),
        sourceType,
        url: url?.trim() || null,
        description: description?.trim() || null,
      },
    });

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    console.error('Scholar Sources POST Error:', error);
    return NextResponse.json({ error: 'خطأ في إضافة المصدر' }, { status: 500 });
  }
}

// PUT: تحديث مصدر
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, sourceType, url, description, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف المصدر مطلوب' }, { status: 400 });
    }

    const source = await db.scholarSource.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(sourceType !== undefined && { sourceType }),
        ...(url !== undefined && { url: url?.trim() || null }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ source });
  } catch (error) {
    console.error('Scholar Sources PUT Error:', error);
    return NextResponse.json({ error: 'خطأ في تحديث المصدر' }, { status: 500 });
  }
}

// DELETE: حذف مصدر
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف المصدر مطلوب' }, { status: 400 });
    }

    await db.scholarSource.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Scholar Sources DELETE Error:', error);
    return NextResponse.json({ error: 'خطأ في حذف المصدر' }, { status: 500 });
  }
}
