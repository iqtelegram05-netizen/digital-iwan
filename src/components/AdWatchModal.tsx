'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { Tv, Gift, X, ExternalLink, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import CrystalButton from './CrystalButton';

interface AdItem {
  id: string;
  title: string;
  imageUrl?: string | null;
  linkUrl?: string | null;
  htmlCode?: string | null;
}

interface AdWatchModalProps {
  open: boolean;
  onClose: () => void;
}

const COUNTDOWN_SECONDS = 5;

export default function AdWatchModal({ open, onClose }: AdWatchModalProps) {
  const { user, usageInfo, setUsageInfo, setShowAdReward, setLastAdRewardMsg } = useAppStore();

  const [ads, setAds] = useState<AdItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentAd, setCurrentAd] = useState<AdItem | null>(null);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [phase, setPhase] = useState<'loading' | 'watching' | 'ready' | 'collecting' | 'done' | 'error' | 'empty'>('loading');
  const [rewardMsg, setRewardMsg] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAds = useCallback(async () => {
    setLoading(true);
    setPhase('loading');
    try {
      const res = await fetch('/api/ads');
      const data = await res.json();
      if (data.ads && data.ads.length > 0) {
        setAds(data.ads);
        // Pick random ad
        const ad = data.ads[Math.floor(Math.random() * data.ads.length)];
        setCurrentAd(ad);
        setPhase('watching');
        setCountdown(COUNTDOWN_SECONDS);
      } else {
        setPhase('empty');
      }
    } catch {
      setPhase('error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Start countdown when modal opens
  useEffect(() => {
    if (!open) {
      // Reset state on close
      setAds([]);
      setCurrentAd(null);
      setCountdown(COUNTDOWN_SECONDS);
      setPhase('loading');
      setRewardMsg('');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    fetchAds();
  }, [open, fetchAds]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'watching') return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase('ready');
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
  }, [phase]);

  const handleCollect = useCallback(async () => {
    if (!user || !currentAd) return;
    setPhase('collecting');

    try {
      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, adId: currentAd.id }),
      });
      const data = await res.json();

      if (data.bonusEarned) {
        setRewardMsg(data.message);
        setShowAdReward(true);
        setLastAdRewardMsg(data.message);
      } else {
        setRewardMsg(data.message || 'تم تسجيل المشاهدة');
      }

      setPhase('done');

      // Refresh usage info
      try {
        const usageRes = await fetch(`/api/usage?userId=${user.id}`);
        if (usageRes.ok) {
          const usageData = await usageRes.json();
          setUsageInfo(usageData);
        }
      } catch {
        // silent
      }
    } catch {
      setPhase('error');
      setRewardMsg('حدث خطأ أثناء تسجيل المشاهدة');
    }
  }, [user, currentAd, setShowAdReward, setLastAdRewardMsg, setUsageInfo]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-card border border-border/50 rounded-2xl p-5 max-w-sm w-full shadow-2xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                <Tv className="w-4 h-4" />
                شاهد إعلان
              </h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Loading State */}
            {phase === 'loading' && (
              <div className="flex flex-col items-center py-8 gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground">جاري تحميل الإعلان...</span>
              </div>
            )}

            {/* No Ads Available */}
            {phase === 'empty' && (
              <div className="flex flex-col items-center py-6 gap-3">
                <AlertCircle className="w-10 h-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">لا توجد إعلانات متاحة حالياً</p>
                <p className="text-[10px] text-muted-foreground">حاول مرة أخرى لاحقاً</p>
                <CrystalButton
                  variant="outline"
                  size="sm"
                  className="mt-2 border-primary/20 hover:bg-primary/10 text-xs"
                  onClick={onClose}
                >
                  إغلاق
                </CrystalButton>
              </div>
            )}

            {/* Error State */}
            {phase === 'error' && (
              <div className="flex flex-col items-center py-6 gap-3">
                <AlertCircle className="w-10 h-10 text-destructive" />
                <p className="text-sm text-destructive text-center">{rewardMsg || 'حدث خطأ'}</p>
                <CrystalButton
                  variant="outline"
                  size="sm"
                  className="mt-2 border-primary/20 hover:bg-primary/10 text-xs"
                  onClick={fetchAds}
                >
                  إعادة المحاولة
                </CrystalButton>
              </div>
            )}

            {/* Ad Display */}
            {(phase === 'watching' || phase === 'ready' || phase === 'collecting') && currentAd && (
              <div className="space-y-4">
                {/* Ad Image or Title */}
                <div className="rounded-xl overflow-hidden border border-border/30 bg-card/50">
                  {currentAd.imageUrl ? (
                    <div className="relative">
                      <img
                        src={currentAd.imageUrl}
                        alt={currentAd.title}
                        className="w-full h-40 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      {currentAd.linkUrl && (
                        <a
                          href={currentAd.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute top-2 left-2 bg-black/50 text-white text-[9px] px-2 py-1 rounded-lg flex items-center gap-1 hover:bg-black/70 transition-colors"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          زيارة
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Tv className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{currentAd.title}</p>
                        {currentAd.linkUrl && (
                          <a
                            href={currentAd.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-primary flex items-center gap-1 hover:underline truncate"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            {currentAd.linkUrl}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Countdown */}
                {phase === 'watching' && (
                  <div className="text-center space-y-2">
                    <p className="text-xs text-muted-foreground">
                      شاهد الإعلان لمدة <span className="text-primary font-bold">{countdown}</span> ثوانٍ
                    </p>
                    <div className="w-full h-2 bg-primary/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-l from-primary to-primary/60 rounded-full"
                        animate={{ width: `${((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">انتظر حتى ينتهي العد التنازلي...</p>
                  </div>
                )}

                {/* Collect Button */}
                {phase === 'ready' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-2"
                  >
                    <Gift className="w-8 h-8 text-green-500 mx-auto" />
                    <p className="text-xs font-medium text-green-500">انتهى الوقت! يمكنك الآن جمع مكافأتك</p>
                    <CrystalButton
                      className="w-full h-10 bg-green-500 hover:bg-green-600 text-white text-sm rounded-xl gap-2"
                      onClick={handleCollect}
                    >
                      <Gift className="w-4 h-4" />
                      اجمع مكافأتك
                    </CrystalButton>
                  </motion.div>
                )}

                {/* Collecting State */}
                {phase === 'collecting' && (
                  <div className="flex flex-col items-center py-4 gap-2">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground">جاري تسجيل المشاهدة...</span>
                  </div>
                )}
              </div>
            )}

            {/* Done State */}
            {phase === 'done' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-3"
              >
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <div>
                  <p className="text-sm font-medium text-green-500">تم بنجاح!</p>
                  <p className="text-xs text-muted-foreground mt-1">{rewardMsg}</p>
                </div>

                {/* Progress info */}
                {usageInfo && (
                  <div className="mt-3 p-2.5 rounded-lg bg-card/50 border border-border/30">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">
                        التقدم: {usageInfo.adsProgress}/{usageInfo.ADS_FOR_BONUS}
                      </span>
                      <span className="text-green-500 font-medium">
                        تبقّى {usageInfo.adsUntilBonus} ← {usageInfo.BONUS_MESSAGES} رسائل
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-primary/10 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="h-full bg-gradient-to-l from-green-500 to-green-400 rounded-full transition-all duration-500"
                        style={{ width: `${(usageInfo.adsProgress / usageInfo.ADS_FOR_BONUS) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <CrystalButton
                  className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm"
                  onClick={onClose}
                >
                  حسناً
                </CrystalButton>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
