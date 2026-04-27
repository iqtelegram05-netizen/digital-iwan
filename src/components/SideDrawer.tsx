'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

import { BookOpen, Compass, Mic, Calendar, ChevronDown, ChevronUp, Clock, Menu } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import QiblaCompass from './QiblaCompass';

// ========== PRAYERS DATA ==========
const PRAYERS = [
  {
    id: 'd Kumail',
    title: 'دعاء كميل',
    subtitle: 'الدعاء المروي عن الإمام علي بن أبي طالب (ع)',
    text: 'اَللّـهُمَّ إِنّي اَسْاَلُكَ بِرَحْمَتِكَ الَّتي وَسِعَتْ كُلَّ شَيْء، وَبِقُوَّتِكَ الَّتي قَهَرَتْ كُلَّ شَيْء، وَخَضَعَ لَها كُلُّ شَيْء، وَذَلَّ لَها كُلُّ شَيْء...',
  },
  {
    id: 'd arafa',
    title: 'دعاء عرفة',
    subtitle: 'من أدعية يوم عرفة',
    text: 'اَلحَمْدُ للهِ رَبِّ الْعالَمينَ، اَللّهُمَّ لكَ الْحَمْدُ كَما يَنْبَغي لِشَانِ كَرَمِكَ وَعَظيمِ سُلْطانِكَ...',
  },
  {
    id: 'd nadba',
    title: 'دعاء ندبة',
    subtitle: 'الدعاء المروي عن الإمام المهدي (عج)',
    text: 'اَلْحَمْدُ للهِ رَبِّ الْعالَمينَ، وَصَلَّى اللهُ عَلى سَيِّدِنا مُحَمَّد نَبيِّهِ وَآلِهِ وَسَلَّمَ تَسْليماً...',
  },
  {
    id: 'd faraj',
    title: 'دعاء الفرج',
    subtitle: 'دعاء يُقال في أوقات الشدة',
    text: 'لا اِلـهَ اِلاّ اللهُ الْحَلِيمُ الْكَرِيمُ، لا اِلـهَ اِلاّ اللهُ الْعَلِيُّ الْعَظيمُ، سُبْحانَ اللهِ رَبِّ السَّماواتِ السَّبْعِ وَرَبِّ الاَرَضينَ السَّبْعِ...',
  },
  {
    id: 'd sanami',
    title: 'دعاء صنمي قريش',
    subtitle: 'الدعاء المروي عن أهل البيت (ع)',
    text: 'اَللّـهُمَّ اِنّي اَسْاَلُكَ مِنْ فَضْلِكَ، وَاَسْاَلُكَ مِنْ رَحْمَتِكَ، وَاَسْاَلُكَ مِنْ عَفْوِكَ...',
  },
  {
    id: 'd tawassul',
    title: 'دعاء التوسل',
    subtitle: 'دعاء التوسل بآل محمد (ص)',
    text: 'اَللّهُمَّ اِنّي اَتَوَجَّهُ اِلَيْكَ بِنَبِيِّكَ نَبِيِّ الرَّحْمَةِ مُحَمَّد صَلَّى اللهُ عَلَيْهِ وَآلِهِ...',
  },
  {
    id: 'd ahd',
    title: 'دعاء العهد',
    subtitle: 'يُقرأ أول أيام شهر رجب',
    text: 'اَللّهُمَّ رَبَّ النّورِ الْعَظيمِ، وَرَبَّ الْكُرْسِيِّ الرَّفيعِ، وَرَبَّ الْبَحْرِ الْمَسْجُورِ...',
  },
  {
    id: 'd simat',
    title: 'دعاء السمات',
    subtitle: 'من أدعية الإمام زين العابدين (ع)',
    text: 'اَللّهُمَّ اجْعَلْ في قَلْبي عَلَماً وَنُوراً وَفَهْماً وَإيماناً وَيَقيناً...',
  },
  {
    id: 'd sabr',
    title: 'دعاء أهل الصبر',
    subtitle: 'دعاء لأهل المصائب والصبر',
    text: 'اَللّهُمَّ صَلِّ عَلى مُحَمَّد وَآلِ مُحَمَّد وَارْزُقْني فِي دارِ الدُّنْيا طاعَتَكَ...',
  },
];

