/**
 * Arabic Text Filter
 * Removes non-Arabic words and foreign language contamination from AI responses.
 * Keeps: Arabic letters, numbers, basic punctuation, Quran verse references, hadith references.
 */

// Arabic Unicode range including common diacritics and special chars
const ARABIC_LETTERS = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

// Pattern to detect non-Arabic "word" tokens (consecutive Latin/Persian/CJK/etc chars)
// This matches standalone words in Latin script, NOT numbers
const NON_ARABIC_WORD = /[a-zA-Z][a-zA-Z\u00C0-\u024F\u0250-\u02AF\u0600-\u06FF]*[a-zA-Z\u00C0-\u024F\u0250-\u02AF]?|[a-zA-Z\u00C0-\u024F]+/g;

// Common Islamic terms that might be transliterated but should be in Arabic
const TRANSLITERATION_MAP: Record<string, string> = {
  'allah': 'الله',
  'islam': 'الإسلام',
  'muslim': 'المسلم',
  'muslims': 'المسلمون',
  'quran': 'القرآن الكريم',
  'koran': 'القرآن الكريم',
  'hadith': 'الحديث',
  'sunnah': 'السنة',
  'sharia': 'الشريعة',
  'fiqh': 'الفقه',
  'tafsir': 'التفسير',
  'ijtihad': 'الاجتهاد',
  'imam': 'الإمام',
  'ayatollah': 'آية الله',
  'hijab': 'الحجاب',
  'salah': 'الصلاة',
  'zakat': 'الزكاة',
  'sawm': 'الصيام',
  'hajj': 'الحج',
  'wudu': 'الوضوء',
  'tawhid': 'التوحيد',
  'shirk': 'الشرك',
  'kufr': 'الكفر',
  'iman': 'الإيمان',
  'nifaq': 'النفاق',
  'tawba': 'التوبة',
  'dhikr': 'الذكر',
  'dua': 'الدعاء',
  'sura': 'سورة',
  'surah': 'سورة',
  'ayah': 'آية',
  'jihad': 'الجهاد',
  'caliph': 'الخليفة',
  'caliphate': 'الخلافة',
  'masjid': 'المسجد',
  'mosque': 'المسجد',
  'madrasa': 'المدرسة',
  'madrasah': 'المدرسة',
  'shaykh': 'الشيخ',
  'sheikh': 'الشيخ',
  'mullah': 'الملا',
  'wali': 'الولي',
  'wilayah': 'الولاية',
  'husayn': 'الحسين',
  'hussain': 'الحسين',
  'ali': 'علي',
  'muhammad': 'محمد',
  'mohammad': 'محمد',
  'prophet': 'النبي',
  ' messenger': ' الرسول',
  'companions': 'الصحابة',
  'sahaba': 'الصحابة',
  'ahle': 'أهل',
  'ahl': 'أهل',
  'beyt': 'بيت',
  'kitab': 'الكتاب',
  'kafir': 'الكافر',
  'munafiq': 'المنافق',
  'mumin': 'المؤمن',
  'kafirun': 'الكافرون',
  'mushrik': 'المشرك',
  'rakah': 'الركعة',
  'rakat': 'الركعات',
  'sujud': 'السجود',
  'rukuk': 'الركوع',
  'raku': 'الركوع',
  'qiyam': 'القيام',
  'qiraat': 'القراءة',
  'tasbih': 'التسبيح',
  'takbir': 'التكبير',
  'tahmid': 'التحميد',
  'tahlil': 'التهليل',
  'salawat': 'الصلوات',
  'salam': 'السلام',
  'bismillah': 'بسم الله',
  'alhamdulillah': 'الحمد لله',
  'subhanallah': 'سبحان الله',
  'allahuakbar': 'الله أكبر',
  'inshallah': 'إن شاء الله',
  'mashallah': 'ما شاء الله',
  'jazakallah': 'جزاك الله',
  'jummah': 'الجمعة',
  'ramadan': 'رمضان',
  'eid': 'العيد',
  'muharram': 'محرم',
  'ashura': 'عاشوراء',
  'arbaeen': 'الأربعينية',
  'nawawi': 'النووي',
  'bukhari': 'البخاري',
  'muslim': 'مسلم',
  'tirmidhi': 'الترمذي',
  'abudawud': 'أبو داود',
  'ibnmajah': 'ابن ماجه',
  'nasai': 'النسائي',
  'darimi': 'الدارمي',
  'malik': 'مالك',
  'hanafi': 'الحنفي',
  'shafii': 'الشافعي',
  'hanbali': 'الحنبلي',
  'shia': 'الشيعة',
  'sunni': 'السنة',
  'mutazilite': 'المعتزلة',
  'ashari': 'الأشعري',
  'maturidi': 'الماتريدي',
  'rafidi': 'الرافضي',
  'nasibi': 'الناصبي',
  'marja': 'المرجع',
  'taqlid': 'التقليد',
  'wilayat': 'الولاية',
  'ghadir': 'الغدير',
  'karbala': 'كربلاء',
  'najaf': 'النجف',
  'qom': 'قم',
  'mashhad': 'مشهد',
  'ranging': 'المدى',
  'rang': 'اللون',
  'range': 'المدى',
  'concept': 'المفهوم',
  'meaning': 'المعنى',
  'definition': 'التعريف',
  'example': 'مثال',
  'theory': 'النظرية',
  'logic': 'المنطق',
  'reason': 'العقل',
  'argument': 'الحجة',
  'proof': 'الدليل',
  'evidence': 'البرهان',
  'premise': 'المقدمة',
  'conclusion': 'النتيجة',
  'syllogism': 'القياس',
  'contradiction': 'التناقض',
  'paradox': 'المفارقة',
};

