import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { encrypt, fingerprint } from '@/lib/crypto';
import { getKeyStats } from '@/lib/loadBalancer';

// Catch unhandled errors to prevent process crash
if (typeof process !== 'undefined') {
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION:', reason);
  });
}

// ========== PROVIDER MANAGEMENT ==========

// GET: Get all providers and keys with stats
export async function GET() {
  try {
    const stats = await getKeyStats();
    if (!stats) {
      return NextResponse.json({ error: 'فشل في جلب البيانات' }, { status: 500 });
    }
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Keys GET Error:', error);
    return NextResponse.json({ error: 'خطأ في جلب البيانات' }, { status: 500 });
  }
}

// ========== ADD KEYS ==========

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'addProvider') {
      const { name, label, baseUrl } = body;
      if (!name || !label) {
        return NextResponse.json({ error: 'اسم المزود والتسمية مطلوبان' }, { status: 400 });
      }

      const existing = await db.apiProvider.findUnique({ where: { name } });
      if (existing) {
        return NextResponse.json({ error: 'هذا المزود موجود بالفعل' }, { status: 409 });
      }

      const provider = await db.apiProvider.create({
        data: { name, label, baseUrl: baseUrl || null },
      });

      return NextResponse.json({ message: 'تم إضافة المزود بنجاح', provider }, { status: 201 });
    }

    if (action === 'addKeys') {
      const { providerId, keys, status = 'active' } = body;
      if (!providerId || !keys || !Array.isArray(keys) || keys.length === 0) {
        return NextResponse.json({ error: 'معرف المزود والمفاتيح مطلوبة' }, { status: 400 });
      }

      const provider = await db.apiProvider.findUnique({ where: { id: providerId } });
      if (!provider) {
        return NextResponse.json({ error: 'المزود غير موجود' }, { status: 404 });
      }

      const created = [];
      for (const keyData of keys) {
        const rawKey = typeof keyData === 'string' ? keyData : keyData.key;
        if (!rawKey || !rawKey.trim()) continue;

        const trimmed = rawKey.trim();
        const fp = fingerprint(trimmed);
        const lbl = typeof keyData === 'object' ? keyData.label : null;

        // Skip duplicates by fingerprint
        const existing = await db.apiKey.findFirst({
          where: { providerId, keyFingerprint: fp },
        });
        if (existing) continue;

        const createdKey = await db.apiKey.create({
          data: {
            providerId,
            encryptedKey: encrypt(trimmed),
            keyFingerprint: fp,
            label: lbl || null,
            status,
          },
        });
        created.push(createdKey);
      }

      const stats = await getKeyStats();
      return NextResponse.json({
        message: `تم إضافة ${created.length} مفتاح بنجاح`,
        added: created.length,
        skipped: keys.length - created.length,
        stats,
      });
    }

    if (action === 'bulkAdd') {
      // Bulk paste: detect provider automatically and add all keys
      const { text } = body;
      if (!text || typeof text !== 'string') {
        return NextResponse.json({ error: 'النص مطلوب' }, { status: 400 });
      }

      // Split by newlines, commas, spaces, or semicolons
      const rawKeys = text
        .split(/[\n,;\s]+/)
        .map(k => k.trim())
        .filter(k => k.length > 10);

      if (rawKeys.length === 0) {
        return NextResponse.json({ error: 'لم يتم العثور على مفاتيح صالحة' }, { status: 400 });
      }

      // Auto-detect provider and create keys inline
      const results: Record<string, number> = { added: 0, skipped: 0 };

      for (const rawKey of rawKeys) {
        try {
          let providerName = 'generic';
          let providerLabel = 'عام (آخر)';
          let providerBaseUrl: string | null = null;

          // Detect provider from key pattern
          if (/^AIza[0-9A-Za-z_-]{30,}$/.test(rawKey)) {
            providerName = 'gemini'; providerLabel = 'Google Gemini';
          } else if (/^gsk_[a-zA-Z0-9]{30,}$/.test(rawKey)) {
            providerName = 'groq'; providerLabel = 'Groq';
          } else if (/^sk-proj-[a-zA-Z0-9_-]{30,}$/.test(rawKey)) {
            providerName = 'openai'; providerLabel = 'OpenAI';
          } else if (/^sk-or-v1-[a-zA-Z0-9_-]{30,}$/.test(rawKey)) {
            providerName = 'openrouter'; providerLabel = 'OpenRouter';
          } else if (/^sk-[a-zA-Z0-9]{30,}$/.test(rawKey)) {
            providerName = 'deepseek'; providerLabel = 'DeepSeek';
          }

          // Ensure provider exists
          let provider = await db.apiProvider.upsert({
            where: { name: providerName },
            update: {},
            create: { name: providerName, label: providerLabel, baseUrl: providerBaseUrl },
          });

          // Check duplicate
          const fp = fingerprint(rawKey);
          const existing = await db.apiKey.findFirst({
            where: { providerId: provider.id, keyFingerprint: fp },
          });

          if (!existing) {
            await db.apiKey.create({
              data: {
                providerId: provider.id,
                encryptedKey: encrypt(rawKey),
                keyFingerprint: fp,
                status: 'active',
              },
            });
            results.added++;
          } else {
            results.skipped++;
          }
        } catch (keyErr) {
          console.error('Error processing key:', keyErr);
          results.skipped++;
        }
      }

      const stats = await getKeyStats();

      return NextResponse.json({
        message: `تمت معالجة ${rawKeys.length} مفتاح: ${results.added} مضاف، ${results.skipped} مكرر/خطأ`,
        added: results.added,
        skipped: results.skipped,
        stats,
      });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error) {
    console.error('Keys POST Error:', error);
    return NextResponse.json({ error: 'خطأ في المعالجة' }, { status: 500 });
  }
}

