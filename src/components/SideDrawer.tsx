'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

import { BookOpen, Compass, Mic, Calendar, Clock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
// QiblaCompass moved to standalone page at /qibla
import { type ReaderItem } from '@/store/appStore';
import { useTranslation } from '@/i18n/useTranslation';
import { isRTL } from '@/i18n/languages';

// ========== EVENTS DATA (month/day only - titles come from translations) ==========
const HIJRI_EVENTS = [
  { month: 1, day: 1, titleKey: 'events.hijriNewYear', color: 'bg-sky-500' },
  { month: 1, day: 10, titleKey: 'events.ashura', color: 'bg-red-600' },
  { month: 2, day: 20, titleKey: 'events.arbaeen', color: 'bg-red-600' },
  { month: 3, day: 17, titleKey: 'events.prophetBirth', color: 'bg-sky-500' },
  { month: 7, day: 27, titleKey: 'events.mabath', color: 'bg-sky-500' },
  { month: 8, day: 15, titleKey: 'events.mahdiBirth', color: 'bg-sky-500' },
  { month: 9, day: 19, titleKey: 'events.aliStrike', color: 'bg-yellow-600' },
  { month: 9, day: 21, titleKey: 'events.aliMartyrdom', color: 'bg-red-600' },
  { month: 9, day: 27, titleKey: 'events.laylatAlQadr', color: 'bg-blue-500' },
  { month: 12, day: 18, titleKey: 'events.eidAlGhadir', color: 'bg-sky-500' },
];

interface PrayerItem {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  text: string;
}

// ========== Reusable Prayer List Item ==========
function PrayerListItem({
  prayer,
  Icon,
  onClick,
}: {
  prayer: PrayerItem;
  Icon: React.ElementType;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full p-3 rounded-xl bg-card/40 border border-primary/10 hover:bg-primary/10 hover:border-primary/30 transition-all text-right group"
      style={{ display: 'grid', gridTemplateColumns: '40px 1fr 20px', gap: '10px', alignItems: 'center' }}
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <Icon className="w-4 h-4 text-primary" />
      </div>

      {/* Text - guaranteed width via 1fr grid column */}
      <div style={{ minWidth: 0, overflow: 'hidden' }}>
        <p
          className="text-sm font-medium text-foreground group-hover:text-primary transition-colors"
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {prayer.title}
        </p>
        {prayer.subtitle && (
          <p
            className="text-[10px] text-muted-foreground"
            style={{ marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {prayer.subtitle}
          </p>
        )}
      </div>

      {/* Arrow */}
      <div className="text-primary/40 group-hover:text-primary transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </div>
    </button>
  );
}

export default function SideDrawer() {
  const { sheetOpen, setSheetOpen, openReader } = useAppStore();
  const [prayers, setPrayers] = useState<PrayerItem[]>([]);
  const [prayersLoading, setPrayersLoading] = useState(true);
  const { t, tSection, lang } = useTranslation();
  const dir = isRTL(lang) ? 'rtl' : 'ltr';
  const side = dir === 'rtl' ? 'right' : 'right';
  const monthNames = tSection('events.months') as string[];

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
            {t('menu.mainMenu')}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            {t('menu.browseContent')}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="prayers" className="flex-1 min-h-0 flex flex-col" dir="rtl" onValueChange={(val) => {
          if (val === 'qibla') {
            window.location.href = '/qibla';
          } else if (val === 'events') {
            window.location.href = '/hijri';
          }
        }}>
          <TabsList className="w-full grid grid-cols-4 p-1 m-3 rounded-xl bg-muted/50 h-auto">
            {[
              { value: 'prayers', label: t('tabs.prayers'), icon: BookOpen },
              { value: 'qibla', label: t('tabs.qibla'), icon: Compass, isExternal: true, href: '/qibla' },
              { value: 'sermons', label: t('tabs.sermons'), icon: Mic },
              { value: 'events', label: t('tabs.events'), icon: Calendar },
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

          <ScrollArea className="flex-1 min-h-0 px-3 pb-6" style={{ overflowX: 'hidden' } as React.CSSProperties}>
            {/* Prayers Tab */}
            <TabsContent value="prayers" className="mt-0 space-y-4">
              <h3 className="text-sm font-bold text-foreground/80 mb-3 mt-2">{t('prayers.title')}</h3>
              {prayersLoading ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground text-xs">
                  <motion.div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin-slow ml-2" />
                  {t('prayers.loading')}
                </div>
              ) : duaItems.length > 0 ? (
                <div className="space-y-2">
                  {duaItems.map((prayer) => (
                    <PrayerListItem key={prayer.id} prayer={prayer} Icon={BookOpen} onClick={() => handleOpen(prayer)} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">{t('prayers.empty')}</p>
              )}

              <Separator className="my-4 bg-primary/10" />
              <h3 className="text-sm font-bold text-foreground/80 mb-3">{t('prayers.visits')}</h3>
              {ziyaratItems.length > 0 ? (
                <div className="space-y-2">
                  {ziyaratItems.map((prayer) => (
                    <PrayerListItem key={prayer.id} prayer={prayer} Icon={Compass} onClick={() => handleOpen(prayer)} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">{t('prayers.visitsEmpty')}</p>
              )}
            </TabsContent>

            {/* Qibla - opens dedicated page */}
            <TabsContent value="qibla" className="mt-0">
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Compass className="w-10 h-10 text-primary animate-pulse" />
                <p className="text-sm text-muted-foreground">جارٍ فتح بوصلة القبلة...</p>
              </div>
            </TabsContent>

            {/* Sermons Tab */}
            <TabsContent value="sermons" className="mt-0 space-y-4">
              <h3 className="text-sm font-bold text-foreground/80 mb-3 mt-2">{t('prayers.sermonsTitle')}</h3>
              {prayersLoading ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground text-xs">
                  <motion.div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin-slow ml-2" />
                  {t('prayers.loading')}
                </div>
              ) : sermonItems.length > 0 ? (
                <div className="space-y-2">
                  {sermonItems.map((prayer) => (
                    <PrayerListItem key={prayer.id} prayer={prayer} Icon={Mic} onClick={() => handleOpen(prayer)} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">{t('prayers.sermonsEmpty')}</p>
              )}
            </TabsContent>

            {/* Events Tab - redirects to full Hijri calendar page */}
            <TabsContent value="events" className="mt-0">
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Calendar className="w-10 h-10 text-primary animate-pulse" />
                <p className="text-sm text-muted-foreground">جارٍ فتح التقويم الهجري...</p>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
