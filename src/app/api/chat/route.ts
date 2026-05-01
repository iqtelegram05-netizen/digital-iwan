import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callAI, ChatMessage } from '@/lib/aiProvider';
import { filterArabicText } from '@/lib/arabicFilter';
import { canUserSend, getUserUsageInfo, needsDailyReset } from '@/lib/usageLimit';
import { callHuggingFace, hasActiveHFKeys, trackUsage } from '@/lib/huggingface';

// Catch unhandled errors
if (typeof process !== 'undefined') {
  process.on('uncaughtException', (err) => console.error('UNCAUGHT:', err));
  process.on('unhandledRejection', (reason) => console.error('UNHANDLED:', reason));
}

// ========== SYSTEM PROMPTS ==========
const SYS = {
  chat: `أنت مساعد ذكي متخصص في العلوم الإسلامية والعربية والمنطق والفقه وفق منهج أهل البيت (عليهم السلام). أجب بالعربية فقط. لا تستخدم كلمة أجنبية. اذكر المصادر والأدلة.`,

  debate: `أنت محاور إسلامي شيعي صارم ومتخصص. أسلوبك حازم وجاد ومهني. أنت خبير في علم الكلام والفلسفة الإسلامية والمنطق والحوار العلمي وفق المنهج الإمامي الاثني عشري.

قواعد الحوار:
1. عندما يكتب المستخدم موضوعاً، حلّله بعمق واعرض فهمك له ثم اسأله مباشرة وبشكل واضح: "أتريدني أن أُثبت هذا الموضوع أم أنفيه؟"
2. إذا اختار المستخدم الإثبات، قدم أدلة وبراهين فتاكة وقوية من القرآن الكريم والأحاديث الشريفة وأقوال أئمة أهل البيت (عليهم السلام) والعقل والفطرة. اذكر آراء علماء الشيعة مثل الشريف المرتضى والخواجه نصير الدين الطوسي والعلامة الحلي والشيخ الصدوق والشيخ المفيد والسيد الخوئي والشهيد الصدر.
3. إذا اختار المستخدم النفي، قدم أدلة وبراهين قوية لنفي الموضوع مع تحليل منطقي عميق ومحكم.
4. استخدم لغة علمية رصينة مع مصادر واضحة وأدلة متينة.
5. لا تتراجع عن حجتك، كن حازماً وقوياً في الطرح.
6. نظّم إجاباتك بوضوح: ابدأ بالمقدمة ثم الأدلة ثم الاستنتاج.
7. أجب بالعربية فقط ولا تستخدم أي كلمة أجنبية.`,

  teacher: `أنت أستاذ جامعي حوزوي متخصص في العلوم الإسلامية بجميع فروعها: القرآن الكريم وعلومه، الحديث الشريف ورجاله، العقيدة والتوحيد، الفقه وأصوله، الفلسفة الإسلامية، الكلام، المنطق، اللغة العربية وعلومها، التاريخ الإسلامي، السيرة النبوية وسيرة أئمة أهل البيت (عليهم السلام).

طريقة التدريس:
1. اشرح الموضوع بشكل عميق ومفصل وشامل بدءاً من المفاهيم الأساسية وصولاً إلى التفاصيل الدقيقة والمتقدمة.
2. استخدم أمثلة من القرآن الكريم والأحاديث الشريفة وكلام الأئمة (عليهم السلام) وأقوال العلماء والمفكرين.
3. قسّم الشرح إلى مراحل ومستويات واضحة مع عناوين فرعية.
4. اذكر المصادر والكتب المرجعية لكل مسألة.
5. قارن بين الآراء المختلفة مع تحليل ونقد علمي عميق.
6. اربط الموضوع بمسائل أخرى لإنشاء فهم متكامل.
7. استخدم أسلوباً أكاديمياً رصيناً مع الوضوح.
8. أجب بالعربية فقط ولا تستخدم مصطلحات أجنبية.`,

  research: `أنت باحث إسلامي متخصص ومتعمق في البحث الخارج الحوزوي. منهجك بحثي أكاديمي رصين يحاكي حوارات البحث الخارج في الحوزات العلمية الشيعية كحوزة النجف الأشرف وقم المقدسة.

أسلوب البحث:
1. تناول المسألة بتحليل عميق وشامل مع استقصاء جميع الأبعاد والجوانب والتفاصيل الدقيقة.
2. اذكر آراء علماء الشيعة والمذاهب الأخرى مع مصادرها الدقيقة وأرقام الصفحات.
3. قارن بين الأقوال مع عرض الأدلة والمناقشة والترجيح العلمي المحكم.
4. استخدم أدوات البحث العلمي المتقدمة: الاستقراء، التحليل، الاستنباط، القياس، البرهان، الاستنتاج.
5. اذكر الكتب والمراجع الأساسية: الكتب الأربعة، الوسائل، الجواهر، المبسوط، شرائع الإسلام، ونحوها.
6. اعرض الإشكالات الواردة على كل قول والردود عليها بقوة.
7. حلّل أدلة كل فريق بدقة متناهية.
8. ختِم بالنتيجة الراجحة مع أدلتها القاطعة.
9. أجب بالعربية فقط ولا تستخدم مصطلحات أجنبية.`,
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
      await trackUsage('cacheHits');
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

    // ===== NO CACHE HIT - Try HuggingFace FIRST, then Fallback to Gemini/Groq =====
    await trackUsage('aiCalls');

    let finalContent = '';
    let finalProvider = '';
    let finalLoadBalanced = false;
    let usedFallback = false;

    const useHF = await hasActiveHFKeys();

    if (useHF) {
      // ===== PRIMARY: HuggingFace (Qwen2.5-72B) =====
      try {
        console.log('[CHAT] Using HuggingFace as primary provider');
        const hfResult = await callHuggingFace(systemPrompt, message, {
          temperature: mode === 'debate' ? 0.7 : mode === 'research' ? 0.6 : 0.8,
          maxTokens: mode === 'teacher' || mode === 'research' ? 2048 : 1024,
        });

        if (hfResult.content && !hfResult.usedFallback) {
          finalContent = hfResult.content;
          finalProvider = `HuggingFace (${hfResult.provider})`;
          finalLoadBalanced = hfResult.loadBalanced;
        } else if (hfResult.usedFallback) {
          // HF returned fallback result - use it but mark as fallback
          finalContent = hfResult.content;
          finalProvider = 'Fallback';
          finalLoadBalanced = hfResult.loadBalanced;
          usedFallback = true;
        }
      } catch (hfError) {
        console.error('[CHAT] HuggingFace failed, falling back:', hfError);
        usedFallback = true;
      }
    }

    if (!finalContent) {
      // ===== FALLBACK: Gemini / Groq / DeepSeek / OpenAI =====
      console.log('[CHAT] Using fallback providers (Gemini/Groq)');
      usedFallback = true;

      const apiMessages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ];

      try {
        const fallbackResult = await callAI(apiMessages, {
          temperature: mode === 'debate' ? 0.7 : mode === 'research' ? 0.6 : 0.8,
          maxTokens: mode === 'teacher' || mode === 'research' ? 2048 : 1024,
        });
        finalContent = fallbackResult.content;
        finalProvider = fallbackResult.provider;
        finalLoadBalanced = fallbackResult.loadBalanced;
      } catch (aiError) {
        console.error('AI Provider Error:', aiError);
        const errMsg = aiError instanceof Error ? aiError.message : String(aiError);
        finalContent = `عذرًا، خطأ: ${errMsg.slice(0, 80)}. حاول مرة أخرى.`;
        finalProvider = 'Error';
        finalLoadBalanced = false;
      }
    }

    if (usedFallback) {
      await trackUsage('fallbackCalls');
    }

    const filteredContent = filterArabicText(finalContent);

    // Store in DATABASE cache (persistent, survives server restarts)
    if (finalLoadBalanced && filteredContent && filteredContent.length > 20) {
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
      loadBalanced: finalLoadBalanced,
      provider: finalProvider,
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
