'use client';

import { motion } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { ArrowLeft, Heart, BookOpen, Cpu, Globe, Code, Users, Sparkles } from 'lucide-react';

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
        {/* Header */}
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
          <h1 className="text-xl sm:text-2xl font-bold text-primary">الإيوان الرقمي</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Digital Iwan</p>
          <p className="text-xs text-muted-foreground/70 italic">
            &ldquo;إِنَّمَا الْعِلْمُ ثَلَاثَةٌ: آيَةٌ مُحْكَمَةٌ، وَسُنَّةٌ قَائِمَةٌ، وَفَرِيضَةٌ عَادِلَةٌ&rdquo;
          </p>
          <p className="text-[10px] text-muted-foreground/50">رسول الله (صلى الله عليه وآله)</p>
        </motion.div>

        {/* About text */}
        <motion.div
          className="bg-card/50 border border-primary/10 rounded-2xl p-4 sm:p-5 space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h2 className="text-sm sm:text-base font-bold text-foreground">عن التطبيق</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            الإيوان الرقمي هو تطبيق ذكاء اصطناعي متخصص في العلوم الإسلامية الشيعية الإمامية الاثني عشرية. يهدف إلى توفير بيئة تعليمية وحوارية شاملة تجمع بين التراث الإسلامي الأصيل والتقنية الحديثة، ليكون مرجعاً رقمياً للباحثين والطلاب والمهتمين بالعلوم الدينية.
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            يقدم التطبيق أربعة أقسام رئيسية: المحاور الرقمي للحوار العلمي والمنطقي، والأستاذ الرقمي للشرح التفصيلي، والبحث الخارج للتحليل الأكاديمي المتعمق، واختبار نفسك للتقييم والتحدي. بالإضافة إلى أدوات إسلامية كالمسبحة الإلكترونية وبوصلة القبلة والتقويم الهجري.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="grid grid-cols-2 gap-2 sm:gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {[
            { icon: <Cpu className="w-4 h-4" />, title: 'ذكاء اصطناعي', desc: 'مزدوج الهوية دينياً وعلمياً' },
            { icon: <BookOpen className="w-4 h-4" />, title: 'أقسام متعددة', desc: 'محاور وأستاذ وبحث واختبار' },
            { icon: <Globe className="w-4 h-4" />, title: 'متعدد اللغات', desc: 'يدعم أكثر من 20 لغة' },
            { icon: <Sparkles className="w-4 h-4" />, title: 'أدوات إسلامية', desc: 'مسبحة وقبلة وتقويم هجري' },
          ].map((feature, i) => (
            <div key={i} className="bg-card/30 border border-primary/10 rounded-xl p-3 sm:p-4 space-y-1.5">
              <div className="text-primary">{feature.icon}</div>
              <p className="text-[11px] sm:text-xs font-bold text-foreground">{feature.title}</p>
              <p className="text-[10px] text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Methodology */}
        <motion.div
          className="bg-card/50 border border-primary/10 rounded-2xl p-4 sm:p-5 space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="text-sm sm:text-base font-bold text-foreground">المنهجية</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            يعتمد التطبيق في محتواه على المنهج الشيعي الإمامي الاثني عشري، مستنداً إلى القرآن الكريم والسنة النبوية المطهرة وكلام أئمة أهل البيت (عليهم السلام) وأقوال العلماء والمفكرين من الفرقاء والمجتهدين. يهدف إلى تقديم المعلومات بدقة علمية مع ذكر المصادر والأدلة.
          </p>
        </motion.div>

        {/* Developer */}
        <motion.div
          className="text-center space-y-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-center gap-2">
            <Code className="w-4 h-4 text-primary/50" />
            <span className="text-xs text-muted-foreground">التطوير والتصميم</span>
          </div>
          <p className="text-sm font-bold text-primary">سجاد علي العبيدي</p>
          <p className="text-[10px] text-muted-foreground/60 flex items-center justify-center gap-1">
            <Heart className="w-3 h-3 text-red-400" />
            بصمة عراقية شيعية
          </p>
        </motion.div>
      </div>
    </div>
  );
}
