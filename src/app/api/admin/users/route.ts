import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Get all users with login logs summary
export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        loginLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        // Get total unique login count
        const loginCount = await db.loginLog.count({
          where: {
            userId: user.id,
            action: 'login',
          },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          isBlocked: user.isBlocked,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          latestLoginLog: user.loginLogs[0] || null,
          loginCount,
        };
      })
    );

    return NextResponse.json({ users: usersWithStats });
  } catch (error) {
    console.error('Admin Users GET Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب قائمة المستخدمين' },
      { status: 500 }
    );
  }
}

// PUT: Update user (role, block/unblock)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, role, isBlocked } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'معرف المستخدم مطلوب' },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (role !== undefined) {
      if (!['user', 'supervisor', 'owner'].includes(role)) {
        return NextResponse.json(
          { error: 'الدور يجب أن يكون "user" أو "supervisor" أو "owner"' },
          { status: 400 }
        );
      }
      updateData.role = role;
    }

    if (isBlocked !== undefined) {
      updateData.isBlocked = isBlocked;
    }

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
    });

    return NextResponse.json({
      message: 'تم تحديث بيانات المستخدم بنجاح',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isBlocked: user.isBlocked,
      },
    });
  } catch (error) {
    console.error('Admin Users PUT Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحديث بيانات المستخدم' },
      { status: 500 }
    );
  }
}

// POST: Block user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'معرف المستخدم مطلوب' },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    if (existing.isBlocked) {
      return NextResponse.json(
        { error: 'المستخدم محظور بالفعل' },
        { status: 400 }
      );
    }

    const user = await db.user.update({
      where: { id: userId },
      data: { isBlocked: true },
    });

    return NextResponse.json({
      message: 'تم حظر المستخدم بنجاح',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isBlocked: user.isBlocked,
      },
    });
  } catch (error) {
    console.error('Admin Users POST (Block) Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء حظر المستخدم' },
      { status: 500 }
    );
  }
}

// DELETE: Unblock user
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'معرف المستخدم مطلوب' },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return NextResponse.json(
        { error: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    if (!existing.isBlocked) {
      return NextResponse.json(
        { error: 'المستخدم غير محظور' },
        { status: 400 }
      );
    }

    const user = await db.user.update({
      where: { id: userId },
      data: { isBlocked: false },
    });

    return NextResponse.json({
      message: 'تم إلغاء حظر المستخدم بنجاح',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isBlocked: user.isBlocked,
      },
    });
  } catch (error) {
    console.error('Admin Users DELETE (Unblock) Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إلغاء حظر المستخدم' },
      { status: 500 }
    );
  }
}
