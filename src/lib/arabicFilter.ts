/**
 * Arabic Text Filter - V2 (Complete Rewrite)
 * ============================================
 * Approach: Character-level analysis of each word token.
 * Any word containing non-Arabic characters is either translated or removed.
 * This is much more robust than regex-based matching.
 */

// ============ CONFIGURATION ============

// Arabic Unicode ranges (letters only)
function isArabicChar(c: string): boolean {
  const code = c.codePointAt(0) || 0;
  return (
    (code >= 0x0600 && code <= 0x06FF) ||  // Arabic
    (code >= 0x0750 && code <= 0x077F) ||  // Arabic Supplement
    (code >= 0x08A0 && code <= 0x08FF) ||  // Arabic Extended-A
    (code >= 0xFB50 && code <= 0xFDFF) ||  // Arabic Presentation Forms-A
    (code >= 0xFE70 && code <= 0xFEFF)     // Arabic Presentation Forms-B
  );
}

// Check if a character is a basic digit or common symbol (safe to keep)
function isSafeChar(c: string): boolean {
  const code = c.codePointAt(0) || 0;
  return (
    (code >= 0x30 && code <= 0x39) ||   // 0-9
    (code >= 0x0660 && code <= 0x0669) || // Arabic-Indic digits
    code === 0x2D ||  // -
    code === 0x2B ||  // +
    code === 0x3D ||  // =
    code === 0x25 ||  // %
    code === 0x2F ||  // /
    code === 0x5C ||  // backslash
    code === 0x40 ||  // @
    code === 0x23 ||  // #
    code === 0x2A     // *
  );
}

// Check if char is whitespace
function isWhitespace(c: string): boolean {
  const code = c.codePointAt(0) || 0;
  return code === 0x20 || code === 0x0A || code === 0x0D || code === 0x09 ||
    (code >= 0x2000 && code <= 0x200A) || code === 0x3000;
}

// Arabic/standard punctuation (safe to keep)
function isArabicPunctuation(c: string): boolean {
  const code = c.codePointAt(0) || 0;
  return (
    code === 0x060C ||  // ،
    code === 0x061B ||  // ؛
    code === 0x061F ||  // ؟
    code === 0x0640 ||  // ـ (tatweel)
    code === 0x066A ||  // ٪
    code === 0x002C ||  // ,
    code === 0x002E ||  // .
    code === 0x003B ||  // ;
    code === 0x003A ||  // :
    code === 0x0021 ||  // !
    code === 0x003F ||  // ?
    code === 0x0028 ||  // (
    code === 0x0029 ||  // )
    code === 0x005B ||  // [
    code === 0x005D ||  // ]
    code === 0x007B ||  // {
    code === 0x007D ||  // }
    code === 0x00AB ||  // «
    code === 0x00BB ||  // »
    code === 0x2018 ||  // '
    code === 0x2019 ||  // '
    code === 0x201C ||  // "
    code === 0x201D ||  // "
    code === 0x2014 ||  // —
    code === 0x2013 ||  // –
    code === 0x2026 ||  // …
    code === 0x00AB ||  // «
    code === 0x00BB ||  // »
    code === 0x000A ||  // newline
    code === 0x000D     // carriage return
  );
}

// Check if a string contains any Latin/non-Arabic letter
function containsForeignLetter(word: string): boolean {
  for (const c of word) {
    const code = c.codePointAt(0) || 0;
    if (
      (code >= 0x0041 && code <= 0x005A) ||  // A-Z
      (code >= 0x0061 && code <= 0x007A) ||  // a-z
      (code >= 0x00C0 && code <= 0x024F) ||  // Latin Extended
      (code >= 0x0250 && code <= 0x02AF) ||  // IPA Extensions
      (code >= 0x1E00 && code <= 0x1EFF) ||  // Latin Extended Additional
      (code >= 0x2C60 && code <= 0x2C7F) ||  // Latin Extended-C
      (code >= 0xA720 && code <= 0xA7FF) ||  // Latin Extended-D
      (code >= 0xAB30 && code <= 0xAB6F) ||  // Latin Extended-E
      (code >= 0x0400 && code <= 0x04FF) ||  // Cyrillic
      (code >= 0x0500 && code <= 0x052F) ||  // Cyrillic Supplement
      (code >= 0x3000 && code <= 0x303F) ||  // CJK Symbols
      (code >= 0x3040 && code <= 0x309F) ||  // Hiragana
      (code >= 0x30A0 && code <= 0x30FF) ||  // Katakana
      (code >= 0x4E00 && code <= 0x9FFF)     // CJK Unified Ideographs
    ) {
      return true;
    }
  }
  return false;
}

