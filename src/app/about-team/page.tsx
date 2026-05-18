'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, Code2, BookOpen, Brain, Mail, PenTool, Sparkles, Shield, Users, ChevronLeft } from 'lucide-react';

export default function AboutTeamPage() {
  return (
    <div
      className="h-[100dvh] flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(170deg, #0c1a2e 0%, #0f2847 30%, #132e4a 60%, #0a1628 100%)',
      }}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <button
          onClick={() => window.history.back()}
          className="p-2 rounded-full hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white/70" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-lg font-black text-white">من نحن</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Hero Section */}
        <div className="relative px-4 pt-8 pb-10 text-center overflow-hidden">
          {/* Decorative background orbs */}
          <div className="absolute top-4 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-sky-500/5 rounded-full blur-[80px] pointer-events-none" />

          {/* Logo / Brand */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="relative mx-auto mb-6"
          >
            <div
              className="w-24 h-24 mx-auto rounded-3xl flex items-center justify-center relative"
              style={{
                background: 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(14,165,233,0.05))',
                border: '2px solid rgba(14,165,233,0.2)',
                boxShadow: '0 0 40px rgba(14,165,233,0.15), 0 0 80px rgba(14,165,233,0.05)',
              }}
            >
              <PenTool className="w-10 h-10 text-primary" />
              {/* Orbiting dots */}
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary/60 animate-pulse" />
              <div className="absolute -bottom-1 -left-1 w-2 h-2 rounded-full bg-sky-400/60 animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl sm:text-4xl font-black text-white mb-2"
          >
            فريق <span className="text-primary">قلم كود</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-primary/80 font-medium tracking-wide"
            dir="ltr"
          >
            (Qalam Code)
          </motion.p>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6 relative"
          >
            <div
              className="inline-block px-6 py-3 rounded-2xl relative"
              style={{
                background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(14,165,233,0.03))',
                border: '1.5px solid rgba(14,165,233,0.15)',
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              <p className="text-sm sm:text-base text-white/80 font-bold leading-relaxed">
                حيث يلتقي الاجتهاد الفكري بالابتكار الرقمي
              </p>
            </div>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>

        {/* About Section */}
        <div className="px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="max-w-lg mx-auto"
          >
            <div
              className="rounded-2xl p-6 sm:p-8 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                border: '1.5px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Corner decorations */}
              <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none">
                <div className="absolute top-2 right-2 w-6 h-[2px] bg-primary/30 rounded" />
                <div className="absolute top-2 right-2 w-[2px] h-6 bg-primary/30 rounded" />
              </div>
              <div className="absolute bottom-0 left-0 w-16 h-16 pointer-events-none">
                <div className="absolute bottom-2 left-2 w-6 h-[2px] bg-primary/30 rounded" />
                <div className="absolute bottom-2 left-2 w-[2px] h-6 bg-primary/30 rounded" />
              </div>

              <p className="text-sm sm:text-base text-white/65 leading-[2] text-justify">
                نحن فريق من المبرمجين الباحثين؛ اجتمعنا على هدف واحد وهو نصرة دين آل محمد{' '}
                <span className="text-primary/80 font-bold">(عليهم السلام)</span>{' '}
                عبر تسخير الفكر الرصين وأدوات التكنولوجيا الحديثة. ما يميزنا هو أن كوادرنا تجمع بين
                التخصص في العلوم الدينية والاحتراف في عالم البرمجة، لنقدم حلولاً تقنية برؤية إيمانية.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Identity Section */}
        <div className="px-4 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-center gap-2 mb-5">
              <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-primary/30" />
              <h2
                className="text-base font-black text-white/90 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-primary" />
                هويتنا
              </h2>
              <div className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-primary/30" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
              {/* Card 1: Researchers */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="group rounded-2xl p-5 relative overflow-hidden cursor-default transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                  border: '1.5px solid rgba(255,255,255,0.06)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(14,165,233,0.25)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(14,165,233,0.05))',
                    border: '1px solid rgba(14,165,233,0.15)',
                  }}
                >
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-black text-white mb-1.5">باحثون</h3>
                <p className="text-xs text-white/45 leading-relaxed">
                  نغوص في أعماق العلوم الدينية لنستخرج المعرفة الأصيلة.
                </p>
              </motion.div>

              {/* Card 2: Programmers */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="group rounded-2xl p-5 relative overflow-hidden cursor-default transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                  border: '1.5px solid rgba(255,255,255,0.06)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(14,165,233,0.25)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(14,165,233,0.05))',
                    border: '1px solid rgba(14,165,233,0.15)',
                  }}
                >
                  <Code2 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-black text-white mb-1.5">مبرمجون</h3>
                <p className="text-xs text-white/45 leading-relaxed">
                  نصيغ هذه المعرفة بلغة العصر عبر الذكاء الاصطناعي والبرمجيات المتقدمة.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Supervisor Section */}
        <div className="px-4 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="max-w-lg mx-auto"
          >
            <div className="flex items-center justify-center gap-2 mb-5">
              <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-primary/30" />
              <h2 className="text-base font-black text-white/90 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                بإشراف
              </h2>
              <div className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-primary/30" />
            </div>

            <div
              className="rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(14,165,233,0.06), rgba(14,165,233,0.02))',
                border: '1.5px solid rgba(14,165,233,0.12)',
                boxShadow: '0 0 40px rgba(14,165,233,0.06)',
              }}
            >
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

              {/* Avatar */}
              <div
                className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4 relative"
                style={{
                  background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(14,165,233,0.04))',
                  border: '1.5px solid rgba(14,165,233,0.2)',
                  boxShadow: '0 0 30px rgba(14,165,233,0.1)',
                }}
              >
                <Brain className="w-8 h-8 text-primary" />
              </div>

              <h3 className="text-lg font-black text-white mb-2">
                سماحة الشيخ سجاد علي العبيدي
              </h3>
              <p className="text-xs text-primary/70 font-bold mb-1">
                أستاذ العلوم الدينية ومبرمج الذكاء الاصطناعي
              </p>
            </div>
          </motion.div>
        </div>

        {/* Contact Section */}
        <div className="px-4 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="max-w-lg mx-auto"
          >
            <div className="flex items-center justify-center gap-2 mb-5">
              <div className="h-px flex-1 max-w-[60px] bg-gradient-to-r from-transparent to-primary/30" />
              <h2 className="text-base font-black text-white/90 flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                للتواصل والتعاون
              </h2>
              <div className="h-px flex-1 max-w-[60px] bg-gradient-to-l from-transparent to-primary/30" />
            </div>

            <div
              className="rounded-2xl p-6 text-center relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                border: '1.5px solid rgba(255,255,255,0.06)',
              }}
            >
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                نتشرف باستلام رسائلكم عبر البريد الإلكتروني الرسمي:
              </p>
              <motion.a
                href="mailto:qalamcodeorg@gmail.com"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl transition-all cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, rgba(14,165,233,0.12), rgba(14,165,233,0.05))',
                  border: '1.5px solid rgba(14,165,233,0.2)',
                }}
              >
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-primary" dir="ltr">
                  qalamcodeorg@gmail.com
                </span>
              </motion.a>
            </div>
          </motion.div>
        </div>

        {/* Footer decoration */}
        <div className="px-4 pb-8">
          <div className="flex items-center justify-center gap-3">
            <div className="h-px flex-1 max-w-[80px] bg-gradient-to-r from-transparent to-white/5" />
            <p className="text-[10px] text-white/20 font-medium">Qalam Code Team</p>
            <div className="h-px flex-1 max-w-[80px] bg-gradient-to-l from-transparent to-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}
