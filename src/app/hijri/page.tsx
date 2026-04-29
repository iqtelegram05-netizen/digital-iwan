'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ChevronRight, ChevronLeft, Search, X, Calendar, Star, Heart,
  BookOpen, Moon, Sun, Sparkles, ChevronDown, Filter
} from 'lucide-react';

// ============================================================
// HIJRI CALENDAR ENGINE (Tabular Islamic Calendar)
// Reference Epoch: 1447-11-12 = 2026-04-29 (Wednesday)
// ============================================================

const EPOCH_GREG = new Date(2026, 3, 29); // April 29, 2026
const EPOCH_HY = 1447;
const EPOCH_HM = 11; // ذو القعدة
const EPOCH_HD = 12;

const LEAP_YEARS = [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29];

function isLeapHijri(y: number): boolean {
  return LEAP_YEARS.includes(((y - 1) % 30) + 1);
}

function monthDays(y: number, m: number): number {
  if (m % 2 === 1) return 30;
  if (m === 12 && isLeapHijri(y)) return 30;
  return 29;
}

function gregToHijri(d: Date): { year: number; month: number; day: number } {
  const diffDays = Math.round((d.getTime() - EPOCH_GREG.getTime()) / 86400000);
  let hY = EPOCH_HY, hM = EPOCH_HM, hD = EPOCH_HD;
  if (diffDays >= 0) {
    hD += diffDays;
    while (hD > monthDays(hY, hM)) {
      hD -= monthDays(hY, hM);
      hM++;
      if (hM > 12) { hM = 1; hY++; }
    }
  } else {
    let rem = -diffDays;
    hD -= rem;
    while (hD < 1) {
      hM--;
      if (hM < 1) { hM = 12; hY--; }
      hD += monthDays(hY, hM);
    }
  }
  return { year: hY, month: hM, day: hD };
}

function hijriToGreg(hY: number, hM: number, hD: number): Date {
  // Convert Hijri to days from epoch
  let dy = hD - EPOCH_HD;
  let my = hY, mm = hM;
  if (dy >= 0) {
    // Count forward from epoch month
    let cy = EPOCH_HY, cm = EPOCH_HM;
    while (cy < my || (cy === my && cm < mm)) {
      dy += monthDays(cy, cm);
      cm++;
      if (cm > 12) { cm = 1; cy++; }
    }
  } else {
    let cy = EPOCH_HY, cm = EPOCH_HM;
    while (cy > my || (cy === my && cm > mm)) {
      cm--;
      if (cm < 1) { cm = 12; cy--; }
      dy -= monthDays(cy, cm);
    }
  }
  const result = new Date(EPOCH_GREG.getTime() + dy * 86400000);
  return result;
}

// ============================================================
// ARABIC MONTH & DAY NAMES
// ============================================================

