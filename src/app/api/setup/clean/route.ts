import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// نقطة نهاية تشخيصية لمسح البيانات مع تفاصيل كاملة
export async function POST() {
  const details: Record<string, string> = {};

  try {
    // ===== الخطوة 1: فحص ما موجود في قاعدة البيانات قبل الحذف =====
    try {
      const prayerCount = await db.$queryRawUnsafe<{ count: bigint }[]>('SELECT COUNT(*) as count FROM "Prayer"');
      details['prayersBefore'] = String(prayerCount[0].count);
    } catch (e) {
      details['prayersBefore'] = 'خطأ: ' + String(e);
    }

    try {
      const settingsRows = await db.$queryRawUnsafe<{ id: string; apikeys: string }[]>('SELECT id, "apiKeys" FROM "OwnerSettings" LIMIT 5');
      details['settingsBefore'] = String(settingsRows.length) + ' سجل';
      if (settingsRows.length > 0) {
        details['settingsData'] = settingsRows[0].apikeys?.substring(0, 200) || 'فارغ';
      }
    } catch (e) {
      details['settingsBefore'] = 'خطأ: ' + String(e);
    }

    // عرض عناوين الخطب الموجودة فعلاً
    try {
      const prayerList = await db.$queryRawUnsafe<{ title: string; category: string }[]>('SELECT title, category FROM "Prayer" LIMIT 20');
      details['prayerTitles'] = prayerList.length > 0 ? JSON.stringify(prayerList) : 'لا يوجد شيء';
    } catch (e) {
      details['prayerTitles'] = 'خطأ: ' + String(e);
    }

    // ===== الخطوة 2: حذف الأدعية/الخطب =====
    try {
      const r = await db.prayer.deleteMany({});
      details['prayersDeletedORM'] = String(r.count);
    } catch (e) {
      details['prayersDeletedORM'] = 'خطأ ORM: ' + String(e);
      // محاولة بـ SQL مباشر
      try {
        const raw = await db.$executeRawUnsafe('DELETE FROM "Prayer"');
        details['prayersDeletedSQL'] = 'تم الحذف بـ SQL';
      } catch (e2) {
        details['prayersDeletedSQL'] = 'خطأ SQL: ' + String(e2);
      }
    }

    // ===== الخطوة 3: حذف إعدادات المالك =====
    try {
      const r = await db.ownerSettings.deleteMany({});
      details['settingsDeletedORM'] = String(r.count);
    } catch (e) {
      details['settingsDeletedORM'] = 'خطأ ORM: ' + String(e);
      try {
        await db.$executeRawUnsafe('DELETE FROM "OwnerSettings"');
        details['settingsDeletedSQL'] = 'تم الحذف بـ SQL';
      } catch (e2) {
        details['settingsDeletedSQL'] = 'خطأ SQL: ' + String(e2);
      }
    }

    // ===== الخطوة 4: التحقق بعد الحذف =====
    try {
      const after = await db.$queryRawUnsafe<{ count: bigint }[]>('SELECT COUNT(*) as count FROM "Prayer"');
      details['prayersAfter'] = String(after[0].count);
    } catch (e) {
      details['prayersAfter'] = 'خطأ: ' + String(e);
    }

    try {
      const after2 = await db.$queryRawUnsafe<{ count: bigint }[]>('SELECT COUNT(*) as count FROM "OwnerSettings"');
      details['settingsAfter'] = String(after2[0].count);
    } catch (e) {
      details['settingsAfter'] = 'خطأ: ' + String(e);
    }

    // ===== الخطوة 5: إنشاء إعدادات فارغة =====
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
      details['newSettings'] = 'تم إنشاء 10 خانات فارغة';
    } catch (e) {
      details['newSettings'] = 'خطأ: ' + String(e);
    }

    return NextResponse.json({ success: true, details });
  } catch (error) {
    return NextResponse.json(
      { success: false, details: { error: String(error) } },
      { status: 500 }
    );
  }
}
