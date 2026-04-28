import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface ApiKeySlot {
  key: string;
  status: string; // "active", "waiting", "consumed"
  name: string;
  createdAt: string;
}

// Helper: generate 10 default empty key slots
function getDefaultApiKeys(): ApiKeySlot[] {
  return Array.from({ length: 10 }, (_, i) => ({
    key: '',
    status: 'waiting',
    name: `مفتاح ${i + 1}`,
    createdAt: '',
  }));
}

// Helper: ensure settings exist, initialize with 10 empty slots if needed
async function ensureSettings() {
  let settings = await db.ownerSettings.findFirst();

  if (!settings) {
    settings = await db.ownerSettings.create({
      data: {
        ragLinks: JSON.stringify([]),
        apiKeys: JSON.stringify(getDefaultApiKeys()),
      },
    });
    return settings;
  }

  // Ensure apiKeys has exactly 10 slots
  const currentKeys: ApiKeySlot[] = JSON.parse(settings.apiKeys || '[]');
  if (currentKeys.length !== 10) {
    const defaultKeys = getDefaultApiKeys();
    // Preserve any existing keys in their slots
    for (let i = 0; i < Math.min(currentKeys.length, 10); i++) {
      defaultKeys[i] = currentKeys[i];
    }
    settings = await db.ownerSettings.update({
      where: { id: settings.id },
      data: { apiKeys: JSON.stringify(defaultKeys) },
    });
  }

  return settings;
}

// GET: Retrieve owner settings including 10 API key slots
export async function GET() {
  try {
    const settings = await ensureSettings();

    const ragLinks: string[] = JSON.parse(settings.ragLinks || '[]');
    const apiKeys: ApiKeySlot[] = JSON.parse(settings.apiKeys || '[]');

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

// PUT: Update RAG links
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ragLinks } = body;

    if (ragLinks !== undefined) {
      if (!Array.isArray(ragLinks)) {
        return NextResponse.json(
          { error: 'روابط قاعدة المعرفة يجب أن تكون مصفوفة' },
          { status: 400 }
        );
      }

      const settings = await ensureSettings();
      const updatedSettings = await db.ownerSettings.update({
        where: { id: settings.id },
        data: { ragLinks: JSON.stringify(ragLinks) },
      });

      const updatedRagLinks: string[] = JSON.parse(updatedSettings.ragLinks || '[]');
      const apiKeys: ApiKeySlot[] = JSON.parse(updatedSettings.apiKeys || '[]');

      return NextResponse.json({
        message: 'تم تحديث روابط قاعدة المعرفة بنجاح',
        ragLinks: updatedRagLinks,
        apiKeys,
        stats: {
          totalApiKeys: apiKeys.length,
          activeKeys: apiKeys.filter((k) => k.status === 'active').length,
          waitingKeys: apiKeys.filter((k) => k.status === 'waiting').length,
          consumedKeys: apiKeys.filter((k) => k.status === 'consumed').length,
          totalRagLinks: updatedRagLinks.length,
        },
      });
    }

    return NextResponse.json(
      { error: 'البيانات المطلوبة غير موجودة' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin PUT Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تحديث الإعدادات' },
      { status: 500 }
    );
  }
}

