import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callAI, ChatMessage } from '@/lib/aiProvider';
import { filterArabicText } from '@/lib/arabicFilter';
import { canUserSend, getUserUsageInfo, needsDailyReset } from '@/lib/usageLimit';

// Catch unhandled errors
if (typeof process !== 'undefined') {
  process.on('uncaughtException', (err) => console.error('UNCAUGHT:', err));
  process.on('unhandledRejection', (reason) => console.error('UNHANDLED:', reason));
}

// ========== RESPONSE CACHE (in-memory, saves API calls) ==========
const cache = new Map<string, { response: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 500;

function hashText(text: string): string {
  // Simple fast hash - normalize whitespace and lowercase
  const normalized = text.trim().replace(/\s+/g, ' ');
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `${hash}-${normalized.length}`;
}

function getCachedResponse(mode: string, question: string, scholar: string | null): string | null {
  const key = `${mode}:${scholar || ''}:${hashText(question)}`;
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    console.log('[CACHE HIT]', key.slice(0, 30));
    return entry.response;
  }
  // Remove expired entries
  if (entry) cache.delete(key);
  return null;
}

function setCachedResponse(mode: string, question: string, scholar: string | null, response: string): void {
  const key = `${mode}:${scholar || ''}:${hashText(question)}`;
  if (cache.size >= MAX_CACHE_SIZE) {
    // Evict oldest 20%
    const entries = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    for (let i = 0; i < Math.floor(MAX_CACHE_SIZE * 0.2); i++) {
      cache.delete(entries[i][0]);
    }
  }
  cache.set(key, { response, timestamp: Date.now() });
}

// ========== ULTRA-COMPACT SYSTEM PROMPTS (~30 tokens each) ==========
const SYS = {
  chat: 'مساعد ذكي في العلوم الإسلامية والعربية والمنطق والفقه. أجب بالعربية فقط. لا تستخدم كلمة أجنبية.',
  debate: 'محاور إسلامي محايد. حلل الحجج واعرض آراء المذاهب بإنصاف. أجب بالعربية فقط.',
  teacher: 'معلم يشرح المواضيع الصعبة بطريقة بسيطة يفهمها طفل. أجب بالعربية فقط.',
  research: 'باحث إسلامي يعرض آراء العلماء والمذاهب مع مصادرها. أجب بالعربية فقط.',
};

