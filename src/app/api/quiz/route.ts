import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callAI } from '@/lib/aiProvider';
import { filterArabicText } from '@/lib/arabicFilter';

const CATEGORY_PROMPTS: Record<string, string> = {
  'عقائد': 'العقائد الشيعية الإمامية الاثني عشرية: التوحيد بأبعاده، النبوة العامة والخاصة، الإمامة وعصمة الأئمة، المعاد والبرزخ، العدل الإلهي، الجبر والتفويض والبين بين، البداء، الشفاعة، التوسل، الرؤية، القضاء والقدر، مسألة خلق القرآن، منزلة العقل، الحسن والقبح العقليين',
  'منطق': 'علم المنطق الإسلامي والفلسفي: القياس، البرهان، الاستقراء، التمثيل، المقدمات والنتائج، القضايا الحملية وشرطية، الاستدلال، مباحث اللفظ، المنطق الأرسطوذكلي وتطويره عند المسلمين كالفارابي وابن سينا والخواجه نصير الدين الطوسي والسيد الشهيد الصدر',
  'علم الكلام': 'علم الكلام الشيعي: المسائل الكلامية الدقيقة، الإلهيات، النبوات، الإمامة، المعاد، دلائل الصانع، البراهين العقلية على وجود الله، مسألة التثليث والتنزيه، دلائل النبوة، دلائل الإمامة، إثبات المعاد الجسماني',
  'نحو': 'النحو العربي المتقدم: إعراب القرآن الكريم بإتقان، إعراب الأحاديث النبوية، القواعد النحوية الدقيقة، المسائل الخلافية بين البصريين والكوفيين، علم المعاني والبيان والبديع، إعراب الآيات المشكلة',
  'فقه': 'الفقه الإمامي الشيعي: العبادات (الصلاة والصيام والخمس والزكاة والحج والجهاد)، المعاملات، الأحوال الشخصية، القواعد الفقهية (لا ضرر ولا ضرار، نفي السبيل، الاستصحاب، قاعدة اليد)، الفقه المقارن بين المذاهب، أدلة الأحكام الكتاب والسنة والإجماع والعقل',
  'أهل البيت': 'سيرة أئمة أهل البيت (عليهم السلام): حياة النبي محمد (ص) والأئمة الاثني عشر، مناقبهم ومظلوميتهم، تاريخهم السياسي والعلمي، رواياتهم وأحاديثهم، الكتب المؤلفة فيهم، الأحداث الكبرى كواقعة كربلاء والغدير',
  'الإمامة': 'عقيدة الإمامة في المذهب الشيعي: دلائل الإمامة من القرآن والسنة والعقل، شرائط الإمام، العصمة، النص على الأئمة الاثني عشر، الغيبة الصغرى والكبرى للإمام المهدي (عج)، النيابة العامة والخاصة',
  'التاريخ الشيعي': 'التاريخ السياسي والعلمي للشيعة: من عصر النبي (ص) إلى اليوم، أحداث السقيفة والغدير وكربلاء، تاريخ الحوزات العلمية، تاريخ المراجع والعلماء، المذابح والاضطهادات التاريخية بحق الشيعة',
  'التفسير': 'تفسير القرآن الكريم وفق المذهب الشيعي: التفسير بالمأثور، التفسير العقلي والفلسفي، التفسير الموضوعي، المنسوخ والناسخ، المحكم والمتشابه، أسباب النزول، تفاسير الشيعة كتفسير القمي والعياشي والتبيان وال مجمع البيان والميزان',
  'الرجال': 'علم الرجال الشيعي: الجرح والتعديل، رواة الحديث من الشيعة، طبقات الرواة، الكتب الرجالية كالفهرست للشيخ الطوسي والرجال للنجاشي واختيار معرفة الرجال للطوسي ومعجم رجال الحديث للخوئي',
};

const VALID_CATEGORIES = ['عقائد', 'منطق', 'علم الكلام', 'نحو', 'فقه', 'أهل البيت', 'الإمامة', 'التاريخ الشيعي', 'التفسير', 'الرجال'];

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

    // System prompt for quiz generation - VERY HARD, Shia-specific
    const systemPrompt = `أنت خبير عميق في العلوم الإسلامية الشيعية الإمامية الاثني عشرية على مستوى البحث الخارج في الحوزات العلمية.

مجال الأسئلة: ${categoryPrompt}

قواعد توليد الأسئلة:
1. الأسئلة يجب أن تكون صعبة جداً على مستوى البحث الخارج والحوزة العلمية
2. تختص بالمنهج الشيعي الإمامي الاثني عشري حصراً
3. تغطي تفاصيل دقيقة ومسائل متقدمة ونادرة لا يعرفها إلا المتخصصون
4. كل سؤال يجب أن يكون فريداً ومختلفاً عن الأسئلة السابقة
5. الخيارات الأربعة يجب أن تكون مقنعة ومتشابهة الصعوبة بحيث لا يمكن التخمين
6. الإجابة الصحيحة يجب أن تحتاج لمعرفة عميقة بالموضوع
7. لا تكرر أسئلة شائعة أو معروفة، اكتب أسئلة نادرة ومعمقة
8. اكتب الأسئلة بلغة عربية فصيحة أكاديمية

أجب بصيغة JSON فقط بدون أي نص إضافي:
{"questions":[{"question":"نص السؤال","options":["خيار أ","خيار ب","خيار ج","خيار د"],"correctAnswer":0}]}`;

    const aiResult = await callAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `أنشئ 10 أسئلة اختبار صعبة جداً ومتنوعة ونادرة في: ${category}. الأسئلة يجب أن تكون على أعلى مستوى من الصعوبة وتختص بالفكر الشيعي الإمامي. لا تكرر الأسئلة الشائعة. أجب بصيغة JSON فقط.` },
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
