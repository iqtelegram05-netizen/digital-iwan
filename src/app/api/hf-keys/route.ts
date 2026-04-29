import { NextRequest, NextResponse } from 'next/server';
import {
  getHFKeyStats,
  addHFKey,
  bulkAddHFKeys,
  deleteHFKey,
  toggleHFKeyStatus,
  reactivateAllHFKeys,
  getDailyUsageStats,
} from '@/lib/huggingface';

// GET: Get all HF keys stats + daily usage
export async function GET() {
  try {
    const [hfStats, dailyUsage] = await Promise.all([
      getHFKeyStats(),
      getDailyUsageStats(),
    ]);

    return NextResponse.json({
      hf: hfStats,
      dailyUsage,
    });
  } catch (error) {
    console.error('[HF-KEYS GET] Error:', error);
    return NextResponse.json({ error: 'فشل في جلب الإحصائيات' }, { status: 500 });
  }
}

// POST: Add HF key(s)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, token, tokens, label, model } = body;

    switch (action) {
      case 'add': {
        if (!token || typeof token !== 'string' || token.length < 10) {
          return NextResponse.json({ error: 'مفتاح HuggingFace غير صالح (يجب أن يكون 10 أحرف على الأقل)' }, { status: 400 });
        }
        const result = await addHFKey(token.trim(), label, model);
        if (!result) {
          return NextResponse.json({ error: 'فشل في إضافة المفتاح' }, { status: 500 });
        }
        return NextResponse.json({ success: true, key: { id: result.id, fingerprint: result.fingerprint, label: result.label, model: result.model } });
      }

      case 'bulkAdd': {
        if (!Array.isArray(tokens) || tokens.length === 0) {
          return NextResponse.json({ error: 'قائمة المفاتيح مطلوبة' }, { status: 400 });
        }
        const validTokens = tokens.filter((t: string) => typeof t === 'string' && t.trim().length >= 10);
        if (validTokens.length === 0) {
          return NextResponse.json({ error: 'لا توجد مفاتيح صالحة' }, { status: 400 });
        }
        const result = await bulkAddHFKeys(validTokens, model);
        return NextResponse.json({ success: true, added: result.added, errors: result.errors });
      }

      default:
        return NextResponse.json({ error: 'إجراء غير معروف. استخدم: add, bulkAdd' }, { status: 400 });
    }
  } catch (error) {
    console.error('[HF-KEYS POST] Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء المعالجة' }, { status: 500 });
  }
}

// PUT: Toggle status / Reactivate all
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, keyId } = body;

    switch (action) {
      case 'toggle': {
        if (!keyId) {
          return NextResponse.json({ error: 'معرف المفتاح مطلوب' }, { status: 400 });
        }
        const success = await toggleHFKeyStatus(keyId);
        if (!success) {
          return NextResponse.json({ error: 'فشل في تحديث حالة المفتاح' }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }

      case 'reactivateAll': {
        const count = await reactivateAllHFKeys();
        return NextResponse.json({ success: true, reactivated: count });
      }

      case 'updatePriority': {
        const { priority } = body;
        if (!keyId || typeof priority !== 'number') {
          return NextResponse.json({ error: 'معرف المفتاح والأولوية مطلوبان' }, { status: 400 });
        }
        const { db } = await import('@/lib/db');
        await db.huggingFaceKey.update({
          where: { id: keyId },
          data: { priority },
        });
        return NextResponse.json({ success: true });
      }

      case 'updateModel': {
        const { model: newModel } = body;
        if (!keyId || !newModel) {
          return NextResponse.json({ error: 'معرف المفتاح والنموذج مطلوبان' }, { status: 400 });
        }
        const { db } = await import('@/lib/db');
        await db.huggingFaceKey.update({
          where: { id: keyId },
          data: { model: newModel },
        });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'إجراء غير معروف. استخدم: toggle, reactivateAll, updatePriority, updateModel' }, { status: 400 });
    }
  } catch (error) {
    console.error('[HF-KEYS PUT] Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء المعالجة' }, { status: 500 });
  }
}

// DELETE: Remove HF key
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('keyId');

    if (!keyId) {
      return NextResponse.json({ error: 'معرف المفتاح مطلوب' }, { status: 400 });
    }

    const success = await deleteHFKey(keyId);
    if (!success) {
      return NextResponse.json({ error: 'فشل في حذف المفتاح' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[HF-KEYS DELETE] Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء الحذف' }, { status: 500 });
  }
}
