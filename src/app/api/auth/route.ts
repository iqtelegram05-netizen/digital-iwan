import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST: Login or Logout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, userId, action } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني مطلوب' },
        { status: 400 }
      );
    }

    // Logout action
    if (action === 'logout') {
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

    // Login action - create user if not exists
    let user = await db.user.findUnique({ where: { email } });

    if (!user) {
      // Create new user
      user = await db.user.create({
        data: {
          email,
          name: name || null,
          lastLogin: new Date(),
        },
      });
    } else {
      // Update last login
      user = await db.user.update({
        where: { id: user.id },
        data: {
          lastLogin: new Date(),
          ...(name ? { name } : {}),
        },
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

    if (!userId) {
      return NextResponse.json(
        { error: 'معرف المستخدم مطلوب' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
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