const HIJRI_MONTHS = [
  '', 'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];

const WEEK_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const GREG_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

// ============================================================
// COMPREHENSIVE AHL AL-BAYT EVENTS DATABASE
// ============================================================

interface HijriEvent {
  month: number;
  day: number;
  title: string;
  type: 'birth' | 'martyrdom' | 'occasion' | 'sad' | 'eid' | 'wiladat' | 'wafat';
  person?: string;
  description?: string;
}

const AHL_AL_BAYT_EVENTS: HijriEvent[] = [
  // ========= محرم =========
  { month: 1, day: 1, title: 'رأس السنة الهجرية', type: 'occasion', description: 'أول أيام السنة الهجرية وبداية أيام الحزن على الإمام الحسين (ع)' },
  { month: 1, day: 2, title: 'وصول الإمام الحسين (ع) وأهل بيته إلى كربلاء', type: 'sad', person: 'الإمام الحسين (ع)', description: 'نزل الإمام الحسين (ع) وأصحابه في أرض كربلاء يوم الثاني من محرم' },
  { month: 1, day: 3, title: 'استشهاد القاسم بن الحسن (ع)', type: 'martyrdom', person: 'القاسم بن الحسن (ع)', description: 'استُشهد القاسم بن الإمام الحسن المجتبى (ع) وهو ابن ثلاثة عشر عاماً في كربلاء' },
  { month: 1, day: 7, title: 'دخول الحسن والحسين على رسول الله (ص)', type: 'occasion', person: 'النبي محمد (ص)', description: 'نزل جبرائيل بالبشرى بمولد الحسين (ع) فأتى النبي (ص) بيوم السابع إلى فاطمة (س)' },
  { month: 1, day: 7, title: 'حصار الإمام الحسين (ع) في كربلاء', type: 'sad', person: 'الإمام الحسين (ع)', description: 'فرض جيش عمر بن سعد الحصار على الإمام الحسين (ع) ومنعه من الوصول إلى الماء' },
  { month: 1, day: 9, title: 'التاسع من محرم - يوم التروية', type: 'sad', person: 'الإمام الحسين (ع)', description: 'يوم التروية، حاصرت فيه خيول العدو الإمام الحسين (ع) ومن معه' },
  { month: 1, day: 10, title: 'عاشوراء - شهادة الإمام الحسين (ع)', type: 'martyrdom', person: 'الإمام الحسين (ع)', description: 'استُشهد الإمام الحسين بن علي (ع) وأصحابه في واقعة كربلاء سنة 61 هـ. أعظم مأساة في التاريخ الإسلامي' },
  { month: 1, day: 10, title: 'شهادة العباس بن علي (ع)', type: 'martyrdom', person: 'العباس بن علي (ع)', description: 'استُشهد أبو الفضل العباس (ع) أخو الإمام الحسين (ع) وهو يحمل الماء إلى خيام الأطفال والعيال' },
  { month: 1, day: 10, title: 'شهادة علي الأكبر بن الحسين (ع)', type: 'martyrdom', person: 'علي الأكبر بن الحسين (ع)', description: 'استُشهد علي الأكبر ابن الإمام الحسين (ع) وكان أشبه الناس برسول الله (ص) خَلقاً وخُلقاً' },
  { month: 1, day: 11, title: 'استشهاد الإمام زين العابدين (ع) - رواية ضعيفة', type: 'martyrdom', person: 'الإمام زين العابدين (ع)', description: 'هناك رواية ضعيفة باستشهاد الإمام السجاد (ع) في كربلاء والمشهور أنه أُسر ونجا' },
  { month: 1, day: 13, title: 'شهادة الإمام زين العابدين (ع)', type: 'martyrdom', person: 'الإمام زين العابدين (ع)', description: 'استُشهد الإمام علي بن الحسين السجاد (ع) سنة 95 هـ بالمدينة المنورة مسموماً على يد الوليد بن عبد الملك' },
  { month: 1, day: 25, title: 'مبايعة المسلمين للإمام علي (ع) في الغدير', type: 'occasion', person: 'الإمام علي (ع)', description: 'بعد وفاة عثمان، بايع الناس الإمام علي (ع) خليفة للمسلمين يوم 25 محرم سنة 35 هـ' },

  // ========= صفر =========
  { month: 2, day: 3, title: 'شهادة الإمام الحسن المجتبى (ع)', type: 'martyrdom', person: 'الإمام الحسن (ع)', description: 'استُشهد الإمام الحسن بن علي (ع) مسموماً على يد زوجته جعدة بنت الأشعث سنة 50 هـ بالمدينة المنورة' },
  { month: 2, day: 7, title: 'وفاة رسول الله (ص)', type: 'sad', person: 'النبي محمد (ص)', description: 'انتقال النبي الأعظم محمد (ص) إلى الرفيق الأعلى سنة 11 هـ. من أقرب المناسبات المؤلمة لأهل البيت (ع)' },
  { month: 2, day: 8, title: 'شهادة الإمام الحسن العسكري (ع)', type: 'martyrdom', person: 'الإمام العسكري (ع)', description: 'استُشهد الإمام الحسن بن علي العسكري (ع) مسموماً على يد المعتمد العباسي سنة 260 هـ في سامراء' },
  { month: 2, day: 17, title: 'استشهاد الصحابي الجليل سلمان الفارسي', type: 'martyrdom', person: 'سلمان الفارسي (رض)', description: 'وفاة سلمان الفارسي (رض) خادم أهل البيت (ع) ومترجم معنى الولاية' },
  { month: 2, day: 20, title: 'أربعينية الإمام الحسين (ع)', type: 'occasion', person: 'الإمام الحسين (ع)', description: 'يوم الأربعين - زيارة الإمام الحسين (ع) في العشرين من صفر. أكبر تجمع بشري سنوي في العالم' },
  { month: 2, day: 28, title: 'وفاة رسول الله (ص) - رواية أخرى', type: 'sad', person: 'النبي محمد (ص)', description: 'بعض الروايات تذكر وفاة النبي (ص) في 28 صفر بدلاً من 7 صفر' },
  { month: 2, day: 28, title: 'رحلة النبي (ص) وأمير المؤمنين إلى المدينة', type: 'occasion', person: 'النبي محمد (ص)', description: 'هجرة النبي الأكرم (ص) والإمام علي (ع) من مكة المكرمة إلى المدينة المنورة' },
  { month: 2, day: 30, title: 'شهادة الإمام رضا (ع)', type: 'martyrdom', person: 'الإمام الرضا (ع)', description: 'استُشهد الإمام علي بن موسى الرضا (ع) مسموماً على يد المأمون العباسي بطوس (مشهد) سنة 203 هـ' },

  // ========= ربيع الأول =========
  { month: 3, day: 8, title: 'وفاة هارون الرشيد', type: 'occasion', description: 'وفاة الخليفة العباسي هارون الرشيد الذي اضطهد أهل البيت (ع)' },
  { month: 3, day: 10, title: 'وفاة السيدة خديجة الكبرى (س)', type: 'sad', person: 'السيدة خديجة (س)', description: 'وفاة السيدة خديجة بنت خويلد (س) أم المؤمنين وأول من آمن بالنبي (ص) سنة 3 قبل الهجرة' },
  { month: 3, day: 17, title: 'مولد النبي محمد (ص)', type: 'wiladat', person: 'النبي محمد (ص)', description: 'مولد سيد المرسلين ونبي الإسلام محمد بن عبد الله (ص) في مكة المكرمة عام الفيل سنة 570 م' },
  { month: 3, day: 17, title: 'مولد الإمام جعفر الصادق (ع)', type: 'wiladat', person: 'الإمام الصادق (ع)', description: 'مولد الإمام جعفر بن محمد الصادق (ع) في المدينة المنورة سنة 83 هـ' },

  // ========= ربيع الثاني =========
  { month: 4, day: 8, title: 'شهادة الإمام الحسن العسكري (ع) - رواية أخرى', type: 'martyrdom', person: 'الإمام العسكري (ع)', description: 'بعض الروايات تذكر شهادة الإمام العسكري (ع) في 8 ربيع الثاني سنة 260 هـ' },

  // ========= جمادى الأولى =========
  { month: 5, day: 5, title: 'مولد السيدة زينب الكبرى (س)', type: 'wiladat', person: 'السيدة زينب (س)', description: 'مولد السيدة زينب بنت علي (س) حفيدة النبي (ص) وأخت الإمام الحسين (ع) في المدينة المنورة سنة 5 هـ' },
  { month: 5, day: 13, title: 'وفاة أم المؤمنين السيدة خديجة (س)', type: 'sad', person: 'السيدة خديجة (س)', description: 'بعض الروايات تذكر وفاتها في 13 جمادى الأولى' },

  // ========= جمادى الآخرة =========
  { month: 6, day: 3, title: 'شهادة السيدة فاطمة الزهراء (س)', type: 'martyrdom', person: 'السيدة فاطمة الزهراء (س)', description: 'استُشهدت السيدة فاطمة بنت محمد (س) الصديقة الطاهرة بعد مرضها إثر الضربة والأسقاط سنة 11 هـ. 75 يوماً بعد وفاة النبي (ص)' },
  { month: 6, day: 20, title: 'مولد السيدة فاطمة الزهراء (س)', type: 'wiladat', person: 'السيدة فاطمة الزهراء (س)', description: 'مولد فاطمة الزهراء (س) سيدة نساء العالمين بنت رسول الله (ص) سنة 8 قبل الهجرة في مكة المكرمة' },

  // ========= رجب =========
  { month: 7, day: 1, title: 'مولد الإمام محمد الباقر (ع)', type: 'wiladat', person: 'الإمام الباقر (ع)', description: 'مولد الإمام محمد بن علي الباقر (ع) في المدينة المنورة سنة 57 هـ. شقّق العلم شقاً لذلك قيل له الباقر' },
  { month: 7, day: 3, title: 'شهادة الإمام علي بن أبي طالب (ع)', type: 'martyrdom', person: 'الإمام علي (ع)', description: 'بعض الروايات الشيعية تذكر شهادة أمير المؤمنين (ع) في 3 رجب سنة 40 هـ' },
  { month: 7, day: 10, title: 'مولد الإمام محمد الجواد (ع)', type: 'wiladat', person: 'الإمام الجواد (ع)', description: 'مولد الإمام محمد بن علي الجواد (ع) التاسع من أئمة أهل البيت سنة 195 هـ بالمدينة المنورة' },
  { month: 7, day: 13, title: 'مولد الإمام علي بن أبي طالب (ع)', type: 'wiladat', person: 'الإمام علي (ع)', description: 'مولد أمير المؤمنين علي بن أبي طالب (ع) داخل الكعبة المشرفة سنة 23 قبل الهجرة. الكعبة لم يُولد فيها أحد قبله' },
  { month: 7, day: 27, title: 'المبعث النبوي الشريف', type: 'occasion', person: 'النبي محمد (ص)', description: 'بعثة النبي محمد (ص) بالنور الإلهي ونزول الوحي بابتداء الرسالة. إحدى أعظم المناسبات الإسلامية' },

  // ========= شعبان =========
  { month: 8, day: 3, title: 'مولد الإمام الحسين بن علي (ع)', type: 'wiladat', person: 'الإمام الحسين (ع)', description: 'مولد سيد الشهداء الإمام الحسين بن علي (ع) في المدينة المنورة سنة 4 هـ على ما روي' },
  { month: 8, day: 4, title: 'مولد الإمام الحسين (ع) - رواية أخرى', type: 'wiladat', person: 'الإمام الحسين (ع)', description: 'بعض الروايات تذكر مولد الإمام الحسين (ع) في 4 شعبان' },
  { month: 8, day: 5, title: 'مولد الإمام العباس (ع)', type: 'wiladat', person: 'العباس بن علي (ع)', description: 'مولد أبي الفضل العباس بن علي (ع) قمر بني هاشم وساقي عطاشى كربلاء سنة 26 هـ' },
  { month: 8, day: 15, title: 'مولد الإمام المهدي (عج)', type: 'wiladat', person: 'الإمام المهدي (عج)', description: 'ليلة النصف من شعبان - مولد الإمام محمد بن الحسن المهدي (عج) صاحب العصر والزمان سنة 255 هـ في سامراء' },
  { month: 8, day: 15, title: 'ولادة الإمام الحسن بن علي (ع) - رواية', type: 'wiladat', person: 'الإمام الحسن (ع)', description: 'بعض المصادر تذكر مولد الإمام الحسن المجتبى (ع) في 15 شعبان سنة 3 هـ' },

  // ========= رمضان =========
  { month: 9, day: 2, title: 'استشهاد أمير المؤمنين علي (ع) - رواية أخرى', type: 'martyrdom', person: 'الإمام علي (ع)', description: 'بعض الروايات تذكر استشهاد الإمام علي (ع) في ليلة الثاني من رمضان' },
  { month: 9, day: 10, title: 'وفاة السيدة خديجة (س) - رواية أخرى', type: 'sad', person: 'السيدة خديجة (س)', description: 'بعض المصادر تاريخ وفاتها في 10 رمضان سنة 10 قبل الهجرة' },
  { month: 9, day: 15, title: 'مولد الإمام الحسن بن علي (ع)', type: 'wiladat', person: 'الإمام الحسن (ع)', description: 'مولد الإمام الحسن المجتبى (ع) سبط النبي (ص) في المدينة المنورة سنة 3 هـ' },
  { month: 9, day: 19, title: 'ضربة الإمام علي (ع) على رأسه', type: 'sad', person: 'الإمام علي (ع)', description: 'ضُرب أمير المؤمنين علي (ع) على رأسه المبارك بالسيف المسموم في المحراب على يد عبد الرحمن بن ملجم المرادي سنة 40 هـ' },
  { month: 9, day: 21, title: 'شهادة الإمام علي بن أبي طالب (ع)', type: 'martyrdom', person: 'الإمام علي (ع)', description: 'استُشهد أمير المؤمنين علي بن أبي طالب (ع) بعد الضربة بيومين في الكوفة سنة 40 هـ. دُفن في النجف الأشرف' },
  { month: 9, day: 23, title: 'ليلة القدر المباركة', type: 'occasion', person: 'النبي محمد (ص)', description: 'ليلة القدر التي هي خير من ألف شهر. نزل فيها القرآن الكريم على النبي الأعظم (ص). أنزل الله فيها السور' },
  { month: 9, day: 25, title: 'شهادة الإمام موسى بن جعفر الكاظم (ع)', type: 'martyrdom', person: 'الإمام الكاظم (ع)', description: 'استُشهد الإمام موسى بن جعفر الكاظم (ع) مسموماً في سجن هارون الرشيد ببغداد سنة 183 هـ. دُفن في الكاظمية' },

  // ========= شوال =========
  { month: 10, day: 1, title: 'عيد الفطر المبارك', type: 'eid', description: 'عيد الفطر السعيد - عيد المسلمين بعد صيام شهر رمضان المبارك. من أعياد الله المباركة' },
  { month: 10, day: 25, title: 'شهادة الإمام جعفر الصادق (ع)', type: 'martyrdom', person: 'الإمام الصادق (ع)', description: 'استُشهد الإمام جعفر بن محمد الصادق (ع) مسموماً على يد المنصور العباسي سنة 148 هـ في المدينة المنورة' },
  { month: 10, day: 25, title: 'شهادة الإمام موسى الكاظم (ع) - رواية أخرى', type: 'martyrdom', person: 'الإمام الكاظم (ع)', description: 'بعض الروايات تاريخ شهادته في 25 شوال سنة 183 هـ' },

  // ========= ذو القعدة =========
  { month: 11, day: 6, title: 'وفاة السيدة فاطمة المعصومة (س)', type: 'sad', person: 'السيدة فاطمة المعصومة (س)', description: 'وفاة السيدة فاطمة المعصومة بنت موسى الكاظم (س) أخت الإمام الرضا (ع) في قم سنة 201 هـ. مرقدها في قم' },
  { month: 11, day: 11, title: 'مولد الإمام علي بن محمد الهادي (ع)', type: 'wiladat', person: 'الإمام الهادي (ع)', description: 'مولد الإمام علي بن محمد الهادي (ع) في صريا من أرض المدينة سنة 212 هـ' },
  { month: 11, day: 30, title: 'وفاة السيدة خديجة الكبرى (س)', type: 'sad', person: 'السيدة خديجة (س)', description: 'بعض الروايات تاريخ وفاتها في 30 ذو القعدة سنة 10 قبل الهجرة' },

  // ========= ذو الحجة =========
  { month: 12, day: 1, title: 'زواج الإمام علي (ع) والسيدة فاطمة (س)', type: 'occasion', person: 'الإمام علي (ع)', description: 'زواج أمير المؤمنين علي (ع) بالسيدة فاطمة الزهراء (س) سيدة نساء العالمين في المدينة المنورة' },
  { month: 12, day: 7, title: 'مولد الإمام موسى بن جعفر الكاظم (ع)', type: 'wiladat', person: 'الإمام الكاظم (ع)', description: 'مولد الإمام موسى بن جعفر الكاظم (ع) في الأبواء بين مكة والمدينة سنة 128 هـ' },
  { month: 12, day: 10, title: 'عيد الأضحى المبارك', type: 'eid', description: 'عيد الأضحى - ذبح القرابين تقرباً لله تعالى. يوم الحج الأكبر' },
  { month: 12, day: 15, title: 'ولادة الإمام زين العابدين (ع)', type: 'wiladat', person: 'الإمام زين العابدين (ع)', description: 'مولد الإمام علي بن الحسين السجاد (ع) في المدينة المنورة سنة 38 هـ' },
  { month: 12, day: 18, title: 'عيد الغدير الأغر', type: 'eid', person: 'الإمام علي (ع)', description: 'يوم الغدير - يوم نصب النبي (ص) الإمام علي (ع) خليفة وولياً للمسلمين في غدير خم سنة 10 هـ. أكبر أعياد الشيعة' },
  { month: 12, day: 24, title: 'يوم المباهلة', type: 'occasion', person: 'النبي محمد (ص)', description: 'يوم المباهلة مع نصارى نجران حين خرج النبي (ص) بعلي وفاطمة والحسن والحسين (ع) للمباهلة' },
  { month: 12, day: 26, title: 'وفاة أبي طالب (رض)', type: 'sad', person: 'أبو طالب (رض)', description: 'وفاة أبي طالب عم النبي (ص) والناصر الأول للإسلام سنة 10 قبل الهجرة في السنة التي توفي فيها خديجة (س)' },
];

// ============================================================
// EVENT TYPE STYLES
// ============================================================

const EVENT_STYLES: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  wiladat: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400', icon: <Sparkles className="w-3 h-3" /> },
  birth: { bg: 'bg-sky-500/10', border: 'border-sky-500/30', text: 'text-sky-600 dark:text-sky-400', icon: <Star className="w-3 h-3" /> },
  martyrdom: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600 dark:text-red-400', icon: <Heart className="w-3 h-3" /> },
  wafat: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600 dark:text-red-400', icon: <Heart className="w-3 h-3" /> },
  sad: { bg: 'bg-amber-900/10', border: 'border-amber-800/30', text: 'text-amber-700 dark:text-amber-500', icon: <Moon className="w-3 h-3" /> },
  eid: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600 dark:text-yellow-400', icon: <Sun className="w-3 h-3" /> },
  occasion: { bg: 'bg-primary/10', border: 'border-primary/30', text: 'text-primary', icon: <BookOpen className="w-3 h-3" /> },
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function HijriCalendarPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  const todayHijri = gregToHijri(today);

  // Current week start (Hijri days offset)
  const currentWeekStart = useMemo(() => {
    const todayMs = today.getTime();
    const todayDayOfWeek = today.getDay(); // 0=Sun, 3=Wed for 2026-04-29
    const weekStartMs = todayMs - (todayDayOfWeek * 86400000) + (weekOffset * 7 * 86400000);
    return new Date(weekStartMs);
  }, [today, weekOffset]);

  // Generate 7 days of the week
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart.getTime() + i * 86400000);
      const hijri = gregToHijri(date);
      const dayOfWeek = date.getDay();
      const events = AHL_AL_BAYT_EVENTS.filter(e => e.month === hijri.month && e.day === hijri.day);
      const isToday = date.toDateString() === today.toDateString();
      days.push({ date, hijri, dayOfWeek, events, isToday });
    }
    return days;
  }, [currentWeekStart, today]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return AHL_AL_BAYT_EVENTS.filter(e =>
      e.title.toLowerCase().includes(q) ||
      (e.person && e.person.toLowerCase().includes(q)) ||
      (e.description && e.description.toLowerCase().includes(q)) ||
      HIJRI_MONTHS[e.month].includes(q)
    );
  }, [searchQuery]);

  // Filter events for today
  const todayEvents = useMemo(() => {
    return AHL_AL_BAYT_EVENTS.filter(e => e.month === todayHijri.month && e.day === todayHijri.day);
  }, [todayHijri]);

  // Next event
  const nextEvent = useMemo(() => {
    // Find the next upcoming event from today
    for (let i = 0; i < 30; i++) {
      const futureDate = new Date(today.getTime() + i * 86400000);
      const h = gregToHijri(futureDate);
      const events = AHL_AL_BAYT_EVENTS.filter(e => e.month === h.month && e.day === h.day);
      if (events.length > 0 && i > 0) {
        return { daysAway: i, date: futureDate, hijri: h, events };
      }
    }
    return null;
  }, [today]);

  const goToday = useCallback(() => setWeekOffset(0), []);
  const goNextWeek = useCallback(() => setWeekOffset(o => o + 1), []);
  const goPrevWeek = useCallback(() => setWeekOffset(o => o - 1), []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center gap-2 px-3 py-3 bg-background/80 backdrop-blur-lg border-b border-primary/10">
        <button onClick={() => window.history.back()} className="p-2 rounded-full hover:bg-primary/10 transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">التقويم الهجري</span>
          </h1>
          <p className="text-[10px] text-muted-foreground">مناسبات أهل البيت عليهم السلام</p>
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="p-2 rounded-full hover:bg-primary/10 transition-colors"
        >
          {showSearch ? <X className="w-4 h-4 text-foreground" /> : <Search className="w-4 h-4 text-foreground" />}
        </button>
      </div>

      {/* Search Panel */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-primary/10 bg-background/90 backdrop-blur-sm"
          >
            <div className="px-4 py-3 space-y-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن مناسبة... (اسم شخص، شهر، نوع)"
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-card border border-primary/20 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                  autoFocus
                  dir="rtl"
                />
              </div>
              {searchQuery.trim() && (
                <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                  <span>{searchResults.length} نتيجة</span>
                  <button onClick={() => setSearchQuery('')} className="text-primary hover:underline">مسح</button>
                </div>
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="px-4 pb-3 max-h-[50vh] overflow-y-auto space-y-2">
                {searchResults.map((evt, idx) => {
                  const style = EVENT_STYLES[evt.type] || EVENT_STYLES.occasion;
                  return (
                    <motion.div
                      key={`${evt.month}-${evt.day}-${idx}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`p-3 rounded-xl ${style.bg} border ${style.border} ${style.text}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 shrink-0">{style.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold leading-relaxed">{evt.title}</p>
                          <p className="text-[10px] mt-1 opacity-70">{evt.day} {HIJRI_MONTHS[evt.month]}</p>
                          {evt.description && (
                            <p className="text-[10px] mt-1 leading-relaxed opacity-60">{evt.description}</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {searchQuery.trim() && searchResults.length === 0 && (
              <div className="px-4 pb-4 text-center">
                <p className="text-xs text-muted-foreground">لم يتم العثور على نتائج</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Today's Hijri Date Card */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl p-5 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(14,165,233,0.05))',
            border: '1.5px solid rgba(14,165,233,0.2)',
          }}
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          <p className="text-3xl font-black text-primary tracking-wide">
            {todayHijri.day}
          </p>
          <p className="text-sm font-bold text-foreground mt-1">{HIJRI_MONTHS[todayHijri.month]}</p>
          <p className="text-xs text-muted-foreground mt-1">{todayHijri.year} هـ</p>
          <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-muted-foreground">
            <span>{WEEK_DAYS[today.getDay()]}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span>{today.getDate()} {GREG_MONTHS[today.getMonth()]} {today.getFullYear()} م</span>
          </div>
        </motion.div>

        {/* Today's Events */}
        {todayEvents.length > 0 && !showSearch && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-foreground/80 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              مناسبات اليوم
            </h3>
            {todayEvents.map((evt, idx) => {
              const style = EVENT_STYLES[evt.type] || EVENT_STYLES.occasion;
              return (
                <motion.div
                  key={`today-${idx}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`p-3 rounded-xl ${style.bg} border ${style.border} ${style.text}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">{style.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold leading-relaxed">{evt.title}</p>
                      {evt.description && (
                        <p className="text-[10px] mt-1 leading-relaxed opacity-60">{evt.description}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Next Event Countdown */}
        {nextEvent && !showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="p-3 rounded-xl bg-primary/5 border border-primary/15"
          >
            <p className="text-[10px] text-muted-foreground mb-1">المناسبة القادمة بعد {nextEvent.daysAway} يوم</p>
            {nextEvent.events.slice(0, 2).map((evt, idx) => {
              const style = EVENT_STYLES[evt.type] || EVENT_STYLES.occasion;
              return (
                <div key={`next-${idx}`} className={`text-xs font-medium ${style.text}`}>
                  {evt.title} — {nextEvent.hijri.day} {HIJRI_MONTHS[nextEvent.hijri.month]}
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Week Navigation */}
        {!showSearch && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground/80 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                جدول الأسبوع
              </h3>
              <div className="flex items-center gap-1">
                <button onClick={goToday} className="text-[10px] px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">
                  اليوم
                </button>
                <button onClick={goPrevWeek} className="p-1.5 rounded-md hover:bg-primary/10 transition-colors text-foreground">
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={goNextWeek} className="p-1.5 rounded-md hover:bg-primary/10 transition-colors text-foreground">
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Week Table */}
            <div className="rounded-xl border border-border/50 overflow-hidden bg-card/40">
              {/* Table Header */}
              <div className="grid grid-cols-7 bg-muted/30 border-b border-border/30">
                {weekDays.map((d, i) => (
                  <div key={`header-${i}`} className="py-2 text-center text-[9px] font-bold text-muted-foreground border-l border-border/20 last:border-l-0">
                    {WEEK_DAYS[d.dayOfWeek]}
                  </div>
                ))}
              </div>

              {/* Hijri Date Row */}
              <div className="grid grid-cols-7 border-b border-border/30">
                {weekDays.map((d, i) => (
                  <div
                    key={`hijri-${i}`}
                    className={`py-3 px-1 text-center border-l border-border/20 last:border-l-0 transition-colors ${
                      d.isToday ? 'bg-primary/10' : 'hover:bg-muted/20'
                    }`}
                  >
                    <p className={`text-lg font-black leading-none ${d.isToday ? 'text-primary' : 'text-foreground/90'}`}>
                      {d.hijri.day}
                    </p>
                    <p className="text-[8px] text-muted-foreground mt-1 truncate px-0.5">
                      {HIJRI_MONTHS[d.hijri.month]}
                    </p>
                    <p className="text-[7px] text-muted-foreground/60 mt-0.5">
                      {d.date.getDate()}/{d.date.getMonth() + 1}
                    </p>
                  </div>
                ))}
              </div>

              {/* Events Row */}
              <div className="grid grid-cols-7">
                {weekDays.map((d, i) => (
                  <div
                    key={`events-${i}`}
                    className={`min-h-[80px] p-1.5 border-l border-border/20 last:border-l-0 ${
                      d.isToday ? 'bg-primary/5' : ''
                    }`}
                  >
                    {d.events.length > 0 ? (
                      <div className="space-y-1">
                        {d.events.slice(0, 2).map((evt, idx) => {
                          const isMartyrdom = evt.type === 'martyrdom' || evt.type === 'wafat' || evt.type === 'sad';
                          return (
                            <div
                              key={`evt-${idx}`}
                              className={`rounded-md px-1 py-0.5 text-[7px] leading-tight ${
                                isMartyrdom ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                                evt.type === 'eid' ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400' :
                                evt.type === 'wiladat' || evt.type === 'birth' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' :
                                'bg-primary/15 text-primary'
                              }`}
                            >
                              <span className="font-bold">{evt.person ? evt.person.split(' ')[0] : ''}</span>
                              <br />
                              <span className="opacity-80">{evt.title.length > 20 ? evt.title.slice(0, 18) + '...' : evt.title}</span>
                            </div>
                          );
                        })}
                        {d.events.length > 2 && (
                          <p className="text-[7px] text-muted-foreground text-center">
                            +{d.events.length - 2}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full opacity-20">
                        <span className="text-[10px]">—</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* All Events for Current Month (Collapsible) */}
        {!showSearch && (
          <div className="space-y-2">
            <button
              onClick={() => setShowAllEvents(!showAllEvents)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-card/40 border border-border/30 hover:bg-card/60 transition-colors"
            >
              <span className="text-xs font-bold text-foreground/80 flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-primary" />
                مناسبات شهر {HIJRI_MONTHS[todayHijri.month]} {todayHijri.year}
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showAllEvents ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showAllEvents && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-2"
                >
                  {AHL_AL_BAYT_EVENTS
                    .filter(e => e.month === todayHijri.month)
                    .sort((a, b) => a.day - b.day)
                    .map((evt, idx) => {
                      const style = EVENT_STYLES[evt.type] || EVENT_STYLES.occasion;
                      const isTodayEvt = evt.day === todayHijri.day;
                      return (
                        <motion.div
                          key={`month-${idx}`}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className={`p-3 rounded-xl ${style.bg} border ${isTodayEvt ? 'border-2 border-primary/50' : style.border} ${style.text}`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="mt-0.5 shrink-0">{style.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold bg-background/50 px-1.5 py-0.5 rounded-md">{evt.day}</span>
                                <p className="text-xs font-bold leading-relaxed">{evt.title}</p>
                              </div>
                              {evt.description && (
                                <p className="text-[10px] mt-1 leading-relaxed opacity-60">{evt.description}</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}

                  {AHL_AL_BAYT_EVENTS.filter(e => e.month === todayHijri.month).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      لا توجد مناسبات مسجلة لهذا الشهر في قاعدة البيانات
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* All Events Quick Reference (if search not active) */}
        {!showSearch && (
          <div className="space-y-2">
            <button
              onClick={() => setShowAllEvents(!showAllEvents)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-card/40 border border-border/30 hover:bg-card/60 transition-colors"
            >
              <span className="text-xs font-bold text-foreground/80 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                دليل المناسبات السنوية ({AHL_AL_BAYT_EVENTS.length} مناسبة)
              </span>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showAllEvents ? 'rotate-180' : ''}`} />
            </button>

            {showAllEvents && (
              <div className="overflow-y-auto max-h-[400px] space-y-1.5 pb-2">
                {/* Group by month */}
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => {
                  const monthEvents = AHL_AL_BAYT_EVENTS.filter(e => e.month === month).sort((a, b) => a.day - b.day);
                  if (monthEvents.length === 0) return null;
                  return (
                    <div key={`m-${month}`} className="space-y-1.5">
                      <div className="sticky top-0 z-10 py-1.5 px-2 bg-background/90 backdrop-blur-sm">
                        <p className="text-[10px] font-bold text-primary">{HIJRI_MONTHS[month]} — {monthEvents.length} مناسبة</p>
                      </div>
                      {monthEvents.map((evt, idx) => {
                        const style = EVENT_STYLES[evt.type] || EVENT_STYLES.occasion;
                        return (
                          <div key={`all-${month}-${idx}`} className={`p-2.5 rounded-lg ${style.bg} border ${style.border} ${style.text}`}>
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5 shrink-0 text-[10px]">{style.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[9px] font-mono bg-background/50 px-1 py-0.5 rounded">{evt.day}</span>
                                  <p className="text-[11px] font-bold leading-snug">{evt.title}</p>
                                </div>
                                {evt.description && evt.description.length > 40 && (
                                  <p className="text-[9px] mt-0.5 leading-relaxed opacity-50 line-clamp-2">{evt.description}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Bottom spacing */}
        <div className="h-4" />
      </div>
    </div>
  );
}
