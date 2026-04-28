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
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

// ========== 76 Font Options ==========
const FONT_OPTIONS = [
  // === خطوط عربية أصيلة ===
  { id: 'amiri', label: 'أميري', family: 'var(--font-amiri)', cat: 'عربية أصيلة' },
  { id: 'cairo', label: 'القاهرة', family: 'var(--font-cairo)', cat: 'عربية حديثة' },
  { id: 'tajawal', label: 'تجوال', family: 'var(--font-tajawal)', cat: 'عربية حديثة' },
  { id: 'aref-ruqaa', label: 'عارف رقعة', family: '"Aref Ruqaa", serif', cat: 'عربية أصيلة' },
  { id: 'lateef', label: 'لطيف', family: '"Lateef", serif', cat: 'عربية أصيلة' },
  { id: 'scheherazade', label: 'شهرزاد', family: '"Scheherazade New", serif', cat: 'عربية أصيلة' },
  { id: 'katibeh', label: 'كاتبة', family: '"Katibeh", cursive', cat: 'عربية أصيلة' },
  { id: 'markazi', label: 'مرکزی', family: '"Markazi Text", serif', cat: 'عربية أصيلة' },
  { id: 'jomhuria', label: 'جمهورية', family: '"Jomhuria", display', cat: 'عربية أصيلة' },
  { id: 'lalezar', label: 'لاله زار', family: '"Lalezar", display', cat: 'عربية أصيلة' },
  { id: 'mirza', label: 'ميرزا', family: '"Mirza", cursive', cat: 'عربية أصيلة' },
  // === خطوط عربية حديثة ===
  { id: 'almarai', label: 'المراعي', family: '"Almarai", sans-serif', cat: 'عربية حديثة' },
  { id: 'changa', label: 'شانغا', family: '"Changa", sans-serif', cat: 'عربية حديثة' },
  { id: 'rubik', label: 'روبيك', family: '"Rubik", sans-serif', cat: 'عربية حديثة' },
  { id: 'mada', label: 'مدى', family: '"Mada", sans-serif', cat: 'عربية حديثة' },
  { id: 'reem-kufi', label: 'ريم كوفي', family: '"Reem Kufi", sans-serif', cat: 'عربية حديثة' },
  { id: 'readex', label: 'رديكس برو', family: '"Readex Pro", sans-serif', cat: 'عربية حديثة' },
  { id: 'harmattan', label: 'هرمان', family: '"Harmattan", sans-serif', cat: 'عربية حديثة' },
  { id: 'hind', label: 'هند', family: '"Hind", sans-serif', cat: 'عربية حديثة' },
  { id: 'hind-vadodara', label: 'هند فادودارا', family: '"Hind Vadodara", sans-serif', cat: 'عربية حديثة' },
  { id: 'vazirmatn', label: 'وزير متن', family: '"Vazirmatn", sans-serif', cat: 'عربية حديثة' },
  { id: 'baloo', label: 'بالو بهيجان', family: '"Baloo Bhaijaan", cursive', cat: 'عربية حديثة' },
  { id: 'yrsa', label: 'يرسا', family: '"Yrsa", serif', cat: 'عربية حديثة' },
  { id: 'philosopher', label: 'فيلسوف', family: '"Philosopher", serif', cat: 'عربية حديثة' },
  // === خطوط نوتو ===
  { id: 'naskh', label: 'نسخ عربي', family: '"Noto Naskh Arabic", serif', cat: 'نوتو' },
  { id: 'kufi', label: 'كوفي عربي', family: '"Noto Kufi Arabic", sans-serif', cat: 'نوتو' },
  { id: 'noto-sans', label: 'نوتو سنس', family: '"Noto Sans Arabic", sans-serif', cat: 'نوتو' },
  { id: 'noto-serif', label: 'نوتو سيريف', family: '"Noto Serif Arabic", serif', cat: 'نوتو' },
  // === خطوط IBM ===
  { id: 'ibm-sans', label: 'آي بي إم سنس', family: '"IBM Plex Sans Arabic", sans-serif', cat: 'آي بي إم' },
  { id: 'ibm-serif', label: 'آي بي إم سيريف', family: '"IBM Plex Serif Arabic", serif', cat: 'آي بي إم' },
  // === خطوط سيريف عالمية ===
  { id: 'lora', label: 'لورا', family: '"Lora", serif', cat: 'سيريف عالمية' },
  { id: 'merriweather', label: 'ميريويذر', family: '"Merriweather", serif', cat: 'سيريف عالمية' },
  { id: 'crimson', label: 'كريمسون', family: '"Crimson Text", serif', cat: 'سيريف عالمية' },
  { id: 'spectral', label: 'سبكترال', family: '"Spectral", serif', cat: 'سيريف عالمية' },
  { id: 'cardo', label: 'كاردو', family: '"Cardo", serif', cat: 'سيريف عالمية' },
  { id: 'vollkorn', label: 'فولكورن', family: '"Vollkorn", serif', cat: 'سيريف عالمية' },
  { id: 'bitter', label: 'بيتر', family: '"Bitter", serif', cat: 'سيريف عالمية' },
  { id: 'pt-serif', label: 'بي تي سيريف', family: '"PT Serif", serif', cat: 'سيريف عالمية' },
  { id: 'cormorant', label: 'كورمورانت', family: '"Cormorant Garamond", serif', cat: 'سيريف عالمية' },
  { id: 'eb-garamond', label: 'إي بي غاراموند', family: '"EB Garamond", serif', cat: 'سيريف عالمية' },
  { id: 'libre-baskerville', label: 'ليبري باسكرفيل', family: '"Libre Baskerville", serif', cat: 'سيريف عالمية' },
  { id: 'fauna', label: 'فاونا', family: '"Fauna One", serif', cat: 'سيريف عالمية' },
  // === خطوط سنس عالمية ===
  { id: 'nunito', label: 'نونيتو', family: '"Nunito", sans-serif', cat: 'سنس عالمية' },
  { id: 'source-sans', label: 'سورس سنس', family: '"Source Sans 3", sans-serif', cat: 'سنس عالمية' },
  { id: 'source-serif', label: 'سورس سيريف', family: '"Source Serif 4", serif', cat: 'سنس عالمية' },
  // === خطوط عربية النظام ===
  { id: 'traditional', label: 'تقليدي', family: '"Traditional Arabic", serif', cat: 'خطوط النظام' },
  { id: 'simplified', label: 'عربي مبسط', family: '"Simplified Arabic", sans-serif', cat: 'خطوط النظام' },
  { id: 'typesetting', label: 'تنضيد عربي', family: '"Arabic Typesetting", serif', cat: 'خطوط النظام' },
  { id: 'majalla', label: 'مجلة', family: '"Sakkal Majalla", serif', cat: 'خطوط النظام' },
  { id: 'geeza', label: 'جيزة', family: '"Geeza Pro", serif', cat: 'خطوط النظام' },
  { id: 'tahoma', label: 'تاهوما', family: 'Tahoma, sans-serif', cat: 'خطوط النظام' },
  { id: 'arial', label: 'أريال', family: 'Arial, sans-serif', cat: 'خطوط النظام' },
  { id: 'segoe', label: 'سيغوي', family: '"Segoe UI", sans-serif', cat: 'خطوط النظام' },
  { id: 'georgia', label: 'جورجيا', family: 'Georgia, serif', cat: 'خطوط النظام' },
  { id: 'verdana', label: 'فردانا', family: 'Verdana, sans-serif', cat: 'خطوط النظام' },
  { id: 'times', label: 'تايمز', family: '"Times New Roman", serif', cat: 'خطوط النظام' },
  { id: 'palatino', label: 'بالاتينو', family: 'Palatino, serif', cat: 'خطوط النظام' },
  { id: 'garamond', label: 'غاراموند', family: 'Garamond, serif', cat: 'خطوط النظام' },
  { id: 'cambria', label: 'كامبريا', family: 'Cambria, serif', cat: 'خطوط النظام' },
  { id: 'calibri', label: 'كاليبري', family: 'Calibri, sans-serif', cat: 'خطوط النظام' },
  { id: 'trebuchet', label: 'تريبوكيت', family: '"Trebuchet MS", sans-serif', cat: 'خطوط النظام' },
  { id: 'droid-kufi', label: 'درويد كوفي', family: '"Droid Arabic Kufi", sans-serif', cat: 'خطوط النظام' },
  { id: 'droid-naskh', label: 'درويد نسخ', family: '"Droid Arabic Naskh", serif', cat: 'خطوط النظام' },
  { id: 'lucida', label: 'لوسيدا', family: '"Lucida Sans Unicode", sans-serif', cat: 'خطوط النظام' },
  { id: 'optima', label: 'أوبيتما', family: 'Optima, sans-serif', cat: 'خطوط النظام' },
  { id: 'bookman', label: 'بوكمان', family: 'Bookman, serif', cat: 'خطوط النظام' },
  { id: 'rockwell', label: 'روكويل', family: 'Rockwell, serif', cat: 'خطوط النظام' },
  { id: 'courier', label: 'كوريير', family: '"Courier New", monospace', cat: 'خطوط النظام' },
  { id: 'century', label: 'سنتوري', family: '"Century Schoolbook", serif', cat: 'خطوط النظام' },
  // === خطوط عامة ===
  { id: 'serif', label: 'مصحفي عام', family: 'serif', cat: 'عامة' },
  { id: 'sans-serif', label: 'بلا حواف', family: 'sans-serif', cat: 'عامة' },
  { id: 'monospace', label: 'ثابت العرض', family: 'monospace', cat: 'عامة' },
  { id: 'cursive', label: 'يدوي', family: 'cursive', cat: 'عامة' },
  { id: 'system-ui', label: 'نظام', family: 'system-ui, sans-serif', cat: 'عامة' },
  { id: 'fantasy', label: 'خيالي', family: 'fantasy, cursive', cat: 'عامة' },
];

