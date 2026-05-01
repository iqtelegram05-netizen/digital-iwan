'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, CircleDot, RotateCcw, Sparkles,
  ChevronDown, ChevronRight, CheckCircle2
} from 'lucide-react';

interface TasbeehItem {
  id: string;
  text: string;
  description?: string;
  count: number;
}

interface TasbeehGroup {
  id: string;
  name: string;
  description?: string;
  items: TasbeehItem[];
}

export default function TasbeehPage() {
  const [groups, setGroups] = useState<TasbeehGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [counter, setCounter] = useState(0);
  const [totalSessionCount, setTotalSessionCount] = useState(0);
  const [showGroups, setShowGroups] = useState(false);

  // Vibration feedback
  const vibrate = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(30);
    }
  }, []);

  const fetchTasbeeh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tasbeeh');
      if (res.ok) {
        const data = await res.json();
        const g = data.groups || [];
        setGroups(g);
        if (g.length > 0 && !selectedGroupId) {
          setSelectedGroupId(g[0].id);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    fetchTasbeeh();
  }, [fetchTasbeeh]);

  const currentGroup = groups.find((g) => g.id === selectedGroupId);
  const currentItem = currentGroup?.items[selectedItemIndex];
  const maxCount = currentItem?.count || 33;
  const isComplete = counter >= maxCount;
  const progressPercent = maxCount > 0 ? Math.min(100, Math.round((counter / maxCount) * 100)) : 0;

  // Total group progress
  const groupItems = currentGroup?.items || [];
  const completedItemsCount = groupItems.filter((_, idx) => {
    if (idx === selectedItemIndex) return isComplete;
    return false; // Only track current session
  }).length;

  const handleTap = () => {
    if (!currentItem || isComplete) return;
    vibrate();
    const next = counter + 1;
    setCounter(next);
    setTotalSessionCount((prev) => prev + 1);
  };

  const handleReset = () => {
    setCounter(0);
  };

  const handleResetAll = () => {
    setCounter(0);
    setTotalSessionCount(0);
    setSelectedItemIndex(0);
  };

  const handleNextItem = () => {
    if (!currentGroup) return;
    const nextIdx = selectedItemIndex + 1;
    if (nextIdx < currentGroup.items.length) {
      setSelectedItemIndex(nextIdx);
      setCounter(0);
    }
  };

  const handlePrevItem = () => {
    if (selectedItemIndex > 0) {
      setSelectedItemIndex(selectedItemIndex - 1);
      setCounter(0);
    }
  };

  const selectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedItemIndex(0);
    setCounter(0);
    setShowGroups(false);
  };

  // Auto-advance on completion
  useEffect(() => {
    if (isComplete && currentItem && currentGroup) {
      const timer = setTimeout(() => {
        const nextIdx = selectedItemIndex + 1;
        if (nextIdx < currentGroup.items.length) {
          setSelectedItemIndex(nextIdx);
          setCounter(0);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, currentItem, currentGroup, selectedItemIndex]);

  return (
    <div className="h-[100dvh] bg-gradient-to-b from-background via-background to-emerald-950/10 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-lg border-b border-emerald-500/10">
        <button onClick={() => window.history.back()} className="p-2 rounded-full hover:bg-emerald-500/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CircleDot className="w-5 h-5 text-emerald-500 shrink-0" />
            <span>المسبحة</span>
          </h1>
          <p className="text-[10px] text-muted-foreground">
            {currentGroup ? currentGroup.name : 'السبحة الإلكترونية'}
          </p>
        </div>
        {/* Group selector */}
        {groups.length > 1 && (
          <button
            onClick={() => setShowGroups(!showGroups)}
            className="p-2 rounded-full hover:bg-emerald-500/10 transition-colors"
          >
            <ChevronDown className={`w-5 h-5 text-emerald-500 transition-transform ${showGroups ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Group Selector Dropdown */}
      <AnimatePresence>
        {showGroups && groups.length > 1 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-emerald-500/10 bg-background/95 backdrop-blur-sm z-40"
          >
            <div className="px-4 py-2 space-y-1 max-h-[200px] overflow-y-auto">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => selectGroup(group.id)}
                  className={`w-full text-right p-3 rounded-xl transition-colors ${
                    group.id === selectedGroupId
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                      : 'hover:bg-muted/50 border border-transparent'
                  }`}
                >
                  <p className="text-xs font-semibold">{group.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{group.items.length} تسبيحة فرعية</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6">

        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <motion.div
              className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"
            />
            <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>
          </div>
        ) : !currentGroup || groupItems.length === 0 ? (
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <CircleDot className="w-16 h-16 text-emerald-500/20" />
            <p className="text-sm">لا توجد تسبيحات متاحة حالياً</p>
            <p className="text-[10px]">سيتم إضافة تسبيحات من قبل المشرف</p>
          </div>
        ) : (
          <>
            {/* Group name & item navigation */}
            <div className="text-center space-y-1 w-full max-w-sm">
              <p className="text-xs font-medium text-emerald-500/70">{currentGroup.name}</p>

              {/* Item navigation arrows */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handlePrevItem}
                  disabled={selectedItemIndex === 0}
                  className="p-1.5 rounded-full hover:bg-emerald-500/10 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-foreground" />
                </button>

                <div className="flex-1 text-center min-w-0">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={`${selectedGroupId}-${selectedItemIndex}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-2xl font-bold text-foreground leading-relaxed"
                    >
                      {currentItem?.text}
                    </motion.p>
                  </AnimatePresence>
                  {currentItem?.description && (
                    <p className="text-[10px] text-muted-foreground mt-1">{currentItem.description}</p>
                  )}
                </div>

                <button
                  onClick={handleNextItem}
                  disabled={selectedItemIndex >= groupItems.length - 1}
                  className="p-1.5 rounded-full hover:bg-emerald-500/10 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-foreground" />
                </button>
              </div>

              {/* Item dots indicator */}
              {groupItems.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  {groupItems.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setSelectedItemIndex(idx); setCounter(0); }}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === selectedItemIndex
                          ? 'bg-emerald-500 w-6'
                          : idx < selectedItemIndex
                            ? 'bg-emerald-500/40'
                            : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ============ MAIN COUNTER CIRCLE ============ */}
            <motion.div
              className="relative flex items-center justify-center"
              style={{ width: 260, height: 260 }}
            >
              {/* Outer ring glow */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  boxShadow: isComplete
                    ? '0 0 60px rgba(16,185,129,0.4), 0 0 120px rgba(16,185,129,0.15)'
                    : '0 0 40px rgba(16,185,129,0.1)',
                }}
              />

              {/* SVG Progress ring */}
              <svg className="absolute inset-0" viewBox="0 0 260 260" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background circle */}
                <circle
                  cx="130" cy="130" r="120"
                  fill="none"
                  stroke="rgba(16,185,129,0.1)"
                  strokeWidth="6"
                />
                {/* Progress circle */}
                <motion.circle
                  cx="130" cy="130" r="120"
                  fill="none"
                  stroke={isComplete ? '#10b981' : '#059669'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 120}
                  initial={false}
                  animate={{ strokeDashoffset: 2 * Math.PI * 120 * (1 - progressPercent / 100) }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </svg>

              {/* Main tap button */}
              <motion.button
                onClick={handleTap}
                whileTap={{ scale: 0.92 }}
                className="absolute inset-4 rounded-full flex flex-col items-center justify-center cursor-pointer select-none transition-colors"
                style={{
                  background: isComplete
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))',
                  border: isComplete ? 'none' : '2px solid rgba(16,185,129,0.2)',
                }}
              >
                {isComplete ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <CheckCircle2 className="w-12 h-12 text-white" />
                    <span className="text-white text-sm font-bold">تم بحمد الله</span>
                  </motion.div>
                ) : (
                  <>
                    <motion.span
                      key={counter}
                      initial={{ scale: 1.3, opacity: 0.5 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-7xl font-black tabular-nums"
                      style={{ color: '#10b981' }}
                    >
                      {counter}
                    </motion.span>
                    <span className="text-sm text-muted-foreground mt-1">
                      من {maxCount}
                    </span>
                  </>
                )}
              </motion.button>

              {/* Pulse effect on completion */}
              <AnimatePresence>
                {isComplete && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0.8 }}
                    animate={{ scale: 1.3, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border-2 border-emerald-500"
                  />
                )}
              </AnimatePresence>
            </motion.div>

            {/* Progress bar */}
            <div className="w-full max-w-sm space-y-2">
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: isComplete
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : 'linear-gradient(90deg, #059669, #10b981)',
                  }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>التسبيحة {selectedItemIndex + 1} من {groupItems.length}</span>
                <span className="tabular-nums">{progressPercent}%</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleReset}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-card border border-border/50 hover:bg-muted/50 transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">إعادة</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleResetAll}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-red-400" />
                <span className="text-xs text-red-400">إعادة الكل</span>
              </motion.button>

              {totalSessionCount > 0 && (
                <div className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-emerald-500 font-medium tabular-nums">{totalSessionCount}</span>
                </div>
              )}
            </div>

            {/* Items list (collapsed preview) */}
            <div className="w-full max-w-sm">
              <button
                onClick={() => setShowGroups(!showGroups)}
                className="w-full text-center text-[10px] text-muted-foreground/50 py-2"
              >
                عرض جميع التسبيحات ({groupItems.length})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
