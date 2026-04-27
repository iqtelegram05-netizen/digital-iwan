import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface OwnerSettingsUpdate {
  ragLinks?: string[];
  apiKeys?: Array<{ key: string; status: string; name: string }>;
}

// GET: Retrieve owner settings
export async function GET() {
  try {
    let settings = await db.ownerSettings.findFirst();

    // Create default settings if none exist
    if (!settings) {
      settings = await db.ownerSettings.create({
        data: {
          ragLinks: JSON.stringify([]),
          apiKeys: JSON.stringify([]),
        },
      });
    }

    const ragLinks: string[] = JSON.parse(settings.ragLinks || '[]');
    const apiKeys: Array<{ key: string; status: string; name: string }> = JSON.parse(settings.apiKeys || '[]');

    return NextResponse.json({
      ragLinks,
      apiKeys,
      stats: {
        totalApiKeys: apiKeys.length,
        activeKeys: apiKeys.filter((k) => k.status === 'active').length,
        waitingKeys: apiKeys.filter((k) => k.status === 'waiting').length,
        consumedKeys: apiKeys.filter((k) => k.status === 'consumed').length,
        totalRagLinks: ragLinks.length,
      },
    });
  } catch (error) {
    console.error('Admin GET Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب الإعدادات' },
      { status: 500 }
    );
  }
}

// PUT: Update owner settings
export async function PUT(request: NextRequest) {
  try {
    const body: OwnerSettingsUpdate = await request.json();

    let settings = await db.ownerSettings.findFirst();

    if (!settings) {
      settings = await db.ownerSettings.create({
        data: {
          ragLinks: JSON.stringify([]),
          apiKeys: JSON.stringify([]),
        },
      });
    }

    const currentRagLinks: string[] = JSON.parse(settings.ragLinks || '[]');
    const currentApiKeys: Array<{ key: string; status: string; name: string }> = JSON.parse(settings.apiKeys || '[]');

    const updateData: Record<string, string> = {};

    if (body.ragLinks !== undefined) {
      updateData.ragLinks = JSON.stringify(body.ragLinks);
    }

    if (body.apiKeys !== undefined) {
      updateData.apiKeys = JSON.stringify(body.apiKeys);
    }

    const updatedSettings = await db.ownerSettings.update({
      where: { id: settings.id },
      data: updateData,
    });

    const ragLinks: string[] = JSON.parse(updatedSettings.ragLinks || '[]');
    const apiKeys: Array<{ key: string; status: string; name: string }> = JSON.parse(updatedSettings.apiKeys || '[]');

    return NextResponse.json({
      message: 'تم تحديث الإعدادات بنجاح',
      ragLinks,
      apiKeys,
      stats: {
        totalApiKeys: apiKeys.length,
        activeKeys: apiKeys.filter((k) => k.status === 'active').length,
        waitingKeys: apiKeys.filter((k) => k.status === 'waiting').length,
        consumedKeys: apiKeys.filter((k) => k.status === 'consumed').length,
        totalRagLinks: ragLinks.length,
      },
    });
  } catch (error) {
    console.error('Admin PUT Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحديث الإعدادات' },
      { status: 500 }
    );
  }
}

// POST: Add new API key or RAG link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body; // type: "api_key" | "rag_link"

    if (!type || !data) {
      return NextResponse.json(
        { error: 'نوع البيانات والبيانات مطلوبان' },
        { status: 400 }
      );
    }

    let settings = await db.ownerSettings.findFirst();

    if (!settings) {
      settings = await db.ownerSettings.create({
        data: {
          ragLinks: JSON.stringify([]),
          apiKeys: JSON.stringify([]),
        },
      });
    }

    if (type === 'api_key') {
      const currentApiKeys: Array<{ key: string; status: string; name: string }> = JSON.parse(settings.apiKeys || '[]');
      currentApiKeys.push({
        key: data.key || `key_${Date.now()}`,
        status: data.status || 'waiting',
        name: data.name || 'مفتاح جديد',
      });
      await db.ownerSettings.update({
        where: { id: settings.id },
        data: { apiKeys: JSON.stringify(currentApiKeys) },
      });
      return NextResponse.json({ message: 'تم إضافة مفتاح API بنجاح' });
    }

    if (type === 'rag_link') {
      const currentRagLinks: string[] = JSON.parse(settings.ragLinks || '[]');
      currentRagLinks.push(data.url || data);
      await db.ownerSettings.update({
        where: { id: settings.id },
        data: { ragLinks: JSON.stringify(currentRagLinks) },
      });
      return NextResponse.json({ message: 'تم إضافة رابط قاعدة المعرفة بنجاح' });
    }

    return NextResponse.json(
      { error: 'نوع غير صالح. الأنواع المتاحة: api_key, rag_link' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin POST Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء إضافة البيانات' },
      { status: 500 }
    );
  }
}
