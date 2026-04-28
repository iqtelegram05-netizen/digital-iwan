import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// نقطة نهاية لإنشاء الجداول تلقائياً في قاعدة البيانات
// يُستدعى مرة واحدة فقط بعد ربط قاعدة البيانات
export async function GET() {
  try {
    // إنشاء جميع الجداول إذا لم تكن موجودة
    const sqlStatements = `
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL,
        "name" TEXT,
        "avatar" TEXT,
        "role" TEXT NOT NULL DEFAULT 'user',
        "isBlocked" BOOLEAN NOT NULL DEFAULT false,
        "lastLogin" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS "LoginLog" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "action" TEXT NOT NULL DEFAULT 'login',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "LoginLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
      CREATE TABLE IF NOT EXISTS "ChatSession" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT,
        "title" TEXT,
        "mode" TEXT NOT NULL DEFAULT 'chat',
        "scholar" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
      CREATE TABLE IF NOT EXISTS "Message" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sessionId" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "sources" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Message_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
      CREATE TABLE IF NOT EXISTS "QuizResult" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT,
        "category" TEXT NOT NULL,
        "score" INTEGER NOT NULL,
        "total" INTEGER NOT NULL DEFAULT 100,
        "answers" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "QuizResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
      CREATE TABLE IF NOT EXISTS "UserProfile" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "bio" TEXT,
        "interests" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
      CREATE TABLE IF NOT EXISTS "OwnerSettings" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "ragLinks" TEXT,
        "apiKeys" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS "Prayer" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "subtitle" TEXT,
        "category" TEXT NOT NULL DEFAULT 'دعاء',
        "text" TEXT NOT NULL,
        "isPublished" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
    `;

    // تنفيذ كل أمر SQL منفصل
    const statements = sqlStatements
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const sql of statements) {
      try {
        await db.$executeRawUnsafe(sql);
      } catch (err: unknown) {
        // تجاهل أخطاء "already exists" أو الفهرس الموجود
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes('already exists') && !msg.includes('duplicate') && !msg.includes('relation')) {
          console.warn('SQL warning:', msg);
        }
      }
    }

    // اختبار: قراءة المستخدمين
    const userCount = await db.user.count();

    return NextResponse.json({
      success: true,
      message: 'تم إنشاء جميع الجداول بنجاح',
      tables: ['User', 'LoginLog', 'ChatSession', 'Message', 'QuizResult', 'UserProfile', 'OwnerSettings', 'Prayer'],
      userCount,
    });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'حدث خطأ أثناء إنشاء الجداول',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
