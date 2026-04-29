import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callAI, ChatMessage } from '@/lib/aiProvider';
import { filterArabicText } from '@/lib/arabicFilter';
import { canUserSend, getUserUsageInfo } from '@/lib/usageLimit';

// Catch unhandled errors to prevent process crash
if (typeof process !== 'undefined') {
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION:', reason);
  });
}

const ARABIC_ONLY_RULE = `
\n╔══════════════════════════════════════════════════════════╗
║  قاعدة ذهبية ثابتة - العبودية للعربية فقط                ║
║  لا تُخالف هذه القاعدة تحت أي ظرف                        ║
╚══════════════════════════════════════════════════════════╝

حكم مطلق: إجابتك يجب أن تكون باللغة العربية الفصحى حصرياً.

🚫 محظور تماماً:
- أي كلمة إنجليزية (ranging, concept, theory, logic, reason, proof, evidence, argument, definition, example, meaning, approach, framework, perspective, domain, structure, process, function, mechanism, etc.)
- أي حرف لاتيني (a-z, A-Z) وسط الكلام العربي
- أي كلمة فرنسية أو فارسية أو تركية أو أوردو
- كتابة المصطلح الأجنبي بين قوسين بعد الترجمة
- الخلط بين لغتين في نفس الجملة

✅ الصواب:
- اكتب المعنى بالعربية فقط: "مفهوم المدى" لا "مفهوم ranging"
- "البرهان" لا "proof"، "الحجة" لا "argument"
- "النظرية" لا "theory"، "المنطق" لا "logic"
- "الدليل" لا "evidence"، "التعريف" لا "definition"
- "المنهج" لا "approach"، "المنظور" لا "perspective"

تذكّر: حتى كلمة واحدة أجنبية تُفسد النص كله. فكّر بالعربية، اكتب بالعربية، أجب بالعربية فقط.`;

const SYSTEM_PROMPTS: Record<string, string> = {
  chat: `أنت مساعد ذكي متخصص في العلوم الإسلامية واللغة العربية والفلسفة والمنطق والفقه. تقدم إجابات مدروسة ودقيقة. عندما يتم تحديد عالم معين، استشهد بمنهجه وآرائه.${ARABIC_ONLY_RULE}`,

  debate: `أنت محاور رقمي ماهر ومتخصص في العلوم الإسلامية. مهامك:
1. أنت محاور محايد لا ينتسب لأي مذهب أو عالم معين.
2. عندما يقدم المستخدم ادعاءً أو حجة، قم بتحليلها من جميع الجوانب.
3. اعرض آراء مختلف العلماء والمذاهب الإسلامية حول الموضوع بشكل متوازن ومنصف.
4. استخدم الأدلة القرآنية والحديثية والفقهية والمنطقية.
5. كن محترمًا ولكن شاملًا في تحليلاتك، وعرض الإشكالات والحجج المضادة.
6. لا تتحيز لرأي عالم على حساب آخر، بل اعرض الرأي الأقوى بالدليل.
7. ساعد في تعزيز فهم المستخدم باختبار حججه وتقديم بدائل فكرية.${ARABIC_ONLY_RULE}`,

  teacher: `أنت معلم خبير يستطيع شرح أي موضوع معقد (خاصة في العقيدة، الفلسفة، المنطق، الفقه، النحو) بطريقة بسيطة جدًا يفهمها طفل في العاشرة من عمره. استخدم لغة بسيطة وأمثلة مألوفة وشرحًا خطوة بخطوة. اجعل المفاهيم الصعبة تبدو سهلة وطبيعية.${ARABIC_ONLY_RULE}`,

  research: `أنت باحث إسلامي متخصص في البحث الخارج. مهامك:
1. أنت لا تقتصر على آراء عالم واحد بل تبحث في مصادر متعددة.
2. عندما يسألك المستخدم عن حكم أو موضوع، اعرض آراء مختلف العلماء والمذاهب الإسلامية بشكل شامل.
3. استشهد بالآيات القرآنية والأحاديث النبوية وآراء علماء السلف والخلف من مختلف المذاهب.
4. قدم الروايات والأحاديث المتعلقة بالموضوع مع ذكر مصادرها (الكتب، الأبواب، الأرقام).
5. اذكر الإجماع والخلاف في المسائل الفقهية والعقائدية مع نسبة كل قول لقائله.
6. اعتمد على المصادر الأصلية: القرآن الكريم، الكتب الحديثية الستة والمسانيد، كتب التفسير المعتمدة، كتب الفقه المقارن.
7. كن دقيقًا في النقل وموثوقًا في المصادر، واذكر درجة الحديث إذا كان ذلك مهمًا.
8. لا تتحيز لرأي على حساب آخر، بل اعرض ما قاله كل عالم مع الدليل.${ARABIC_ONLY_RULE}`,
};

