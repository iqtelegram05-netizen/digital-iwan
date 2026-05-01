'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, RotateCcw, ChevronDown, ChevronRight, ChevronLeft,
  Sparkles, CheckCircle2
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

/* ──────────────── Sound helper (works on iOS & Android) ──────────────── */
let audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return audioCtx;
  } catch { return null; }
}

function playClick(freq = 800, duration = 0.05) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playComplete() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  // Play a pleasant 3-note chime
  const notes = [523, 659, 784]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    const startTime = ctx.currentTime + i * 0.15;
    gain.gain.setValueAtTime(0.25, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
    osc.start(startTime);
    osc.stop(startTime + 0.3);
  });
}

/* ──────────────── Single Bead ──────────────── */
function Bead({
  index,
  state,
  size = 36,
  onClick,
  isFirst = false,
}: {
  index: number;
  state: 'pending' | 'active' | 'done';
  size?: number;
  onClick?: () => void;
  isFirst?: boolean;
}) {
  const beadColors = {
    pending: {
      bg: 'radial-gradient(circle at 32% 28%, #5a8f80, #1e5648 50%, #0f3329 100%)',
      shadow: '0 2px 6px rgba(0,0,0,0.5), inset 0 -3px 5px rgba(0,0,0,0.4), inset 0 2px 3px rgba(255,255,255,0.08)',
      highlight: 'rgba(255,255,255,0.15)',
    },
    active: {
      bg: 'radial-gradient(circle at 32% 28%, #6ee7b7, #10b981 50%, #047857 100%)',
      shadow: '0 0 20px rgba(16,185,129,0.6), 0 0 40px rgba(16,185,129,0.2), inset 0 -3px 5px rgba(0,0,0,0.3), inset 0 2px 3px rgba(255,255,255,0.2)',
      highlight: 'rgba(255,255,255,0.35)',
    },
    done: {
      bg: 'radial-gradient(circle at 32% 28%, #fde68a, #f59e0b 50%, #b45309 100%)',
      shadow: '0 2px 6px rgba(180,83,9,0.4), inset 0 -3px 5px rgba(0,0,0,0.3), inset 0 2px 3px rgba(255,255,255,0.15)',
      highlight: 'rgba(255,255,255,0.25)',
    },
  };

  const c = beadColors[state];

  return (
    <div className="flex flex-col items-center" style={{ gap: 0 }}>
      {isFirst && (
        <div
          className="rounded-full"
          style={{
            width: 3,
            height: 20,
            background: 'linear-gradient(to bottom, #92400e, #b45309)',
            boxShadow: '0 0 2px rgba(180,83,9,0.3)',
          }}
        />
      )}
      {!isFirst && (
        <div
          className="rounded-full"
          style={{
            width: 2.5,
            height: 6,
            background: 'linear-gradient(to bottom, #a16207, #ca8a04)',
            boxShadow: '0 0 2px rgba(202,138,4,0.2)',
          }}
        />
      )}
      <motion.button
        type="button"
        id={`bead-${index}`}
        onClick={onClick}
        whileTap={state === 'active' ? { scale: 0.85 } : undefined}
        className="relative rounded-full cursor-pointer select-none focus:outline-none"
        style={{
          width: size,
          height: size,
          background: c.bg,
          boxShadow: c.shadow,
          transition: 'background 0.4s ease, box-shadow 0.4s ease',
        }}
        animate={state === 'active' ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={state === 'active' ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : {}}
      >
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: size * 0.28,
            height: size * 0.2,
            top: size * 0.18,
            left: size * 0.22,
            background: c.highlight,
            filter: 'blur(1px)',
          }}
        />
        {state === 'done' && (
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-amber-900/60 pointer-events-none">
            {index + 1}
          </span>
        )}
        {state === 'active' && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-emerald-300/60 pointer-events-none"
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </motion.button>
    </div>
  );
}