// POST: Actions - addKey, swapKey, removeLink
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'الإجراء مطلوب' },
        { status: 400 }
      );
    }

    const settings = await ensureSettings();

    // Action: addKey - add a key to a specific slot
    if (action === 'addKey') {
      const { key, name, slotIndex } = body;

      if (key === undefined || slotIndex === undefined) {
        return NextResponse.json(
          { error: 'المفتاح ورقم الفتحة مطلوبان' },
          { status: 400 }
        );
      }

      if (slotIndex < 0 || slotIndex >= 10) {
        return NextResponse.json(
          { error: 'رقم الفتحة يجب أن يكون بين 0 و 9' },
          { status: 400 }
        );
      }

      const apiKeys: ApiKeySlot[] = JSON.parse(settings.apiKeys || '[]');

      // Determine status: if this is the first key being set, make it active
      const hasActiveKey = apiKeys.some((k) => k.status === 'active' && k.key !== '');
      const status = hasActiveKey ? 'waiting' : 'active';

      apiKeys[slotIndex] = {
        key: key as string,
        status,
        name: (name as string) || `مفتاح ${slotIndex + 1}`,
        createdAt: new Date().toISOString(),
      };

      await db.ownerSettings.update({
        where: { id: settings.id },
        data: { apiKeys: JSON.stringify(apiKeys) },
      });

      return NextResponse.json({
        message: 'تم إضافة المفتاح بنجاح',
        apiKeys,
      });
    }

    // Action: swapKey - replace key in a specific slot
    if (action === 'swapKey') {
      const { slotIndex, newKey, newName } = body;

      if (slotIndex === undefined || newKey === undefined) {
        return NextResponse.json(
          { error: 'رقم الفتحة والمفتاح الجديد مطلوبان' },
          { status: 400 }
        );
      }

      if (slotIndex < 0 || slotIndex >= 10) {
        return NextResponse.json(
          { error: 'رقم الفتحة يجب أن يكون بين 0 و 9' },
          { status: 400 }
        );
      }

      const apiKeys: ApiKeySlot[] = JSON.parse(settings.apiKeys || '[]');
      const oldSlot = apiKeys[slotIndex];

      // Preserve the old status or set to waiting
      const status = oldSlot && oldSlot.key ? oldSlot.status : 'waiting';

      apiKeys[slotIndex] = {
        key: newKey as string,
        status,
        name: (newName as string) || oldSlot?.name || `مفتاح ${slotIndex + 1}`,
        createdAt: oldSlot?.createdAt || new Date().toISOString(),
      };

      await db.ownerSettings.update({
        where: { id: settings.id },
        data: { apiKeys: JSON.stringify(apiKeys) },
      });

      return NextResponse.json({
        message: 'تم استبدال المفتاح بنجاح',
        apiKeys,
      });
    }

    // Action: removeLink - remove a RAG link
    if (action === 'removeLink') {
      const { url } = body;

      if (!url) {
        return NextResponse.json(
          { error: 'رابط قاعدة المعرفة مطلوب' },
          { status: 400 }
        );
      }

      const ragLinks: string[] = JSON.parse(settings.ragLinks || '[]');
      const filteredLinks = ragLinks.filter((link) => link !== url);

      if (filteredLinks.length === ragLinks.length) {
        return NextResponse.json(
          { error: 'الرابط غير موجود في قاعدة المعرفة' },
          { status: 404 }
        );
      }

      await db.ownerSettings.update({
        where: { id: settings.id },
        data: { ragLinks: JSON.stringify(filteredLinks) },
      });

      return NextResponse.json({
        message: 'تم حذف رابط قاعدة المعرفة بنجاح',
        ragLinks: filteredLinks,
      });
    }

    // Action: consumeKey - mark current active key as consumed and switch to next waiting
    if (action === 'consumeKey') {
      const apiKeys: ApiKeySlot[] = JSON.parse(settings.apiKeys || '[]');

      // Find current active key and mark as consumed
      let switched = false;
      for (let i = 0; i < apiKeys.length; i++) {
        if (apiKeys[i].status === 'active' && apiKeys[i].key !== '') {
          apiKeys[i].status = 'consumed';
          // Find next waiting key with a value
          for (let j = 0; j < apiKeys.length; j++) {
            if (apiKeys[j].status === 'waiting' && apiKeys[j].key !== '') {
              apiKeys[j].status = 'active';
              switched = true;
              break;
            }
          }
          break;
        }
      }

      if (!switched) {
        // Check if there's no active key but there are waiting keys
        const hasActive = apiKeys.some((k) => k.status === 'active' && k.key !== '');
        if (!hasActive) {
          for (let j = 0; j < apiKeys.length; j++) {
            if (apiKeys[j].status === 'waiting' && apiKeys[j].key !== '') {
              apiKeys[j].status = 'active';
              break;
            }
          }
        }
      }

      await db.ownerSettings.update({
        where: { id: settings.id },
        data: { apiKeys: JSON.stringify(apiKeys) },
      });

      return NextResponse.json({
        message: 'تم تحديث حالة المفاتيح',
        apiKeys,
      });
    }

    return NextResponse.json(
      { error: 'إجراء غير معروف. الإجراءات المتاحة: addKey, swapKey, removeLink, consumeKey' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin POST Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تنفيذ العملية' },
      { status: 500 }
    );
  }
}
