'use client';

import { motion } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { ArrowLeft, Code, BookOpen, Search, Mail, Users, Sparkles, Pen } from 'lucide-react';

export default function AboutView() {
  const { setCurrentView } = useAppStore();

  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => setCurrentView('chat')}
        className="flex items-center gap-2 text-primary text-xs sm:text-sm mb-4 sm:mb-6 hover:underline self-start"
      >
        <ArrowLeft className="w-4 h-4" />
        العودة
      </motion.button>

      <div className="max-w-lg mx-auto w-full space-y-5 sm:space-y-6">
        {/* Header - Team Logo */}
        <motion.div
          className="text-center space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Islamic geometric icon */}
          <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/10 flex items-center justify-center sky-glow">
            <svg width="48" height="48" viewBox="0 0 64 64" fill="none" className="text-primary">
              {/* Islamic star pattern */}
              <polygon points="32,4 38,24 58,24 42,36 48,56 32,44 16,56 22,36 6,24 26,24" fill="currentColor" opacity="0.15" />
              <polygon points="32,12 36,26 50,26 38,34 42,48 32,40 22,48 26,34 14,26 28,26" fill="currentColor" opacity="0.25" />
              <circle cx="32" cy="32" r="6" fill="currentColor" opacity="0.4" />
              <circle cx="32" cy="32" r="3" fill="currentColor" opacity="0.7" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary">فريق &quot;قلم كود&quot;</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Qalam Code</p>
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-8 bg-primary/30" />
            <Sparkles className="w-3 h-3 text-primary/50" />
            <div className="h-px w-8 bg-primary/30" />
          </div>
          <p className="text-sm font-medium text-primary/80 italic">
            حيث يلتقي الاجتهاد الفكري بالابتكار الرقمي
          </p>
        </motion.div>

        {/* About the team */}
        <motion.div
          className="bg-card/50 border border-primary/10 rounded-2xl p-4 sm:p-5 space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="text-sm sm:text-base font-bold text-foreground">من نحن</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            نحن فريق من المبرمجين الباحثين؛ اجتمعنا على هدف واحد وهو نصرة دين آل محمد (عليهم السلام) عبر تسخير الفكر الرصين وأدوات التكنولوجيا الحديثة. ما يميزنا هو أن كوادرنا تجمع بين التخصص في العلوم الدينية والاحتراف في عالم البرمجة، لنقدم حلولاً تقنية برؤية إيمانية.
          </p>
        </motion.div>

        {/* Identity cards */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h2 className="text-sm sm:text-base font-bold text-foreground">هويتنا</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="bg-card/40 border border-primary/10 rounded-xl p-3 sm:p-4 space-y-2 hover:bg-primary/5 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                <Search className="w-5 h-5 text-sky-500" />
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-foreground">باحثون</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                نغوص في أعماق العلوم الدينية لنستخرج المعرفة الأصيلة.
              </p>
            </div>
            <div className="bg-card/40 border border-primary/10 rounded-xl p-3 sm:p-4 space-y-2 hover:bg-primary/5 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Code className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-[11px] sm:text-xs font-bold text-foreground">مبرمجون</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                نصيغ هذه المعرفة بلغة العصر عبر الذكاء الاصطناعي والبرمجيات المتقدمة.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Supervisor */}
        <motion.div
          className="bg-card/50 border border-primary/10 rounded-2xl p-4 sm:p-5 space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2">
            <Pen className="w-4 h-4 text-primary" />
            <h2 className="text-sm sm:text-base font-bold text-foreground">بإشراف</h2>
          </div>
          <div className="flex flex-col items-center text-center space-y-2 pt-2">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center sky-glow">
              <svg width="32" height="32" viewBox="0 0 64 64" fill="none" className="text-primary">
                <polygon points="32,4 38,24 58,24 42,36 48,56 32,44 16,56 22,36 6,24 26,24" fill="currentColor" opacity="0.3" />
                <circle cx="32" cy="32" r="6" fill="currentColor" opacity="0.5" />
              </svg>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-primary">سماحة الشيخ سجاد علي العبيدي</h3>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              أستاذ العلوم الدينية ومبرمج الذكاء الاصطناعي
            </p>
          </div>
        </motion.div>

        {/* Contact */}
        <motion.div
          className="bg-card/50 border border-primary/10 rounded-2xl p-4 sm:p-5 space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <h2 className="text-sm sm:text-base font-bold text-foreground">للتواصل والتعاون</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            نتشرف باستلام رسائلكم عبر البريد الإلكتروني الرسمي:
          </p>
          <a
            href="mailto:qalamcodeorg@gmail.com"
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs sm:text-sm font-medium transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M22 7L13.03 12.7a1.94 1.94 0 01-2.06 0L2 7" />
            </svg>
            qalamcodeorg@gmail.com
          </a>
        </motion.div>

        {/* Footer branding */}
        <motion.div
          className="text-center space-y-2 pb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center justify-center gap-2">
            <div className="h-px w-12 bg-primary/20" />
            <Code className="w-4 h-4 text-primary/40" />
            <div className="h-px w-12 bg-primary/20" />
          </div>
          <p className="text-[10px] text-muted-foreground/60">
            قلم كود &copy; {new Date().getFullYear()} — جميع الحقوق محفوظة
          </p>
        </motion.div>
      </div>
    </div>
  );
}
