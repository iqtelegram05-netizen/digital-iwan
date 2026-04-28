import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// نقطة نهاية لمسح البيانات الوهمية (مفاتيح API + الأدعية/الخطب/الزيارات)
export async function GET() {
  try {
    const results: Record<string, number> = {};

    // 1. حذف جميع الأدعية والزيارات والخطب
    try {
      const deletePrayers = await db.prayer.deleteMany({});
      results['deletedPrayers'] = deletePrayers.count;
    } catch (e) {
      console.warn('Delete prayers warning:', e);
      results['deletedPrayers'] = 0;
    }

    // 2. حذف إعدادات المالك (مفاتيح API وروابط RAG)
    try {
      const deleteSettings = await db.ownerSettings.deleteMany({});
      results['deletedSettings'] = deleteSettings.count;
    } catch (e) {
      console.warn('Delete settings warning:', e);
      results['deletedSettings'] = 0;
    }

    // 3. إعادة إنشاء إعدادات المالك فارغة
    try {
      await db.ownerSettings.create({
        data: {
          ragLinks: JSON.stringify([]),
          apiKeys: JSON.stringify(
            Array.from({ length: 10 }, (_, i) => ({
              key: '',
              status: 'waiting',
              name: `مفتاح ${i + 1}`,
              createdAt: '',
            }))
          ),
        },
      });
      results['createdSettings'] = 1;
    } catch (e) {
      console.warn('Create settings warning:', e);
      results['createdSettings'] = 0;
    }

    return NextResponse.json({
      success: true,
      message: 'تم مسح جميع البيانات الوهمية بنجاح',
      details: results,
    });
  } catch (error) {
    console.error('Clean error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء مسح البيانات',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