// ========== Color Options ==========
const COLOR_OPTIONS = [
  { id: 'default', label: 'افتراضي', value: 'text-foreground/85', bg: 'bg-foreground' },
  { id: 'warm', label: 'دافئ', value: 'text-amber-200/90', bg: 'bg-amber-200' },
  { id: 'gold', label: 'ذهبي', value: 'text-yellow-300/90', bg: 'bg-yellow-300' },
  { id: 'sky', label: 'سماوي', value: 'text-sky-200/90', bg: 'bg-sky-200' },
  { id: 'emerald', label: 'زمردي', value: 'text-emerald-200/90', bg: 'bg-emerald-200' },
  { id: 'rose', label: 'وردي', value: 'text-rose-200/90', bg: 'bg-rose-200' },
  { id: 'purple', label: 'بنفسجي', value: 'text-purple-200/90', bg: 'bg-purple-200' },
  { id: 'white', label: 'أبيض', value: 'text-white/95', bg: 'bg-white' },
  { id: 'orange', label: 'برتقالي', value: 'text-orange-200/90', bg: 'bg-orange-200' },
  { id: 'cyan', label: 'سماوي فاتح', value: 'text-cyan-200/90', bg: 'bg-cyan-200' },
];

// ========== Size Options ==========
const SIZE_OPTIONS = [
  { id: 'xs', label: 'صغير جداً', value: 'text-xs', lineHeight: 'leading-[1.8]' },
  { id: 'sm', label: 'صغير', value: 'text-sm', lineHeight: 'leading-[2]' },
  { id: 'md', label: 'متوسط', value: 'text-base', lineHeight: 'leading-[2.2]' },
  { id: 'lg', label: 'كبير', value: 'text-lg', lineHeight: 'leading-[2.5]' },
  { id: 'xl', label: 'كبير جداً', value: 'text-xl', lineHeight: 'leading-[2.8]' },
  { id: '2xl', label: 'ضخم', value: 'text-2xl', lineHeight: 'leading-[3]' },
  { id: '3xl', label: 'عملاق', value: 'text-3xl', lineHeight: 'leading-[3.2]' },
];