interface ChatRequestBody {
  message: string;
  sessionId?: string;
  mode?: 'chat' | 'debate' | 'teacher' | 'research';
  scholar?: string;
  userId?: string; // for usage tracking
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
      if (user && !canUserSend(user)) {
        const usageInfo = getUserUsageInfo(user);
        return NextResponse.json({
          error: 'limit_reached',
          message: 'وصلت للحد الأقصى من الرسائل المجانية. اشترك أو شاهد إعلانات للمتابعة.',
          usageInfo,
        }, { status: 403 });
      }

      // Deduct usage after successful send
      if (user && user.role !== 'owner' && user.role !== 'supervisor') {
        const isPremium = user.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date();
        if (!isPremium) {
          if (user.bonusMessages > 0) {
            await db.user.update({ where: { id: userId }, data: { bonusMessages: { decrement: 1 } } });
          } else {
            await db.user.update({ where: { id: userId }, data: { messagesUsed: { increment: 1 } } });
          }
        }
      }
    }

    // Build system prompt
    let systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;

    // Add scholar context for chat and teacher modes
    // In debate and research modes, scholars are NOT forced - the AI presents multiple views
    if (scholar && (mode === 'chat' || mode === 'teacher')) {
      // Check if this is a custom scholar (not in the default list)
      const defaultScholars = [
        'السيد السيستاني',
        'السيد كمال الحيدري',
        'السيد القزويني',
        'السيد محمد صادق الصدر',
        'الشيخ بشير النجفي',
        'السيد الشيرازي',
      ];

      if (!defaultScholars.includes(scholar)) {
        // Custom scholar: AI should research and respond based on that scholar's views
        systemPrompt += `\n\nالمستخدم يريد البحث عن آراء العالم: "${scholar}". هذا العالم ليس من القائمة الافتراضية. مهمتك:\n1. ابحث عن هذا العالم واستعرض آراءه ومنهجه في الموضوع المطروح.\n2. إذا كنت تعرف عنه معلومات، استشهد بآرائه وكتبه.\n3. إذا لم تكن متأكدًا من آرائه بالضبط، قدم ما تعرفه مع التنبيه بذلك.\n4. لا تضف هذا العالم للقائمة الرسمية - هو مجرد استفسار مؤقت.`;
      } else {
        systemPrompt += `\n\nيرجى صياغة إجاباتك وفق منهج وآراء العالم: ${scholar}. استشهد بآرائه وفتاواه وكتبه عند الإمكان.`;
      }
    }

    // Get or create session
    let session;
    if (sessionId) {
      session = await db.chatSession.findUnique({ where: { id: sessionId } });
    }

    if (!session) {
      session = await db.chatSession.create({
        data: {
          mode,
          scholar: scholar || null,
          title: message.slice(0, 60),
        },
      });
    }

    // Store user message
    await db.message.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: message,
      },
    });

    // Fetch previous messages for context (last 10)
    const previousMessages = await db.message.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
      take: 11,
    });

    // Build message history
    const apiMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...previousMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    // Call AI via load balancer / direct provider
    let aiResult;
    try {
      aiResult = await callAI(apiMessages, {
        temperature: mode === 'debate' ? 0.7 : 0.8,
        maxTokens: 2048,
      });
    } catch (aiError) {
      console.error('AI Provider Error:', aiError);
      const errMsg = aiError instanceof Error ? aiError.message : String(aiError);
      aiResult = {
        content: `عذرًا، حدث خطأ في الاتصال بمزود الخدمة: ${errMsg.slice(0, 100)}. يرجى المحاولة مرة أخرى أو تغيير المفتاح.`,
        provider: 'Error',
        tokensUsed: 0,
        loadBalanced: false,
      };
    }

    // Apply Arabic text filter to remove non-Arabic words
    const filteredContent = filterArabicText(aiResult.content);

    // Store assistant message (filtered version)
    try {
      await db.message.create({
        data: {
          sessionId: session.id,
          role: 'assistant',
          content: filteredContent,
        },
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
    return NextResponse.json(
      { error: 'حدث خطأ أثناء معالجة طلبك' },
      { status: 500 }
    );
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
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
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
