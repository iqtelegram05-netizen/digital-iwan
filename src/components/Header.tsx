'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Moon, Sun, GraduationCap, Languages, Plus, X, Check, Tv, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LANGUAGES } from '@/i18n/languages';
import { useTranslation } from '@/i18n/useTranslation';
import AdWatchModal from './AdWatchModal';

const SCHOLARS = [
  'السيد السيستاني',
  'السيد كمال الحيدري',
  'السيد القزويني',
  'السيد محمد صادق الصدر',
  'الشيخ بشير النجفي',
  'السيد الشيرازي',
];

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { selectedScholar, setSelectedScholar, currentView, user, usageInfo } = useAppStore();
  const { theme, setTheme } = useTheme();
  const { t, lang, setLanguage } = useTranslation();

  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customScholar, setCustomScholar] = useState('');
  const [showAdModal, setShowAdModal] = useState(false);

  // Find current language info
  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  // Hide scholar selector in debate and research modes
  const hideScholarSelector = currentView === 'debate' || currentView === 'research';

  const handleAddCustomScholar = () => {
    if (customScholar.trim()) {
      setSelectedScholar(customScholar.trim());
      setCustomScholar('');
      setShowCustomInput(false);
    }
  };

  return (
    <motion.header
      className="sticky top-0 z-40 glass-card border-b border-border/50 px-2 sm:px-4 py-1 sm:py-2"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center justify-between max-w-4xl mx-auto gap-1">
        {/* Menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="text-foreground/70 hover:text-primary hover:bg-primary/10 shrink-0"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Scholar Selector - hidden in debate/research modes */}
        {!hideScholarSelector && (
          <div className="flex-1 mx-1 max-w-[160px] sm:max-w-[220px] min-w-0">
            <Select value={selectedScholar || ''} onValueChange={setSelectedScholar}>
              <SelectTrigger className="h-8 sm:h-9 text-[10px] sm:text-xs border-primary/20 bg-primary/5 focus:ring-primary/30">
                <div className="flex items-center gap-1.5 min-w-0">
                  <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0" />
                  <SelectValue placeholder={t('header.selectScholar')} className="truncate" />
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-56 sm:max-h-72">
                {SCHOLARS.map((scholar) => (
                  <SelectItem key={scholar} value={scholar} className="text-xs sm:text-sm">
                    {scholar}
                  </SelectItem>
                ))}
                {/* Custom scholar option */}
                <div className="border-t border-border/30 my-1">
                  <div
                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-primary cursor-pointer hover:bg-primary/5 rounded-sm"
                    onClick={(e) => {
                      e.preventDefault();
                      setShowCustomInput(true);
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>بحث عن عالم آخر...</span>
                  </div>
                </div>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Custom Scholar Input Overlay */}
        <AnimatePresence>
          {showCustomInput && (
            <motion.div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCustomInput(false)}
            >
              <motion.div
                className="bg-card border border-border/50 rounded-2xl p-5 max-w-sm w-full shadow-2xl"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    بحث عن عالم
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowCustomInput(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  أدخل اسم العالم أو المرجع الذي تريد البحث عن آرائه. سيتم حفظه مؤقتاً لهذه الجلسة فقط.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={customScholar}
                    onChange={(e) => setCustomScholar(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomScholar()}
                    placeholder="مثال: الشيخ محمد الحسين آل كاشف الغطاء"
                    className="text-xs border-primary/20 bg-card/50"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    className="shrink-0 h-9 w-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                    onClick={handleAddCustomScholar}
                    disabled={!customScholar.trim()}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Watch Ad Button - for non-premium logged-in users */}
        {user && user.role !== 'owner' && user.role !== 'supervisor' && usageInfo && !usageInfo.isPremium && (
          <motion.button
            className="shrink-0 flex items-center gap-1 h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-all"
            onClick={() => setShowAdModal(true)}
            whileTap={{ scale: 0.95 }}
          >
            <Tv className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="text-[9px] sm:text-[10px] font-medium hidden sm:inline">إعلان</span>
            {usageInfo.adsUntilBonus < 10 && (
              <span className="text-[8px] text-green-500 hidden sm:inline">{usageInfo.adsUntilBonus}←{usageInfo.BONUS_MESSAGES}</span>
            )}
          </motion.button>
        )}

        <AdWatchModal open={showAdModal} onClose={() => setShowAdModal(false)} />

        {/* Language Selector */}
        <Select value={lang} onValueChange={setLanguage}>
          <SelectTrigger className="w-auto min-w-[42px] max-w-[56px] h-8 sm:h-9 px-1.5 border-primary/20 bg-primary/5 focus:ring-primary/30 gap-0.5">
            <div className="flex items-center justify-center">
              <span className="text-sm">{currentLang.flag}</span>
              <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground hidden sm:inline">
                {currentLang.code.toUpperCase()}
              </span>
            </div>
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {LANGUAGES.map((language) => (
              <SelectItem key={language.code} value={language.code} className="text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-base">{language.flag}</span>
                  <span>{language.nativeName}</span>
                  <span className="text-muted-foreground text-[10px]">({language.name})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="text-foreground/70 hover:text-primary hover:bg-primary/10 shrink-0"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <motion.div
            key={theme}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </motion.div>
        </Button>
      </div>
    </motion.header>
  );
}
