'use client';

import { useAppStore } from '@/store/appStore';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { Menu, Moon, Sun, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SCHOLARS = [
  'السيد علي السيستاني',
  'الشيخ حسين البحاراني',
  'السيد محمد باقر الصدر',
  'الشيخ جعفر السبحاني',
  'السيد كمال الحيدري',
  'الشيخ علي الكوراني',
];

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { selectedScholar, setSelectedScholar } = useAppStore();
  const { theme, setTheme } = useTheme();

  return (
    <motion.header
      className="sticky top-0 z-40 glass-card border-b border-border/50 px-2 sm:px-4 py-1 sm:py-2"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {/* Right: Menu button */}
        <Button
          variant="ghost"
          size="icon"
          className="text-foreground/70 hover:text-primary hover:bg-primary/10 shrink-0"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Center: Scholar Selector */}
        <div className="flex-1 mx-1 sm:mx-4 max-w-[200px] sm:max-w-[280px]">
          <Select value={selectedScholar || ''} onValueChange={setSelectedScholar}>
            <SelectTrigger className="h-8 sm:h-9 text-[11px] sm:text-sm border-primary/20 bg-primary/5 focus:ring-primary/30">
              <div className="flex items-center gap-2 min-w-0">
                <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
                <SelectValue placeholder="اختر عالماً" className="truncate" />
              </div>
            </SelectTrigger>
            <SelectContent className="max-h-48 sm:max-h-64">
              {SCHOLARS.map((scholar) => (
                <SelectItem key={scholar} value={scholar} className="text-sm">
                  {scholar}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Left: Theme toggle */}
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