// ========== Font Categories ==========
const FONT_CATEGORIES = [...new Set(FONT_OPTIONS.map(f => f.cat))];

export default function ReaderView() {
  const { readerItem, setCurrentView } = useAppStore();
  const [activeFont, setActiveFont] = useState('amiri');
  const [activeColor, setActiveColor] = useState('default');
  const [activeSize, setActiveSize] = useState('md');
  const [showControls, setShowControls] = useState(false);
  const [activeTab, setActiveTab] = useState<'font' | 'color' | 'size'>('font');
  const [showAllFonts, setShowAllFonts] = useState(false);
  const [fontSearch, setFontSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

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
  const currentSize = SIZE_OPTIONS.find((s) => s.id === activeSize) || SIZE_OPTIONS[2];

  const categoryIcon = readerItem.category === 'خطب' ? Mic : readerItem.category === 'زيارة' ? Compass : BookOpen;
  const CategoryIcon = categoryIcon;

  const filteredFonts = fontSearch.trim()
    ? FONT_OPTIONS.filter(f => f.label.includes(fontSearch.trim()) || f.cat.includes(fontSearch.trim()))
    : FONT_OPTIONS;

  const displayedFonts = showAllFonts ? filteredFonts : filteredFonts.slice(0, 20);
  const hasMoreFonts = displayedFonts.length < filteredFonts.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header Bar */}
      <motion.div
        className="shrink-0 px-3 sm:px-4 pt-2 pb-2 glass-card border-b border-primary/10 overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <button
              className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-primary/20 hover:bg-primary/10 transition-colors"
              onClick={() => setCurrentView('chat')}
            >
              <ArrowRight className="w-4 h-4 text-foreground/70" />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{readerItem.title}</p>
              {readerItem.subtitle && (
                <p className="text-[10px] text-muted-foreground truncate">{readerItem.subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20">
              <CategoryIcon className="w-3 h-3 text-primary" />
              <span className="text-[10px] text-primary font-medium">{readerItem.category}</span>
            </div>
            <button
              className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ${
                showControls
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'border-primary/20 hover:bg-primary/10 text-foreground/70'
              }`}
              onClick={() => { setShowControls(!showControls); setActiveTab('font'); }}
            >
              <AnimatePresence mode="wait">
                {showControls ? (
                  <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} className="flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </motion.span>
                ) : (
                  <motion.span key="settings" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} className="flex items-center justify-center">
                    <Type className="w-4 h-4" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
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
            <div className="px-3 sm:px-4 py-3 space-y-3 glass-card border-b border-primary/10 max-h-[55dvh] overflow-y-auto">
              {/* Tab Selector */}
              <div className="flex gap-2">
                {([
                  { id: 'font' as const, label: 'الخط', icon: Type, count: FONT_OPTIONS.length },
                  { id: 'color' as const, label: 'اللون', icon: Palette, count: COLOR_OPTIONS.length },
                  { id: 'size' as const, label: 'الحجم', icon: Maximize2, count: SIZE_OPTIONS.length },
                ]).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card/50 border border-border/30 hover:border-primary/40 text-foreground/70'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    <span className="opacity-60">{tab.count}</span>
                  </button>
                ))}
              </div>

              {/* Font Tab */}
              {activeTab === 'font' && (
                <div className="space-y-2">
                  {/* Search */}
                  <input
                    type="text"
                    value={fontSearch}
                    onChange={(e) => { setFontSearch(e.target.value); setShowAllFonts(false); }}
                    placeholder="ابحث عن خط..."
                    className="w-full px-3 py-2 text-xs bg-card/50 border border-border/30 rounded-lg focus:outline-none focus:border-primary/40 text-foreground placeholder:text-muted-foreground/50"
                  />

                  {/* Current font preview */}
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                    <span className="text-xs text-primary font-medium">الخط الحالي:</span>
                    <span className="text-sm font-bold text-primary" style={{ fontFamily: currentFont.family }}>
                      {currentFont.label}
                    </span>
                  </div>

                  {/* Font Categories */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    <button
                      onClick={() => setFontSearch('')}
                      className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                        !fontSearch.trim() ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-card/50 border border-border/20 text-muted-foreground'
                      }`}
                    >
                      الكل ({FONT_OPTIONS.length})
                    </button>
                    {FONT_CATEGORIES.map((cat) => {
                      const catCount = FONT_OPTIONS.filter(f => f.cat === cat).length;
                      return (
                        <button
                          key={cat}
                          onClick={() => { setFontSearch(cat); setShowAllFonts(false); }}
                          className={`shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                            fontSearch.trim() === cat ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-card/50 border border-border/20 text-muted-foreground hover:text-foreground/70'
                          }`}
                        >
                          {cat} ({catCount})
                        </button>
                      );
                    })}
                  </div>

                  {/* Font Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    {displayedFonts.map((font) => (
                      <button
                        key={font.id}
                        onClick={() => handleFontChange(font.id)}
                        className={`relative px-2 py-2 rounded-lg text-right transition-all border ${
                          activeFont === font.id
                            ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                            : 'bg-card/50 border-border/20 hover:border-primary/40 hover:bg-primary/5'
                        }`}
                      >
                        <p className={`text-[11px] font-bold truncate block ${activeFont === font.id ? 'text-primary-foreground' : 'text-foreground/80'}`}
                           style={{ fontFamily: font.family }}
                        >
                          {font.label}
                        </p>
                        <p className="text-[8px] truncate mt-0.5 opacity-50"
                           style={{ fontFamily: font.family }}
                        >
                          بسم الله
                        </p>
                        {activeFont === font.id && (
                          <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-primary-foreground" />
                        )}
                      </button>
                    ))}
                  </div>

                  {hasMoreFonts && (
                    <button
                      onClick={() => setShowAllFonts(true)}
                      className="w-full py-2 text-xs text-primary font-medium flex items-center justify-center gap-1 rounded-lg border border-primary/20 hover:bg-primary/5 transition-all"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                      عرض المزيد ({filteredFonts.length - 20} خط إضافي)
                    </button>
                  )}
                  {showAllFonts && filteredFonts.length > 20 && (
                    <button
                      onClick={() => setShowAllFonts(false)}
                      className="w-full py-2 text-xs text-primary font-medium flex items-center justify-center gap-1 rounded-lg border border-primary/20 hover:bg-primary/5 transition-all"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                      عرض أقل
                    </button>
                  )}
                </div>
              )}

              {/* Color Tab */}
              {activeTab === 'color' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Palette className="w-3.5 h-3.5" />
                    لون النص
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => handleColorChange(color.id)}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all ${
                          activeColor === color.id
                            ? 'border-primary bg-primary/10 scale-105 shadow-lg'
                            : 'border-transparent hover:border-foreground/20'
                        }`}
                        title={color.label}
                      >
                        <div className={`w-8 h-8 rounded-full ${color.bg} shadow-inner`} />
                        <span className="text-[9px] text-foreground/60">{color.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Tab */}
              {activeTab === 'size' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {currentSize.id === 'lg' || currentSize.id === 'xl' || currentSize.id === '2xl' || currentSize.id === '3xl' ? (
                      <Maximize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Minimize2 className="w-3.5 h-3.5" />
                    )}
                    حجم الخط
                  </div>
                  <div className="space-y-2">
                    {SIZE_OPTIONS.map((size) => (
                      <button
                        key={size.id}
                        onClick={() => handleSizeChange(size.id)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
                          activeSize === size.id
                            ? 'bg-primary text-primary-foreground border-primary shadow-lg'
                            : 'bg-card/50 border-border/20 hover:border-primary/40'
                        }`}
                      >
                        <span className="text-xs font-medium">{size.label}</span>
                        <span className={`${size.value} font-bold ${activeSize === size.id ? 'text-primary-foreground' : 'text-foreground/50'}`}>
                          بسم الله الرحمن
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
            <h1 className={`text-xl sm:text-2xl font-bold mb-2`} style={{ fontFamily: currentFont.family }}>{readerItem.title}</h1>
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
              className={`whitespace-pre-wrap transition-all duration-300 ${currentSize.value} ${currentSize.lineHeight} ${currentColor.value}`}
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