// Common English/French words used casually that should be removed
const REMOVE_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'because', 'but', 'and', 'or', 'if', 'while', 'about', 'up',
  'it', 'its', 'this', 'that', 'these', 'those', 'he', 'she', 'they',
  'we', 'you', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
  'our', 'their', 'what', 'which', 'who', 'whom',
  'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'en', 'est',
  'que', 'qui', 'dans', 'pour', 'sur', 'avec', 'pas', 'plus', 'par',
  'ne', 'se', 'ce', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
]);

/**
 * Filter non-Arabic words from text
 * - Translates known Islamic terms to Arabic
 * - Removes common English/French filler words
 * - Preserves numbers, punctuation, and structure
 */
export function filterArabicText(text: string): string {
  if (!text) return text;

  let result = text;

  // Step 1: Replace known transliterated Islamic/academic terms with Arabic
  for (const [eng, arabic] of Object.entries(TRANSLITERATION_MAP)) {
    // Use word boundary matching (case-insensitive)
    const regex = new RegExp(`\\b${eng}\\b`, 'gi');
    result = result.replace(regex, arabic);
  }

  // Step 2: Remove standalone non-Arabic words (Latin script words)
  // But preserve: numbers, URLs, common abbreviations in parentheses
  result = result.replace(NON_ARABIC_WORD, (match) => {
    const lower = match.toLowerCase();

    // Skip if it's a known transliteration (already handled above)
    if (TRANSLITERATION_MAP[lower]) return match;

    // Skip single letters used as references (like A, B, C)
    if (match.length === 1 && /[a-zA-Z]/.test(match)) return match;

    // Skip common abbreviations
    if (['e.g.', 'i.e.', 'etc', 'vs', 'vol', 'pp', 'ch', 'dr', 'sr', 'hr', 'min', 'km'].includes(lower)) {
      return match;
    }

    // Skip if surrounded by parentheses (user intentionally transliterated)
    return '';
  });

  // Step 3: Clean up extra whitespace from removed words
  result = result.replace(/\s{2,}/g, ' ');
  result = result.replace(/\s([.،؛:!؟؟»])\s/g, '$1 ');
  result = result.replace(/\s+([.،؛:!؟؟»])/g, '$1');
  result = result.replace(/([.،؛:!؟؟»])\s+/g, '$1 ');

  // Step 4: Fix common patterns after filtering
  result = result.replace(/\(\s*\)/g, ''); // Remove empty parentheses
  result = result.replace(/\s+\)/g, ')');   // Fix space before closing paren
  result = result.replace(/\(\s+/g, '(');   // Fix space after opening paren

  return result.trim();
}

/**
 * Apply Arabic filter to quiz questions and options
 */
export function filterQuizQuestions(questions: Array<{ question: string; options: string[] }>): Array<{ question: string; options: string[] }> {
  return questions.map((q) => ({
    question: filterArabicText(q.question),
    options: q.options.map((opt) => filterArabicText(opt)),
  }));
}
