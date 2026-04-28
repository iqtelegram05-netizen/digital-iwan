'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

import { BookOpen, Compass, Mic, Calendar, Clock, Menu } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import QiblaCompass from './QiblaCompass';
import { type ReaderItem } from '@/store/appStore';

// ========== EVENTS DATA ==========
const HIJRI_EVENTS = [
  { month: 1, day: 1, title: 'رأس السنة الهجرية', color: 'bg-sky-500' },
  { month: 1, day: 10, title: 'عاشوراء - استشهاد الإمام الحسين (ع)', color: 'bg-red-600' },
  { month: 2, day: 20, title: 'أربعينية الحسين (ع)', color: 'bg-red-600' },
  { month: 3, day: 17, title: 'مولد النبي محمد (ص) والإمام الصادق (ع)', color: 'bg-sky-500' },
  { month: 7, day: 27, title: 'المبعث النبوي', color: 'bg-sky-500' },
  { month: 8, day: 15, title: 'مولد الإمام المهدي (عج)', color: 'bg-sky-500' },
  { month: 9, day: 19, title: 'ضربة الإمام علي (ع)', color: 'bg-yellow-600' },
  { month: 9, day: 21, title: 'شهادة الإمام علي (ع)', color: 'bg-red-600' },
  { month: 9, day: 27, title: 'ليلة القدر', color: 'bg-blue-500' },
  { month: 12, day: 18, title: 'عيد الغدير الأغر', color: 'bg-sky-500' },
];

const MONTH_NAMES = [
  '', 'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

interface PrayerItem {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  text: string;
}

export default function SideDrawer() {
  const { sheetOpen, setSheetOpen, openReader } = useAppStore();
  const [prayers, setPrayers] = useState<PrayerItem[]>([]);
  const [prayersLoading, setPrayersLoading] = useState(true);

  const fetchPrayers = useCallback(async () => {
    try {
      setPrayersLoading(true);
      const res = await fetch('/api/prayers');
      if (res.ok) {
        const data = await res.json();
        setPrayers(data.prayers || []);
      }
    } catch {
      // silent
    } finally {
      setPrayersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sheetOpen) {
      fetchPrayers();
    }
  }, [sheetOpen, fetchPrayers]);

  const duaItems = prayers.filter((p) => p.category === 'دعاء');
  const ziyaratItems = prayers.filter((p) => p.category === 'زيارة');
  const sermonItems = prayers.filter((p) => p.category === 'خطب');

  const handleOpen = (item: PrayerItem) => {
    const readerItem: ReaderItem = {
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      category: item.category,
      text: item.text,
    };
    openReader(readerItem);
  };

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

          <ScrollArea className="h-[calc(100dvh-140px)] px-3 pb-6">
            {/* Prayers Tab */}
            <TabsContent value="prayers" className="mt-0 space-y-4">
              <h3 className="text-sm font-bold text-foreground/80 mb-3 mt-2">الأدعية</h3>
              {prayersLoading ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground text-xs">
                  <motion.div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin-slow ml-2" />
                  جارٍ التحميل...
                </div>
              ) : duaItems.length > 0 ? (
                <div className="space-y-2">
                  {duaItems.map((prayer, idx) => (
                    <motion.button
                      key={prayer.id}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card/40 border border-primary/10 hover:bg-primary/10 hover:border-primary/30 transition-all text-right group"
                      onClick={() => handleOpen(prayer)}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <BookOpen className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{prayer.title}</p>
                        {prayer.subtitle && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{prayer.subtitle}</p>
                        )}
                      </div>
                      <motion.div
                        className="text-primary/40 group-hover:text-primary transition-colors"
                        whileHover={{ x: -3 }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                      </motion.div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">لا توجد أدعية مضافة بعد. يمكن للمالك إضافتها من لوحة التحكم.</p>
              )}

              <Separator className="my-4 bg-primary/10" />
              <h3 className="text-sm font-bold text-foreground/80 mb-3">الزيارات</h3>
              {ziyaratItems.length > 0 ? (
                <div className="space-y-2">
                  {ziyaratItems.map((prayer, idx) => (
                    <motion.button
                      key={prayer.id}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card/40 border border-primary/10 hover:bg-primary/10 hover:border-primary/30 transition-all text-right group"
                      onClick={() => handleOpen(prayer)}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Compass className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{prayer.title}</p>
                        {prayer.subtitle && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{prayer.subtitle}</p>
                        )}
                      </div>
                      <motion.div
                        className="text-primary/40 group-hover:text-primary transition-colors"
                        whileHover={{ x: -3 }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                      </motion.div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">لا توجد زيارات مضافة بعد.</p>
              )}
            </TabsContent>

            {/* Qibla Tab */}
            <TabsContent value="qibla" className="mt-0">
              <QiblaCompass />
            </TabsContent>

            {/* Sermons Tab */}
            <TabsContent value="sermons" className="mt-0 space-y-4">
              <h3 className="text-sm font-bold text-foreground/80 mb-3 mt-2">الخطب</h3>
              {prayersLoading ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground text-xs">
                  <motion.div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin-slow ml-2" />
                  جارٍ التحميل...
                </div>
              ) : sermonItems.length > 0 ? (
                <div className="space-y-2">
                  {sermonItems.map((prayer, idx) => (
                    <motion.button
                      key={prayer.id}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card/40 border border-primary/10 hover:bg-primary/10 hover:border-primary/30 transition-all text-right group"
                      onClick={() => handleOpen(prayer)}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Mic className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{prayer.title}</p>
                        {prayer.subtitle && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{prayer.subtitle}</p>
                        )}
                      </div>
                      <motion.div
                        className="text-primary/40 group-hover:text-primary transition-colors"
                        whileHover={{ x: -3 }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                      </motion.div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">لا توجد خطب مضافة بعد. يمكن للمالك إضافتها من لوحة التحكم.</p>
              )}
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
