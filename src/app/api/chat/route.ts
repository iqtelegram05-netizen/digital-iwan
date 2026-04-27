import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';

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

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequestBody = await request.json();
    const { message, sessionId, mode = 'chat', scholar } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'الرسالة مطلوبة' },
        { status: 400 }
      );
    }

    if (message.trim().length === 0) {
      return NextResponse.json(
        { error: 'الرسالة لا يمكن أن تكون فارغة' },
        { status: 400 }
      );
    }

    const validModes = ['chat', 'debate', 'teacher'];
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        { error: 'وضع غير صالح. الوضع يجب أن يكون: chat, debate, أو teacher' },
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
      session = await db.chatSession.findUnique({
        where: { id: sessionId },
      });
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
      take: 11, // current + 10 previous
    });

    // Build message history for ZAI
    const chatHistory = previousMessages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    // Call ZAI SDK
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...chatHistory,
      ],
      temperature: mode === 'debate' ? 0.7 : 0.8,
      max_tokens: 2048,
    });

    const aiResponse = completion.choices?.[0]?.message?.content || 'عذرًا، لم أتمكن من توليد إجابة. يرجى المحاولة مرة أخرى.';

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
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.' },
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
      return NextResponse.json(
        { error: 'معرف الجلسة مطلوب' },
        { status: 400 }
      );
    }

    const session = await db.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'الجلسة غير موجودة' },
        { status: 404 }
      );
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
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب سجل المحادثة' },
      { status: 500 }
    );
  }
}
