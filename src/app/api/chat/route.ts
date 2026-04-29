import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callAI, ChatMessage } from '@/lib/aiProvider';
import { filterArabicText } from '@/lib/arabicFilter';
import { canUserSend, getUserUsageInfo, needsDailyReset } from '@/lib/usageLimit';

// Catch unhandled errors to prevent process crash
if (typeof process !== 'undefined') {
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION:', reason);
  });
}

// Compact Arabic-only rule (~150 tokens instead of ~400)
const AR = `\nأجب بالعربية الفصحى حصرياً. لا تستخدم أي كلمة أجنبية أو لاتينية. ترجم كل مصطلح: proof=برهان،theory=نظرية،logic=منطق،evidence=دليل،argument=حجة،definition=تعريف،concept=مفهوم،approach=منهج،framework=إطار،perspective=منظور. لا تكتب الكلمة الأجنبية أبداً حتى بين قوسين.`;

const SYSTEM_PROMPTS: Record<string, string> = {
  chat: `أنت مساعد ذكي متخصص في العلوم الإسلامية واللغة العربية والفلسفة والمنطق والفقه. تقدم إجابات مدروسة ودقيقة. عندما يتم تحديد عالم معين، استشهد بمنهجه وآرائه.${AR}`,

  debate: `أنت محاور رقمي ماهر متخصص في العلوم الإسلامية. محايد لا ينتسب لمذهب. حلل الحجج من جميع الجوانب واعرض آراء العلماء والمذاهب بإنصاف. استخدم الأدلة القرآنية والحديثية والفقهية.${AR}`,

  teacher: `أنت معلم خبير يشرح أي موضوع معقد (عقيدة، فلسفة، منطق، فقه، نحو) بطريقة بسيطة يفهمها طفل. استخدم لغة بسيطة وأمثلة مألوفة وشرح خطوة بخطوة.${AR}`,

  research: `أنت باحث إسلامي متخصص في البحث الخارج. اعرض آراء مختلف العلماء والمذاهب بشمولية مع ذكر المصادر والروايات والأحاديث. كن دقيقاً في النقل واذكر درجة الحديث.${AR}`,
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

    // Check usage limits (if userId provided)
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
          const usageInfo = getUserUsageInfo(freshUser);
          return NextResponse.json({
            error: 'limit_reached',
            message: 'وصلت للحد الأقصى من الرسائل المجانية اليومية. اشترك أو شاهد إعلانات للمتابعة.',
            usageInfo,
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

    // Build system prompt
    let systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;

    // Add scholar context (compact)
    if (scholar && (mode === 'chat' || mode === 'teacher')) {
      const defaultScholars = ['السيد السيستاني','السيد كمال الحيدري','السيد القزويني','السيد محمد صادق الصدر','الشيخ بشير النجفي','السيد الشيرازي'];
      if (!defaultScholars.includes(scholar)) {
        systemPrompt += `\nابحث عن آراء العالم "${scholar}" واستعرض منهجه.`;
      } else {
        systemPrompt += `\nصغ إجاباتك وفق منهج العالم: ${scholar}.`;
      }
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

    // Store user message
    await db.message.create({
      data: { sessionId: session.id, role: 'user', content: message },
    });

    // Fetch only last 4 messages for context (saves ~50% tokens)
    const previousMessages = await db.message.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
      take: 5,
    });

    // Build message history
    const apiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...previousMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    // Call AI
    let aiResult;
    try {
      aiResult = await callAI(apiMessages, {
        temperature: mode === 'debate' ? 0.7 : 0.8,
        maxTokens: 1024,
      });
    } catch (aiError) {
      console.error('AI Provider Error:', aiError);
      const errMsg = aiError instanceof Error ? aiError.message : String(aiError);
      aiResult = {
        content: `عذرًا، حدث خطأ: ${errMsg.slice(0, 100)}. يرجى المحاولة مرة أخرى.`,
        provider: 'Error',
        tokensUsed: 0,
        loadBalanced: false,
      };
    }

    const filteredContent = filterArabicText(aiResult.content);

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
