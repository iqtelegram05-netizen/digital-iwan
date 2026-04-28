import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { selectKey, reportSuccess, reportFailure } from '@/lib/loadBalancer';

const SYSTEM_PROMPTS: Record<string, string> = {
  chat: `أنت مساعد ذكي متخصص في العلوم الإسلامية واللغة العربية والفلسفة والمنطق والفقه. تقدم إجابات مدروسة ودقيقة. عندما يتم تحديد عالم معين، استشهد بمنهجه وآرائه. أجب باللغة العربية.`,

  debate: `أنت محاور ماهر في العلوم الإسلامية. سيقدم المستخدم ادعاءً أو حجة، ومهمتك هي تحديها بالحجج المضادة والأدلة والتفكير المنطقي. استخدم المصادر الموثوقة. كن محترمًا ولكن شاملًا في تحدياتك. ساعد في تعزيز فهم المستخدم باختبار حججه. أجب باللغة العربية.`,

  teacher: `أنت معلم خبير يستطيع شرح أي موضوع معقد (خاصة في العقيدة، الفلسفة، المنطق، الفقه، النحو) بطريقة بسيطة جدًا يفهمها طفل في العاشرة من عمره. استخدم لغة بسيطة وأمثلة مألوفة وشرحًا خطوة بخطوة. اجعل المفاهيم الصعبة تبدو سهلة وطبيعية. أجب باللغة العربية.`,
};

interface ChatRequestBody {
  message: string;
  sessionId?: string;
  mode?: 'chat' | 'debate' | 'teacher';
  scholar?: string;
}

// Max retries with different keys
const MAX_RETRIES = 3;

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

    const validModes = ['chat', 'debate', 'teacher'];
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        { error: 'وضع غير صالح' },
        { status: 400 }
      );
    }

    // Build system prompt
    let systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.chat;
    if (scholar) {
      systemPrompt += `\n\nيرجى صياغة إجاباتك وفق منهج وآراء العالم: ${scholar}. استشهد بآرائه وفتاواه وكتبه عند الإمكان.`;
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
    const chatHistory = previousMessages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    // ===== LOAD BALANCER: Try with API keys =====
    let aiResponse = '';
    let usedKey = false;
    let lastError = '';

    // Try up to MAX_RETRIES with different keys
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const selectedKey = await selectKey();

      if (!selectedKey) {
        // No keys available, fall back to default ZAI
        break;
      }

      try {
        const zai = await ZAI.create();
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            ...chatHistory,
          ],
          temperature: mode === 'debate' ? 0.7 : 0.8,
          max_tokens: 2048,
        });

        aiResponse = completion.choices?.[0]?.message?.content || '';
        if (aiResponse) {
          // Success! Report it
          const tokensUsed = completion.usage?.total_tokens || 0;
          await reportSuccess(selectedKey.id, tokensUsed);
          usedKey = true;
          break;
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        const result = await reportFailure(selectedKey.id, lastError, 'retry');

        if (!result.shouldRetry || !result.nextKey) {
          break;
        }
        // Loop continues with next key
      }
    }

    // Fallback: use default ZAI if no keys worked
    if (!aiResponse) {
      try {
        const zai = await ZAI.create();
        const completion = await zai.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            ...chatHistory,
          ],
          temperature: mode === 'debate' ? 0.7 : 0.8,
          max_tokens: 2048,
        });
        aiResponse = completion.choices?.[0]?.message?.content || 'عذرًا، لم أتمكن من توليد إجابة.';
      } catch {
        aiResponse = lastError
          ? `عذرًا، حدث خطأ في الخدمة: ${lastError.slice(0, 100)}`
          : 'عذرًا، لم أتمكن من توليد إجابة. يرجى المحاولة لاحقاً.';
      }
    }

    // Store assistant message
    await db.message.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: aiResponse,
      },
    });

    return NextResponse.json({
      message: aiResponse,
      sessionId: session.id,
      mode: session.mode,
      loadBalanced: usedKey,
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
