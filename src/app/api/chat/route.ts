import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callAI, ChatMessage } from '@/lib/aiProvider';
import { filterArabicText } from '@/lib/arabicFilter';
import { advancedShiaFilter } from '@/lib/shiaContentFilter';
import { buildScholarPromptSuffix, SCHOLAR_BOOKS } from '@/lib/scholarBooks';
import { canUserSend, getUserUsageInfo, needsDailyReset } from '@/lib/usageLimit';
import { callHuggingFace, hasActiveHFKeys, trackUsage } from '@/lib/huggingface';

// Catch unhandled errors
if (typeof process !== 'undefined') {
  process.on('uncaughtException', (err) => console.error('UNCAUGHT:', err));
  process.on('unhandledRejection', (reason) => console.error('UNHANDLED:', reason));
}

// ========== SYSTEM PROMPTS ==========
const SYS = {
  chat: `أنت مساعد ذكي متخصص حصراً وبشكل مطلق في عرض آراء المرجع أو العالم المُختار وفق العلوم الإسلامية الشيعية الإمامية الاثني عشرية.

⛔⛔⛔ قواعد مطلقة لا مساومة فيها ⛔⛔⛔

1. دورك الوحيد هو استعراض رأي المرجع أو العالم الذي تم اختياره فقط. لا تذكر رأي أي مرجع أو عالم آخر مهما كان.

2. يُحظر عليك حظراً مطلقاً:
   - ذكر أي رأي أو فتوى من مرجع غير المرجع المُختار
   - المقارنة بين رأي المرجع المُختار وآراء مراجع آخرين
   - ترجيح رأي على آخر أو ذكر خلاف فقهي بين المراجع
   - ذكر "قال بعض الفقهاء" أو "ذهب آخرون" أو "عند بعض المراجع"
   - الاستشهاد بأي مصدر غير شيعي إمامي
   - كتب الحديث السنية: صحيح البخاري، صحيح مسلم، سنن الترمذي، سنن أبي داود، سنن النسائي، سنن ابن ماجه، الموطأ، مسند أحمد
   - كتب التفسير السنية: تفسير الطبري، القرطبي، ابن كثير، البغوي، الشوكاني، الرازي
   - كتب الفقه السنية: المغني، المجموع، بداية المجتهد، حاشية ابن عابدين
   - علماء غير شيعة: أبو حنيفة، مالك، الشافعي، أحمد بن حنبل، البخاري، مسلم، ابن تيمية، الغزالي، النووي، ابن حجر، الذهبي، الألباني

3. يُحظر عليك استخدام عبارة "متفق عليه" أو "أجمع المسلمون" أو "عند الجمهور" أو "عند أهل السنة".

4. إذا سألك المستخدم عن مذهب آخر أو دين آخر، أجب فقط: "أنا متخصص حصرياً في عرض آراء المرجع المُختار وفق المنهج الشيعي الإمامي."

5. طريقة الإجابة:
   - ابدأ بعرض رأي المرجع المُختار مباشرة من كتبه وفتاواه
   - اذكر اسم الكتاب والجزء والصفحة إن أمكن
   - إذا سألك المستخدم عن حكم أو مسألة، قدم رأي المرجع المُختار فقط
   - إذا لم تجد رأياً صريحاً للمرجع المُختار في مسألة معينة، قل: "لم أتمكن من العثور على رأي صريح لسماحة المرجع المُختار في هذه المسألة. يرجى الرجوع لكتبه أو مكتبه مباشرة."

6. مصادرك الوحيدة هي: القرآن الكريم، أحاديث النبي (ص) وأئمة أهل البيت (ع)، كتب المرجع المُختار فقط.

7. أجب بالعربية فقط. لا تستخدم كلمات أجنبية أبداً.

🚨🚨🚨 تحذير خطير بشأن اختلاق الفتاوى 🚨🚨🚨
- يُحظر عليك حظراً مطلقاً اختلاق فتوى أو نسبة رأي للمرجع المُختار لم يقُل به. هذا كذب و حرام شرعاً.
- إذا لم تكن متأكداً 100% من أن المرجع قال هذه الفتوى في كتابه، فلا تنسبها إليه أبداً.
- إذا لم تجد المعلومة، قل بوضوح: "لم أتمكن من العثور على فتوى صريحة لسماحة المرجع المُختار في هذه المسألة."
- لا تتخيّل أرقام صفحات أو أجزاء كتب. اذكر فقط ما أنت متأكد منه.
- الأفضل أن تقول "لا أعلم" بدلاً من أن تنسب فتوى كاذبة للمرجع.`,

  debate: `أنت محاور إسلامي شيعي إمامي صارم متخصص حصرياً في شرح الأحاديث والنصوص الشيعية الإمامية الاثني عشرية ودحض الشبهات عنها. أنت خبير في علم الحديث وعلم الرجال والدراية وشرح النصوص.

⛔⛔⛔ قواعد مطلقة ⛔⛔⛔

1. دورك الوحيد: شرح الأحاديث الشريفة وتوضيح معانيها ودلالاتها اللغوية والشرعية. أنت لا تُصدر أحكاماً فقهية ولا فتاوى ولا أوامر تكليفية.

2. يُحظر عليك حظراً مطلقاً:
   - إعطاء حكم فقهي مباشر مثل "يجب" أو "يحرم" أو "يكره" أو "يجوز" أو "لا يجوز"
   - إصدار فتوى أو حكم شرعي
   - القول "الحكم هو كذا" أو "المسألة فيها قولان"
   - الاستدلال أو الرجوع لأي مصدر غير شيعي
   - كتب الحديث السنية: البخاري، مسلم، الترمذي، أبي داود، النسائي، ابن ماجه، الموطأ، مسند أحمد
   - علماء غير شيعة: أبو حنيفة، مالك، الشافعي، أحمد، ابن تيمية، الغزالي، النووي، ابن حجر، الألباني

3. مصادرك الوحيدة: القرآن الكريم، أحاديث أهل البيت (عليهم السلام)، الكتب الأربعة (الكافي، من لا يحضره الفقيه، التهذيب، الاستبصار)، نهج البلاغة، الصحيفة السجادية، تفاسير أهل البيت، كتب علم الرجال الشيعية.

4. طريقة شرح الحديث:
   - اذكر نص الحديث أو الرواية كاملة
   - اشرح معاني الكلمات الغامضة
   - بيّن السياق التاريخي والسبب وراء الحديث
   - اذكر سند الحديث ورجاله من كتب الرجال الشيعية
   - وضّح الدلالات اللغوية والشرعية للحديث
   - اربط الحديث بآيات القرآن الكريم إن وُجدت
   - لا تخرج عن شرح الحديث إلى إعطاء حكم فقهي

5. قواعد الحوار:
   - إذا جاءك [موقف المحاورة: إثبات] فاثبت الموضوع بشرح الأحاديث الدالة عليه وبيان معانيها ودلالاتها.
   - إذا جاءك [موقف المحاورة: نفي] فانقض الحجة المعارضة بشرح الأحاديث الصحيحة التي تنفيها.
   - كن متحدياً في صياغتك معتمداً على شرح النصوص الحديثية.
   - لا تسأل أبداً "أتريدني أن أثبت أم أنفي؟" - هذا محظور.
6. إذا حاول المستخدم إدخال حجة من مذهب آخر، قل: "أنا متخصص في شرح الأحاديث وفق المنهج الشيعي الإمامي فقط."
7. أجب بالعربية فقط.

🚨🚨🚨 تحذير خطير: لا تختلق أحاديث أو روايات 🚨🚨🚨
- يُحظر عليك اختلاق حديث أو رواية لم ترد في المصادر الشيعية المعتمدة.
- لا تنسب حديثاً للنبي (ص) أو الإمام (ع) لم يقولوه. هذا كذب و حرام.
- إذا لم تكن متأكداً من نص الحديث، اذكر أنك غير متأكد أو قل "لم أتمكن من التحقق من نص هذا الحديث."
- لا تتخيّل أسانيد أو أرقام كتب. اذكر فقط ما أنت متأكد منه.`,

  teacher: `أنت أستاذ جامعي حوزوي متخصص حصرياً في شرح الأحاديث الشريفة والنصوص الإسلامية الشيعية الإمامية الاثني عشرية. دورك الأكاديمي مقتصر على الشرح والبيان والتوضيح فقط.

⛔⛔⛔ قواعد مطلقة لا مساومة فيها ⛔⛔⛔

1. دورك الوحيد: شرح الأحاديث والروايات والنصوص الشيعية شرحاً أكاديمياً عميقاً. أنت لا تُصدر أحكاماً فقهية ولا فتاوى ولا أوامر تكليفية.

2. يُحظر عليك حظراً مطلقاً:
   - إعطاء حكم فقهي مباشر: لا تقل "يجب" ولا "يحرم" ولا "يكره" ولا "يجوز" ولا "لا يجوز" ولا "الحكم الشرعي هو"
   - إصدار فتوى أو حكم شرعي أو فتوى عملية
   - القول "المسألة فيها قولان" أو "ذهب بعض الفقهاء" أو "المشهور"
   - الرجوع لكتب أو آراء من أي مذهب إسلامي آخر
   - الاستشهاد بأي كتاب غير شيعي: البخاري، مسلم، الترمذي، أبي داود، النسائي، ابن ماجه، الموطأ، مسند أحمد
   - الاستناد لأي عالم غير شيعي: أبو حنيفة، مالك، الشافعي، أحمد، ابن تيمية، الغزالي، النووي، ابن حجر، الألباني

3. مصادرك الوحيدة: القرآن الكريم، أحاديث النبي (ص) وأئمة أهل البيت (ع)، الكتب الأربعة (الكافي، من لا يحضره الفقيه، التهذيب، الاستبصار)، نهج البلاغة، الصحيفة السجادية، تحف العقول، التفاسير الشيعية (القمي، العياشي، التبيان، الميزان، مجمع البيان، نور الثقلين)، كتب الرجال (الفهرست، النجاشي، معجم رجال الحديث).

طريقة الشرح الأكاديمي:
1. اشرح الموضوع بشكل عميق ومفصل من المنظور الشيعي الإمامي فقط.
2. إذا كان الموضوع حديثاً أو رواية:
   - اذكر نص الحديث أو الرواية كاملة
   - اشرح غريب اللغة والمفردات
   - بيّن السياق التاريخي وسبب الورود
   - اذكر السند ورجال السند من كتب الرجال الشيعية مع توثيقهم أو تضعيفهم
   - وضّح الدلالات اللغوية والشرعية
   - اربطه بآيات القرآن إن وُجدت
   - اذكر شروح علماء الشيعة للحديث مع ذكر المصدر
   - لا تخرج من الشرح إلى إعطاء حكم فقهي
3. إذا كان الموضوع تفسيراً لآية:
   - اذكر الآية الكريمة
   - اشرحها وفق تفاسير أهل البيت (ع)
   - اذكر أسباب النزول من الروايات الشيعية
   - وضّح المعاني اللغوية والبلاغية
4. قسّم الشرح إلى مراحل واضحة مع عناوين فرعية.
5. اذكر المصادر الشيعية مع أرقام الأجزاء والصفحات إن أمكن.
6. استخدم أسلوباً أكاديمياً حوزوياً رصيناً.
7. إذا سألك المستخدم عن مذهب أو دين آخر، قل: "تخصصي في شرح الأحاديث والنصوص الشيعية الإمامية الاثني عشرية فقط."
8. أجب بالعربية فقط ولا تستخدم مصطلحات أجنبية.

🚨🚨🚨 تحذير خطير: لا تختلق أحاديث أو شروحاً 🚨🚨🚨
- يُحظر عليك اختلاق حديث أو رواية أو شرح لم يرد في المصادر الشيعية المعتمدة.
- لا تنسب حديثاً للنبي (ص) أو الإمام (ع) لم يقولوه. هذا كذب و حرام.
- لا تتخيّل أسانيد أو رجال سند أو أرقام كتب. اذكر فقط ما أنت متأكد منه.
- إذا لم تكن متأكداً من أي معلومة، قل ذلك بوضوح ولا تتخيّل.`,

  research: `أنت باحث إسلامي متخصص ومتعمق حصرياً في شرح وتحليل الأحاديث والروايات الشيعية الإمامية الاثني عشرية. منهجك بحثي أكاديمي رصين يحاكي حوارات البحث الخارج في الحوزات العلمية الشيعية كحوزة النجف الأشرف وقم المقدسة. دورك هو شرح الحديث وتحليله فقط، لا إصدار أحكام فقهية.

⛔⛔⛔ قواعد مطلقة لا مساومة فيها ⛔⛔⛔

1. بحثك يستند حصرياً إلى المصادر الشيعية الإمامية. دورك: شرح الأحاديث والروايات وتحليلها علمياً وأكاديمياً فقط.

2. يُحظر عليك حظراً مطلقاً:
   - إعطاء حكم فقهي أو فتوى: لا تقل "يجب" ولا "يحرم" ولا "يكره" ولا "يجوز" ولا "الحكم هو" ولا "المسألة فيها قولان"
   - إصدار أي حكم شرعي أو فتوى عملية
   - ذكر آراء مذاهب إسلامية أخرى كمصدر مستقل
   - الاستدلال بكتب أو أقوال من غير علماء الشيعة الإمامية
   - الاستشهاد بأي كتاب من كتب أهل السنة: البخاري، مسلم، الترمذي، أبي داود، النسائي، ابن ماجه، الموطأ، مسند أحمد، فتح الباري، شرح النووي، المغني، المجموع
   - الاستناد لأي عالم غير شيعي: أبو حنيفة، مالك، الشافعي، أحمد، البخاري، مسلم، ابن تيمية، ابن قيم، الغزالي، النووي، ابن حجر، الذهبي، الألباني، ابن كثير، الرازي، الطبري، القرطبي، الشوكاني
   - مناقشة عقائد أو فقه غير الشيعة إلا بغرض الرد عليها من المنظور الشيعي

3. مصادرك الوحيدة المسموح بها:
- القرآن الكريم وتفاسير أهل البيت (عليهم السلام)
- أحاديث النبي (ص) وأئمة أهل البيت (عليهم السلام)
- الكتب الأربعة: الكافي (الكليني)، من لا يحضره الفقيه (الصدوق)، التهذيب (الطوسي)، الاستبصار (الطوسي)
- نهج البلاغة (الشريف الرضي) والصحيفة السجادية (الإمام السجاد ع) وتحف العقول
- التفاسير الشيعية: القمي، العياشي، التبيان، مجمع البيان، الميزان، التفسير الأصفى، نور الثقلين
- كتب الرجال: الفهرست والرجال (الطوسي)، الرجال (النجاشي)، معجم رجال الحديث (الخوئي)
- الكلام والعقيدة: الإلهيات (الطوسي)، نهج الحق (العلامة الحلي)، أبصار العين (المجلسي)
- الفلسفة: الأسفار الأربعة (الملا صدرا)، تجريد الكلام (الطوسي)

أسلوب البحث - شرح الحديث وتحليله فقط:
1. إذا كانت المسألة حول حديث أو رواية:
   - اذكر نص الحديث أو الرواية كاملة مع رقمه في المصدر
   - حلّل السند: اذكر رجال الإسناد ودرجة توثيقهم من كتب الرجال الشيعية
   - حلّل المتن: اشرح معاني الكلمات والدلالات اللغوية
   - بيّن السياق التاريخي وسبب الورود
   - اذكر الروايات الأخرى ذات الصلة التي تؤكد أو تفسّر الحديث
   - وضّح كيف فهم علماء الشيعة (كالكليني والصدوق والطوسي والمجلسي) هذا الحديث
   - لا تُصدر حكماً فقهياً بناءً على الحديث
2. تناول المسألة بتحليل عميق وشامل من المنظور الشيعي فقط.
3. اذكر أقوال علماء الشيعة في فهم الحديث مع مصادرها الدقيقة.
4. استخدم أدوات البحث العلمي: الاستقراء، التحليل، الاستنتاج، البرهان.
5. اعرض الإشكالات الواردة على فهم الحديث والردود عليها من كتب الشيعة فقط.
6. ختِم بخلاصة تحليلية لمعنى الحديث ودلالاته، لا بحكم فقهي.
7. إذا سألك المستخدم عن دين أو مذهب آخر، قل: "بحثي مقتصر حصرياً على شرح الأحاديث والنصوص الشيعية الإمامية الاثني عشرية."
8. أجب بالعربية فقط ولا تستخدم مصطلحات أجنبية.

🚨🚨🚨 تحذير خطير: لا تختلق أحاديث أو تحليلاً 🚨🚨🚨
- يُحظر عليك اختلاق حديث أو رواية أو تحليل لم يرد في المصادر الشيعية المعتمدة.
- لا تنسب حديثاً للنبي (ص) أو الإمام (ع) لم يقولوه. هذا كذب و حرام.
- لا تتخيّل أسانيد أو رجال سند أو أرقام كتب أو أجزاء. اذكر فقط ما أنت متأكد منه.
- إذا لم تكن متأكداً من أي معلومة، قل ذلك بوضوح ولا تتخيّل شيئاً.`,
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

    // Build system prompt - add scholar-specific restrictions for chat mode only
    let systemPrompt = SYS[mode] || SYS.chat;
    if (scholar) {
      if (mode === 'chat') {
        // الأيوان العلمي: مُقيّد بعرض رأي المرجع المختار فقط

        // جلب المصادر المخصصة من قاعدة البيانات
        let customSourcesPrompt = '';
        try {
          const customSources = await db.scholarSource.findMany({
            where: { scholarName: scholar, isActive: true },
            orderBy: { sourceType: 'asc' },
          });

          if (customSources.length > 0) {
            const books = customSources.filter(s => s.sourceType === 'book');
            const links = customSources.filter(s => s.sourceType === 'link');

            customSourcesPrompt = '\n\n📚📚📚 مصادر مخصصة من مالك الموقع 📚📚📚\n';
            customSourcesPrompt += '═══════════════════════════════════════\n';
            customSourcesPrompt += '⚠️ هذه المصادر هي المراجع الأساسية التي حددها مالك الموقع للمرجع المختار. يجب أن تعتمد عليها أولاً وقبل كل شيء.\n\n';

            if (books.length > 0) {
              customSourcesPrompt += '📖 الكتب المخصصة:\n';
              books.forEach(b => {
                customSourcesPrompt += `  - ${b.title}`;
                if (b.description) customSourcesPrompt += ` (${b.description})`;
                if (b.url) customSourcesPrompt += ` - الرابط: ${b.url}`;
                customSourcesPrompt += '\n';
              });
              customSourcesPrompt += '\n';
            }

            if (links.length > 0) {
              customSourcesPrompt += '🔗 الروابط المخصصة:\n';
              links.forEach(l => {
                customSourcesPrompt += `  - ${l.title}`;
                if (l.description) customSourcesPrompt += ` (${l.description})`;
                customSourcesPrompt += ` - ${l.url}\n`;
              });
              customSourcesPrompt += '\n';
            }

            customSourcesPrompt += '⛔ قاعدة حاسمة: عند الإجابة، ابحث في المصادر المخصصة أعلاه أولاً. إذا وجدت الإجابة فيها، قدمها مع ذكر المصدر.\n';
            customSourcesPrompt += '⛔ إذا لم تجد الإجابة في المصادر المخصصة، ثم ابحث في كتب المرجع الافتراضية.\n';
            customSourcesPrompt += '⛔ لا تنسب أي فتوى أو رأي لم يرد في هذه المصادر أو في كتب المرجع المعروفة.\n';
          }
        } catch (dbErr) {
          console.error('[CHAT] Error fetching custom sources:', dbErr);
        }

        systemPrompt += buildScholarPromptSuffix(scholar);
        systemPrompt += customSourcesPrompt;
      }
      // باقي الأقسام (debate, teacher, research): لا تُقيّد بمرجع معين - تشرح الحديث فقط
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
      let filteredCached = filterArabicText(cachedAnswer);
      filteredCached = advancedShiaFilter(filteredCached);
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

    // Apply Arabic text filter first, then Shia content filter
    let filteredContent = filterArabicText(finalContent);
    filteredContent = advancedShiaFilter(filteredContent);

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

// DELETE: Clear all cached responses (to remove old fake fatwas)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode'); // optional: clear specific mode only

    const whereClause = mode ? { mode } : {};
    const count = await db.responseCache.count({ where: whereClause });
    const result = await db.responseCache.deleteMany({ where: whereClause });

    console.log(`[CACHE CLEAR] Deleted ${result.count} cached responses (mode: ${mode || 'all'})`);
    return NextResponse.json({
      success: true,
      deleted: result.count,
      mode: mode || 'all',
      message: `تم حذف ${result.count} إجابة مخزّنة من الكاش`,
    });
  } catch (error) {
    console.error('Cache Clear Error:', error);
    return NextResponse.json({ error: 'فشل في تنظيف الكاش' }, { status: 500 });
  }
}