// ============ TRANSLATION MAP ============
// Maps foreign words to their Arabic equivalents
// This is checked FIRST before any removal
const TRANSLATION_MAP: Record<string, string> = {
  // Core Islamic terms
  'allah': 'الله',
  'islam': 'الإسلام',
  'muslim': 'المسلم',
  'muslims': 'المسلمون',
  'muslimah': 'المسلمة',
  'quran': 'القرآن',
  'koran': 'القرآن',
  'hadith': 'الحديث',
  'hadiths': 'الأحاديث',
  'sunnah': 'السنة',
  'sharia': 'الشريعة',
  'fiqh': 'الفقه',
  'tafsir': 'التفسير',
  'tafseer': 'التفسير',
  'ijtihad': 'الاجتهاد',
  'imam': 'الإمام',
  'ayatollah': 'آية الله',
  'hijab': 'الحجاب',
  'niqab': 'النقاب',
  'salah': 'الصلاة',
  'salat': 'الصلاة',
  'zakat': 'الزكاة',
  'sawm': 'الصيام',
  'hajj': 'الحج',
  'umrah': 'العمرة',
  'wudu': 'الوضوء',
  'tawhid': 'التوحيد',
  'tawheed': 'التوحيد',
  'shirk': 'الشرك',
  'kufr': 'الكفر',
  'iman': 'الإيمان',
  'nifaq': 'النفاق',
  'tawba': 'التوبة',
  'dhikr': 'الذكر',
  'dua': 'الدعاء',
  'd ua': 'الدعاء',
  'sura': 'سورة',
  'surah': 'سورة',
  'ayah': 'آية',
  'ayat': 'آيات',
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
  'wilayat': 'الولاية',
  'husayn': 'الحسين',
  'hussain': 'الحسين',
  'hussein': 'الحسين',
  'hasan': 'الحسن',
  'muhammad': 'محمد',
  'mohammad': 'محمد',
  'mohamed': 'محمد',
  'prophet': 'النبي',
  'messenger': 'الرسول',
  'companions': 'الصحابة',
  'sahaba': 'الصحابة',
  'sahabah': 'الصحابة',
  'ahl': 'أهل',
  'ahle': 'أهل',
  'ahlul': 'أهل',
  'bayt': 'بيت',
  'beyt': 'بيت',
  'kitab': 'الكتاب',
  'kafir': 'الكافر',
  'kuffar': 'الكافرون',
  'munafiq': 'المنافق',
  'mumin': 'المؤمن',
  'muminoon': 'المؤمنون',
  'mushrik': 'المشرك',
  'rakah': 'الركعة',
  'rakat': 'الركعات',
  'rakaat': 'الركعات',
  'sujud': 'السجود',
  'sajdah': 'السجدة',
  'rukuk': 'الركوع',
  'ruku': 'الركوع',
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
  'inshaallah': 'إن شاء الله',
  'mashallah': 'ما شاء الله',
  'jazakallah': 'جزاك الله',
  'jummah': 'الجمعة',
  'jumaah': 'الجمعة',
  'ramadan': 'رمضان',
  'eid': 'العيد',
  'muharram': 'محرم',
  'ashura': 'عاشوراء',
  'arbaeen': 'الأربعين',
  'ghadir': 'الغدير',
  'karbala': 'كربلاء',
  'najaf': 'النجف',
  'qom': 'قم',
  'mashhad': 'مشهد',
  'marja': 'المرجع',
  'marjaa': 'المرجع',
  'taqlid': 'التقليد',
  'ijma': 'الإجماع',
  'nass': 'النص',
  'qiyas': 'القياس',
  'istihadha': 'الاستحاضة',
  'hayd': 'الحيض',
  'nifas': 'النفاس',
  'iddah': 'العدة',
  'mutah': 'المتعة',
  'mahr': 'المهر',
  'dowry': 'المهر',
  'waqf': 'الوقف',
  'zakat': 'الزكاة',
  'sadaqah': 'الصدقة',
  'khums': 'الخمس',
  'halal': 'الحلال',
  'haram': 'الحرام',
  'makruh': 'المكروه',
  'mustahab': 'المستحب',
  'wajib': 'الواجب',
  'fard': 'الفرض',
  'sunnah': 'السنة',
  'nafl': 'النافلة',
  'haram': 'الحرام',
  'batil': 'الباطل',
  'sahih': 'صحيح',
  'hasan': 'حسن',
  'daif': 'ضعيف',
  'mawdu': 'موضوع',
  'mutawatir': 'المتواتر',
  'ahad': 'الأحاد',
  'mansukh': 'المنسوخ',
  'nasikh': 'الناسخ',

  // Hadith collectors and scholars
  'bukhari': 'البخاري',
  'muslim': 'مسلم',
  'tirmidhi': 'الترمذي',
  'abudawud': 'أبو داود',
  'nasai': 'النسائي',
  'ibnmajah': 'ابن ماجه',
  'darimi': 'الدارمي',
  'malik': 'مالك',
  'ahmad': 'أحمد',
  'nawawi': 'النووي',
  'ghazali': 'الغزالي',
  'ibntaymiyyah': 'ابن تيمية',
  'ibnkathir': 'ابن كثير',
  'tabari': 'الطبري',
  'qurtubi': 'القرطبي',
  'razi': 'الرازي',
  'sistani': 'السيستاني',
  'khamenei': 'الخامنئي',
  'sadr': 'الصدر',

  // Schools of thought
  'hanafi': 'الحنفي',
  'shafii': 'الشافعي',
  'hanbali': 'الحنبلي',
  'maliki': 'المالكي',
  'shia': 'الشيعة',
  'sunni': 'السني',
  'sufi': 'الصوفي',
  'mutazilite': 'المعتزلي',
  'ashari': 'الأشعري',
  'maturidi': 'الماتريدي',
  'jaafari': 'الجعفري',
  'zaydi': 'الزيدي',
  'ibadi': 'الإباضي',
  'zahiri': 'الظاهري',

  // Philosophy & Logic terms
  'philosophy': 'الفلسفة',
  'logic': 'المنطق',
  'metaphysics': 'ما وراء الطبيعة',
  'epistemology': 'نظرية المعرفة',
  'ethics': 'الأخلاق',
  'ontology': 'علم الوجود',
  'teleology': 'الغائية',
  'dialectic': 'الجدل',
  'syllogism': 'القياس',
  'premise': 'المقدمة',
  'argument': 'الحجة',
  'proof': 'الدليل',
  'evidence': 'البرهان',
  'contradiction': 'التناقض',
  'paradox': 'المفارقة',
  'reason': 'العقل',
  'rationality': 'العقلانية',
  'rational': 'عقلاني',
  'empirical': 'تجريبي',
  'theory': 'النظرية',
  'concept': 'المفهوم',
  'meaning': 'المعنى',
  'definition': 'التعريف',
  'example': 'مثال',
  'hypothesis': 'الفرضية',
  'thesis': 'الأطروحة',
  'antithesis': 'نقيض الأطروحة',
  'synthesis': 'التركيب',
  'deduction': 'الاستنتاج',
  'induction': 'الاستقراء',
  'abstraction': 'التجريد',
  'analysis': 'التحليل',
  'synthetic': 'تركيبي',
  'categorical': 'قطعي',
  'universal': 'كلي',
  'particular': 'جزئي',
  'necessary': 'ضروري',
  'contingent': 'ممكن',
  'impossible': 'مستحيل',
  'essence': 'الجوهر',
  'existence': 'الوجود',
  'substance': 'الجوهر',
  'attribute': 'الصفة',
  'accident': 'العَرَض',
  'causality': 'العلة والمعلول',
  'cause': 'العلة',
  'effect': 'المعلول',
  'purpose': 'الغاية',
  'truth': 'الحقيقة',
  'falsehood': 'البطلان',
  'validity': 'الصحة',
  'fallacy': 'المغالطة',
  ' sophistry': 'السفسطة',

  // Linguistics / Grammar
  'grammar': 'النحو',
  'syntax': 'التركيب',
  'morphology': 'الصرف',
  'phonetics': 'الأصوات',
  'semantics': 'الدلالة',
  'pragmatics': 'التداولية',
  'verb': 'الفعل',
  'noun': 'الاسم',
  'adjective': 'الصفة',
  'adverb': 'الظرف',
  'preposition': 'حرف الجر',
  'conjunction': 'حرف العطف',
  'pronoun': 'الضمير',
  'subject': 'المبتدأ',
  'predicate': 'الخبر',
  'object': 'المفعول',
  'clause': 'الجملة',
  'sentence': 'الجملة',
  'phrase': 'الشبه جملة',
  'root': 'الجذر',
  'derivation': 'الاشتقاق',
  'inflection': 'الإعراب',

  // Common academic / technical words often sneaking in
  'ranging': 'المدى',
  'rang': 'المدى',
  'range': 'المدى',
  'domain': 'المجال',
  'field': 'المجال',
  'scope': 'النطاق',
  'aspect': 'الجانب',
  'dimension': 'البُعد',
  'perspective': 'المنظور',
  'approach': 'المنهج',
  'methodology': 'المنهجية',
  'framework': 'الإطار',
  'paradigm': 'النموذج',
  'context': 'السياق',
  'phenomenon': 'الظاهرة',
  'phenomena': 'الظواهر',
  'criterion': 'المعيار',
  'criteria': 'المعايير',
  'standard': 'المعيار',
  'principle': 'المبدأ',
  'axiom': 'البديهة',
  'corollary': 'النتيجة',
  'implication': 'الاستلزام',
  'inference': 'الاستدلال',
  'conclusion': 'النتيجة',
  'assumption': 'الافتراض',
  'premise': 'المقدمة',
  'proposition': 'القضية',
  'assertion': 'الدعوى',
  'contention': 'الادعاء',
  'refutation': 'الرد',
  'rebuttal': 'التفنيد',
  'objection': 'الاعتراض',
  'response': 'الرد',
  'critique': 'النقد',
  'evaluation': 'التقييم',
  'assessment': 'التقويم',
  'justification': 'التبرير',
  'explanation': 'التوضيح',
  'interpretation': 'التفسير',
  'clarification': 'التوضيح',
  'elaboration': 'التوسيع',
  'specification': 'التحديد',
  'generalization': 'التعميم',
  'specialization': 'التخصص',
  'classification': 'التصنيف',
  'categorization': 'التصنيف',
  'distinction': 'التمييز',
  'differentiation': 'التفريق',
  'comparison': 'المقارنة',
  'contrast': 'المقابلة',
  'analogy': 'القياس',
  'metaphor': 'الاستعارة',
  'allegory': 'الرمزية',
  'symbol': 'الرمز',
  'sign': 'الدال',
  'reference': 'الإحالة',
  'indication': 'الإشارة',
  'significance': 'الأهمية',
  'relevance': 'الصلة',
  'correlation': 'الارتباط',
  'dependency': 'الاعتماد',
  'independence': 'الاستقلال',
  'equivalence': 'المساواة',
  'hierarchy': 'الهرمية',
  'structure': 'البنية',
  'function': 'الوظيفة',
  'mechanism': 'الآلية',
  'process': 'العملية',
  'procedure': 'الإجراء',
  'sequence': 'التسلسل',
  'progression': 'التدرج',
  'regression': 'الانتكاس',
  'evolution': 'التطور',
  'development': 'التطور',
  'transformation': 'التحول',
  'modification': 'التعديل',
  'adaptation': 'التكيف',
  'integration': 'الدمج',
  'incorporation': 'الإدماج',
  'assimilation': 'الاستيعاب',
  'accommodation': 'الاستيعاب',
  'complementarity': 'التكامل',
  'opposition': 'التعارض',
  'conflict': 'الصراع',
  'resolution': 'الحل',
  'compromise': 'التسوية',
  'consensus': 'الإجماع',
  'dissent': 'الخلاف',
  'controversy': 'الجدل',
  'debate': 'المناظرة',
  'discourse': 'الخطاب',
  'dialogue': 'الحوار',
  'discussion': 'المناقشة',
  'conversation': 'المحادثة',
  'communication': 'التواصل',
  'expression': 'التعبير',
  'articulation': 'الصياغة',
  'formulation': 'الصياغة',
  'representation': 'التمثيل',
  'manifestation': 'التجلي',
  'realization': 'التحقق',
  'actualization': 'التحقق',
  'implementation': 'التنفيذ',
  'application': 'التطبيق',
  'utilization': 'الاستخدام',
  'exploitation': 'الاستغلال',
  'optimization': 'التحسين',
  'maximization': 'التعظيم',
  'minimization': 'التصغير',
  'regulation': 'التنظيم',
  'organization': 'التنظيم',
  'coordination': 'التنسيق',
  'administration': 'الإدارة',
  'management': 'الإدارة',
  'governance': 'الحكم',
  'authority': 'السلطة',
  'legitimacy': 'الشرعية',
  'jurisdiction': 'الاختصاص',
  'competence': 'الكفاءة',
  'capability': 'القدرة',
  'capacity': 'الطاقة',
  'potential': 'الإمكانية',
  'possibility': 'الاحتمال',
  'probability': 'الاحتمالية',
  'certainty': 'اليقين',
  'doubt': 'الشك',
  'skepticism': 'الشكوكية',
  'belief': 'الاعتقاد',
  'conviction': 'القناعة',
  'opinion': 'الرأي',
  'viewpoint': 'وجهة النظر',
  'standpoint': 'الموقف',
  'position': 'الموقف',
  'attitude': 'الموقف',
  'disposition': 'التوجه',
  'tendency': 'الميل',
  'inclination': 'الميول',
  'orientation': 'التوجه',
  'preference': 'التفضيل',
  'priority': 'الأولوية',
  'importance': 'الأهمية',
  'significance': 'الأهمية',
  'relevance': 'الصلة',
  'pertinence': 'الصلة',
  'applicability': 'القابلية للتطبيق',
  'suitability': 'الملاءمة',
  'appropriateness': 'الملاءمة',
  'adequacy': 'الكفاية',
  'sufficiency': 'الكفاية',
  'necessity': 'الضرورة',
  'requirement': 'المتطلب',
  'condition': 'الشرط',
  'prerequisite': 'المتطلب السابق',
  'constraint': 'القيد',
  'limitation': 'الحدود',
  'restriction': 'القيود',
  'boundary': 'الحدود',
  'threshold': 'العتبة',
  'margin': 'الهامش',
  'degree': 'الدرجة',
  'extent': 'المدى',
  'measure': 'المقياس',
  'proportion': 'النسبة',
  'ratio': 'النسبة',
  'fraction': 'الكسر',
  'percentage': 'النسبة المئوية',
  'quantity': 'الكمية',
  'quality': 'الجودة',
  'intensity': 'الشدة',
  'magnitude': 'الحجم',
  'amplitude': 'السعة',
  'frequency': 'التكرار',
  'duration': 'المدة',
  'interval': 'الفترة',
  'period': 'الفترة',
  'phase': 'المرحلة',
  'stage': 'المرحلة',
  'level': 'المستوى',
  'tier': 'المستوى',
  'rank': 'الرتبة',
  'order': 'الترتيب',
  'class': 'الطبقة',
  'category': 'التصنيف',
  'type': 'النوع',
  'kind': 'النوع',
  'sort': 'الصنف',
  'variety': 'التنوع',
  'version': 'النسخة',
  'edition': 'الطبعة',
  'variant': 'النسخة',
  'form': 'الشكل',
  'format': 'الصيغة',
  'pattern': 'النمط',
  'model': 'النموذج',
  'template': 'القالب',
  'schema': 'المخطط',
  'design': 'التصميم',
  'plan': 'الخطة',
  'strategy': 'الاستراتيجية',
  'tactic': 'التكتيك',
  'technique': 'التقنية',
  'method': 'الطريقة',
  'procedure': 'الإجراء',
  'practice': 'الممارسة',
  'habit': 'العادة',
  'custom': 'العرف',
  'tradition': 'التقليد',
  'convention': 'العادة',
  'norm': 'المعيار',
  'rule': 'القاعدة',
  'law': 'القانون',
  'regulation': 'اللائحة',
  'statute': 'النص القانوني',
  'ordinance': 'المرسوم',
  'decree': 'المرسوم',
  'edict': 'الأمر',
  'mandate': 'التكليف',
  'directive': 'التوجيه',
  'instruction': 'التعليمات',
  'guideline': 'الإرشادات',
  'recommendation': 'التوصية',
  'advice': 'النصيحة',
  'counsel': 'المشورة',
  'suggestion': 'الاقتراح',
  'proposal': 'المقترح',
  'initiative': 'المبادرة',
  'project': 'المشروع',
  'program': 'البرنامج',
  'campaign': 'الحملة',
  'movement': 'الحركة',
  'trend': 'الاتجاه',
  'current': 'التيار',
  'wave': 'الموجة',
  'cycle': 'الدورة',
  'circle': 'الدائرة',
  'sphere': 'المجال',
  'realm': 'المجال',
  'domain': 'المجال',
  'territory': 'الإقليم',
  'region': 'المنطقة',
  'zone': 'المنطقة',
  'area': 'المنطقة',
  'sector': 'القطاع',
  'branch': 'الفرع',
  'division': 'الفرع',
  'department': 'القسم',
  'unit': 'الوحدة',
  'section': 'القسم',
  'chapter': 'الفصل',
  'verse': 'الآية',
  'paragraph': 'الفقرة',
  'line': 'السطر',
  'page': 'الصفحة',
  'volume': 'المجلد',
  'book': 'الكتاب',
  'article': 'المقال',
  'essay': 'المقالة',
  'treatise': 'الرسالة',
  'dissertation': 'الأطروحة',
  'thesis': 'الأطروحة',
  'manuscript': 'المخطوطة',
  'document': 'الوثيقة',
  'record': 'السجل',
  'archive': 'الأرشيف',
  'source': 'المصدر',
  'reference': 'المرجع',
  'citation': 'الاستشهاد',
  'quotation': 'الاقتباس',
  'excerpt': 'المقتطف',
  'fragment': 'الشظية',
  'remnant': 'البقية',
  'remainder': 'الباقي',
  'residue': 'البقايا',
  'trace': 'الأثر',
  'vestige': 'الأثر',
  'legacy': 'الإرث',
  'heritage': 'التراث',
  'tradition': 'التقليد',
  'inheritance': 'الميراث',
  'succession': 'التعاقب',
  'continuity': 'الاستمرارية',
  'permanence': 'الدوام',
  'stability': 'الاستقرار',
  'consistency': 'الاتساق',
  'coherence': 'التماسك',
  'unity': 'الوحدة',
  'integrity': 'النزاهة',
  'wholeness': 'الكمال',
  'completeness': 'الاكتمال',
  'totality': 'الكلية',
  'universality': 'الشمولية',
  'generality': 'العمومية',
  'particularity': 'الخصوصية',
  'specificity': 'التحديد',
  'individuality': 'الفردية',
  'uniqueness': 'التفرد',
  'distinctiveness': 'التميز',
  'originality': 'الأصالة',
  'creativity': 'الإبداع',
  'innovation': 'الابتكار',
  'invention': 'الاختراع',
  'discovery': 'الاكتشاف',
  'revelation': 'الوحي',
  'inspiration': 'الإلهام',
  'intuition': 'الحدس',
  'insight': 'البصيرة',
  'wisdom': 'الحكمة',
  'knowledge': 'المعرفة',
  'understanding': 'الفهم',
  'comprehension': 'الاستيعاب',
  'awareness': 'الوعي',
  'consciousness': 'الوعي',
  'perception': 'الإدراك',
  'cognition': 'الإدراك',
  'recognition': 'التعرف',
  'identification': 'التحديد',
  'classification': 'التصنيف',
  'categorization': 'التبويب',
  'organization': 'التنظيم',
  'arrangement': 'الترتيب',
  'ordering': 'الترتيب',
  'sequencing': 'التتابع',
  'alignment': 'المحاذاة',
  'orientation': 'التوجه',
  'direction': 'الاتجاه',
  'position': 'الموضع',
  'location': 'الموقع',
  'placement': 'الوضع',
  'distribution': 'التوزيع',
  'allocation': 'التخصيص',
  'assignment': 'التكليف',
  'designation': 'التعيين',
  'nomination': 'الترشيح',
  'appointment': 'التعيين',
  'election': 'الانتخاب',
  'selection': 'الاختيار',
  'choice': 'الخيار',
  'option': 'الخيار',
  'alternative': 'البديل',
  'substitute': 'البديل',
  'replacement': 'الاستبدال',
  'exchange': 'التبادل',
  'trade': 'التجارة',
  'commerce': 'التجارة',
  'transaction': 'المعاملة',
  'transfer': 'النقل',
  'transmission': 'النقل',
  'conveyance': 'النقل',
  'delivery': 'التسليم',
  'submission': 'التقديم',
  'presentation': 'العرض',
  'demonstration': 'الإثبات',
  'exhibition': 'العرض',
  'manifestation': 'التجلي',
  'expression': 'التعبير',
  'articulation': 'البيان',
  'enunciation': 'النطق',
  'pronunciation': 'النطق',
  'utterance': 'القول',
  'statement': 'البيان',
  'declaration': 'الإعلان',
  'proclamation': 'الإعلان',
  'announcement': 'الإعلان',
  'notification': 'الإشعار',
  'communication': 'الإبلاغ',
  'information': 'المعلومة',
  'data': 'البيانات',
  'fact': 'الحقيقة',
  'figure': 'الرقم',
  'statistic': 'الإحصائية',
  'number': 'العدد',
  'count': 'العدد',
  'amount': 'الكمية',
  'sum': 'المجموع',
  'total': 'الإجمالي',
  'aggregate': 'المجموع',
  'average': 'المتوسط',
  'mean': 'المتوسط',
  'median': 'الوسيط',
  'mode': 'المنوال',
  'deviation': 'الانحراف',
  'variance': 'التشتت',
  'dispersion': 'التشتت',
  'concentration': 'التركيز',
  'density': 'الكثافة',
  'weight': 'الوزن',
  'mass': 'الكتلة',
  'volume': 'الحجم',
  'size': 'الحجم',
  'dimension': 'البُعد',
  'scale': 'المقياس',
  'proportion': 'النسبة',
  'ratio': 'النسبة',
  'percentage': 'النسبة المئوية',
  'rate': 'المعدل',
  'speed': 'السرعة',
  'velocity': 'السرعة',
  'acceleration': 'التسارع',
  'momentum': 'الزخم',
  'force': 'القوة',
  'power': 'القوة',
  'energy': 'الطاقة',
  'strength': 'القوة',
  'intensity': 'الشدة',
  'magnitude': 'المقدار',
  'amplitude': 'السعة',
  'capacity': 'السعة',
  'ability': 'القدرة',
  'capability': 'القدرة',
  'skill': 'المهارة',
  'talent': 'الموهبة',
  'competence': 'الكفاءة',
  'proficiency': 'الإتقان',
  'expertise': 'الخبرة',
  'mastery': 'الإتقان',
  'excellence': 'التميز',
  'superiority': 'الأفضلية',
  'inferiority': 'الدونية',
  'equality': 'المساواة',
  'equity': 'العدالة',
  'justice': 'العدالة',
  'fairness': 'الإنصاف',
  'impartiality': 'الحياد',
  'neutrality': 'الحياد',
  'objectivity': 'الموضوعية',
  'subjectivity': 'الذاتية',
  'bias': 'التحيز',
  'prejudice': 'التحيز',
  'discrimination': 'التمييز',
  'favoritism': 'المحاباة',
  'nepotism': 'المحسوبية',
  'corruption': 'الفساد',
  'integrity': 'النزاهة',
  'honesty': 'الصدق',
  'truthfulness': 'الصدق',
  'sincerity': 'الإخلاص',
  'authenticity': 'الأصالة',
  'genuineness': 'الأصالة',
  'validity': 'الصلاحية',
  'reliability': 'الموثوقية',
  'credibility': 'المصداقية',
  'trustworthiness': 'الجدارة بالثقة',
  'confidence': 'الثقة',
  'assurance': 'الضمان',
  'certainty': 'اليقين',
  'security': 'الأمان',
  'safety': 'السلامة',
  'protection': 'الحماية',
  'defense': 'الدفاع',
  'guardianship': 'الوصاية',
  'custody': 'الحضانة',
  'preservation': 'الحفاظ',
  'conservation': 'المحافظة',
  'maintenance': 'الصيانة',
  'restoration': 'الترميم',
  'renovation': 'التجديد',
  'renewal': 'التجديد',
  'reconstruction': 'إعادة البناء',
  'reformation': 'الإصلاح',
  'transformation': 'التحويل',
  'modification': 'التعديل',
  'alteration': 'التغيير',
  'variation': 'التنوع',
  'diversity': 'التنوع',
  'variety': 'التنوع',
  'multiplicity': 'التعدد',
  'plurality': 'التعددية',
  'abundance': 'الوفرة',
  'scarcity': 'الندرة',
  'shortage': 'النقص',
  'deficiency': 'العجز',
  'insufficiency': 'عدم الكفاية',
  'adequacy': 'الكفاية',
  'excess': 'الزيادة',
  'surplus': 'الفائض',
  'deficit': 'العجز',
  'balance': 'التوازن',
  'equilibrium': 'التوازن',
  'stability': 'الاستقرار',
  'instability': 'عدم الاستقرار',
  'disorder': 'الاضطراب',
  'chaos': 'الفوضى',
  'confusion': 'الارتباك',
  'ambiguity': 'الغموض',
  'obscurity': 'الغموض',
  'clarity': 'الوضوح',
  'transparency': 'الشفافية',
  'opacity': 'الغموض',
  'visibility': 'الوضوح',
  'accessibility': 'سهولة الوصول',
  'availability': 'التوفر',
  'presence': 'الوجود',
  'absence': 'الغياب',
  'existence': 'الوجود',
  'nonexistence': 'العدم',
  'reality': 'الواقع',
  'actuality': 'الواقع',
  'potentiality': 'الإمكان',
  'possibility': 'الاحتمال',
  'impossibility': 'الاستحالة',
  'necessity': 'الضرورة',
  'contingency': 'الاحتمال',
  'inevitability': 'الحتمية',
  'fate': 'القدر',
  'destiny': 'المصير',
  'providence': 'العناية الإلهية',
  'divine': 'الإلهي',
  'sacred': 'المقدس',
  'holy': 'المقدس',
  'profane': 'الدنيوي',
  'secular': 'الدنيوي',
  'spiritual': 'الروحي',
  'material': 'المادي',
  'physical': 'المادي',
  'metaphysical': 'ما وراء الطبيعة',
  'transcendental': 'الماورائي',
  'temporal': 'الزمني',
  'eternal': 'الأبدي',
  'infinite': 'اللانهائي',
  'finite': 'المحدود',
  'absolute': 'المطلق',
  'relative': 'النسبي',
  'objective': 'الموضوعي',
  'subjective': 'الذاتي',
  'universal': 'الكلي',
  'particular': 'الجزئي',
  'general': 'العام',
  'specific': 'الخاص',
  'individual': 'الفردي',
  'collective': 'الجماعي',
  'social': 'الاجتماعي',
  'political': 'السياسي',
  'economic': 'الاقتصادي',
  'cultural': 'الثقافي',
  'historical': 'التاريخي',
  'geographical': 'الجغرافي',
  'scientific': 'العلمي',
  'technological': 'التقني',
  'philosophical': 'الفلسفي',
  'theological': 'اللاهوتي',
  'juridical': 'القانوني',
  'legal': 'القانوني',
  'legitimate': 'الشرعي',
  'illegitimate': 'غير الشرعي',
  'valid': 'صالح',
  'invalid': 'باطل',
  'null': 'باطل',
  'void': 'باطل',
  'effective': 'ساري',
  'ineffective': 'غير ساري',
  'operative': 'ساري المفعول',
  'inoperative': 'غير ساري',
  'applicable': 'قابل للتطبيق',
  'inapplicable': 'غير قابل للتطبيق',
  'relevant': 'ذو صلة',
  'irrelevant': 'لا صلة له',
  'pertinent': 'مهم',
  'impertinent': 'غير مهم',
  'suitable': 'مناسب',
  'unsuitable': 'غير مناسب',
  'appropriate': 'ملائم',
  'inappropriate': 'غير ملائم',
  'proper': 'صحيح',
  'improper': 'غير صحيح',
  'correct': 'صحيح',
  'incorrect': 'خاطئ',
  'accurate': 'دقيق',
  'inaccurate': 'غير دقيق',
  'precise': 'محدد',
  'imprecise': 'غير محدد',
  'exact': 'دقيق',
  'inexact': 'غير دقيق',
  'true': 'صحيح',
  'false': 'خاطئ',
  'right': 'صحيح',
  'wrong': 'خاطئ',
  'good': 'جيد',
  'bad': 'سيء',
  'better': 'أفضل',
  'worse': 'أسوأ',
  'best': 'الأفضل',
  'worst': 'الأسوأ',
  'superior': 'أسمى',
  'inferior': 'أدنى',
  'higher': 'أعلى',
  'lower': 'أدنى',
  'greater': 'أكبر',
  'lesser': 'أصغر',
  'larger': 'أكبر',
  'smaller': 'أصغر',
  'bigger': 'أكبر',
  'tiny': 'صغير',
  'huge': 'ضخم',
  'vast': 'واسع',
  'enormous': 'ضخم',
  'massive': 'ضخم',
  'immense': 'عظيم',
  'colossal': 'هائل',
  'gigantic': 'عملاق',
  'tremendous': 'عظيم',
  'considerable': 'معتبر',
  'significant': 'مهم',
  'substantial': 'جوهري',
  'essential': 'أساسي',
  'fundamental': 'جوهري',
  'crucial': 'حاسم',
  'vital': 'حيوي',
  'critical': 'حرج',
  'paramount': 'أسمى',
  'supreme': 'أعلى',
  'ultimate': 'أسمى',
  'final': 'نهائي',
  'initial': 'أولي',
  'primary': 'أساسي',
  'secondary': 'ثانوي',
  'tertiary': 'ثلاثي',
  'subordinate': 'تابع',
  'ancillary': 'مساعد',
  'auxiliary': 'مساعد',
  'complementary': 'مكمل',
  'supplementary': 'تكميلي',
  'additional': 'إضافي',
  'extra': 'إضافي',
  'further': 'إضافي',
  'more': 'أكثر',
  'less': 'أقل',
  'fewer': 'أقل',
  'much': 'كثير',
  'many': 'كثير',
  'several': 'عدة',
  'numerous': 'عدد',
  'multiple': 'متعدد',
  'various': 'مختلف',
  'diverse': 'متنوع',
  'different': 'مختلف',
  'similar': 'مشابه',
  'identical': 'مطابق',
  'equivalent': 'مكافئ',
  'analogous': 'مماثل',
  'comparable': 'قابل للمقارنة',
  'parallel': 'موازٍ',
  'contrary': 'متعارض',
  'opposite': 'معاكس',
  'reverse': 'معاكس',
  'inverse': 'عكسي',
  'converse': 'عكسي',
  'reciprocal': 'متبادل',
  'mutual': 'متبادل',
  'joint': 'مشترك',
  'shared': 'مشترك',
  'common': 'مشترك',
  'collective': 'جماعي',
  'public': 'عام',
  'private': 'خاص',
  'personal': 'شخصي',
  'individual': 'فردي',
  'general': 'عام',
  'special': 'خاص',
  'specific': 'محدد',
  'particular': 'معين',
  'certain': 'معين',
  'doubtful': 'مشكوك',
  'questionable': 'مثير للجدل',
  'problematic': 'مثير للإشكال',
  'controversial': 'مثير للجدل',
  'debatable': 'قابل للنقاش',
  'arguable': 'قابل للنقاش',
  'disputable': 'قابل للنزاع',
  'contestable': 'قابل للطعن',
  'challengeable': 'قابل للتحدي',
  'verifiable': 'قابل للتحقق',
  'confirmable': 'قابل للتأكيد',
  'falsifiable': 'قابل للدحض',
  'testable': 'قابل للاختبار',
  'measurable': 'قابل للقياس',
  'quantifiable': 'قابل للكمي',
  'calculable': 'قابل للحساب',
  'computable': 'قابل للحساب',
  'estimable': 'قابل للتقدير',
  'evaluable': 'قابل للتقييم',
  'assessable': 'قابل للتقويم',
  'determinable': 'قابل للتحديد',
  'identifiable': 'قابل للتعريف',
  'recognizable': 'قابل للتعرف',
  'distinguishable': 'قابل للتمييز',
  'perceptible': 'مدرك',
  'observable': 'قابل للملاحظة',
  'detectable': 'قابل للكشف',
  'noticeable': 'ملحوظ',
  'visible': 'مرئي',
  'invisible': 'غير مرئي',
  'apparent': 'ظاهر',
  'obvious': 'واضح',
  'evident': 'بيّن',
  'manifest': 'ظاهر',
  'patent': 'بيّن',
  'conspicuous': 'بارز',
  'prominent': 'بارز',
  'salient': 'بارز',
  'remarkable': 'لافت',
  'noteworthy': 'جدير بالذكر',
  'notable': 'بارز',
  'significant': 'مهم',
  'important': 'مهم',
  'essential': 'ضروري',
  'necessary': 'ضروري',
  'required': 'مطلوب',
  'needed': 'مطلوب',
  'demanded': 'مطلوب',
  'compulsory': 'إلزامي',
  'mandatory': 'إلزامي',
  'obligatory': 'واجب',
  'imperative': 'ضروري',
  'indispensable': 'لا غنى عنه',
  'vital': 'حيوي',
  'crucial': 'بالغ الأهمية',
  'critical': 'حرج',
  'pivotal': 'محوري',
  'key': 'أساسي',
  'central': 'مركزي',
  'core': 'جوهري',
  'main': 'رئيسي',
  'major': 'كبير',
  'minor': 'صغير',
  'principal': 'رئيسي',
  'chief': 'رئيس',
  'leading': 'رئيسي',
  'foremost': 'أول',
  'primary': 'أولي',
  'prime': 'أول',
  'supreme': 'أسمى',
  'paramount': 'أهم',
  'preeminent': 'بارز',
  'dominant': 'مهيمن',
  'predominant': 'غالب',
  'prevalent': 'شائع',
  'widespread': 'واسع الانتشار',
  'common': 'شائع',
  'frequent': 'متكرر',
  'regular': 'منتظم',
  'habitual': 'معتاد',
  'customary': 'معتاد',
  'usual': 'معتاد',
  'normal': 'طبيعي',
  'typical': 'نموذجي',
  'standard': 'قياسي',
  'conventional': 'تقليدي',
  'traditional': 'تقليدي',
  'orthodox': 'أرثوذكسي',
  'unorthodox': 'غير تقليدي',
  'heterodox': 'غير تقليدي',
  'alternative': 'بديل',
  'unconventional': 'غير تقليدي',
  'innovative': 'مبتكر',
  'novel': 'جديد',
  'original': 'أصلي',
  'creative': 'إبداعي',
  'inventive': 'مبتكر',
  'ingenious': 'عبقري',
  'resourceful': 'مبدع',
  'versatile': 'متعدد المهارات',
  'adaptable': 'مرن',
  'flexible': 'مرن',
  'rigid': 'صلب',
  'stiff': 'جامد',
  'firm': 'ثابت',
  'solid': 'صلب',
  'hard': 'صلب',
  'soft': 'لين',
  'tough': 'قوي',
  'fragile': 'هش',
  'delicate': 'رقيق',
  'sensitive': 'حساس',
  'resilient': 'مرن',
  'robust': 'قوي',
  'durable': 'دائم',
  'permanent': 'دائم',
  'temporary': 'مؤقت',
  'transient': 'عابر',
  'ephemeral': 'زائل',
  'fleeting': 'عابر',
  'momentary': 'لحظي',
  'instantaneous': 'فوري',
  'sudden': 'مفاجئ',
  'gradual': 'تدريجي',
  'progressive': 'تدريجي',
  'continuous': 'مستمر',
  'continual': 'متواصل',
  'perpetual': 'دائم',
  'constant': 'ثابت',
  'steady': 'مستقر',
  'stable': 'مستقر',
  'unstable': 'غير مستقر',
  'variable': 'متغير',
  'changeable': 'متغير',
  'fluctuating': 'متذبذب',
  'oscillating': 'متأرجح',
  'alternating': 'متناوب',
  'intermittent': 'متقطع',
  'periodic': 'دوري',
  'cyclical': 'دوري',
  'recurrent': 'متكرر',
  'recurring': 'متكرر',
  'repeated': 'مكرر',
  'frequent': 'متكرر',
  'infrequent': 'نادر',
  'rare': 'نادر',
  'uncommon': 'غير شائع',
  'exceptional': 'استثنائي',
  'extraordinary': 'غير عادي',
  'remarkable': 'استثنائي',
  'outstanding': 'متميز',
  'excellent': 'ممتاز',
  'superb': 'رائع',
  'magnificent': 'رائع',
  'splendid': 'باهر',
  'glorious': 'مجيد',
  'grand': 'عظيم',
  'majestic': 'مهيب',
  'imposing': 'مهيب',
  'impressive': 'مبهر',
  'striking': 'لافت',
  'stunning': 'مذهل',
  'astonishing': 'مدهش',
  'amazing': 'مذهل',
  'wonderful': 'رائع',
  'marvelous': 'عجيب',
  'fantastic': 'رائع',
  'incredible': 'مدهش',
  'unbelievable': 'لا يصدق',
  'inconceivable': 'غير قابل للتصور',
  'unimaginable': 'لا يمكن تخيله',
  'thinkable': 'قابل للتفكير',
  'conceivable': 'قابل للتصور',
  'imaginable': 'قابل للتخيل',
  'possible': 'ممكن',
  'probable': 'محتمل',
  'likely': 'محتمل',
  'unlikely': 'غير محتمل',
  'implausible': 'غير معقول',
  'credible': 'مصداق',
  'plausible': 'معقول',
  'reasonable': 'معقول',
  'rational': 'عقلاني',
  'logical': 'منطقي',
  'illogical': 'غير منطقي',
  'irrational': 'غير عقلاني',
  'absurd': 'سخيف',
  'ridiculous': 'مضحك',
  'ludicrous': 'أمر سخيف',
  'preposterous': 'سخيف',
  'nonsensical': 'لا معنى له',
  'meaningless': 'بلا معنى',
  'pointless': 'بلا فائدة',
  'purposeless': 'بلا هدف',
  'aimless': 'بلا هدف',
  'directionless': 'بلا اتجاه',
  'useless': 'عديم الفائدة',
  'worthless': 'بلا قيمة',
  'valueless': 'بلا قيمة',
  'priceless': 'ثمين',
  'valuable': 'ثمين',
  'precious': 'ثمين',
  'costly': 'مكلف',
  'expensive': 'غالي',
  'cheap': 'رخيص',
  'inexpensive': 'غير مكلف',
  'affordable': 'ميسور',
  'reasonable': 'معقول',
  'moderate': 'معتدل',
  'excessive': 'مفرط',
  'extreme': 'متطرف',
  'moderate': 'معتدل',
  'temperate': 'معتدل',
  'mild': 'خفيف',
  'gentle': 'لطيف',
  'harsh': 'قاسٍ',
  'severe': 'شديد',
  'strict': 'صارم',
  'rigorous': 'صارم',
  'lenient': 'متساهل',
  'tolerant': 'متسامح',
  'intolerant': 'غير متسامح',
  'permissive': 'متساهل',
  'restrictive': 'مقيد',
  'liberal': 'ليبرالي',
  'conservative': 'محافظ',
  'moderate': 'معتدل',
  'radical': 'جذري',
  'moderate': 'معتدل',
  'moderate': 'معتدل',
};