const ZIYARAT = [
  {
    id: 'z ashura',
    title: 'زيارة عاشوراء',
    subtitle: 'الزيارة المقدسة في يوم عاشوراء',
    text: 'اَلسَّلامُ عَلَيْكَ يا اَبا عَبْدِ اللهِ، اَلسَّلامُ عَلَيْكَ يَابْنَ رَسُولِ اللهِ...',
  },
  {
    id: 'z warith',
    title: 'زيارة وارث',
    subtitle: 'الزيارة المروية عن الإمام الصادق (ع)',
    text: 'اَلسَّلامُ عَلَيْكَ يا وارِثَ آدَمَ صَفْوَةِ اللهِ، اَلسَّلامُ عَلَيْكَ يا وارِثَ نُوح نَبِيِّ اللهِ...',
  },
  {
    id: 'z jamea',
    title: 'الجامعة الكبيرة',
    subtitle: 'من أعظم الزيارات',
    text: 'اَلسَّلامُ عَلَيْكَ يا اَميرَ الْمُؤْمِنينَ، اَلسَّلامُ عَلَيْكَ يا وَلِيَّ اللهِ...',
  },
];

// ========== SERMONS DATA ==========
const SERMONS = [
  {
    id: 's qasiya',
    title: 'الخطبة القاصعة',
    subtitle: 'من خُطب أمير المؤمنين (ع) في نهج البلاغة',
    text: 'فَإِنَّ أَوْلَى النّاسِ بِالأَنْبِيَاءِ أَعْمَلُهُمْ بِما جاءُوا بِهِ، ثُمَّ تَلا ذلِكَ قَوْلُهُ عَزَّ وَجَلَّ: "إِنَّ الَّذينَ يُؤْمِنُونَ وَيَعْمَلُونَ الصّالِحاتِ أُولئِكَ هُمْ خَيْرُ الْبَرِيَّةِ"...',
  },
  {
    id: 's nh1',
    title: 'نهج البلاغة - الخطبة 1',
    subtitle: 'أول الخطب في نهج البلاغة',
    text: 'اَلْحَمْدُ للهِ الَّذي لا يُبْلِغُ مَدْحَهُ الْقائِلُونَ، وَلا يُحْصِي نَعْماءَهُ الْعادُّونَ، وَلا يُؤَدّي حَقَّهُ الْمُجْتَهِدُونَ...',
  },
  {
    id: 's nh3',
    title: 'نهج البلاغة - الخطبة 3',
    subtitle: 'الخطبة الشقشقية',
    text: 'أَمَا وَاللهِ لَوَدِدْتُ أَنَّ مُحَمَّداً صَلَّى اللهُ عَلَيْهِ وَآلِهِ لَمْ يُبْعَثْ قَطُّ، وَأَنَّ لِي كَبِدَي شَقّاً بِما أَرى مِنْ هَلْكِ أُمَّتِي...',
  },
  {
    id: 's nh16',
    title: 'نهج البلاغة - الخطبة 16',
    subtitle: 'في صفات المتقين',
    text: 'اَلتَّقْوى هِيَ الْخَيْرُ كُلُّهُ، وَهِيَ السِّلْمُ كُلُّهُ، وَالْحُكْمَةُ كُلُّها، وَالْبِرُّ كُلُّهُ...',
  },
  {
    id: 's nh183',
    title: 'نهج البلاغة - الخطبة 183',
    subtitle: 'في صفات الله تعالى',
    text: 'اَلْحَمْدُ للهِ الَّذي لا يَصْطَفِي مِنْ خَلْقِهِ سِوَى مَنْ عَلِمَ أَنَّ النِّعْمَةَ مِنْهُ...',
  },
  {
    id: 's nh216',
    title: 'نهج البلاغة - الخطبة 216',
    subtitle: 'في الوعظ والتذكير',
    text: 'أَيُّهَا النّاسُ، إِنَّمَا الدُّنْيا دارُ مَمَرٍّ لا دارُ مَقَرٍّ، وَالنّاسُ فيها رَجُلانِ: رَجُلٌ باعَ نَفْسَهُ فَأَتْبَعَها...',
  },
  {
    id: 's mutaqin',
    title: 'خطبة المتقين',
    subtitle: 'في صفات المتقين',
    text: 'وَقَدْ تَخَلَّوْا مِنَ الدُّنْيا فَتَخَلَّتْ مِنْهُمْ، وَتَخَلَّتْ مِنْهُمْ فَتَخَلَّوْا مِنْها...',
  },
  {
    id: 's ashthar',
    title: 'عهد مالك الأشتر',
    subtitle: 'وصية الإمام علي (ع) لمالك الأشتر عند توليه مصر',
    text: 'هذا ما أَمَرَ بِهِ عَبْدُ اللهِ عَلِيٌّ أَميرُ الْمُؤْمِنينَ مالِكاً الْأَشْتَرَ حِينَ وَلَّاهُ مِصْرَ...',
  },
];

