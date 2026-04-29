'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import type { UsageInfoData } from '@/lib/usageLimit';
import { Tv, Gift, Crown, X, Clock, RefreshCw } from 'lucide-react';
import CrystalButton from './CrystalButton';
import AdWatchModal from './AdWatchModal';

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function UsageBar() {
  const {
    user,
    usageInfo,
    setUsageInfo,
    limitReachedModal,
    setLimitReachedModal,
    showAdReward,
    setShowAdReward,
    lastAdRewardMsg,
    setLastAdRewardMsg,
    setCurrentView,
  } = useAppStore();

  const [showAdModal, setShowAdModal] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!user || user.role === 'owner' || user.role === 'supervisor') return;
    try {
      const res = await fetch(`/api/usage?userId=${user.id}`);
      if (res.ok) {
        const data: UsageInfoData = await res.json();
        setUsageInfo(data);
        // Initialize countdown from server
        setCountdown(data.resetCountdown || 0);
      }
    } catch {
      // silently fail
    }
  }, [user, setUsageInfo]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Countdown timer - ticks every second
  useEffect(() => {
    if (!usageInfo || usageInfo.isPremium || usageInfo.isAdmin) return;

    // Set initial countdown
    setCountdown(usageInfo.resetCountdown || 0);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Timer expired - fetch fresh usage data (daily reset should happen)
          setIsExpired(true);
          fetchUsage();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [usageInfo?.isPremium, usageInfo?.isAdmin, usageInfo?.resetCountdown, fetchUsage]);

  // Re-fetch when timer expires
  useEffect(() => {
    if (isExpired) {
      fetchUsage();
      setIsExpired(false);
    }
  }, [isExpired, fetchUsage]);

  // Re-fetch usage when ad modal closes
  const handleAdModalClose = useCallback(() => {
    setShowAdModal(false);
    fetchUsage();
  }, [fetchUsage]);

  const isPremium = usageInfo?.isPremium || false;

  // Don't show for admin/owner
  if (!user || user.role === 'owner' || user.role === 'supervisor') return null;
  if (!usageInfo) return null;

  const totalRemaining = usageInfo.freeRemaining + usageInfo.bonusMessages;
  const usagePercent = ((usageInfo.freeLimit - usageInfo.freeRemaining) / usageInfo.freeLimit) * 100;

  return (
    <>
      {/* Usage Bar - always visible at top of chat area */}
      <motion.div
        className="mx-3 sm:mx-4 mt-1 mb-0 px-2.5 py-1.5 rounded-lg bg-card/60 border border-border/30 backdrop-blur-sm"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Message Counter with Timer */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isPremium ? (
              <div className="flex items-center gap-1 text-yellow-500">
                <Crown className="w-3 h-3" />
                <span className="text-[10px] sm:text-xs font-medium">مشترك</span>
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] sm:text-xs font-bold ${totalRemaining <= 3 ? 'text-red-500' : totalRemaining <= 10 ? 'text-orange-500' : 'text-primary'}`}>
                        {totalRemaining}
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                        / {usageInfo.freeLimit} سؤال متبقي
                      </span>
                    </div>
                    {usageInfo.bonusMessages > 0 && (
                      <span className="text-[9px] text-green-500 font-medium">
                        +{usageInfo.bonusMessages} مكافأة
                      </span>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-primary/10 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${
                        usagePercent >= 90 ? 'bg-gradient-to-l from-red-500 to-red-400' :
                        usagePercent >= 70 ? 'bg-gradient-to-l from-orange-500 to-orange-400' :
                        'bg-gradient-to-l from-primary/80 to-primary/40'
                      }`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(usagePercent, 100)}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Watch Ad Button */}
          {!isPremium && (
            <CrystalButton
              size="sm"
              className="shrink-0 h-6 px-2 text-[9px] sm:text-[10px] gap-1 bg-primary/10 hover:bg-primary/20 text-primary border-0"
              onClick={() => setShowAdModal(true)}
            >
              <Tv className="w-3 h-3" />
              شاهد إعلان
            </CrystalButton>
          )}
        </div>

        {/* 24h Countdown Timer */}
        {!isPremium && countdown > 0 && (
          <div className="mt-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
              <Clock className="w-2.5 h-2.5" />
              <span>تجدد بعد</span>
              <span className="font-mono font-medium text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded">
                {formatCountdown(countdown)}
              </span>
            </div>
            {/* Ad progress */}
            {usageInfo.adsUntilBonus < 10 && (
              <div className="flex items-center gap-0.5 text-[8px] text-green-500">
                <Gift className="w-2.5 h-2.5" />
                <span>{usageInfo.adsUntilBonus} إعلان ← {usageInfo.BONUS_MESSAGES} رسائل</span>
              </div>
            )}
          </div>
        )}

        {/* Timer expired - show refresh message */}
        {!isPremium && countdown === 0 && usageInfo.freeRemaining < usageInfo.freeLimit && (
          <div className="mt-1.5 flex items-center gap-1 text-[9px] text-green-500 animate-pulse">
            <RefreshCw className="w-2.5 h-2.5" />
            <span>تم تجديد الأسئلة! أعد تحميل الصفحة.</span>
          </div>
        )}
      </motion.div>

      {/* AdWatchModal */}
      <AdWatchModal open={showAdModal} onClose={handleAdModalClose} />

      {/* Limit Reached Modal */}
      <AnimatePresence>
        {limitReachedModal && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLimitReachedModal(false)}
          >
            <motion.div
              className="bg-card border border-border/50 rounded-2xl p-5 max-w-sm w-full shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-primary">وصلت للحد الأقصى اليومي</h3>
                <button onClick={() => setLimitReachedModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground mb-3">
                استهلكت جميع أسئلتك المجانية لهذا اليوم ({usageInfo.freeLimit} سؤال). يمكنك المتابعة بإحدى الطرق التالية:
              </p>

              {/* Reset Timer Info */}
              {countdown > 0 && (
                <div className="mb-3 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-blue-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>تجدد الأسئلة بعد</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-blue-400">
                    {formatCountdown(countdown)}
                  </span>
                </div>
              )}

              {/* Subscription Option */}
              <div className="mb-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs font-bold text-yellow-500">اشتراك شهري</span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">أسئلة غير محدودة لمدة شهر كامل</p>
                <CrystalButton
                  className="w-full h-8 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded-lg"
                  onClick={() => {
                    setLimitReachedModal(false);
                    setCurrentView('profile');
                  }}
                >
                  اشترك الآن - {usageInfo.SUBSCRIPTION_PRICE}$
                </CrystalButton>
              </div>

              {/* Ad Option */}
              <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Tv className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-bold text-green-500">شاهد إعلانات</span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">
                  كل {usageInfo.ADS_FOR_BONUS} إعلانات = {usageInfo.BONUS_MESSAGES} أسئلة مجانية
                </p>
                <CrystalButton
                  className="w-full h-8 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg"
                  onClick={() => {
                    setLimitReachedModal(false);
                    setShowAdModal(true);
                  }}
                >
                  شاهد إعلان الآن
                </CrystalButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ad Reward Notification */}
      <AnimatePresence>
        {showAdReward && (
          <motion.div
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Gift className="w-4 h-4" />
            <span className="text-xs font-medium">{lastAdRewardMsg}</span>
            <button onClick={() => setShowAdReward(false)} className="mr-2">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