// Remove duplicates and build a cleaner map
const CLEAN_TRANSLATION_MAP: Record<string, string> = {};
for (const [key, value] of Object.entries(TRANSLATION_MAP)) {
  const k = key.trim().toLowerCase();
  if (k && !CLEAN_TRANSLATION_MAP[k]) {
    CLEAN_TRANSLATION_MAP[k] = value;
  }
}

// ============ MAIN FILTER FUNCTION ============

/**
 * Tokenize text into words while preserving whitespace, punctuation, and newlines
 */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let currentType: 'word' | 'space' | 'punct' | 'number' | 'other' | 'newline' = 'other';

  for (const c of text) {
    let tokenType: 'word' | 'space' | 'punct' | 'number' | 'other' | 'newline';

    if (c === '\n') {
      tokenType = 'newline';
    } else if (isWhitespace(c)) {
      tokenType = 'space';
    } else if (isArabicPunctuation(c)) {
      tokenType = 'punct';
    } else if (isSafeChar(c)) {
      tokenType = 'number';
    } else if (isArabicChar(c)) {
      tokenType = 'word';
    } else {
      // Latin or other foreign character
      tokenType = 'word';
    }

    if (tokenType !== currentType) {
      if (current) tokens.push(current);
      current = c;
      currentType = tokenType;
    } else {
      current += c;
    }
  }
  if (current) tokens.push(current);

  return tokens;
}

