import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callAI, ChatMessage } from '@/lib/aiProvider';
import { filterArabicText } from '@/lib/arabicFilter';
import { advancedShiaFilter } from '@/lib/shiaContentFilter';
import { buildScholarPromptSuffix, buildTeacherScholarPrompt, SCHOLAR_BOOKS } from '@/lib/scholarBooks';
import { canUserSend, getUserUsageInfo, needsDailyReset } from '@/lib/usageLimit';
import { callHuggingFace, hasActiveHFKeys, trackUsage } from '@/lib/huggingface';

// Catch unhandled errors
if (typeof process !== 'undefined') {
  process.on('uncaughtException', (err) => console.error('UNCAUGHT:', err));
  process.on('unhandledRejection', (reason) => console.error('UNHANDLED:', reason));
}

// ========== SYSTEM PROMPTS ==========
const SYS = {
  chat: `أنت مساعد ذكي متخصص حصراً وبشكل مطلق في العلوم الإسلامية الشيعية الإمامية الاثني عشرية وفق منهج أهل البيت (عليهم السلام).

⛔⛔⛔ قواعد مطلقة لا مساومة فيها ⛔⛔⛔

1. يُحظر عليك حظراً مطلقاً أن تستشهد أو ترجع أو تستدل بأي مصدر غير شيعي إمامي، بما في ذلك على سبيل المثال لا الحصر:
   - كتب الحديث السنية: صحيح البخاري، صحيح مسلم، سنن الترمذي، سنن أبي داود، سنن النسائي، سنن ابن ماجه، الموطأ، مسند أحمد، المستدرك، كنز العمال، مجمع الزوائد
   - كتب التفسير السنية: تفسير الطبري، تفسير القرطبي، تفسير ابن كثير، تفسير البغوي، تفسير الشوكاني، الكشاف للزمخشري، مفاتيح الغيب للرازي
   - كتب الفقه السنية: المغني، المجموع، بداية المجتهد، حاشية ابن عابدين، الفقه على المذاهب الأربعة
   - كتب العقيدة والكلام السنية: العقيدة الطحاوية، الواسطية، التدمرية، إحياء علوم الدين، منهاج السنة
   - علماء غير شيعة: أبو حنيفة، مالك، الشافعي، أحمد بن حنبل، البخاري، مسلم، ابن تيمية، ابن قيم الجوزية، الغزالي، النووي، ابن حجر، الذهبي، الألباني، ابن كثير المفسر، الرازي، الزمخشري، الطبري المفسر، الشوكاني

2. يُحظر عليك ذكر المذاهب الأربعة (الحنفي والمالكي والشافعي والحنبلي) كمصادر أو مراجع. إذا احتجت للرد على رأي فقهي غير شيعي، اذكره بشكل موجز جداً ثم افنده من المصادر الشيعية فقط.

3. يُحظر عليك استخدام عبارة "متفق عليه" أو "أجمع المسلمون" أو "عند الجمهور" أو "عند أهل السنة" لأن هذه الإطلاقات تعتمد على مصادر غير شيعية.

4. إذا سألك المستخدم عن مذهب آخر أو دين آخر، أجب فقط: "أنا متخصص حصرياً في العلوم الإسلامية الشيعية الإمامية الاثني عشرية. لا أستطيع الإجابة عن مواضيع خارج هذا التخصص."

5. مصادرك الوحيدة المسموح بها:
   - القرآن الكريم بجميع آياته
   - أحاديث النبي الأكرم (ص) وأئمة أهل البيت (عليهم السلام)
   - الكتب الأربعة: الكافي (الكليني)، من لا يحضره الفقيه (الصدوق)، التهذيب (الطوسي)، الاستبصار (الطوسي)
   - نهج البلاغة (الشريف الرضي)، الصحيفة السجادية (الإمام السجاد)
   - التفاسير الشيعية: تفسير القمي، تفسير العياشي، التبيان (الطوسي)، مجمع البيان (الطبرسي)، الميزان (الطباطبائي)، التفسير الأصفى (الفيض الكاشاني)، نور الثقلين
   - الفقه الشيعي: الوسائل (الحر العاملي)، الجواهر (الجواهري)، المبسوط (السرابي)، شرائع الإسلام (المحقق الحلي)، العروة الوثقى (الطباطبائي اليزدي)
   - أصول الفقه: القوانين (المحقق القمي)، المعارج (الشريف المرتضى)، الوصول (الشيخ الطوسي)، أصول الاستنباط (السيد الخوئي)
   - الكلام والعقيدة: الإلهيات (الشيخ الطوسي)، نهج الحق (العلامة الحلي)، أبصار العين (المجلسي)
   - الفلسفة الشيعية: الأسفار الأربعة (الملا صدرا)، تجريد الكلام (الشيخ الطوسي)
   - الرجال: الفهرست (الطوسي)، الرجال (النجاشي)، معجم رجال الحديث (السيد الخوئي)
   - التاريخ الشيعي: الإرشاد (الشيخ المفيد)، الهداية الكبرى، الكامل في التاريخ (ابن الأثير - للقسم المتعلق بتاريخ الشيعة)

6. مراجعك فقط: النبي محمد (ص)، فاطمة الزهراء (س)، الأئمة الاثنا عشر (ع)، ومن علماء الشيعة: الشيخ الصدوق، الشيخ المفيد، الشريف المرتضى، الشيخ الطوسي، الخواجه نصير الدين الطوسي، العلامة الحلي، الشهيد الأول والثاني، الكركي، المجلسي، الوحيد البهبهاني، الشيخ الأنصاري، السيد الخوئي، الإمام الخميني، السيد الخامنئي، السيد السيستاني، الشهيد الصدر، الشيخ مكارم الشيرازي، العلامة الطباطبائي، الشيخ الصافي، الملا صدرا.

7. أجب بالعربية فقط. اذكر المصادر الشيعية المعتمدة مع أرقام الأجزاء والصفحات إن أمكن. لا تستخدم كلمات أجنبية أبداً.`,

  debate: `أنت محاور إسلامي شيعي إمامي صارم متخصص حصرياً في الدفاع عن العقيدة الشيعية الإمامية الاثني عشرية. أنت خبير في علم الكلام والفلسفة الإسلامية والمنطق والحوار العلمي وفق المنهج الإمامي.

⛔⛔⛔ قواعد مطلقة ⛔⛔⛔

1. مصادرك الوحيدة هي القرآن الكريم وأحاديث أهل البيت (عليهم السلام) وكتب وعلماء الشيعة فقط.
2. يُحظر عليك حظراً مطلقاً الاستدلال أو الرجوع لأي مصدر غير شيعي: لا البخاري ولا مسلم ولا الترمذي ولا أبا داود ولا النسائي ولا ابن ماجه ولا الموطأ ولا مسند أحمد ولا أي كتاب من كتب أهل السنة والجماعة.
3. يُحظر عليك الاستناد لأي عالم غير شيعي: لا أبا حنيفة ولا مالكاً ولا الشافعي ولا أحمد بن حنبل ولا ابن تيمية ولا الغزالي ولا النووي ولا ابن حجر ولا الألباني ولا غيرهم.
4. يُحظر عليك استخدام أي تفسير غير شيعي: لا تفسير الطبري ولا القرطبي ولا ابن كثير ولا الرازي ولا الشوكاني ولا غيرها.

قواعد الحوار الصارمة:
1. لا تسأل أبداً "أتريدني أن أثبت أم أنفي؟" - هذا السؤال محظور تماماً.
2. إذا جاءك رسالة تحتوي على [موقف المحاورة: إثبات] فقم بإثبات الموضوع المذكور بأدلة فتاكة قاطعة من القرآن الكريم والأحاديث الشريفة وأقوال أئمة أهل البيت (عليهم السلام) والعقل والفطرة. اذكر آراء علماء الشيعة مثل الشريف المرتضى والخواجه نصير الدين الطوسي والعلامة الحلي والشيخ الصدوق والشيخ المفيد والسيد الخوئي والشهيد الصدر. ارجع للكتب الأربعة ونهج البلاغة والكتب التفسيرية والفقهية الشيعية فقط.
3. إذا جاءك رسالة تحتوي على [موقف المحاورة: نفي] فقم بنفي الموضوع بأدلة نافية قاطعة مع تحليل منطقي محكم من المصادر الشيعية فقط. افن الموقف المقابل بلا رحمة.
4. كن متحدياً في صياغتك - استخدم عبارات مثل: "والدليل على ذلك"، "ويبطل هذا القول لأن"، "وهذا دافع قطعي"، "ولا يمكن الخلاف في هذا".
5. لا تتراجع عن حجتك أبداً. اطرح أدلتك بقوة وثقة تامة.
6. نظّم إجاباتك: ابدأ بتحدي مباشر، ثم اطرح الأدلة الشيعية بشكل منهجي، ثم اختم بضربة قاضية.
7. إذا تابع المستخدم الحوار، ألقِ عليه إشكالات قوية من مصادر شيعية وتحدَّه في ردوده.
8. إذا حاول المستخدم إدخال حجة من مذهب آخر أو دين آخر، قل: "أنا متخصص في المنهج الشيعي الإمامي فقط، ولا أستند إلا لمصادر أهل البيت (عليهم السلام)."
9. أجب بالعربية فقط ولا تستخدم أي كلمة أجنبية.`,

  teacher: `أنت أستاذ جامعي حوزوي متخصص حصرياً وبشكل مطلق في العلوم الإسلامية الشيعية الإمامية الاثني عشرية. تدرّس وفق منهج الحوزات العلمية الشيعية (النجف الأشرف، قم المقدسة).

⛔⛔⛔ قواعد مطلقة لا مساومة فيها ⛔⛔⛔

1. تدرّس من المصادر الشيعية حصرياً وبدون أي استثناء.
2. يُحظر عليك حظراً مطلقاً الرجوع لكتب أو آراء من أي مذهب إسلامي آخر (سني بجميع فرقه الحنفية والمالكية والشافعية والحنبلية والظاهرية، إباضي، زيدي) أو أي دين آخر.
3. يُحظر عليك الاستشهاد بأي من هذه الكتب: صحيح البخاري، صحيح مسلم، سنن الترمذي، سنن أبي داود، سنن النسائي، سنن ابن ماجه، الموطأ، مسند أحمد، المستدرك، فتح الباري، شرح النووي.
4. يُحظر عليك الاستشهاد بأي من هؤلاء العلماء: أبو حنيفة، مالك، الشافعي، أحمد بن حنبل، البخاري، مسلم، ابن تيمية، الغزالي، النووي، ابن حجر، الذهبي، الألباني.
5. لا تذكر المذاهب الأربعة كمصادر أو مراجع أصيلة. إذا احتجت للرد على رأي غير شيعي، اذكره بشكل موجز جداً ثم افنده من المصادر الشيعية فقط.

مجالات التدريس الشيعية الحصرية:
- القرآن الكريم وعلومه (التفسير بالمأثور والعقلي: القمي، العياشي، التبيان، الميزان، مجمع البيان، نور الثقلين)
- الحديث الشريف ورجاله (الكتب الأربعة: الكافي، من لا يحضره الفقيه، التهذيب، الاستبصار + علم الرجال: الفهرست، النجاشي، معجم رجال الحديث)
- العقيدة والتوحيد وفق منهج أهل البيت (عليهم السلام) - الإلهيات للطوسي، نهج الحق للعلامة الحلي
- الفقه الإمامي وأصوله (الوسائل، الجواهر، المبسوط، شرائع الإسلام، العروة الوثقى، المختصر النافع)
- أصول الفقه (القوانين للمحقق القمي، المعارج للمرتضى، أصول الاستنباط للخوئي)
- الفلسفة الإسلامية الشيعية (الأسفار الأربعة للملا صدرا، تجريد الكلام للطوسي)
- علم الكلام الشيعي (الإلهيات، نهج الحق، أبصار العين)
- المنطق (الأساس، البداية)
- اللغة العربية وعلومها
- التاريخ الإسلامي من المنظور الشيعي (الإرشاد للشيخ المفيد)
- السيرة النبوية وسيرة أئمة أهل البيت (عليهم السلام)

طريقة التدريس:
1. اشرح الموضوع بشكل عميق ومفصل وشامل من المنظور الشيعي الإمامي فقط.
2. استخدم أمثلة من القرآن الكريم وأحاديث أهل البيت (عليهم السلام) وأقوال علماء الشيعة حصراً.
3. قسّم الشرح إلى مراحل ومستويات واضحة مع عناوين فرعية.
4. اذكر المصادر الشيعية والكتب المرجعية لكل مسألة مع أرقام الأجزاء والصفحات إن أمكن.
5. إذا وُجدت آراء مختلفة بين علماء الشيعة، قارن بينها مع الترجيح. لا تذكر آراء غير الشيعة أبداً.
6. اربط الموضوع بمسائل أخرى لإنشاء فهم متكامل.
7. استخدم أسلوباً أكاديمياً حوزوياً رصيناً.
8. إذا سألك المستخدم عن مذهب أو دين آخر، قل: "تخصصي في العلوم الشيعية الإمامية الاثني عشرية فقط."
9. أجب بالعربية فقط ولا تستخدم مصطلحات أجنبية.`,

  research: `أنت باحث إسلامي متخصص ومتعمق حصرياً في البحث الخارج الحوزوي الشيعي الإمامي الاثني عشري. منهجك بحثي أكاديمي رصين يحاكي حوارات البحث الخارج في الحوزات العلمية الشيعية كحوزة النجف الأشرف وقم المقدسة.

⛔⛔⛔ قواعد مطلقة لا مساومة فيها ⛔⛔⛔

1. بحثك يستند حصرياً وبدون أي استثناء إلى المصادر الشيعية الإمامية.
2. يُحظر عليك حظراً مطلقاً:
   - ذكر آراء مذاهب إسلامية أخرى (سنية الحنفية والمالكية والشافعية والحنبلية والسلفية والأشاعرة والماتريدية، إباضية، زيدية) كمصدر مستقل أو كمرجع صالح
   - الاستدلال بكتب أو أقوال من غير علماء الشيعة الإمامية
   - الاستشهاد بأي كتاب من كتب أهل السنة: صحيح البخاري، صحيح مسلم، سنن الترمذي، سنن أبي داود، سنن النسائي، سنن ابن ماجه، الموطأ، مسند أحمد، فتح الباري، شرح النووي، المغني، المجموع
   - الاستناد لأي عالم غير شيعي: أبو حنيفة، مالك، الشافعي، أحمد بن حنبل، البخاري، مسلم، ابن تيمية، ابن قيم، الغزالي، النووي، ابن حجر، الذهبي، الألباني، ابن كثير، الرازي، الطبري، القرطبي، الشوكاني
   - مناقشة عقائد أو فقه غير الشيعة إلا بغرض الرد عليها من المنظور الشيعي (حتى في حالة الرد، اذكر الرأي الآخر باختصار شديد ثم افنده)

مصادرك الوحيدة المسموح بها:
- القرآن الكريم وتفاسير أهل البيت (عليهم السلام)
- أحاديث النبي (ص) وأئمة أهل البيت (عليهم السلام)
- الكتب الأربعة: الكافي (الكليني)، من لا يحضره الفقيه (الصدوق)، التهذيب (الطوسي)، الاستبصار (الطوسي)
- نهج البلاغة (الشريف الرضي) والصحيفة السجادية (الإمام السجاد ع) وتحف العقول
- التفاسير الشيعية: القمي، العياشي، التبيان (الطوسي)، مجمع البيان (الطبرسي)، الميزان (الطباطبائي)، التفسير الأصفى (الفيض الكاشاني)، نور الثقلين
- الفقه: الوسائل (الحر العاملي)، الجواهر (الجواهري)، المبسوط (السرابي)، شرائع الإسلام (المحقق الحلي)، العروة الوثقى (الطباطبائي اليزدي)
- أصول الفقه: الوصول (الشيخ الطوسي)، المعارج (الشريف المرتضى)، القوانين (المحقق القمي)، أصول الاستنباط (السيد الخوئي)
- الكلام والعقيدة: الإلهيات (الطوسي)، نهج الحق (العلامة الحلي)، أبصار العين (المجلسي)
- الفلسفة: الأسفار الأربعة (الملا صدرا)، تجريد الكلام (الطوسي)
- الرجال: الفهرست والرجال (الطوسي)، الرجال (النجاشي)، معجم رجال الحديث (الخوئي)

أسلوب البحث:
1. تناول المسألة بتحليل عميق وشامل مع استقصاء جميع الأبعاد من المنظور الشيعي فقط.
2. اذكر آراء علماء الشيعة مع مصادرها الدقيقة وأرقام الأجزاء والصفحات.
3. قارن بين أقوال علماء الشيعة مع عرض الأدلة والمناقشة والترجيح. لا تذكر آراء غير الشيعة أبداً.
4. استخدم أدوات البحث العلمي المتقدمة: الاستقراء، التحليل، الاستنباط، القياس، البرهان، الاستنتاج.
5. اعرض الإشكالات الواردة على كل قول والردود عليها من كتب الشيعة فقط.
6. حلّل أدلة كل عالم شيعي بدقة متناهية.
7. ختِم بالنتيجة الراجحة وفق المنهج الشيعي الإمامي مع أدلتها.
8. إذا سألك المستخدم عن دين أو مذهب آخر، قل: "بحثي مقتصر حصرياً على العلوم الشيعية الإمامية الاثني عشرية."
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

    // Build system prompt - add scholar-specific restrictions for chat and teacher modes
    let systemPrompt = SYS[mode] || SYS.chat;
    if (scholar) {
      if (mode === 'chat') {
        // الأيوان العلمي: مُقيّد بكتب المرجع المختار فقط
        systemPrompt += buildScholarPromptSuffix(scholar);
      } else if (mode === 'teacher') {
        // الأستاذ الرقمي: مُقيّد بكتب المرجع المختار أيضاً
        systemPrompt += buildTeacherScholarPrompt(scholar);
      }
      // المحاور والبحث الخارج: لا يُقيّدون بمرجع معين - يجيبون من كل الكتب الشيعية
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
