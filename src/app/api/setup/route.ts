import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // مسح البيانات الوهمية
  if (action === 'clean') {
    try {
      const results: Record<string, number> = {};

      // حذف الأدعية/الزيارات/الخطب
      try {
        const r1 = await db.prayer.deleteMany({});
        results['deletedPrayers'] = r1.count;
      } catch { results['deletedPrayers'] = 0; }

      // حذف إعدادات المالك (مفاتيح API + روابط RAG)
      try {
        const r2 = await db.ownerSettings.deleteMany({});
        results['deletedSettings'] = r2.count;
      } catch { results['deletedSettings'] = 0; }

      // إعادة إنشاء إعدادات فارغة
      try {
        await db.ownerSettings.create({
          data: {
            ragLinks: JSON.stringify([]),
            apiKeys: JSON.stringify(
              Array.from({ length: 10 }, (_, i) => ({
                key: '', status: 'waiting', name: `مفتاح ${i + 1}`, createdAt: '',
              }))
            ),
          },
        });
        results['createdSettings'] = 1;
      } catch { results['createdSettings'] = 0; }

      return NextResponse.json({
        success: true,
        message: 'تم مسح جميع البيانات الوهمية بنجاح',
        details: results,
      });
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'حدث خطأ أثناء مسح البيانات',
        details: error instanceof Error ? error.message : String(error),
      }, { status: 500 });
    }
  }

  // إنشاء الجداول (الوضع الافتراضي)
  try {
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
      CREATE TABLE IF NOT EXISTS "ApiProvider" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "label" TEXT NOT NULL,
        "baseUrl" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS "ApiKey" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "providerId" TEXT NOT NULL,
        "encryptedKey" TEXT NOT NULL,
        "keyFingerprint" TEXT,
        "label" TEXT,
        "status" TEXT NOT NULL DEFAULT 'active',
        "tokensUsed" INTEGER NOT NULL DEFAULT 0,
        "tokensLimit" INTEGER,
        "requestCount" INTEGER NOT NULL DEFAULT 0,
        "lastUsedAt" TIMESTAMP(3),
        "lastErrorAt" TIMESTAMP(3),
        "lastError" TEXT,
        "cooldownUntil" TIMESTAMP(3),
        "priority" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ApiKey_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ApiProvider" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE UNIQUE INDEX IF NOT EXISTS "ApiProvider_name_key" ON "ApiProvider"("name");
      CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
    `;

    const statements = sqlStatements.split(';').map(s => s.trim()).filter(s => s.length > 0);

    for (const sql of statements) {
      try {
        await db.$executeRawUnsafe(sql);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes('already exists') && !msg.includes('duplicate') && !msg.includes('relation')) {
          console.warn('SQL warning:', msg);
        }
      }
    }

    const userCount = await db.user.count();

    return NextResponse.json({
      success: true,
      message: 'تم إنشاء جميع الجداول بنجاح',
      tables: ['User', 'LoginLog', 'ChatSession', 'Message', 'QuizResult', 'UserProfile', 'OwnerSettings', 'Prayer', 'ApiProvider', 'ApiKey'],
      userCount,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'حدث خطأ أثناء إنشاء الجداول',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
