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

// ========== ULTRA-COMPACT SYSTEM PROMPTS (~30 tokens each) ==========
const SYS = {
  chat: 'مساعد ذكي في العلوم الإسلامية والعربية والمنطق والفقه. أجب بالعربية فقط. لا تستخدم كلمة أجنبية.',
  debate: 'محاور إسلامي محايد. حلل الحجج واعرض آراء المذاهب بإنصاف. أجب بالعربية فقط.',
  teacher: 'معلم يشرح المواضيع الصعبة بطريقة بسيطة يفهمها طفل. أجب بالعربية فقط.',
  research: 'باحث إسلامي يعرض آراء العلماء والمذاهب مع مصادرها. أجب بالعربية فقط.',
};

// ========== DATABASE CACHE: 100 similar questions = 1 AI call ==========

// Normalize question: trim, lowercase, remove extra spaces, remove diacritics
function normalizeQuestion(q: string): string {
  return q
    .trim()
    .replace(/\s+/g, ' ')
    // Remove Arabic diacritics (tashkeel)
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g, '')
    // Normalize alef variants
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize taa marbuta
    .replace(/ة/g, 'ه')
    // Normalize yaa
    .replace(/ى/g, 'ي')
    .toLowerCase();
}

// Create hash for cache lookup
function questionHash(question: string, mode: string, scholar: string | null): string {
  const normalized = normalizeQuestion(question);
  const key = `${mode}:${scholar || ''}:${normalized}`;
  // Simple hash
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `${hash}-${key.length}`;
}

// Check DB cache for a response
async function getDBCachedResponse(
  question: string,
  mode: string,
  scholar: string | null
): Promise<string | null> {
  const hash = questionHash(question, mode, scholar);
  const normalized = normalizeQuestion(question);

  // First: exact hash match
  const exact = await db.responseCache.findFirst({
    where: { questionHash: hash, mode },
  });
  if (exact) {
    // Increment hit count and update timestamp
    await db.responseCache.update({
      where: { id: exact.id },
      data: { hitCount: { increment: 1 }, updatedAt: new Date() },
    });
    console.log(`[DB CACHE HIT] exact match, hitCount=${exact.hitCount + 1}`);
    return exact.answer;
  }

  // Second: fuzzy match - find questions with similar length and same mode
  // Get recent caches for this mode
  const recent = await db.responseCache.findMany({
    where: { mode },
    orderBy: { hitCount: 'desc' },
    take: 50,
  });

  for (const cached of recent) {
    const cachedNorm = normalizeQuestion(cached.question);
    // Calculate similarity (simple word overlap)
    const similarity = calculateSimilarity(normalized, cachedNorm);
    if (similarity > 0.85) {
      // High similarity - use cached answer
      await db.responseCache.update({
        where: { id: cached.id },
        data: { hitCount: { increment: 1 }, updatedAt: new Date() },
      });
      console.log(`[DB CACHE HIT] fuzzy match (${(similarity * 100).toFixed(0)}%), hitCount=${cached.hitCount + 1}`);
      return cached.answer;
    }
  }

  return null;
}

// Simple word-level similarity between two Arabic sentences
function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.split(' ').filter(w => w.length > 1));
  const wordsB = new Set(b.split(' ').filter(w => w.length > 1));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  return (2 * intersection) / (wordsA.size + wordsB.size);
}

// Store response in DB cache
async function setDBCachedResponse(
  question: string,
  mode: string,
  scholar: string | null,
  answer: string
): Promise<void> {
  const hash = questionHash(question, mode, scholar);
  try {
    await db.responseCache.create({
      data: {
        questionHash: hash,
        mode,
        scholar: scholar || null,
        question: question.slice(0, 500), // store original question
        answer,
        hitCount: 0,
      },
    });
    console.log('[DB CACHE] Stored new response');

    // Cleanup: keep only 5000 most recent entries per mode
    const count = await db.responseCache.count({ where: { mode } });
    if (count > 5000) {
      const old = await db.responseCache.findMany({
        where: { mode },
        orderBy: { hitCount: 'asc' },
        take: count - 4000,
        select: { id: true },
      });
      const ids = old.map(o => o.id);
      await db.responseCache.deleteMany({ where: { id: { in: ids } } });
      console.log(`[DB CACHE] Cleaned up ${ids.length} old entries`);
    }
  } catch (err) {
    console.error('[DB CACHE] Store error:', err);
  }
}

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

    // ===== CHECK DATABASE CACHE FIRST (100 questions = 1 AI call) =====
    const cachedAnswer = await getDBCachedResponse(message, mode, scholar || null);
    if (cachedAnswer) {
      const filteredCached = filterArabicText(cachedAnswer);
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

    // Store in DATABASE cache (persistent, survives server restarts)
    if (aiResult.loadBalanced && filteredContent && filteredContent.length > 20) {
      await setDBCachedResponse(message, mode, scholar || null, filteredContent);
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
