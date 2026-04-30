'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleDot, ChevronDown, RotateCcw, Sparkles } from 'lucide-react';

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

export default function TasbeehView() {
  const [groups, setGroups] = useState<TasbeehGroup[]>([]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [counters, setCounters] = useState<Record<string, number>>({});
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});

  const fetchTasbeeh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tasbeeh');
      if (res.ok) {
        const data = await res.json();
        const g = data.groups || [];
        setGroups(g);
        // Auto-expand first group if exists
        if (g.length > 0 && !expandedGroupId) {
          setExpandedGroupId(g[0].id);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [expandedGroupId]);

  useEffect(() => {
    fetchTasbeeh();
  }, [fetchTasbeeh]);

  const incrementCounter = (itemId: string, maxCount: number) => {
    setCounters((prev) => {
      const current = prev[itemId] || 0;
      if (current >= maxCount) return prev;
      const next = current + 1;
      if (next >= maxCount) {
        setCompletedItems((cp) => ({ ...cp, [itemId]: true }));
      }
      return { ...prev, [itemId]: next };
    });
  };

  const resetItem = (itemId: string) => {
    setCounters((prev) => ({ ...prev, [itemId]: 0 }));
    setCompletedItems((prev) => ({ ...prev, [itemId]: false }));
  };

  const resetAll = () => {
    setCounters({});
    setCompletedItems({});
  };

  const getTotalProgress = (group: TasbeehGroup) => {
    const total = group.items.reduce((sum, item) => sum + (counters[item.id] || 0), 0);
    const target = group.items.reduce((sum, item) => sum + item.count, 0);
    return { total, target };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        <motion.div className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin-slow ml-2" />
        جارٍ التحميل...
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
        <CircleDot className="w-10 h-10 text-emerald-500/30" />
        <p className="text-sm">لا توجد تسبيحات متاحة حالياً</p>
        <p className="text-[10px]">سيتم إضافة تسبيحات من قبل المشرف</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Reset all button */}
      {Object.keys(counters).length > 0 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] text-muted-foreground">
            {Object.values(counters).reduce((a, b) => a + b, 0)} تسبيحة
          </p>
          <button
            onClick={resetAll}
            className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            إعادة الكل
          </button>
        </div>
      )}

      {groups.map((group) => {
        const progress = getTotalProgress(group);
        const isExpanded = expandedGroupId === group.id;
        const groupComplete = group.items.length > 0 && group.items.every((item) => completedItems[item.id]);
        const progressPercent = progress.target > 0 ? Math.min(100, Math.round((progress.total / progress.target) * 100)) : 0;

        return (
          <motion.div
            key={group.id}
            className="rounded-xl bg-card/40 border border-emerald-500/10 overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Group header */}
            <button
              type="button"
              onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-card/60 transition-colors text-right"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${groupComplete ? 'bg-emerald-500' : 'bg-emerald-500/10'}`}>
                {groupComplete ? (
                  <Sparkles className="w-5 h-5 text-white" />
                ) : (
                  <CircleDot className="w-5 h-5 text-emerald-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{group.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[10px] text-muted-foreground">{group.items.length} تسبيحة فرعية</p>
                  {progress.target > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-emerald-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <span className="text-[9px] text-emerald-500">{progressPercent}%</span>
                    </div>
                  )}
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Items */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-emerald-500/10 p-2 space-y-2">
                    {group.items.map((item) => {
                      const current = counters[item.id] || 0;
                      const isComplete = completedItems[item.id];
                      const itemPercent = Math.min(100, Math.round((current / item.count) * 100));

                      return (
                        <motion.div
                          key={item.id}
                          className={`rounded-lg border p-3 transition-colors ${isComplete ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-card/50 border-border/20'}`}
                          layout
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${isComplete ? 'text-emerald-400' : 'text-foreground'}`}>
                                {item.text}
                              </p>
                              {item.description && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">{item.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => resetItem(item.id)}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                title="إعادة"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer select-none transition-all ${isComplete ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 active:scale-95'}`}
                                onClick={() => !isComplete && incrementCounter(item.id, item.count)}
                              >
                                <span className="text-sm font-bold tabular-nums">{current}</span>
                              </div>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full ${isComplete ? 'bg-emerald-400' : 'bg-emerald-500'}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${itemPercent}%` }}
                                transition={{ duration: 0.2 }}
                              />
                            </div>
                            <span className="text-[9px] text-muted-foreground tabular-nums min-w-[40px] text-left">
                              {current}/{item.count}
                            </span>
                          </div>

                          {/* Completion animation */}
                          <AnimatePresence>
                            {isComplete && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center justify-center gap-1 mt-2 text-emerald-400"
                              >
                                <Sparkles className="w-3 h-3" />
                                <span className="text-[10px] font-medium">تم بحمد الله</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