// ========== EVENTS DATA ==========
const HIJRI_EVENTS = [
  { month: 1, day: 1, title: 'رأس السنة الهجرية', color: 'bg-emerald-500' },
  { month: 1, day: 10, title: 'عاشوراء - استشهاد الإمام الحسين (ع)', color: 'bg-red-600' },
  { month: 2, day: 20, title: 'أربعينية الحسين (ع)', color: 'bg-red-600' },
  { month: 3, day: 17, title: 'مولد النبي محمد (ص) والإمام الصادق (ع)', color: 'bg-emerald-500' },
  { month: 7, day: 27, title: 'المبعث النبوي', color: 'bg-emerald-500' },
  { month: 8, day: 15, title: 'مولد الإمام المهدي (عج)', color: 'bg-emerald-500' },
  { month: 9, day: 19, title: 'ضربة الإمام علي (ع)', color: 'bg-yellow-600' },
  { month: 9, day: 21, title: 'شهادة الإمام علي (ع)', color: 'bg-red-600' },
  { month: 9, day: 27, title: 'ليلة القدر', color: 'bg-blue-500' },
  { month: 12, day: 18, title: 'عيد الغدير الأغر', color: 'bg-emerald-500' },
];

const MONTH_NAMES = [
  '', 'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

export default function SideDrawer() {
  const { sheetOpen, setSheetOpen } = useAppStore();

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetContent side="right" className="w-[90vw] max-w-md p-0 bg-background/95 backdrop-blur-xl">
        <SheetHeader className="p-4 pb-0 border-b border-border/20">
          <SheetTitle className="flex items-center gap-2 text-primary text-lg">
            <Menu className="w-5 h-5" />
            القائمة الرئيسية
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            تصفح الأدعية والخطب والمناسبات
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="prayers" className="h-full" dir="rtl">
          <TabsList className="w-full grid grid-cols-4 p-1 m-3 rounded-xl bg-muted/50 h-auto">
            {[
              { value: 'prayers', label: 'الأدعية', icon: BookOpen },
              { value: 'qibla', label: 'القبلة', icon: Compass },
              { value: 'sermons', label: 'الخطب', icon: Mic },
              { value: 'events', label: 'المناسبات', icon: Calendar },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex flex-col items-center gap-1 py-2 text-[10px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg"
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <ScrollArea className="h-[calc(100vh-140px)] px-3 pb-6">
            {/* Prayers Tab */}
            <TabsContent value="prayers" className="mt-0 space-y-4">
              <h3 className="text-sm font-bold text-foreground/80 mb-3 mt-2">الأدعية</h3>
              {PRAYERS.map((prayer) => (
                <PrayerCard key={prayer.id} {...prayer} />
              ))}
              <Separator className="my-4 bg-primary/10" />
              <h3 className="text-sm font-bold text-foreground/80 mb-3">الزيارات</h3>
              {ZIYARAT.map((z) => (
                <PrayerCard key={z.id} {...z} />
              ))}
            </TabsContent>

            {/* Qibla Tab */}
            <TabsContent value="qibla" className="mt-0">
              <QiblaCompass />
            </TabsContent>

            {/* Sermons Tab */}
            <TabsContent value="sermons" className="mt-0 space-y-4">
              <h3 className="text-sm font-bold text-foreground/80 mb-3 mt-2">خطب أمير المؤمنين (ع)</h3>
              {SERMONS.map((sermon) => (
                <PrayerCard key={sermon.id} {...sermon} />
              ))}
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="mt-0">
              <h3 className="text-sm font-bold text-foreground/80 mb-3 mt-2">مناسبات التاريخ الهجري</h3>
              <div className="space-y-2">
                {HIJRI_EVENTS.map((event, idx) => (
                  <motion.div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-xl bg-card/50 border border-border/30"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${event.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{event.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {event.day} {MONTH_NAMES[event.month]}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Countdown hint */}
              <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10 text-center">
                <Clock className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">العد التنازلي للمناسبة القادمة سيظهر هنا</p>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

// ========== Prayer Card Component ==========
function PrayerCard({ title, subtitle, text }: { title: string; subtitle: string; text: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      className="rounded-xl overflow-hidden border border-primary/10 bg-card/30"
      layout
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 text-right flex items-start gap-3 hover:bg-primary/5 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>
        </div>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-primary shrink-0" />
        </motion.div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="prayer-border mx-3 mb-3">
              <p className="text-sm leading-[2.2] arabic-text text-foreground/80 whitespace-pre-wrap">{text}</p>
              <p className="text-[10px] text-muted-foreground mt-3 text-center">... إلى آخر الدعاء</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