/**
 * Check if a word token is pure Arabic (only Arabic chars, no Latin)
 */
function isPureArabic(word: string): boolean {
  for (const c of word) {
    if (isArabicChar(c)) continue;
    if (isWhitespace(c)) continue;
    // Allow tatweel and diacritics
    const code = c.codePointAt(0) || 0;
    if (code === 0x0640) continue; // tatweel
    if (code >= 0x0610 && code <= 0x061A) continue; // Quranic marks
    if (code >= 0x064B && code <= 0x065F) continue; // Fatha, Damma, Kasra, etc.
    if (code >= 0x0670 && code <= 0x06D3) continue; // More diacritics
    return false;
  }
  return true;
}

/**
 * Process a single word that contains foreign characters
 * Try to translate it, otherwise remove it
 */
function processForeignWord(word: string): string {
  const lower = word.toLowerCase().trim();

  // 1. Check translation map
  if (CLEAN_TRANSLATION_MAP[lower]) {
    return CLEAN_TRANSLATION_MAP[lower];
  }

  // 2. Skip single letters (could be legitimate references like A, B, C)
  if (lower.length <= 1 && /[a-z]/.test(lower)) {
    return word;
  }

  // 3. Skip common abbreviations
  const abbreviations = [
    'e.g.', 'i.e.', 'etc', 'vs', 'vol', 'pp', 'ch', 'dr', 'sr', 'hr',
    'min', 'km', 'cm', 'mm', 'mg', 'kg', 'ml', 'ms', 'bc', 'ad',
    'ah', 'h', 'p', 's', 'n', 'v', 'q', 'r', 'fig', 'no', 'nos',
    'approx', 'cf', 'ed', 'eds', 'trans', 'et', 'al', 'ff', 'ibid',
    'op', 'cit', 'loc', 'supra', 'infra', 'id', 'seq', 'sqq',
  ];
  if (abbreviations.includes(lower)) {
    return word;
  }

  // 4. Skip pure numbers with units (like 3km, 5cm)
  if (/^\d+[\.\d]*(km|cm|mm|mg|kg|ml|ms|hr|min|sec|s|m|h|d|w|mo|yr|%|°C|°F|K)$/.test(lower)) {
    return word;
  }

  // 5. Skip URLs
  if (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('www.')) {
    return word;
  }

  // 6. Skip email-like patterns
  if (lower.includes('@') && lower.includes('.')) {
    return word;
  }

  // 7. Remove the word (it's foreign text with no translation)
  return '';
}