interface ChatRequestBody {
  message: string;
  sessionId?: string;
  mode?: 'chat' | 'debate' | 'teacher' | 'research';
  scholar?: string;
  userId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();
    const { message, sessionId, mode = 'chat', scholar } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'الرسالة مطلوبة' }, { status: 400 });
    }
    if (message.trim().length === 0) {
      return NextResponse.json({ error: 'الرسالة لا يمكن أن تكون فارغة' }, { status: 400 });
    }

    const validModes = ['chat', 'debate', 'teacher', 'research'];
    if (!validModes.includes(mode)) {
      return NextResponse.json({ error: 'وضع غير صالح' }, { status: 400 });
    }

    // Check usage limits
    const userId = body.userId;
    if (userId) {
      const user = await db.user.findUnique({ where: { id: userId } });
      if (user) {
        const isPremium = user.role === 'owner' || user.role === 'supervisor' ||
          (user.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date());

        if (!isPremium && needsDailyReset(user.lastMessageResetDate)) {
          await db.user.update({
            where: { id: userId },
            data: { messagesUsed: 0, lastMessageResetDate: new Date() },
          });
        }

        const freshUser = await db.user.findUnique({ where: { id: userId } });
        if (freshUser && !canUserSend(freshUser)) {
          return NextResponse.json({
            error: 'limit_reached',
            message: 'وصلت للحد الأقصى اليومي.',
            usageInfo: getUserUsageInfo(freshUser),
          }, { status: 403 });
        }

        if (freshUser && freshUser.role !== 'owner' && freshUser.role !== 'supervisor') {
          const freshPremium = freshUser.subscriptionExpiry && new Date(freshUser.subscriptionExpiry) > new Date();
          if (!freshPremium) {
            if (freshUser.bonusMessages > 0) {
              await db.user.update({ where: { id: userId }, data: { bonusMessages: { decrement: 1 } } });
            } else {
              const resetDate = freshUser.lastMessageResetDate || new Date();
              await db.user.update({
                where: { id: userId },
                data: { messagesUsed: { increment: 1 }, lastMessageResetDate: resetDate },
              });
            }
          }
        }
      }
    }

    // Build ultra-compact system prompt
    let systemPrompt = SYS[mode] || SYS.chat;
    if (scholar && (mode === 'chat' || mode === 'teacher')) {
      systemPrompt += ` وفق منهج ${scholar}.`;
    }

    // Get or create session
    let session;
    if (sessionId) {
      session = await db.chatSession.findUnique({ where: { id: sessionId } });
    }
    if (!session) {
      session = await db.chatSession.create({
        data: { mode, scholar: scholar || null, title: message.slice(0, 60) },
      });
    }

    // Store user message in DB (for chat history display)
    await db.message.create({
      data: { sessionId: session.id, role: 'user', content: message },
    });

    // ===== CHECK RESPONSE CACHE FIRST (saves API call entirely) =====
    const cached = getCachedResponse(mode, message, scholar || null);
    if (cached) {
      const filteredCached = filterArabicText(cached);
      await db.message.create({
        data: { sessionId: session.id, role: 'assistant', content: filteredCached },
      });
      return NextResponse.json({
        message: filteredCached,
        sessionId: session.id,
        mode: session.mode,
        loadBalanced: false,
        provider: 'cache',
        usageInfo: userId ? await (async () => {
          const u = await db.user.findUnique({ where: { id: userId } });
          return u ? getUserUsageInfo(u) : null;
        })() : undefined,
      });
    }

    // ===== NO CACHE HIT - Call AI with MINIMAL tokens =====
    // Send ONLY: system prompt + current question (NO history)
    const apiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ];

    let aiResult;
    try {
      aiResult = await callAI(apiMessages, {
        temperature: mode === 'debate' ? 0.7 : 0.8,
        maxTokens: 512,
      });
    } catch (aiError) {
      console.error('AI Provider Error:', aiError);
      const errMsg = aiError instanceof Error ? aiError.message : String(aiError);
      aiResult = {
        content: `عذرًا، خطأ: ${errMsg.slice(0, 80)}. حاول مرة أخرى.`,
        provider: 'Error',
        tokensUsed: 0,
        loadBalanced: false,
      };
    }

    const filteredContent = filterArabicText(aiResult.content);

    // Store in cache
    if (aiResult.loadBalanced && filteredContent) {
      setCachedResponse(mode, message, scholar || null, filteredContent);
    }

    // Store assistant message in DB
    try {
      await db.message.create({
        data: { sessionId: session.id, role: 'assistant', content: filteredContent },
      });
    } catch (dbErr) {
      console.error('Failed to store message:', dbErr);
    }

    return NextResponse.json({
      message: filteredContent,
      sessionId: session.id,
      mode: session.mode,
      loadBalanced: aiResult.loadBalanced,
      provider: aiResult.provider,
      usageInfo: userId ? await (async () => {
        const u = await db.user.findUnique({ where: { id: userId } });
        return u ? getUserUsageInfo(u) : null;
      })() : undefined,
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء معالجة طلبك' }, { status: 500 });
  }
}

// GET: Retrieve chat session history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'معرف الجلسة مطلوب' }, { status: 400 });
    }

    const session = await db.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });

    if (!session) {
      return NextResponse.json({ error: 'الجلسة غير موجودة' }, { status: 404 });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        mode: session.mode,
        scholar: session.scholar,
        createdAt: session.createdAt,
      },
      messages: session.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        sources: msg.sources,
        createdAt: msg.createdAt,
      })),
    });
  } catch (error) {
    console.error('Chat GET Error:', error);
    return NextResponse.json({ error: 'خطأ في جلب السجل' }, { status: 500 });
  }
}
