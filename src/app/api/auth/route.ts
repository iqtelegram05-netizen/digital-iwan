import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// بريد المالك - يُعيّن تلقائياً كمالك عند تسجيل الدخول
const OWNER_EMAILS = ['iqtelegram05@gmail.com'];

// POST: Login (Google or manual) or Logout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, avatar, action } = body;

    // Logout action
    if (action === 'logout') {
      const userId = body.userId;
      if (!userId) {
        return NextResponse.json(
          { error: 'معرف المستخدم مطلوب لتسجيل الخروج' },
          { status: 400 }
        );
      }

      const user = await db.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json(
          { error: 'المستخدم غير موجود' },
          { status: 404 }
        );
      }

      await db.loginLog.create({
        data: {
          userId: user.id,
          email: user.email,
          action: 'logout',
        },
      });

      return NextResponse.json({ message: 'تم تسجيل الخروج بنجاح' });
    }

    if (!email) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني مطلوب' },
        { status: 400 }
      );
    }

    // Login action - create user if not exists
    let user = await db.user.findUnique({ where: { email } });
    const isOwner = OWNER_EMAILS.includes(email);

    if (!user) {
      // Create new user
      user = await db.user.create({
        data: {
          email,
          name: name || null,
          avatar: avatar || null,
          lastLogin: new Date(),
          role: isOwner ? 'owner' : 'user',
        },
      });
    } else {
      // Update last login and info
      const updateData: Record<string, unknown> = {
        lastLogin: new Date(),
        ...(name ? { name } : {}),
        ...(avatar ? { avatar } : {}),
      };
      if (isOwner) updateData.role = 'owner';
      user = await db.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }

    // Create login log
    await db.loginLog.create({
      data: {
        userId: user.id,
        email: user.email,
        action: 'login',
      },
    });

    // Check if user is blocked
    if (user.isBlocked) {
      return NextResponse.json(
        { error: 'حسابك محظور. يرجى التواصل مع الإدارة.', isBlocked: true },
        { status: 403 }
      );
    }

    return NextResponse.json({
      message: 'تم تسجيل الدخول بنجاح',
      token: user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        isBlocked: user.isBlocked,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('Auth POST Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تسجيل الدخول' },
      { status: 500 }
    );
  }
}

// GET: Check auth status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    let user = null;

    // البحث بالمعرّف أولاً، ثم بالبريد
    if (userId) {
      user = await db.user.findUnique({ where: { id: userId } });
    }
    if (!user && email) {
      user = await db.user.findUnique({ where: { email } });
    }
    if (!user) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // تحديث دور المالك تلقائياً
    const isOwner = OWNER_EMAILS.includes(user.email);
    if (isOwner && user.role !== 'owner') {
      await db.user.update({
        where: { id: user.id },
        data: { role: 'owner' },
      });
      user.role = 'owner';
    }

    if (user.isBlocked) {
      return NextResponse.json(
        { error: 'حسابك محظور. يرجى التواصل مع الإدارة.', isBlocked: true },
        { status: 403 }
      );
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        isBlocked: user.isBlocked,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error) {
    console.error('Auth GET Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء التحقق من حالة المستخدم' },
      { status: 500 }
    );
  }
}
