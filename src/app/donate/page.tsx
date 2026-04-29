'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, HandHeart, Heart, Copy, Check, Share2, CreditCard, QrCode } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

export default function DonatePage() {
  const [copied, setCopied] = useState(false);

  const KI_CARD_NUMBER = '07871871284';

  const handleCopy = () => {
    navigator.clipboard.writeText(KI_CARD_NUMBER).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = KI_CARD_NUMBER;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = async () => {
    const text = `تبرع للشعب اللبناني المظلوم\nرقم كي كارد: ${KI_CARD_NUMBER}\n${window.location.href}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'اغاثة الشعب اللبناني', text, url: window.location.href });
      } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden" style={{
      background: 'linear-gradient(170deg, #0c1a2e 0%, #0f2847 30%, #132e4a 60%, #0a1628 100%)',
    }}>
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <button onClick={() => window.history.back()} className="p-2 rounded-full hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white/70" />
        </button>
        <div className="flex items-center gap-2">
          <HandHeart className="w-5 h-5 text-red-500" />
          <h1 className="text-lg font-black text-white">اغاثة الشعب اللبناني</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-6 text-center"
          style={{
            background: 'linear-gradient(170deg, rgba(220,38,38,0.1), rgba(220,38,38,0.03))',
            border: '1.5px solid rgba(220,38,38,0.15)',
            boxShadow: '0 0 40px rgba(220,38,38,0.08)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(220,38,38,0.05))',
              border: '1.5px solid rgba(220,38,38,0.2)',
            }}
          >
            <Heart className="w-10 h-10 text-red-500" fill="rgba(220,38,38,0.3)" />
          </motion.div>

          <h2 className="text-2xl font-black text-white mb-1">تبرع الآن</h2>
          <p className="text-sm text-white/50 mb-4">ساهم في إنقاذ الشعب اللبناني المظلوم</p>

          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl mb-2" style={{
            background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(14,165,233,0.05))',
            border: '1px solid rgba(14,165,233,0.15)',
          }}>
            <span className="text-3xl font-black text-primary">1$</span>
            <div className="w-px h-10 bg-white/10" />
            <div className="text-right">
              <p className="text-sm font-bold text-white/70">1,500</p>
              <p className="text-xs text-white/50">دينار عراقي</p>
            </div>
          </div>
          <p className="text-xs text-white/30">أو أكثر — واجعله مثمراً في ميزان حسناتك</p>
        </motion.div>

        {/* Ki Card Number */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(14,165,233,0.03))',
            border: '1.5px solid rgba(14,165,233,0.12)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold text-white/80">التبرع عبر كي كارد</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 px-4 py-3.5 rounded-xl bg-black/30 border border-white/10">
              <p className="text-lg font-mono font-black text-white tracking-[3px] text-center" dir="ltr">
                {KI_CARD_NUMBER}
              </p>
            </div>
            <button
              onClick={handleCopy}
              className="shrink-0 p-3 rounded-xl transition-all"
              style={{
                background: copied
                  ? 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(34,197,94,0.1))'
                  : 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(14,165,233,0.1))',
                border: copied
                  ? '1px solid rgba(34,197,94,0.3)'
                  : '1px solid rgba(14,165,233,0.2)',
              }}
            >
              {copied ? (
                <Check className="w-5 h-5 text-green-400" />
              ) : (
                <Copy className="w-5 h-5 text-primary" />
              )}
            </button>
            <button
              onClick={handleShare}
              className="shrink-0 p-3 rounded-xl transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(14,165,233,0.1))',
                border: '1px solid rgba(14,165,233,0.2)',
              }}
            >
              <Share2 className="w-5 h-5 text-primary" />
            </button>
          </div>

          {copied && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-green-400 text-center mt-2"
            >
              تم نسخ الرقم بنجاح
            </motion.p>
          )}
        </motion.div>

        {/* QR Code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl p-6 text-center space-y-4"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
            border: '1.5px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <QrCode className="w-4 h-4 text-primary" />
            <p className="text-sm font-bold text-white/80">مسح الباركود للتبرع</p>
          </div>

          <div className="relative mx-auto w-56 h-56 rounded-2xl overflow-hidden flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(14,165,233,0.03))',
              border: '2px solid rgba(14,165,233,0.15)',
              boxShadow: '0 0 30px rgba(14,165,233,0.1)',
            }}
          >
            <Image
              src="/donate-qr.png"
              alt="كي كارد للتبرع"
              fill
              className="object-contain p-4"
              priority
            />
          </div>

          <p className="text-[10px] text-white/30">
            افتح تطبيق كي كارد وامسح الباركود
          </p>
        </motion.div>

        {/* Ki Card Reference Screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl overflow-hidden"
          style={{
            border: '1.5px solid rgba(14,165,233,0.12)',
            boxShadow: '0 0 20px rgba(14,165,233,0.06)',
          }}
        >
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white/3 border-b border-white/5">
            <CreditCard className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold text-white/70">شاشة كي كارد للتبرع</p>
          </div>
          <div className="relative w-full aspect-video bg-black/30">
            <Image
              src="/kicard-reference.png"
              alt="شاشة تطبيق كي كارد"
              fill
              className="object-contain p-2"
            />
          </div>
        </motion.div>

        {/* Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <p className="text-sm font-bold text-white/80 text-center mb-3">خطوات التبرع</p>

          {[
            { step: '1', text: 'افتح تطبيق كي كارد في هاتفك' },
            { step: '2', text: 'اضغط على أيقونة التحويل أو امسح الباركود' },
            { step: '3', text: 'أدخل المبلغ (1$ أو أكثر)' },
            { step: '4', text: 'أرسل المبلغ إلى الرقم أعلاه' },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + idx * 0.1 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div className="shrink-0 w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center">
                <span className="text-xs font-black text-primary">{item.step}</span>
              </div>
              <p className="text-xs text-white/70">{item.text}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Duaa */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center px-4 py-5 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, rgba(14,165,233,0.05), rgba(14,165,233,0.02))',
            border: '1px solid rgba(14,165,233,0.08)',
          }}
        >
          <p className="text-sm text-white/50 leading-loose font-medium">
            ﴿ مَن ذَا الَّذِي يُقْرِضُ اللَّهَ قَرْضًا حَسَنًا فَيُضَاعِفَهُ لَهُ أَضْعَافًا كَثِيرَةً ﴾
          </p>
          <p className="text-[10px] text-white/25 mt-2">سورة البقرة — الآية 245</p>
        </motion.div>

        {/* Bottom spacing */}
        <div className="h-6" />
      </div>
    </div>
  );
}
