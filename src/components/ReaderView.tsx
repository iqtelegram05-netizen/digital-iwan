'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import CrystalButton from './CrystalButton';
import {
  ArrowRight,
  Type,
  Palette,
  Maximize2,
  Minimize2,
  BookOpen,
  Mic,
  Compass,
  X,
} from 'lucide-react';

// ========== Font Options ==========
const FONT_OPTIONS = [
  { id: 'amiri', label: 'أميري', family: 'var(--font-amiri)', style: 'font-[family-name:var(--font-amiri)]' },
  { id: 'cairo', label: 'القاهرة', family: 'var(--font-cairo)', style: 'font-[family-name:var(--font-cairo)]' },
  { id: 'tajawal', label: 'تجوال', family: 'var(--font-tajawal)', style: 'font-[family-name:var(--font-tajawal)]' },
  { id: 'naskh', label: 'نسخ عربي', family: '"Noto Naskh Arabic", serif', style: 'font-[\'Noto_Naskh_Arabic\',serif]' },
  { id: 'kufi', label: 'كوفي', family: '"Noto Kufi Arabic", sans-serif', style: 'font-[\'Noto_Kufi_Arabic\',sans-serif]' },
  { id: 'traditional', label: 'تقليدي', family: '"Traditional Arabic", serif', style: 'font-[\'Traditional_Arabic\',serif]' },
] as const;

// ========== Color Options ==========
const COLOR_OPTIONS = [
  { id: 'default', label: 'افتراضي', value: 'text-foreground/85', bg: 'bg-foreground' },
  { id: 'warm', label: 'دافئ', value: 'text-amber-200/90', bg: 'bg-amber-200' },
  { id: 'gold', label: 'ذهبي', value: 'text-yellow-300/90', bg: 'bg-yellow-300' },
  { id: 'sky', label: 'سماوي', value: 'text-sky-200/90', bg: 'bg-sky-200' },
  { id: 'emerald', label: 'زمردي', value: 'text-emerald-200/90', bg: 'bg-emerald-200' },
  { id: 'rose', label: 'وردي', value: 'text-rose-200/90', bg: 'bg-rose-200' },
  { id: 'purple', label: 'بنفسجي', value: 'text-purple-200/90', bg: 'bg-purple-200' },
] as const;

// ========== Size Options ==========
const SIZE_OPTIONS = [
  { id: 'sm', label: 'صغير', value: 'text-sm', lineHeight: 'leading-[2]' },
  { id: 'md', label: 'متوسط', value: 'text-base', lineHeight: 'leading-[2.2]' },
  { id: 'lg', label: 'كبير', value: 'text-lg', lineHeight: 'leading-[2.5]' },
  { id: 'xl', label: 'كبير جداً', value: 'text-xl', lineHeight: 'leading-[2.8]' },
  { id: '2xl', label: 'ضخم', value: 'text-2xl', lineHeight: 'leading-[3]' },
] as const;