/* ──────────────── Imam Bead ──────────────── */
function ImamBead({ active, done }: { active?: boolean; done?: boolean }) {
  const size = 48;
  const bg = active
    ? 'radial-gradient(circle at 32% 28%, #a78bfa, #7c3aed 50%, #4c1d95 100%)'
    : done
    ? 'radial-gradient(circle at 32% 28%, #c4b5fd, #8b5cf6 50%, #5b21b6 100%)'
    : 'radial-gradient(circle at 32% 28%, #6b5b8a, #3b2d5a 50%, #1e1635 100%)';

  return (
    <div className="flex flex-col items-center">
      <div className="rounded-full" style={{ width: 2.5, height: 6, background: 'linear-gradient(to bottom, #a16207, #ca8a04)' }} />
      <div
        className="rounded-full"
        style={{
          width: size, height: size, background: bg,
          boxShadow: active
            ? '0 0 25px rgba(124,58,237,0.5), inset 0 -3px 5px rgba(0,0,0,0.4), inset 0 2px 3px rgba(255,255,255,0.15)'
            : '0 2px 8px rgba(0,0,0,0.5), inset 0 -3px 5px rgba(0,0,0,0.4), inset 0 2px 3px rgba(255,255,255,0.1)',
        }}
      >
        <div className="absolute rounded-full pointer-events-none" style={{ width: size * 0.3, height: size * 0.22, top: size * 0.16, left: size * 0.2, background: 'rgba(255,255,255,0.2)', filter: 'blur(1.5px)' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-40">
            <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="white" />
          </svg>
        </div>
      </div>
      <div className="rounded-full" style={{ width: 2.5, height: 8, background: 'linear-gradient(to bottom, #a16207, #ca8a04)' }} />
    </div>
  );
}

/* ──────────────── Tassel ──────────────── */
function Tassel() {
  return (
    <div className="flex flex-col items-center relative">
      <div className="rounded-full" style={{ width: 14, height: 14, background: 'radial-gradient(circle at 35% 30%, #ca8a04, #92400e)', boxShadow: '0 2px 4px rgba(0,0,0,0.4)' }} />
      <div style={{ width: 8, height: 12, background: 'linear-gradient(to bottom, #92400e, #b45309)', borderRadius: '0 0 4px 4px' }} />
      <div className="flex items-center justify-center" style={{ width: 30, gap: 2 }}>
        {[...Array(7)].map((_, i) => (
          <motion.div
            key={i}
            className="rounded-b-full"
            style={{
              width: 2,
              height: 24 + (i % 3) * 3,
              background: `linear-gradient(to bottom, #b45309, #${['92400e', '78350f', 'a16207', '854d0e', '92400e', '78350f', 'a16207'][i]})`,
              borderRadius: '0 0 2px 2px',
            }}
            animate={{ rotate: [0, (i - 3) * 2, 0] }}
            transition={{ duration: 3 + i * 0.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
          />
        ))}
      </div>
    </div>
  );
}

/* ──────────────── Main Page ──────────────── */
export default function TasbeehPage() {
  const [groups, setGroups] = useState<TasbeehGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [counter, setCounter] = useState(0);
  const [totalSessionCount, setTotalSessionCount] = useState(0);
  const [showGroups, setShowGroups] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Haptic vibration (Android only)
  const vibrate = useCallback((pattern: number | number[] = 30) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch { /* iOS doesn't support vibrate */ }
  }, []);

  // Scroll active bead into view using DOM element directly
  const scrollActiveBead = useCallback(() => {
    // Use requestAnimationFrame to ensure DOM is painted
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(`bead-${counter}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  }, [counter]);

  const fetchTasbeeh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tasbeeh');
      if (res.ok) {
        const data = await res.json();
        const g = data.groups || [];
        setGroups(g);
        if (g.length > 0) {
          setSelectedGroupId((prev) => prev || g[0].id);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasbeeh();
  }, [fetchTasbeeh]);

  // Scroll to active bead when counter changes
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      // Scroll to first bead on initial load
      setTimeout(() => {
        const el = document.getElementById('bead-0');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      return;
    }
    scrollActiveBead();
  }, [counter, scrollActiveBead]);

  const currentGroup = groups.find((g) => g.id === selectedGroupId);
  const currentItem = currentGroup?.items[selectedItemIndex];
  const maxCount = currentItem?.count || 33;
  const isComplete = counter >= maxCount;
  const progressPercent = maxCount > 0 ? Math.min(100, Math.round((counter / maxCount) * 100)) : 0;
  const groupItems = currentGroup?.items || [];

  const handleTap = () => {
    if (!currentItem || isComplete) return;

    // Sound + vibration feedback
    if (counter === 0) {
      // First dhikr of this item - stronger feedback
      playClick(1000, 0.08);
      setTimeout(() => playClick(1200, 0.1), 100);
      vibrate([50, 60, 100]);
    } else if (counter === maxCount - 1) {
      // Last tap before completion
      playClick(1000, 0.08);
    } else {
      playClick(800, 0.05);
      vibrate(25);
    }

    // Screen flash effect
    setScreenFlash(true);
    setTimeout(() => setScreenFlash(false), 150);

    setCounter((prev) => prev + 1);
    setTotalSessionCount((prev) => prev + 1);
  };

  // Play completion sound when done
  useEffect(() => {
    if (isComplete && counter > 0) {
      playComplete();
      vibrate([100, 50, 100, 50, 200, 50, 300]);
    }
  }, [isComplete, counter, vibrate]);

  const handleBeadTap = (beadIndex: number) => {
    if (beadIndex === counter) handleTap();
  };

  const handleReset = () => setCounter(0);
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
      hasInitialized.current = false;
    }
  };

  const handlePrevItem = () => {
    if (selectedItemIndex > 0) {
      setSelectedItemIndex(selectedItemIndex - 1);
      setCounter(0);
      hasInitialized.current = false;
    }
  };

  const selectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedItemIndex(0);
    setCounter(0);
    hasInitialized.current = false;
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
          hasInitialized.current = false;
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, currentItem, currentGroup, selectedItemIndex]);

  // Build bead segments
  const totalBeads = maxCount;
  const segments: number[] = [];
  let rem = totalBeads;
  while (rem > 0) {
    if (rem > 11) { segments.push(11); rem -= 11; }
    else { segments.push(rem); rem = 0; }
  }
  const segOffsets: number[] = [];
  segments.reduce((acc, seg, i) => { segOffsets[i] = acc; return acc + seg; }, 0);

  return (
    <div className="h-[100dvh] bg-gradient-to-b from-[#0a1a14] via-[#0f2a1f] to-[#071510] flex flex-col overflow-hidden relative">
      {/* Decorative background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Screen flash on tap */}
      <AnimatePresence>
        {screenFlash && (
          <motion.div
            initial={{ opacity: 0.15 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-emerald-400 pointer-events-none z-30"
          />
        )}
      </AnimatePresence>

      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-[#0a1a14]/80 backdrop-blur-xl border-b border-emerald-500/10">
        <button onClick={() => window.history.back()} className="p-2 rounded-full hover:bg-emerald-500/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-emerald-400" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-emerald-50 flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-emerald-400 shrink-0">
              <circle cx="12" cy="6" r="3" fill="currentColor" opacity="0.8" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <circle cx="12" cy="18" r="3" fill="currentColor" opacity="0.8" />
              <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            </svg>
            <span>المسبحة</span>
          </h1>
          <p className="text-[10px] text-emerald-600">
            {currentGroup ? currentGroup.name : 'السبحة الإلكترونية'}
          </p>
        </div>
        {groups.length > 1 && (
          <button onClick={() => setShowGroups(!showGroups)} className="p-2 rounded-full hover:bg-emerald-500/10 transition-colors">
            <ChevronDown className={`w-5 h-5 text-emerald-400 transition-transform ${showGroups ? 'rotate-180' : ''}`} />
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
            className="overflow-hidden border-b border-emerald-500/10 bg-[#0a1a14]/95 backdrop-blur-sm z-40 shrink-0"
          >
            <div className="px-4 py-2 space-y-1 max-h-[200px] overflow-y-auto">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => selectGroup(group.id)}
                  className={`w-full text-right p-3 rounded-xl transition-colors ${
                    group.id === selectedGroupId
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                      : 'hover:bg-emerald-500/5 border border-transparent text-emerald-200'
                  }`}
                >
                  <p className="text-xs font-semibold">{group.name}</p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">{group.items.length} تسبيحة فرعية</p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <motion.div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-sm text-emerald-600">جارٍ التحميل...</p>
          </div>
        ) : !currentGroup || groupItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-emerald-500/30">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.3" />
              </svg>
            </div>
            <p className="text-sm text-emerald-600">لا توجد تسبيحات متاحة حالياً</p>
          </div>
        ) : (
          <>
            {/* Dhikr Text + Navigation */}
            <div className="shrink-0 text-center space-y-2 px-4 pt-4 pb-2">
              <p className="text-[10px] font-medium text-emerald-600 tracking-wider uppercase">
                {currentGroup.name}
              </p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={handlePrevItem} disabled={selectedItemIndex === 0} className="p-1.5 rounded-full hover:bg-emerald-500/10 disabled:opacity-20 transition-colors">
                  <ChevronRight className="w-5 h-5 text-emerald-300" />
                </button>
                <div className="flex-1 text-center min-w-0 max-w-xs">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={`${selectedGroupId}-${selectedItemIndex}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-2xl font-bold text-emerald-50 leading-relaxed"
                      style={{ textShadow: '0 0 20px rgba(16,185,129,0.3)' }}
                    >
                      {currentItem?.text}
                    </motion.p>
                  </AnimatePresence>
                  {currentItem?.description && (
                    <p className="text-[10px] text-emerald-700 mt-1">{currentItem.description}</p>
                  )}
                </div>
                <button onClick={handleNextItem} disabled={selectedItemIndex >= groupItems.length - 1} className="p-1.5 rounded-full hover:bg-emerald-500/10 disabled:opacity-20 transition-colors">
                  <ChevronLeft className="w-5 h-5 text-emerald-300" />
                </button>
              </div>
              {groupItems.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  {groupItems.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setSelectedItemIndex(idx); setCounter(0); hasInitialized.current = false; }}
                      className={`rounded-full transition-all ${
                        idx === selectedItemIndex ? 'bg-emerald-400 w-6 h-2' : idx < selectedItemIndex ? 'bg-amber-500/40 w-2 h-2' : 'bg-emerald-800/40 w-2 h-2'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ──── THE ROSARY ──── */}
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-0">
              {/* Counter badge */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0a1a14]/80 border border-emerald-500/20 backdrop-blur-sm shrink-0">
                <span className="text-lg font-black text-emerald-300 tabular-nums">{counter}</span>
                <span className="text-[10px] text-emerald-600">من {maxCount}</span>
                <div className="w-8 h-1 bg-emerald-900/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: isComplete ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #059669, #10b981)' }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>

              {/* Scrollable bead column */}
              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto overflow-x-hidden py-8 px-4 scrollbar-hide min-h-0"
              >
                <div
                  className="flex flex-col items-center cursor-pointer"
                  onClick={handleTap}
                  style={{ minHeight: '100%' }}
                >
                  {/* Top connector */}
                  <div className="rounded-full mb-1" style={{ width: 16, height: 8, background: 'linear-gradient(to bottom, #ca8a04, #92400e)', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', borderRadius: '8px 8px 0 0' }} />

                  {/* Bead segments */}
                  {segments.map((segCount, segIdx) => (
                    <div key={segIdx} className="flex flex-col items-center relative">
                      {segIdx > 0 && (
                        <ImamBead active={counter === segOffsets[segIdx]} done={counter > segOffsets[segIdx]} />
                      )}
                      {Array.from({ length: segCount }).map((_, beadLocalIdx) => {
                        const gIdx = segOffsets[segIdx] + beadLocalIdx;
                        const st = gIdx < counter ? 'done' as const : gIdx === counter ? 'active' as const : 'pending' as const;
                        return (
                          <Bead
                            key={gIdx}
                            index={gIdx}
                            state={st}
                            size={gIdx === counter ? 40 : 36}
                            onClick={(e) => { e.stopPropagation(); handleBeadTap(gIdx); }}
                            isFirst={segIdx === 0 && beadLocalIdx === 0}
                          />
                        );
                      })}
                    </div>
                  ))}

                  <ImamBead active={isComplete} done={isComplete} />
                  <Tassel />
                </div>
              </div>

              {/* Completion overlay */}
              <AnimatePresence>
                {isComplete && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className="flex flex-col items-center gap-2 px-8 py-5 rounded-2xl bg-[#0a1a14]/90 border border-amber-500/30 backdrop-blur-lg"
                    >
                      <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}>
                        <CheckCircle2 className="w-10 h-10 text-amber-400" />
                      </motion.div>
                      <span className="text-lg font-bold text-emerald-100">تم بحمد الله</span>
                      <span className="text-[10px] text-emerald-500">
                        {groupItems.length > 1 && selectedItemIndex < groupItems.length - 1
                          ? 'الانتقال للتسبيحة التالية...'
                          : 'أحسنت! بارك الله فيك'}
                      </span>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Controls */}
            <div className="shrink-0 px-4 pb-6 pt-3 space-y-3 bg-gradient-to-t from-[#0a1a14] via-[#0a1a14]/95 to-transparent">
              <div className="w-full max-w-md mx-auto">
                <div className="w-full h-1.5 bg-emerald-950/50 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: isComplete ? 'linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)' : 'linear-gradient(90deg, #047857, #10b981, #34d399)' }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[10px] text-emerald-600">
                  <span>التسبيحة {selectedItemIndex + 1} من {groupItems.length}</span>
                  <span className="tabular-nums">{progressPercent}%</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <motion.button whileTap={{ scale: 0.92 }} onClick={handleReset} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/15 hover:bg-emerald-500/10 transition-colors">
                  <RotateCcw className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-emerald-400">إعادة</span>
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={handleTap} disabled={isComplete} className="flex items-center justify-center w-16 h-16 rounded-full transition-all" style={{ background: isComplete ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'linear-gradient(135deg, #059669, #10b981)', boxShadow: isComplete ? '0 0 30px rgba(245,158,11,0.4)' : '0 0 30px rgba(16,185,129,0.3)' }}>
                  <span className="text-xl font-black text-white tabular-nums">{counter}</span>
                </motion.button>
                <motion.button whileTap={{ scale: 0.92 }} onClick={handleResetAll} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-950/30 border border-red-500/15 hover:bg-red-500/10 transition-colors">
                  <RotateCcw className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-red-400">إعادة الكل</span>
                </motion.button>
              </div>

              {totalSessionCount > 0 && (
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] text-amber-500/80">
                    إجمالي الجلسة: <span className="font-bold text-amber-400 tabular-nums">{totalSessionCount}</span> تسبيحة
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
