'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, HandHeart } from 'lucide-react';
import { useAppStore } from '@/store/appStore';

interface DonationPopupProps {
  onDismiss: () => void;
}

export default function DonationPopup({ onDismiss }: DonationPopupProps) {
  const [visible, setVisible] = useState(false);
  const splashComplete = useAppStore((s) => s.splashComplete);
  const scheduledRef = useRef(false);

  useEffect(() => {
    if (scheduledRef.current) return;

    // Show popup after splash completes (every page load — no session storage)
    if (splashComplete) {
      scheduledRef.current = true;
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [splashComplete]);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss();
  };

  const handleDonate = () => {
    setVisible(false);
    onDismiss();
    window.location.href = '/donate';
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={handleDismiss}
          />

          {/* Popup Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed inset-x-4 top-1/2 z-[101] -translate-y-1/2 mx-auto max-w-sm w-full"
          >
            <div
              className="relative overflow-hidden rounded-3xl shadow-2xl"
              style={{
                background: 'linear-gradient(170deg, #0c1a2e 0%, #0f2847 40%, #132e4a 70%, #0a1628 100%)',
                border: '1.5px solid rgba(14,165,233,0.2)',
                boxShadow: '0 0 60px rgba(14,165,233,0.15), 0 25px 50px rgba(0,0,0,0.5)',
              }}
            >
              {/* Decorative top gradient line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />

              {/* Decorative circles */}
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/5 blur-2xl" />
              <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-primary/5 blur-2xl" />

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-3 left-3 z-10 p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all group"
              >
                <X className="w-4 h-4 text-white/50 group-hover:text-white/80 transition-colors" />
              </button>

              <div className="relative p-6 pt-8 text-center space-y-5">
                {/* Heart Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 400 }}
                  className="mx-auto w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))',
                    border: '1.5px solid rgba(239,68,68,0.2)',
                  }}
                >
                  <Heart className="w-8 h-8 text-red-500" fill="rgba(239,68,68,0.3)" />
                </motion.div>

                {/* Title */}
                <div className="space-y-2">
                  <h2 className="text-lg font-black text-white leading-relaxed">
                    اغاثة الشعب اللبناني
                  </h2>
                  <p className="text-sm font-bold text-red-400/90">
                    المظلوم
                  </p>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 px-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent to-white/10" />
                  <HandHeart className="w-4 h-4 text-primary/60" />
                  <div className="flex-1 h-px bg-gradient-to-l from-transparent to-white/10" />
                </div>

                {/* Message */}
                <div className="space-y-3 px-2">
                  <p className="text-sm text-white/80 leading-relaxed">
                    تبرع للشعب اللبناني المظلوم
                  </p>
                  <p className="text-sm text-white/80 leading-relaxed">
                    بأقل كلفة معينة
                  </p>

                  {/* Amount */}
                  <div
                    className="inline-flex items-center gap-3 mx-auto px-5 py-3 rounded-2xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(14,165,233,0.1), rgba(14,165,233,0.05))',
                      border: '1px solid rgba(14,165,233,0.15)',
                    }}
                  >
                    <span className="text-2xl font-black text-primary">1$</span>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="text-right">
                      <p className="text-xs font-bold text-white/70">ألف وخمسمائة</p>
                      <p className="text-xs font-bold text-white/70">دينار عراقي</p>
                    </div>
                  </div>

                  <p className="text-xs text-white/50 leading-relaxed">
                    أو أكثر ودعه مثمر في ميزان حسناتك
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2.5 pt-1">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleDonate}
                    className="w-full py-3.5 rounded-2xl font-black text-base tracking-wide text-white shadow-lg transition-all"
                    style={{
                      background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                      boxShadow: '0 0 30px rgba(220,38,38,0.3), 0 8px 20px rgba(0,0,0,0.3)',
                      fontSize: '18px',
                    }}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <HandHeart className="w-5 h-5" />
                      اغاثة
                    </span>
                  </motion.button>

                  <button
                    onClick={handleDismiss}
                    className="w-full py-2.5 rounded-xl text-xs text-white/40 hover:text-white/60 transition-colors"
                  >
                    إغلاق
                  </button>
                </div>

                {/* Footer note */}
                <p className="text-[9px] text-white/25 leading-relaxed">
                  للتبرع اضغط على كلمة &quot;اغاثة&quot; — يمكنك أيضاً الوصول لصفحة التبرع من زر الأعلى
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
