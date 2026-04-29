'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import type { UsageInfoData } from '@/lib/usageLimit';
import { Tv, Gift, Crown, X } from 'lucide-react';
import CrystalButton from './CrystalButton';

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
    setCurrentView,
  } = useAppStore();

  const fetchUsage = useCallback(async () => {
    if (!user || user.role === 'owner' || user.role === 'supervisor') return;
    try {
      const res = await fetch(`/api/usage?userId=${user.id}`);
      if (res.ok) {
        const data: UsageInfoData = await res.json();
        setUsageInfo(data);
      }
    } catch {
      // silently fail
    }
  }, [user, setUsageInfo]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const handleWatchAd = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch available ads
      const adsRes = await fetch('/api/ads');
      const adsData = await adsRes.json();

      if (adsData.ads && adsData.ads.length > 0) {
        // Show ad (open link or display)
        const ad = adsData.ads[0];
        if (ad.linkUrl) {
          window.open(ad.linkUrl, '_blank', 'noopener');
        }

        // Wait a bit for user to "watch" the ad
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Record ad watch
      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, adId: adsData.ads?.[0]?.id }),
      });
      const data = await res.json();

      if (data.bonusEarned) {
        setShowAdReward(true);
        setLastAdRewardMsg(data.message);
      }

      // Refresh usage
      fetchUsage();
    } catch {
      // silently fail
    }
  }, [user, setShowAdReward, setLastAdRewardMsg, fetchUsage]);

  // Don't show for admin/owner
  if (!user || user.role === 'owner' || user.role === 'supervisor') return null;
  if (!usageInfo) return null;

  const isPremium = usageInfo.isPremium;

  return (
    <>
      {/* Usage Bar - always visible at top of chat area */}
      <motion.div
        className="mx-3 sm:mx-4 mt-1 mb-0 px-2.5 py-1.5 rounded-lg bg-card/60 border border-border/30 backdrop-blur-sm"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Message Counter */}
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
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                      {usageInfo.freeRemaining} / {usageInfo.freeLimit} مجانية
                    </span>
                    {usageInfo.bonusMessages > 0 && (
                      <span className="text-[9px] text-green-500">+{usageInfo.bonusMessages} مكافأة</span>
                    )}
                  </div>
                  <div className="w-full h-1 bg-primary/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-l from-primary/80 to-primary/40 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(usageInfo.freeRemaining / usageInfo.freeLimit) * 100}%` }}
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
              onClick={handleWatchAd}
            >
              <Tv className="w-3 h-3" />
              شاهد إعلان
            </CrystalButton>
          )}
        </div>

        {/* Ad progress */}
        {!isPremium && usageInfo.adsUntilBonus < 10 && (
          <div className="mt-1 text-[8px] text-muted-foreground flex items-center gap-1">
            <Gift className="w-2.5 h-2.5 text-green-500" />
            تفعّل بعد {usageInfo.adsUntilBonus} إعلانات ← {usageInfo.BONUS_MESSAGES} رسائل
          </div>
        )}
      </motion.div>

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
                <h3 className="text-sm font-bold text-primary">وصلت للحد الأقصى</h3>
                <button onClick={() => setLimitReachedModal(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground mb-4">
                استهلكت جميع رسالاتك المجانية ({usageInfo.freeLimit} رسالة). يمكنك المتابعة بإحدى الطرق التالية:
              </p>

              {/* Subscription Option */}
              <div className="mb-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs font-bold text-yellow-500">اشتراك شهري</span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">رسائل غير محدودة لمدة شهر كامل</p>
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
                  كل {usageInfo.ADS_FOR_BONUS} إعلانات = {usageInfo.BONUS_MESSAGES} رسائل مجانية
                </p>
                <CrystalButton
                  className="w-full h-8 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg"
                  onClick={() => {
                    setLimitReachedModal(false);
                    handleWatchAd();
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
