import { NextRequest, NextResponse } from 'next/server';
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

// ===== Random topic sub-areas for infinite variety =====
const RANDOM_TOPICS: Record<string, string[]> = {
  'عقائد': [
    'التوحيد والصفات الإلهية', 'النبوة والمعجزات', 'الإمامة والعصمة', 'المعاد والبرزخ', 'العدل الإلهي والقضاء والقدر',
    'البداء الإلهي', 'الشفاعة والتوسل', 'الرؤية الأخروية', 'خلق القرآن', 'منزلة العقل والحسن والقبح',
    'الناسخ والمنسوخ في العقائد', 'مسألة الرجعة', 'مسألة التقييم والتفويض', 'الولادة والشهادة', 'الفضائل والمناقب'
  ],
  'منطق': [
    'القضايا الحملية والشرطية', 'القياس الاقتراني والاستثنائي', 'البرهان والاستقراء والتمثيل', 'المباشر وغير المباشر',
    'مباحث اللفظ والمفاهيم', 'الحدود والرسوم', 'القواعد المنطقية', 'الخوارزميات المنطقية', 'المنطق الرمزي', 'المنطق عند السيد الشهيد الصدر'
  ],
  'علم الكلام': [
    'الإلهيات العليا', 'النبوات والمعجزات', 'الإمامة والنص', 'المعاد الجسماني', 'دلائل الصانع',
    'مسألة التثليث والتنزيه', 'دلائل النبوة العامة والخاصة', 'دلائل الإمامة من العقل والنقل', 'مسألة التشبيه والتنزيه', 'القضاء والقدر'
  ],
  'نحو': [
    'إعراب الآيات القرآنية', 'إعراب الأحاديث النبوية', 'المسائل الخلافية بصري كوفي', 'النواسخ في اللغة العربية',
    'أسماء الأفعال والمشتقات', 'الجمل التي لها محل من الإعراب', 'الحال والتمييز', 'الإضافة وأنواعها', 'التوابع والتوابيع', 'الأساليب النحوية المتقدمة'
  ],
  'فقه': [
    'الصلاة اليومية وأحكامها', 'الصيام وأحكامه', 'الخمس والزكاة', 'الحج والعمرة', 'المعاملات والعقود',
    'القواعد الفقهية الأربع', 'التعادل والتراحي', 'الأمر بين الأمرين', 'حلية المشكوك', 'فقه الصلاة المعطلة'
  ],
  'أهل البيت': [
    'حياة النبي محمد (ص)', 'حياة أمير المؤمنين (ع)', 'حياة فاطمة الزهراء (س)', 'حياة الحسن والحسين (ع)', 'حياة الإمام الصادق (ع)',
    'حياة الإمام الرضا (ع)', 'واقعة كربلاء', 'واقعة الغدير', 'مظلومية أهل البيت', 'روايات وأحاديث الأئمة'
  ],
  'الإمامة': [
    'دلائل الإمامة من القرآن', 'دلائل الإمامة من السنة', 'دلائل الإمامة من العقل', 'شرائط الإمام وعصمته',
    'النص على الأئمة الاثني عشر', 'الغيبة الصغرى والسفراء', 'الغيبة الكبرى والنيابة', 'الإمام المهدي (عج) في الروايات', 'مسألة الانتظار', 'فلسفة الإمامة'
  ],
  'التاريخ الشيعي': [
    'عصر النبي (ص) والخلافات الأولى', 'أحداث السقيفة', 'عهود الخلفاء', 'عصر الإمام أمير المؤمنين (ع)',
    'مأساة كربلاء وأبعادها', 'تاريخ الحوزات العلمية', 'تاريخ المراجع والعلماء', 'المذابح التاريخية', 'تاريخ الشيعة في العصر الحديث', 'الشيعة في الأندلس والمغرب'
  ],
  'التفسير': [
    'التفسير بالمأثور', 'التفسير العقلي والفلسفي', 'التفسير الموضوعي', 'تفسير آيات الأحكام',
    'آيات الإمامة في القرآن', 'آيات التوحيد', 'المنسوخ والناسخ في التفسير', 'المحكم والمتشابه', 'تفسير سورة البقرة', 'تفسير سورة آل عمران'
  ],
  'الرجال': [
    'الجرح والتعديل عند الشيعة', 'طبقات الرواة', 'الفهرست للشيخ الطوسي', 'الرجال للنجاشي', 'معجم رجال الحديث للخوئي',
    'الرواة عن النبي (ص)', 'رواة آل البيت (ع)', 'الكتب الرجالية المتقدمة', 'الوثاقة والضعف في الرجال', 'مشاهير رواة الشيعة'
  ],
};