/**
 * Filter non-Arabic words from text - V2
 * 
 * Algorithm:
 * 1. Tokenize text preserving structure
 * 2. For each word token:
 *    a. If pure Arabic → keep it
 *    b. If contains foreign chars → try to translate or remove
 * 3. Rebuild text from processed tokens
 * 4. Clean up formatting artifacts
 */
export function filterArabicText(text: string): string {
  if (!text || typeof text !== 'string') return text;
  if (text.length === 0) return text;

  // Skip if text has no Latin/foreign characters at all (optimization)
  if (!containsForeignLetter(text)) return text;

  const tokens = tokenize(text);
  const processed: string[] = [];

  for (const token of tokens) {
    // Skip newlines and whitespace
    if (token === '\n' || /^\s+$/.test(token)) {
      processed.push(token);
      continue;
    }

    // Skip pure punctuation
    if (/^[\s\u060C\u061B\u061F\u0640\u066A.,;:!\?\-\+\=\%\/\\\@#\*\(\)\[\]\{\}«»""''\-\u2014\u2013\u2026]+$/.test(token)) {
      processed.push(token);
      continue;
    }

    // Skip pure numbers (Arabic or Western)
    if (/^[\d\u0660-\u0669\.\,\-\+\s%]+$/.test(token)) {
      processed.push(token);
      continue;
    }

    // Check if the token is pure Arabic
    if (isPureArabic(token)) {
      processed.push(token);
      continue;
    }

    // Token contains foreign characters - try to process
    const result = processForeignWord(token);
    if (result) {
      processed.push(result);
    }
    // If result is empty string, the word is removed (not pushed)
  }

  let output = processed.join('');

  // Clean up formatting artifacts
  output = output.replace(/\s{3,}/g, '\n\n'); // Multiple spaces → paragraph break
  output = output.replace(/\s{2,}/g, ' ');    // Double spaces → single space
  output = output.replace(/ ([\.\,\،\؛\:\!؟\؟])/g, '$1'); // Remove space before punctuation
  output = output.replace(/\(\s+\)/g, '');      // Remove empty parentheses
  output = output.replace(/\[\s+\]/g, '');      // Remove empty brackets
  output = output.replace(/\{\s+\}/g, '');      // Remove empty braces
  output = output.replace(/\s+\)/g, ')');       // Fix space before closing paren
  output = output.replace(/\(\s+/g, '(');       // Fix space after opening paren
  output = output.replace(/\s+\]/g, ']');
  output = output.replace(/\[\s+/g, '[');
  output = output.replace(/\n\s*\n\s*\n/g, '\n\n'); // Max 2 consecutive newlines
  output = output.trim();

  return output;
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
