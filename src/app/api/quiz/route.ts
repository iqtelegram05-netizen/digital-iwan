import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callAI } from '@/lib/aiProvider';
import { filterArabicText } from '@/lib/arabicFilter';

const CATEGORY_PROMPTS: Record<string, string> = {
  'عقائد': 'أصول الإيمان والتوحيد وأسماء الله وصفاته',
  'منطق': 'المقدمات والنتائج والقياس والبرهان',
  'علم': 'علوم القرآن والسنة والتفسير والحديث',
  'نحو': 'الإعراب والبناء والجمل والأفعال والأسماء',
  'فقه': 'العبادات والمعاملات والأحوال الشخصية',
};

const VALID_CATEGORIES = ['عقائد', 'منطق', 'علم', 'نحو', 'فقه'];

interface QuizRequestBody {
  category: string;
  custom?: boolean;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

// ===== QUIZ DB CACHE: same category quiz = 1 AI call =====
const QUIZ_CACHE_KEY = 'quiz_cache';

async function getDBCachedQuiz(category: string): Promise<string | null> {
  const cached = await db.responseCache.findFirst({
    where: { questionHash: `quiz:${category}`, mode: 'quiz' },
  });
  if (cached) {
    await db.responseCache.update({
      where: { id: cached.id },
      data: { hitCount: { increment: 1 }, updatedAt: new Date() },
    });
    console.log(`[QUIZ CACHE HIT] category=${category}, hitCount=${cached.hitCount + 1}`);
    return cached.answer;
  }
  return null;
}

async function setDBCachedQuiz(category: string, quizJson: string): Promise<void> {
  try {
    await db.responseCache.upsert({
      where: { id: `quiz_${category}` },
      update: { answer: quizJson, updatedAt: new Date() },
      create: {
        id: `quiz_${category}`,
        questionHash: `quiz:${category}`,
        mode: 'quiz',
        question: category,
        answer: quizJson,
        hitCount: 0,
      },
    });
    console.log(`[QUIZ CACHE] Stored quiz for category=${category}`);
  } catch (err) {
    console.error('[QUIZ CACHE] Store error:', err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: QuizRequestBody = await request.json();
    const { category } = body;

    if (!category || typeof category !== 'string') {
      return NextResponse.json({ error: 'التصنيف مطلوب' }, { status: 400 });
    }

    const isCustom = body.custom === true;

    // For custom categories, skip validation and generate dynamically
    if (!isCustom && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `التصنيف غير صالح. التصنيفات المتاحة: ${VALID_CATEGORIES.join('، ')}` },
        { status: 400 }
      );
    }

    // ===== CHECK DB CACHE FIRST =====
    const cachedQuiz = await getDBCachedQuiz(category);
    if (cachedQuiz) {
      try {
        const quizData = JSON.parse(cachedQuiz);
        const questions: QuizQuestion[] = quizData.questions.map((q: { question: string; options: string[]; correctAnswer: number }, index: number) => ({
          id: `q_${Date.now()}_${index}`,
          question: filterArabicText(q.question),
          options: q.options.slice(0, 4).map((opt: string) => filterArabicText(opt)),
          correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        }));
        if (questions.length >= 10) {
          return NextResponse.json({
            questions: questions.slice(0, 10),
            category,
            isCustom,
            total: 10,
            provider: 'cache',
          });
        }
      } catch {
        // Cache parse failed, generate new
      }
    }

    const categoryPrompt = CATEGORY_PROMPTS[category] || (isCustom ? `مجال: ${category}` : '');

    // ULTRA-COMPACT system prompt for quiz generation
    const systemPrompt = `أنت خبير في توليد أسئلة اختبار: ${categoryPrompt}.
أنشئ 10 أسئلة متعددة الخيارات (4 خيارات). الأسئلة عميقة. العربية فقط.
أجب بصيغة JSON فقط:
{"questions":[{"question":"نص","options":["أ","ب","ج","د"],"correctAnswer":0}]}`;

    const aiResult = await callAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `أنشئ 10 أسئلة في: ${category}. العربية فقط.` },
      ],
      { temperature: 0.8, maxTokens: 2048 }
    );

    const responseText = aiResult.content;

    // Parse JSON from response
    let quizData: { questions: Array<{ question: string; options: string[]; correctAnswer: number }> };

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quizData = JSON.parse(jsonMatch[0]);
      } else {
        quizData = JSON.parse(responseText);
      }
    } catch {
      const cleanedText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        quizData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse quiz response');
      }
    }

    // Store in DB cache for future requests
    if (quizData.questions && quizData.questions.length >= 10) {
      await setDBCachedQuiz(category, JSON.stringify(quizData));
    }

    // Validate, filter, and format questions
    const questions: QuizQuestion[] = quizData.questions.map((q, index) => ({
      id: `q_${Date.now()}_${index}`,
      question: filterArabicText(q.question),
      options: q.options.slice(0, 4).map((opt: string) => filterArabicText(opt)),
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
    }));

    while (questions.length < 10) {
      questions.push({
        id: `q_${Date.now()}_${questions.length}`,
        question: 'سؤال احتياطي - لم يتم توليد كافة الأسئلة',
        options: ['خيار أ', 'خيار ب', 'خيار ج', 'خيار د'],
        correctAnswer: 0,
      });
    }

    return NextResponse.json({
      questions: questions.slice(0, 10),
      category,
      isCustom,
      total: 10,
      provider: aiResult.provider,
    });
  } catch (error) {
    console.error('Quiz Generation Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء توليد الأسئلة. يرجى المحاولة مرة أخرى.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    categories: VALID_CATEGORIES,
    descriptions: CATEGORY_PROMPTS,
  });
}