// ========== UPDATE / DELETE KEYS ==========

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'toggleProvider') {
      const { providerId, isActive } = body;
      await db.apiProvider.update({
        where: { id: providerId },
        data: { isActive },
      });
      const stats = await getKeyStats();
      return NextResponse.json({ message: 'تم تحديث المزود', stats });
    }

    if (action === 'updateKey') {
      const { keyId, status, priority, label, tokensLimit } = body;
      const updateData: Record<string, unknown> = {};
      if (status) updateData.status = status;
      if (status === 'active') {
        updateData.cooldownUntil = null;
        updateData.lastError = null;
      }
      if (priority !== undefined) updateData.priority = priority;
      if (label !== undefined) updateData.label = label;
      if (tokensLimit !== undefined) updateData.tokensLimit = tokensLimit;

      await db.apiKey.update({
        where: { id: keyId },
        data: updateData,
      });
      const stats = await getKeyStats();
      return NextResponse.json({ message: 'تم تحديث المفتاح', stats });
    }

    if (action === 'reactivateAll') {
      // Reactivate all cooldown/exhausted keys
      await db.apiKey.updateMany({
        where: { status: { in: ['cooldown', 'exhausted'] } },
        data: { status: 'active', cooldownUntil: null, lastError: null },
      });
      const stats = await getKeyStats();
      return NextResponse.json({ message: 'تم إعادة تفعيل جميع المفاتيح', stats });
    }

    if (action === 'resetStats') {
      await db.apiKey.updateMany({
        data: { tokensUsed: 0, requestCount: 0 },
      });
      const stats = await getKeyStats();
      return NextResponse.json({ message: 'تم إعادة تعيين الإحصائيات', stats });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (error) {
    console.error('Keys PUT Error:', error);
    return NextResponse.json({ error: 'خطأ في التحديث' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.keyId) {
      await db.apiKey.delete({ where: { id: body.keyId } });
      const stats = await getKeyStats();
      return NextResponse.json({ message: 'تم حذف المفتاح', stats });
    }

    if (body.providerId) {
      // Delete provider and all its keys (cascade)
      await db.apiProvider.delete({ where: { id: body.providerId } });
      const stats = await getKeyStats();
      return NextResponse.json({ message: 'تم حذف المزود وجميع مفاتيحه', stats });
    }

    if (body.action === 'deleteAll') {
      const count = await db.apiKey.count();
      await db.apiKey.deleteMany({});
      const stats = await getKeyStats();
      return NextResponse.json({ message: `تم حذف ${count} مفتاح`, stats });
    }

    return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
  } catch (error) {
    console.error('Keys DELETE Error:', error);
    return NextResponse.json({ error: 'خطأ في الحذف' }, { status: 500 });
  }
}

// ========== AUTO-DETECTION HELPER ==========

async function detectAndCreateKeys(rawKeys: string[]) {
  const results: Record<string, number> = { added: 0, skipped: 0, byProvider: {} as unknown as number };

  // Provider detection patterns
  const patterns: { name: string; label: string; pattern: RegExp; baseUrl?: string }[] = [
    {
      name: 'gemini',
      label: 'Google Gemini',
      pattern: /^AIza[0-9A-Za-z_-]{30,}$/,
    },
    {
      name: 'groq',
      label: 'Groq',
      pattern: /^gsk_[a-zA-Z0-9]{30,}$/,
    },
    {
      name: 'deepseek',
      label: 'DeepSeek',
      pattern: /^sk-[a-zA-Z0-9]{30,}$/,
    },
    {
      name: 'openai',
      label: 'OpenAI',
      pattern: /^sk-proj-[a-zA-Z0-9_-]{30,}$/,
    },
    {
      name: 'openrouter',
      label: 'OpenRouter',
      pattern: /^sk-or-v1-[a-zA-Z0-9_-]{30,}$/,
    },
  ];

  for (const rawKey of rawKeys) {
    let matched = false;

    for (const p of patterns) {
      if (p.pattern.test(rawKey)) {
        // Ensure provider exists
        let provider = await db.apiProvider.findUnique({ where: { name: p.name } });
        if (!provider) {
          provider = await db.apiProvider.create({
            data: { name: p.name, label: p.label, baseUrl: p.baseUrl || null },
          });
        }

        // Check duplicate
        const fp = fingerprint(rawKey);
        const existing = await db.apiKey.findFirst({
          where: { providerId: provider.id, keyFingerprint: fp },
        });

        if (!existing) {
          await db.apiKey.create({
            data: {
              providerId: provider.id,
              encryptedKey: encrypt(rawKey),
              keyFingerprint: fp,
              status: 'active',
            },
          });
          results.added++;
          (results.byProvider as Record<string, number>)[p.label] = ((results.byProvider as Record<string, number>)[p.label] || 0) + 1;
        } else {
          results.skipped++;
        }

        matched = true;
        break;
      }
    }

    if (!matched) {
      // Try to add as generic provider
      let generic = await db.apiProvider.findUnique({ where: { name: 'generic' } });
      if (!generic) {
        generic = await db.apiProvider.create({
          data: { name: 'generic', label: 'عام (آخر)' },
        });
      }

      const fp = fingerprint(rawKey);
      const existing = await db.apiKey.findFirst({
        where: { providerId: generic.id, keyFingerprint: fp },
      });

      if (!existing) {
        await db.apiKey.create({
          data: {
            providerId: generic.id,
            encryptedKey: encrypt(rawKey),
            keyFingerprint: fp,
            status: 'active',
          },
        });
        results.added++;
        (results.byProvider as Record<string, number>)['عام (آخر)'] = ((results.byProvider as Record<string, number>)['عام (آخر)'] || 0) + 1;
      } else {
        results.skipped++;
      }
    }
  }

  return results;
}