function getRandomSubtopics(category: string): string {
  const topics = RANDOM_TOPICS[category];
  if (!topics) return category;
  // Pick 3-5 random subtopics each time for variety
  const shuffled = [...topics].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3 + Math.floor(Math.random() * 3));
  return selected.join('، ');
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

    const categoryPrompt = CATEGORY_PROMPTS[category] || (isCustom ? `مجال: ${category}` : '');
    const randomSubtopics = getRandomSubtopics(category);
    const uniqueSeed = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

    // System prompt for quiz generation - VERY HARD, Shia-specific, INFINITELY VARIABLE
    const systemPrompt = `أنت خبير عميق في العلوم الإسلامية الشيعية الإمامية الاثني عشرية على مستوى البحث الخارج في الحوزات العلمية.

مجال الأسئلة العام: ${categoryPrompt}
المحاور المطلوب التركيز عليها في هذه المرة: ${randomSubtopics}

⚠️ تعليمات حرجة لضمان التنوع اللانهائي:
1. الأسئلة يجب أن تكون صعبة جداً على مستوى البحث الخارج والحوزة العلمية
2. تختص بالمنهج الشيعي الإمامي الاثني عشري حصراً
3. يجب أن تغطي المحاور المذكورة أعلاه (${randomSubtopics}) بشكل متعمق
4. لا تكرر أبداً الأسئلة الشائعة أو المعروفة أو المعتادة - ابحث عن مسائل نادرة ودقيقة
5. كل سؤال يجب أن يكون فريداً تماماً - استخدم مسائل من كتب مرجعية متخصصة ومخطوطات
6. الخيارات الأربعة يجب أن تكون مقنعة ومتشابهة الصعوبة بحيث لا يمكن التخمين
7. الإجابة الصحيحة يجب أن تحتاج لمعرفة عميقة بالموضوع
8. اكتب الأسئلة بلغة عربية فصيحة أكاديمية
9. تنوّع بين أسئلة نصية وتحليلية واستدلالية وتراثية
10. رمز التوليد الفريد: ${uniqueSeed} - تجاهله ولكن اذكره لضمان أن كل طلب ينتج أسئلة مختلفة تماماً

أجب بصيغة JSON فقط بدون أي نص إضافي:
{"questions":[{"question":"نص السؤال","options":["خيار أ","خيار ب","خيار ج","خيار د"],"correctAnswer":0}]}`;

    const aiResult = await callAI(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `أنشئ 10 أسئلة اختبار في مجال: ${category}. المحاور: ${randomSubtopics}.\n\nأجب بصيغة JSON فقط بدون أي نص إضافي أو شرح أو مقدمات:\n{"questions":[{"question":"نص السؤال","options":["خيار أ","خيار ب","خيار ج","خيار د"],"correctAnswer":0}]}` },
      ],
      { temperature: 0.7, maxTokens: 6000 }
    );

    const responseText = aiResult.content;

    // Check if AI returned a valid response (not an error message)
    if (!responseText || responseText.includes('لا توجد مفاتيح') || responseText.length < 50) {
      console.error('[QUIZ] Invalid AI response:', responseText?.substring(0, 100));
      return NextResponse.json(
        { error: 'خدمة الذكاء الاصطناعي غير متاحة حالياً. يرجى المحاولة لاحقاً.' },
        { status: 503 }
      );
    }

    // Parse JSON from response - multiple extraction strategies
    let quizData: { questions: Array<{ question: string; options: string[]; correctAnswer: number }> };

    try {
      const cleanedText = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      // Strategy 1: Direct JSON parse
      try {
        quizData = JSON.parse(cleanedText);
      } catch {
        // Strategy 2: Find JSON object in text
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          quizData = JSON.parse(jsonMatch[0]);
        } else {
          // Strategy 3: Find JSON array (questions only)
          const arrMatch = cleanedText.match(/\[[\s\S]*\]/);
          if (arrMatch) {
            quizData = { questions: JSON.parse(arrMatch[0]) };
          } else {
            throw new Error('No JSON found in response');
          }
        }
      }
      
      if (!quizData.questions || !Array.isArray(quizData.questions)) {
        throw new Error('No questions array in response');
      }
    } catch (parseErr) {
      console.error('[QUIZ] JSON parse error:', parseErr);
      console.error('[QUIZ] Raw response (first 500 chars):', responseText?.substring(0, 500));
      return NextResponse.json(
        { error: 'حدث خطأ في معالجة الأسئلة. يرجى المحاولة مرة أخرى.' },
        { status: 500 }
      );
    }

    // Validate and format questions - filter out invalid ones
    const validQuestions = quizData.questions.filter(q => 
      q.question && q.question.trim().length > 5 &&
      q.options && Array.isArray(q.options) && q.options.length >= 2 &&
      typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < q.options.length
    );

    const questions: QuizQuestion[] = validQuestions.slice(0, 10).map((q, index) => ({
      id: `q_${Date.now()}_${index}`,
      question: filterArabicText(q.question),
      options: q.options.slice(0, 4).map((opt: string) => filterArabicText(opt)),
      correctAnswer: q.correctAnswer,
    }));

    if (questions.length === 0) {
      return NextResponse.json(
        { error: 'لم يتم توليد أسئلة صالحة. يرجى المحاولة مرة أخرى.' },
        { status: 500 }
      );
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