export default function ReaderView() {
  const { readerItem, setCurrentView } = useAppStore();
  const [activeFont, setActiveFont] = useState('amiri');
  const [activeColor, setActiveColor] = useState('default');
  const [activeSize, setActiveSize] = useState('md');
  const [showControls, setShowControls] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // حفظ التفضيلات في localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('iwan_reader_prefs');
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.font) setActiveFont(prefs.font);
        if (prefs.color) setActiveColor(prefs.color);
        if (prefs.size) setActiveSize(prefs.size);
      }
    } catch { /* silent */ }
  }, []);

  const savePrefs = (font: string, color: string, size: string) => {
    try {
      localStorage.setItem('iwan_reader_prefs', JSON.stringify({ font, color, size }));
    } catch { /* silent */ }
  };

  const handleFontChange = (id: string) => {
    setActiveFont(id);
    savePrefs(id, activeColor, activeSize);
  };

  const handleColorChange = (id: string) => {
    setActiveColor(id);
    savePrefs(activeFont, id, activeSize);
  };

  const handleSizeChange = (id: string) => {
    setActiveSize(id);
    savePrefs(activeFont, activeColor, id);
  };

  if (!readerItem) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <p className="text-muted-foreground text-sm">لم يتم تحديد نص</p>
        <CrystalButton variant="outline" className="mt-4" onClick={() => setCurrentView('chat')}>
          العودة
        </CrystalButton>
      </div>
    );
  }

  const currentFont = FONT_OPTIONS.find((f) => f.id === activeFont) || FONT_OPTIONS[0];
  const currentColor = COLOR_OPTIONS.find((c) => c.id === activeColor) || COLOR_OPTIONS[0];
  const currentSize = SIZE_OPTIONS.find((s) => s.id === activeSize) || SIZE_OPTIONS[1];

  const categoryIcon = readerItem.category === 'خطب' ? Mic : readerItem.category === 'زيارة' ? Compass : BookOpen;
  const CategoryIcon = categoryIcon;

  return (
    <div className="flex flex-col h-full">
      {/* Header Bar */}
      <motion.div
        className="shrink-0 px-3 sm:px-4 pt-2 pb-2 glass-card border-b border-primary/10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <CrystalButton
              variant="outline"
              size="sm"
              className="shrink-0 border-primary/20 hover:bg-primary/10"
              onClick={() => setCurrentView('chat')}
            >
              <ArrowRight className="w-4 h-4" />
            </CrystalButton>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{readerItem.title}</p>
              {readerItem.subtitle && (
                <p className="text-[10px] text-muted-foreground truncate">{readerItem.subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20">
              <CategoryIcon className="w-3 h-3 text-primary" />
              <span className="text-[10px] text-primary font-medium">{readerItem.category}</span>
            </div>
            <CrystalButton
              variant="outline"
              size="sm"
              className="border-primary/20 hover:bg-primary/10"
              onClick={() => setShowControls(!showControls)}
            >
              <AnimatePresence mode="wait">
                {showControls ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                    <X className="w-4 h-4" />
                  </motion.div>
                ) : (
                  <motion.div key="settings" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                    <Type className="w-4 h-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </CrystalButton>
          </div>
        </div>
      </motion.div>

      {/* Controls Panel */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="shrink-0 overflow-hidden"
          >
            <div className="px-3 sm:px-4 py-3 space-y-3 glass-card border-b border-primary/10">
              {/* Font Type */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Type className="w-3.5 h-3.5" />
                  نوع الخط
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {FONT_OPTIONS.map((font) => (
                    <button
                      key={font.id}
                      onClick={() => handleFontChange(font.id)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        activeFont === font.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card/50 border-border/30 hover:border-primary/40 text-foreground/70'
                      }`}
                      style={{ fontFamily: font.family }}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Color */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Palette className="w-3.5 h-3.5" />
                  لون النص
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => handleColorChange(color.id)}
                      className={`w-7 h-7 rounded-full border-2 transition-all shrink-0 ${
                        activeColor === color.id
                          ? 'border-primary scale-110 shadow-lg'
                          : 'border-transparent hover:border-foreground/30'
                      }`}
                      title={color.label}
                    >
                      <div className={`w-full h-full rounded-full ${color.bg}`} />
                    </button>
                  ))}
                  <span className="text-[10px] text-muted-foreground mr-1">
                    {currentColor.label}
                  </span>
                </div>
              </div>

              {/* Font Size */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {currentSize.id === 'lg' || currentSize.id === 'xl' || currentSize.id === '2xl' ? (
                    <Maximize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Minimize2 className="w-3.5 h-3.5" />
                  )}
                  حجم الخط
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {SIZE_OPTIONS.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => handleSizeChange(size.id)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg border transition-all ${
                        activeSize === size.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card/50 border-border/30 hover:border-primary/40 text-foreground/70'
                      }`}
                    >
                      <span className={`text-xs ${size.value}`}>{size.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Text Content Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <motion.div
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {/* Decorative Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center sky-glow">
              <CategoryIcon className="w-7 h-7 text-primary" />
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold mb-2 ${currentFont.style}`}>{readerItem.title}</h1>
            {readerItem.subtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground">{readerItem.subtitle}</p>
            )}
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-primary/30" />
              <div className="w-2 h-2 rounded-full bg-primary/30" />
              <div className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-primary/30" />
            </div>
          </div>

          {/* Main Text */}
          <div className="prayer-border rounded-xl p-4 sm:p-6 bg-card/30">
            <p
              className={`whitespace-pre-wrap text-foreground/85 transition-all duration-300 ${currentFont.style} ${currentSize.value} ${currentSize.lineHeight} ${currentColor.value}`}
              style={{ fontFamily: currentFont.family }}
            >
              {readerItem.text}
            </p>
          </div>

          {/* Footer Decoration */}
          <div className="text-center mt-6 mb-4">
            <div className="flex items-center justify-center gap-2">
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-primary/20" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/20" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/30" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/20" />
              <div className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-primary/20" />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
