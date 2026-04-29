import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/aiProvider';

const CATEGORY_PROMPTS: Record<string, string> = {
  'عقائد': 'أسئلة في العقيدة الإسلامية تشمل أصول الإيمان والتوحيد وأسماء الله وصفاته والقضاء والقدر والإيمان بالملائكة والكتب والرسل واليوم الآخر',
  'منطق': 'أسئلة في علم المنطق تشمل المقدمات والنتائج والقياس والبرهان والحدود والأقيسة المنطقية',
  'علم': 'أسئلة في علوم القرآن والسنة وتفسير القرآن وعلوم الحديث ومصطلحاته',
  'نحو': 'أسئلة في النحو العربي تشمل الإعراب والبناء والجمل وأنواعها والأفعال والأسماء والحروف',
  'فقه': 'أسئلة في الفقه الإسلامي تشمل العبادات والمعاملات والأحوال الشخصية والأخلاق',
};

const VALID_CATEGORIES = ['عقائد', 'منطق', 'علم', 'نحو', 'فقه'];

interface QuizRequestBody {
  category: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: QuizRequestBody = await request.json();
    const { category } = body;

    if (!category || typeof category !== 'string') {
      return NextResponse.json({ error: 'التصنيف مطلوب' }, { status: 400 });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `التصنيف غير صالح. التصنيفات المتاحة: ${VALID_CATEGORIES.join('، ')}` },
        { status: 400 }
      );
    }

    const categoryPrompt = CATEGORY_PROMPTS[category] || '';

    const systemPrompt = `أنت خبير في توليد أسئلة اختبار في المجال التالي: ${categoryPrompt}. 
قم بتوليد 10 أسئلة اختبار متعددة الخيارات (4 خيارات لكل سؤال). 
الأسئلة يجب أن تكون عميقة وتختبر الفهم الحقيقي وليس مجرد الحفظ.
كل خيار يجب أن يكون معقولًا ومقنعًا.
أجب فقط بصيغة JSON التالية بدون أي نص إضافي:
{
  "questions": [
    {
      "question": "نص السؤال",
      "options": ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"],
      "correctAnswer": 0
    }
  ]
}
حيث correctAnswer هو فهرس الإجابة الصحيحة (0، 1، 2، أو 3).`;

    // Use the shared AI provider (load balancer → direct API → ZAI fallback)
    const aiResult = await callAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `أنشئ 10 أسئلة اختبار في تصنيف: ${category}. الأسئلة يجب أن تكون باللغة العربية.` },
      ],
      { temperature: 0.8, maxTokens: 4096 }
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

    // Validate and format questions
    const questions: QuizQuestion[] = quizData.questions.map((q, index) => ({
      id: `q_${Date.now()}_${index}`,
      question: q.question,
      options: q.options.slice(0, 4),
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
