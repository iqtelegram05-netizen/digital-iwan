import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserUsageInfo } from '@/lib/usageLimit';

/**
 * Check user's remaining messages and subscription status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    return NextResponse.json(getUserUsageInfo(user));
  } catch (error) {
    console.error('Usage check error:', error);
    return NextResponse.json({ error: 'خطأ في التحقق' }, { status: 500 });
  }
}
