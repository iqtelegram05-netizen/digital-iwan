import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// نقطة نهاية لمسح البيانات الوهمية باستخدام SQL مباشر
export async function POST() {
  try {
    const results: Record<string, string> = {};

    // 1. حذف جميع الأدعية والزيارات والخطب بالـ SQL المباشر
    try {
      await db.$executeRawUnsafe('DELETE FROM "Prayer"');
      results['prayers'] = 'تم حذف جميع الأدعية والزيارات والخطب';
    } catch (e) {
      console.error('Delete prayers error:', e);
      results['prayers'] = 'خطأ: ' + (e instanceof Error ? e.message : String(e));
    }

    // 2. حذف إعدادات المالك بالـ SQL المباشر
    try {
      await db.$executeRawUnsafe('DELETE FROM "OwnerSettings"');
      results['settings'] = 'تم حذف إعدادات المالك';
    } catch (e) {
      console.error('Delete settings error:', e);
      results['settings'] = 'خطأ: ' + (e instanceof Error ? e.message : String(e));
    }

    // 3. إعادة إنشاء إعدادات فارغة
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
      results['newSettings'] = 'تم إنشاء إعدادات فارغة';
    } catch (e) {
      console.error('Create settings error:', e);
      results['newSettings'] = 'خطأ: ' + (e instanceof Error ? e.message : String(e));
    }

    // 4. التحقق من النتيجة
    try {
      const prayerCount = await db.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "Prayer"') as Array<{ count: number }>;
      const settingsCount = await db.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM "OwnerSettings"') as Array<{ count: number }>;
      results['remainingPrayers'] = String(prayerCount[0]?.count ?? 'غير معروف');
      results['remainingSettings'] = String(settingsCount[0]?.count ?? 'غير معروف');
    } catch (e) {
      results['verification'] = 'خطأ في التحقق';
    }

    return NextResponse.json({
      success: true,
      message: 'تم المسح',
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
