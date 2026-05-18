'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, RotateCcw, ChevronDown, ChevronRight, ChevronLeft,
  CheckCircle2, Settings, X
} from 'lucide-react';

/* ═══════════════ Types ═══════════════ */
interface TasbeehItem { id: string; text: string; description?: string; count: number; }
interface TasbeehGroup { id: string; name: string; description?: string; items: TasbeehItem[]; }

interface ColorTheme {
  name: string;
  pending: string; active: string; done: string;
  glow: string; doneGlow: string;
  highlight: string;
}

interface SeparatorTheme {
  name: string;
  pending: string; active: string; done: string;
  glow: string;
}

interface BackgroundTheme {
  name: string;
  from: string; via: string; to: string;
  text: string; muted: string; border: string;
  glow: string;
}

/* ═══════════════ Color Themes (Gemstone names) ═══════════════ */
const BEAD_THEMES: ColorTheme[] = [
  {
    name: 'زمرد',
    pending: 'radial-gradient(circle at 32% 28%, #5a8f80, #1e5648 50%, #0f3329 100%)',
    active: 'radial-gradient(circle at 32% 28%, #6ee7b7, #10b981 50%, #047857 100%)',
    done: 'radial-gradient(circle at 32% 28%, #fde68a, #f59e0b 50%, #b45309 100%)',
    glow: 'rgba(16,185,129,0.6)', doneGlow: 'rgba(180,83,9,0.4)',
    highlight: 'rgba(255,255,255,0.15)',
  },
  {
    name: 'عقيق يماني',
    pending: 'radial-gradient(circle at 32% 28%, #9b5c4e, #7c2d2a 50%, #4a1c1a 100%)',
    active: 'radial-gradient(circle at 32% 28%, #f87171, #dc2626 50%, #991b1b 100%)',
    done: 'radial-gradient(circle at 32% 28%, #fde68a, #f59e0b 50%, #b45309 100%)',
    glow: 'rgba(220,38,38,0.6)', doneGlow: 'rgba(180,83,9,0.4)',
    highlight: 'rgba(255,255,255,0.18)',
  },
  {
    name: 'فيروز',
    pending: 'radial-gradient(circle at 32% 28%, #5ea8b8, #1d6e8a 50%, #0f4050 100%)',
    active: 'radial-gradient(circle at 32% 28%, #67e8f9, #06b6d4 50%, #0e7490 100%)',
    done: 'radial-gradient(circle at 32% 28%, #fde68a, #f59e0b 50%, #b45309 100%)',
    glow: 'rgba(6,182,212,0.6)', doneGlow: 'rgba(180,83,9,0.4)',
    highlight: 'rgba(255,255,255,0.2)',
  },
  {
    name: 'لؤلؤ',
    pending: 'radial-gradient(circle at 32% 28%, #e2e8f0, #94a3b8 50%, #64748b 100%)',
    active: 'radial-gradient(circle at 32% 28%, #ffffff, #e2e8f0 50%, #cbd5e1 100%)',
    done: 'radial-gradient(circle at 32% 28%, #fde68a, #f59e0b 50%, #b45309 100%)',
    glow: 'rgba(255,255,255,0.5)', doneGlow: 'rgba(180,83,9,0.4)',
    highlight: 'rgba(255,255,255,0.5)',
  },
  {
    name: 'كهرمان',
    pending: 'radial-gradient(circle at 32% 28%, #c99a50, #92400e 50%, #6b3000 100%)',
    active: 'radial-gradient(circle at 32% 28%, #fcd34d, #f59e0b 50%, #d97706 100%)',
    done: 'radial-gradient(circle at 32% 28%, #fef3c7, #fbbf24 50%, #f59e0b 100%)',
    glow: 'rgba(245,158,11,0.6)', doneGlow: 'rgba(251,191,36,0.5)',
    highlight: 'rgba(255,255,255,0.3)',
  },
  {
    name: 'مرجان',
    pending: 'radial-gradient(circle at 32% 28%, #e07868, #c0392b 50%, #8b2018 100%)',
    active: 'radial-gradient(circle at 32% 28%, #ff9a8b, #ef4444 50%, #dc2626 100%)',
    done: 'radial-gradient(circle at 32% 28%, #fde68a, #f59e0b 50%, #b45309 100%)',
    glow: 'rgba(239,68,68,0.6)', doneGlow: 'rgba(180,83,9,0.4)',
    highlight: 'rgba(255,255,255,0.2)',
  },
  {
    name: 'عين القط',
    pending: 'radial-gradient(circle at 32% 28%, #a08060, #7c5c3c 50%, #4a3020 100%)',
    active: 'radial-gradient(circle at 32% 28%, #d4a574, #b8860b 50%, #8b6914 100%)',
    done: 'radial-gradient(circle at 32% 28%, #fde68a, #f59e0b 50%, #b45309 100%)',
    glow: 'rgba(184,134,11,0.6)', doneGlow: 'rgba(180,83,9,0.4)',
    highlight: 'rgba(255,255,255,0.22)',
  },
  {
    name: 'أونيكس',
    pending: 'radial-gradient(circle at 32% 28%, #4a4a4a, #1a1a1a 50%, #0a0a0a 100%)',
    active: 'radial-gradient(circle at 32% 28%, #737373, #404040 50%, #262626 100%)',
    done: 'radial-gradient(circle at 32% 28%, #fde68a, #f59e0b 50%, #b45309 100%)',
    glow: 'rgba(115,115,115,0.5)', doneGlow: 'rgba(180,83,9,0.4)',
    highlight: 'rgba(255,255,255,0.12)',
  },
];

const SEPARATOR_THEMES: SeparatorTheme[] = [
  {
    name: 'ياقوت',
    pending: 'radial-gradient(circle at 32% 28%, #6b5b8a, #3b2d5a 50%, #1e1635 100%)',
    active: 'radial-gradient(circle at 32% 28%, #a78bfa, #7c3aed 50%, #4c1d95 100%)',
    done: 'radial-gradient(circle at 32% 28%, #c4b5fd, #8b5cf6 50%, #5b21b6 100%)',
    glow: 'rgba(124,58,237,0.5)',
  },
  {
    name: 'لازورد',
    pending: 'radial-gradient(circle at 32% 28%, #4a6080, #1e3a5f 50%, #0f1f35 100%)',
    active: 'radial-gradient(circle at 32% 28%, #93c5fd, #3b82f6 50%, #1d4ed8 100%)',
    done: 'radial-gradient(circle at 32% 28%, #bfdbfe, #60a5fa 50%, #2563eb 100%)',
    glow: 'rgba(59,130,246,0.5)',
  },
  {
    name: 'زبرجد',
    pending: 'radial-gradient(circle at 32% 28%, #5c7a60, #2d5a30 50%, #1a3520 100%)',
    active: 'radial-gradient(circle at 32% 28%, #86efac, #22c55e 50%, #16a34a 100%)',
    done: 'radial-gradient(circle at 32% 28%, #bbf7d0, #4ade80 50%, #22c55e 100%)',
    glow: 'rgba(34,197,94,0.5)',
  },
  {
    name: 'عقيق أحمر',
    pending: 'radial-gradient(circle at 32% 28%, #6b3040, #4a1020 50%, #2a0810 100%)',
    active: 'radial-gradient(circle at 32% 28%, #fca5a5, #ef4444 50%, #b91c1c 100%)',
    done: 'radial-gradient(circle at 32% 28%, #fecaca, #f87171 50%, #ef4444 100%)',
    glow: 'rgba(239,68,68,0.5)',
  },
  {
    name: 'ذهب',
    pending: 'radial-gradient(circle at 32% 28%, #8a7040, #6b5418 50%, #4a3a10 100%)',
    active: 'radial-gradient(circle at 32% 28%, #fde68a, #eab308 50%, #ca8a04 100%)',
    done: 'radial-gradient(circle at 32% 28%, #fef9c3, #facc15 50%, #eab308 100%)',
    glow: 'rgba(234,179,8,0.5)',
  },
];

const BACKGROUND_THEMES: BackgroundTheme[] = [
  {
    name: 'ليل أخضر',
    from: '#0a1a14', via: '#0f2a1f', to: '#071510',
    text: '#ecfdf5', muted: '#059669', border: '#10b981',
    glow: 'rgba(16,185,129,0.05)',
  },
  {
    name: 'كحلي',
    from: '#0a0f1a', via: '#0f1a2e', to: '#070d18',
    text: '#eff6ff', muted: '#3b82f6', border: '#60a5fa',
    glow: 'rgba(59,130,246,0.05)',
  },
  {
    name: 'عتمة',
    from: '#0a0a0a', via: '#111111', to: '#050505',
    text: '#f5f5f5', muted: '#737373', border: '#525252',
    glow: 'rgba(115,115,115,0.05)',
  },
  {
    name: 'بنفسجي',
    from: '#0f0a1a', via: '#1a0f2e', to: '#0d0718',
    text: '#f5f3ff', muted: '#8b5cf6', border: '#a78bfa',
    glow: 'rgba(139,92,246,0.05)',
  },
  {
    name: 'عنبري',
    from: '#1a1008', via: '#2a1a0a', to: '#150e05',
    text: '#fef3c7', muted: '#d97706', border: '#f59e0b',
    glow: 'rgba(217,119,6,0.05)',
  },
  {
    name: 'محراب',
    from: '#1a0a0a', via: '#2a0f0f', to: '#150808',
    text: '#fef2f2', muted: '#dc2626', border: '#ef4444',
    glow: 'rgba(220,38,38,0.05)',
  },
];

/* ═══════════════ Sound ═══════════════ */
let audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext | null {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    return audioCtx;
  } catch { return null; }
}

function playClick(freq = 800, duration = 0.05) {
  const ctx = getAudioCtx(); if (!ctx) return;
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.frequency.value = freq; osc.type = 'sine';
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime); osc.stop(ctx.currentTime + duration);
}

function playComplete() {
  const ctx = getAudioCtx(); if (!ctx) return;
  [523, 659, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = freq; osc.type = 'sine';
    const t = ctx.currentTime + i * 0.15;
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.start(t); osc.stop(t + 0.3);
  });
}

/* ═══════════════ localStorage helper ═══════════════ */
function loadSetting<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(`tasbeeh_${key}`);
    return stored ? JSON.parse(stored) : fallback;
  } catch { return fallback; }
}
function saveSetting(key: string, value: number) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(`tasbeeh_${key}`, JSON.stringify(value)); } catch { /* */ }
}

/* ═══════════════ Bead ═══════════════ */
function Bead({
  index, state, size = 36, onClick, isFirst = false, theme,
}: {
  index: number; state: 'pending' | 'active' | 'done'; size?: number;
  onClick?: () => void; isFirst?: boolean; theme: ColorTheme;
}) {
  const colors: Record<string, { bg: string; shadow: string; highlight: string }> = {
    pending: {
      bg: theme.pending,
      shadow: `0 2px 6px rgba(0,0,0,0.5), inset 0 -3px 5px rgba(0,0,0,0.4), inset 0 2px 3px ${theme.highlight}`,
      highlight: theme.highlight,
    },
    active: {
      bg: theme.active,
      shadow: `0 0 20px ${theme.glow}, 0 0 40px ${theme.glow.replace('0.6','0.2')}, inset 0 -3px 5px rgba(0,0,0,0.3), inset 0 2px 3px rgba(255,255,255,0.2)`,
      highlight: 'rgba(255,255,255,0.35)',
    },
    done: {
      bg: theme.done,
      shadow: `0 2px 6px ${theme.doneGlow}, inset 0 -3px 5px rgba(0,0,0,0.3), inset 0 2px 3px rgba(255,255,255,0.15)`,
      highlight: 'rgba(255,255,255,0.25)',
    },
  };
  const c = colors[state];

  return (
    <div className="flex flex-col items-center">
      {isFirst && (
        <div className="rounded-full" style={{ width: 3, height: 20, background: 'linear-gradient(to bottom, #92400e, #b45309)', boxShadow: '0 0 2px rgba(180,83,9,0.3)' }} />
      )}
      {!isFirst && (
        <div className="rounded-full" style={{ width: 2.5, height: 6, background: 'linear-gradient(to bottom, #a16207, #ca8a04)', boxShadow: '0 0 2px rgba(202,138,4,0.2)' }} />
      )}
      <motion.button
        type="button" id={`bead-${index}`} onClick={onClick}
        whileTap={state === 'active' ? { scale: 0.85 } : undefined}
        className="relative rounded-full cursor-pointer select-none focus:outline-none"
        style={{ width: size, height: size, background: c.bg, boxShadow: c.shadow, transition: 'background 0.4s, box-shadow 0.4s' }}
        animate={state === 'active' ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={state === 'active' ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : {}}
      >
        <div className="absolute rounded-full pointer-events-none" style={{ width: size * 0.28, height: size * 0.2, top: size * 0.18, left: size * 0.22, background: c.highlight, filter: 'blur(1px)' }} />
        {state === 'done' && (
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-amber-900/60 pointer-events-none">{index + 1}</span>
        )}
        {state === 'active' && (
          <motion.div className="absolute inset-0 rounded-full border-2 pointer-events-none" style={{ borderColor: theme.glow }}
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </motion.button>
    </div>
  );
}

/* ═══════════════ Imam Bead (NO star) ═══════════════ */
function ImamBead({ active, done, theme }: { active?: boolean; done?: boolean; theme: SeparatorTheme }) {
  const size = 48;
  const bg = active ? theme.active : done ? theme.done : theme.pending;
  return (
    <div className="flex flex-col items-center">
      <div className="rounded-full" style={{ width: 2.5, height: 6, background: 'linear-gradient(to bottom, #a16207, #ca8a04)' }} />
      <div
        className="rounded-full"
        style={{
          width: size, height: size, background: bg,
          boxShadow: active
            ? `0 0 25px ${theme.glow}, inset 0 -3px 5px rgba(0,0,0,0.4), inset 0 2px 3px rgba(255,255,255,0.15)`
            : '0 2px 8px rgba(0,0,0,0.5), inset 0 -3px 5px rgba(0,0,0,0.4), inset 0 2px 3px rgba(255,255,255,0.1)',
        }}
      >
        {/* Only a specular highlight, NO star */}
        <div className="absolute rounded-full pointer-events-none" style={{ width: size * 0.3, height: size * 0.22, top: size * 0.16, left: size * 0.2, background: 'rgba(255,255,255,0.2)', filter: 'blur(1.5px)' }} />
      </div>
      <div className="rounded-full" style={{ width: 2.5, height: 8, background: 'linear-gradient(to bottom, #a16207, #ca8a04)' }} />
    </div>
  );
}

/* ═══════════════ Tassel ═══════════════ */
function Tassel() {
  return (
    <div className="flex flex-col items-center relative">
      <div className="rounded-full" style={{ width: 14, height: 14, background: 'radial-gradient(circle at 35% 30%, #ca8a04, #92400e)', boxShadow: '0 2px 4px rgba(0,0,0,0.4)' }} />
      <div style={{ width: 8, height: 12, background: 'linear-gradient(to bottom, #92400e, #b45309)', borderRadius: '0 0 4px 4px' }} />
      <div className="flex items-center justify-center" style={{ width: 30, gap: 2 }}>
        {[...Array(7)].map((_, i) => (
          <motion.div key={i} className="rounded-b-full"
            style={{ width: 2, height: 24 + (i % 3) * 3, background: `linear-gradient(to bottom, #b45309, #${['92400e','78350f','a16207','854d0e','92400e','78350f','a16207'][i]})`, borderRadius: '0 0 2px 2px' }}
            animate={{ rotate: [0, (i - 3) * 2, 0] }}
            transition={{ duration: 3 + i * 0.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }}
          />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ Settings Panel ═══════════════ */
function SettingsPanel({
  beadIdx, sepIdx, bgIdx,
  onBeadChange, onSepChange, onBgChange,
  onClose,
}: {
  beadIdx: number; sepIdx: number; bgIdx: number;
  onBeadChange: (i: number) => void; onSepChange: (i: number) => void; onBgChange: (i: number) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center"
    >
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md max-h-[75vh] rounded-t-3xl overflow-hidden"
        style={{ background: '#111', borderTop: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="overflow-y-auto px-5 pb-8 space-y-6" style={{ maxHeight: 'calc(75vh - 40px)' }}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">تخصيص المسبحة</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Bead Colors */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white/80">نوع حبات السبحة</p>
            <div className="grid grid-cols-4 gap-2">
              {BEAD_THEMES.map((theme, i) => (
                <button key={i} onClick={() => onBeadChange(i)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${i === beadIdx ? 'border-emerald-400 bg-emerald-400/10' : 'border-white/10 hover:border-white/20'}`}
                >
                  <div className="w-8 h-8 rounded-full" style={{ background: theme.pending, boxShadow: i === beadIdx ? `0 0 12px ${theme.glow}` : 'none' }} />
                  <span className="text-[10px] text-white/70 leading-tight text-center">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Separator Colors */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white/80">حبة الفاصل (الإمام)</p>
            <div className="flex flex-wrap gap-2">
              {SEPARATOR_THEMES.map((theme, i) => (
                <button key={i} onClick={() => onSepChange(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${i === sepIdx ? 'border-emerald-400 bg-emerald-400/10' : 'border-white/10 hover:border-white/20'}`}
                >
                  <div className="w-5 h-5 rounded-full" style={{ background: theme.pending, boxShadow: i === sepIdx ? `0 0 8px ${theme.glow}` : 'none' }} />
                  <span className="text-[11px] text-white/70">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Background */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white/80">لون الخلفية</p>
            <div className="flex flex-wrap gap-2">
              {BACKGROUND_THEMES.map((theme, i) => (
                <button key={i} onClick={() => onBgChange(i)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${i === bgIdx ? 'border-emerald-400 bg-emerald-400/10' : 'border-white/10 hover:border-white/20'}`}
                >
                  <div className="w-5 h-5 rounded-full border border-white/20" style={{ background: `linear-gradient(135deg, ${theme.from}, ${theme.via})` }} />
                  <span className="text-[11px] text-white/70">{theme.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════ Main Page ═══════════════ */
export default function TasbeehPage() {
  const [groups, setGroups] = useState<TasbeehGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [counter, setCounter] = useState(0);
  const [totalSessionCount, setTotalSessionCount] = useState(0);
  const [showGroups, setShowGroups] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Settings (persisted in localStorage)
  const [beadThemeIdx, setBeadThemeIdx] = useState(0);
  const [sepThemeIdx, setSepThemeIdx] = useState(0);
  const [bgThemeIdx, setBgThemeIdx] = useState(0);
  const settingsLoaded = useRef(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Load settings from localStorage
  useEffect(() => {
    setBeadThemeIdx(loadSetting('bead', 0));
    setSepThemeIdx(loadSetting('sep', 0));
    setBgThemeIdx(loadSetting('bg', 0));
    settingsLoaded.current = true;
  }, []);

  const handleBeadChange = (i: number) => { setBeadThemeIdx(i); saveSetting('bead', i); };
  const handleSepChange = (i: number) => { setSepThemeIdx(i); saveSetting('sep', i); };
  const handleBgChange = (i: number) => { setBgThemeIdx(i); saveSetting('bg', i); };

  const beadTheme = BEAD_THEMES[beadThemeIdx] || BEAD_THEMES[0];
  const sepTheme = SEPARATOR_THEMES[sepThemeIdx] || SEPARATOR_THEMES[0];
  const bgTheme = BACKGROUND_THEMES[bgThemeIdx] || BACKGROUND_THEMES[0];

  const vibrate = useCallback((pattern: number | number[] = 30) => {
    try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern); } catch { /* */ }
  }, []);

  const scrollActiveBead = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(`bead-${counter}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
        if (g.length > 0) setSelectedGroupId((prev) => prev || g[0].id);
      }
    } catch { /* */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasbeeh(); }, [fetchTasbeeh]);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      setTimeout(() => { const el = document.getElementById('bead-0'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);
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
    if (counter === 0) { playClick(1000, 0.08); setTimeout(() => playClick(1200, 0.1), 100); vibrate([50, 60, 100]); }
    else if (counter === maxCount - 1) { playClick(1000, 0.08); }
    else { playClick(800, 0.05); vibrate(25); }
    setScreenFlash(true); setTimeout(() => setScreenFlash(false), 150);
    setCounter((prev) => prev + 1);
    setTotalSessionCount((prev) => prev + 1);
  };

  useEffect(() => { if (isComplete && counter > 0) { playComplete(); vibrate([100, 50, 100, 50, 200, 50, 300]); } }, [isComplete, counter, vibrate]);

  const handleBeadTap = (beadIndex: number) => { if (beadIndex === counter) handleTap(); };
  const handleReset = () => setCounter(0);
  const handleResetAll = () => { setCounter(0); setTotalSessionCount(0); setSelectedItemIndex(0); };
  const handleNextItem = () => { if (!currentGroup) return; const n = selectedItemIndex + 1; if (n < currentGroup.items.length) { setSelectedItemIndex(n); setCounter(0); hasInitialized.current = false; } };
  const handlePrevItem = () => { if (selectedItemIndex > 0) { setSelectedItemIndex(selectedItemIndex - 1); setCounter(0); hasInitialized.current = false; } };
  const selectGroup = (id: string) => { setSelectedGroupId(id); setSelectedItemIndex(0); setCounter(0); hasInitialized.current = false; setShowGroups(false); };

  useEffect(() => {
    if (isComplete && currentItem && currentGroup) {
      const t = setTimeout(() => { const n = selectedItemIndex + 1; if (n < currentGroup.items.length) { setSelectedItemIndex(n); setCounter(0); hasInitialized.current = false; } }, 2000);
      return () => clearTimeout(t);
    }
  }, [isComplete, currentItem, currentGroup, selectedItemIndex]);

  // Build segments
  const segments: number[] = [];
  let rem = maxCount;
  while (rem > 0) { if (rem > 11) { segments.push(11); rem -= 11; } else { segments.push(rem); rem = 0; } }
  const segOffsets: number[] = [];
  segments.reduce((acc, seg, i) => { segOffsets[i] = acc; return acc + seg; }, 0);

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden relative" style={{ background: `linear-gradient(to bottom, ${bgTheme.from}, ${bgTheme.via}, ${bgTheme.to})` }}>
      {/* Screen flash */}
      <AnimatePresence>
        {screenFlash && (
          <motion.div initial={{ opacity: 0.15 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
            className="absolute inset-0 pointer-events-none z-30" style={{ background: beadTheme.glow }} />
        )}
      </AnimatePresence>

      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-[100px] pointer-events-none" style={{ background: bgTheme.glow }} />

      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 backdrop-blur-xl" style={{ background: `${bgTheme.from}cc`, borderBottom: `1px solid ${bgTheme.border}15` }}>
        <button onClick={() => window.history.back()} className="p-2 rounded-full hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5" style={{ color: bgTheme.text }} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold flex items-center gap-2" style={{ color: bgTheme.text }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0" style={{ color: bgTheme.muted }}>
              <circle cx="12" cy="6" r="3" fill="currentColor" opacity="0.8" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
              <circle cx="12" cy="18" r="3" fill="currentColor" opacity="0.8" />
              <line x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            </svg>
            <span>المسبحة</span>
          </h1>
          <p className="text-[10px]" style={{ color: `${bgTheme.muted}99` }}>
            {currentGroup ? currentGroup.name : 'السبحة الإلكترونية'}
          </p>
        </div>
        {/* Settings button */}
        <button onClick={() => setShowSettings(true)} className="p-2 rounded-full hover:bg-white/5 transition-colors">
          <Settings className="w-5 h-5" style={{ color: bgTheme.muted }} />
        </button>
        {groups.length > 1 && (
          <button onClick={() => setShowGroups(!showGroups)} className="p-2 rounded-full hover:bg-white/5 transition-colors">
            <ChevronDown className={`w-5 h-5 transition-transform ${showGroups ? 'rotate-180' : ''}`} style={{ color: bgTheme.muted }} />
          </button>
        )}
      </div>

      {/* Group Selector */}
      <AnimatePresence>
        {showGroups && groups.length > 1 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden shrink-0 backdrop-blur-sm z-40" style={{ background: `${bgTheme.from}f2`, borderBottom: `1px solid ${bgTheme.border}15` }}>
            <div className="px-4 py-2 space-y-1 max-h-[200px] overflow-y-auto">
              {groups.map((group) => (
                <button key={group.id} onClick={() => selectGroup(group.id)}
                  className={`w-full text-right p-3 rounded-xl transition-colors ${group.id === selectedGroupId ? `border ${bgTheme.border}30` : 'border border-transparent'}`}
                  style={{ background: group.id === selectedGroupId ? `${bgTheme.border}15` : 'transparent', color: group.id === selectedGroupId ? bgTheme.muted : bgTheme.text }}>
                  <p className="text-xs font-semibold">{group.name}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: `${bgTheme.muted}99` }}>{group.items.length} تسبيحة فرعية</p>
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
            <motion.div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: `${bgTheme.muted}40`, borderTopColor: bgTheme.muted }} />
            <p className="text-sm" style={{ color: bgTheme.muted }}>جارٍ التحميل...</p>
          </div>
        ) : !currentGroup || groupItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `${bgTheme.muted}15` }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ color: `${bgTheme.muted}50` }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" /><circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.3" />
              </svg>
            </div>
            <p className="text-sm" style={{ color: bgTheme.muted }}>لا توجد تسبيحات متاحة حالياً</p>
          </div>
        ) : (
          <>
            {/* Dhikr Text */}
            <div className="shrink-0 text-center space-y-2 px-4 pt-4 pb-2">
              <p className="text-[10px] font-medium tracking-wider uppercase" style={{ color: `${bgTheme.muted}99` }}>{currentGroup.name}</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={handlePrevItem} disabled={selectedItemIndex === 0} className="p-1.5 rounded-full hover:bg-white/5 disabled:opacity-20 transition-colors">
                  <ChevronRight className="w-5 h-5" style={{ color: bgTheme.text }} />
                </button>
                <div className="flex-1 text-center min-w-0 max-w-xs">
                  <AnimatePresence mode="wait">
                    <motion.p key={`${selectedGroupId}-${selectedItemIndex}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                      className="text-2xl font-bold leading-relaxed" style={{ color: bgTheme.text, textShadow: `0 0 20px ${bgTheme.muted}40` }}>
                      {currentItem?.text}
                    </motion.p>
                  </AnimatePresence>
                  {currentItem?.description && <p className="text-[10px] mt-1" style={{ color: `${bgTheme.muted}70` }}>{currentItem.description}</p>}
                </div>
                <button onClick={handleNextItem} disabled={selectedItemIndex >= groupItems.length - 1} className="p-1.5 rounded-full hover:bg-white/5 disabled:opacity-20 transition-colors">
                  <ChevronLeft className="w-5 h-5" style={{ color: bgTheme.text }} />
                </button>
              </div>
              {groupItems.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  {groupItems.map((_, idx) => (
                    <button key={idx} onClick={() => { setSelectedItemIndex(idx); setCounter(0); hasInitialized.current = false; }}
                      className="rounded-full transition-all" style={{ background: idx === selectedItemIndex ? bgTheme.muted : idx < selectedItemIndex ? '#f59e0b60' : `${bgTheme.muted}30`, width: idx === selectedItemIndex ? 24 : 8, height: 8 }} />
                  ))}
                </div>
              )}
            </div>

            {/* ──── THE ROSARY ──── */}
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-0">
              {/* Counter badge */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-sm shrink-0" style={{ background: `${bgTheme.from}cc`, border: `1px solid ${bgTheme.border}20` }}>
                <span className="text-lg font-black tabular-nums" style={{ color: bgTheme.muted }}>{counter}</span>
                <span className="text-[10px]" style={{ color: `${bgTheme.muted}99` }}>من {maxCount}</span>
                <div className="w-8 h-1 rounded-full overflow-hidden" style={{ background: `${bgTheme.muted}20` }}>
                  <motion.div className="h-full rounded-full" style={{ background: isComplete ? '#f59e0b' : bgTheme.muted }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.3 }} />
                </div>
              </div>

              {/* Scrollable beads */}
              <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden py-8 px-4 scrollbar-hide min-h-0">
                <div className="flex flex-col items-center cursor-pointer" onClick={handleTap} style={{ minHeight: '100%' }}>
                  <div className="rounded-full mb-1" style={{ width: 16, height: 8, background: 'linear-gradient(to bottom, #ca8a04, #92400e)', boxShadow: '0 2px 4px rgba(0,0,0,0.3)', borderRadius: '8px 8px 0 0' }} />

                  {segments.map((segCount, segIdx) => (
                    <div key={segIdx} className="flex flex-col items-center relative">
                      {segIdx > 0 && <ImamBead active={counter === segOffsets[segIdx]} done={counter > segOffsets[segIdx]} theme={sepTheme} />}
                      {Array.from({ length: segCount }).map((_, beadLocalIdx) => {
                        const gIdx = segOffsets[segIdx] + beadLocalIdx;
                        const st = gIdx < counter ? 'done' as const : gIdx === counter ? 'active' as const : 'pending' as const;
                        return (
                          <Bead key={gIdx} index={gIdx} state={st} size={gIdx === counter ? 40 : 36} theme={beadTheme}
                            onClick={(e) => { e.stopPropagation(); handleBeadTap(gIdx); }}
                            isFirst={segIdx === 0 && beadLocalIdx === 0} />
                        );
                      })}
                    </div>
                  ))}

                  <ImamBead active={isComplete} done={isComplete} theme={sepTheme} />
                  <Tassel />
                </div>
              </div>

              {/* Completion overlay */}
              <AnimatePresence>
                {isComplete && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className="flex flex-col items-center gap-2 px-8 py-5 rounded-2xl backdrop-blur-lg" style={{ background: `${bgTheme.from}e6`, border: '1px solid #f59e0b40' }}>
                      <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}>
                        <CheckCircle2 className="w-10 h-10 text-amber-400" />
                      </motion.div>
                      <span className="text-lg font-bold" style={{ color: bgTheme.text }}>تم بحمد الله</span>
                      <span className="text-[10px]" style={{ color: `${bgTheme.muted}99` }}>
                        {groupItems.length > 1 && selectedItemIndex < groupItems.length - 1 ? 'الانتقال للتسبيحة التالية...' : 'أحسنت! بارك الله فيك'}
                      </span>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Controls */}
            <div className="shrink-0 px-4 pb-6 pt-3 space-y-3" style={{ background: `linear-gradient(to top, ${bgTheme.to}, ${bgTheme.to}f2, transparent)` }}>
              <div className="w-full max-w-md mx-auto">
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: `${bgTheme.muted}15` }}>
                  <motion.div className="h-full rounded-full"
                    style={{ background: isComplete ? 'linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b)' : `linear-gradient(90deg, ${bgTheme.muted}cc, ${bgTheme.border})` }}
                    animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.3 }} />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[10px]" style={{ color: `${bgTheme.muted}99` }}>
                  <span>التسبيحة {selectedItemIndex + 1} من {groupItems.length}</span>
                  <span className="tabular-nums">{progressPercent}%</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3">
                <motion.button whileTap={{ scale: 0.92 }} onClick={handleReset} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-colors" style={{ background: `${bgTheme.muted}10`, border: `1px solid ${bgTheme.muted}20` }}>
                  <RotateCcw className="w-4 h-4" style={{ color: bgTheme.muted }} />
                  <span className="text-xs" style={{ color: bgTheme.muted }}>إعادة</span>
                </motion.button>
                <motion.button whileTap={{ scale: 0.9 }} onClick={handleTap} disabled={isComplete} className="flex items-center justify-center w-16 h-16 rounded-full transition-all"
                  style={{ background: isComplete ? 'linear-gradient(135deg, #f59e0b, #d97706)' : `linear-gradient(135deg, ${bgTheme.muted}cc, ${bgTheme.border})`, boxShadow: `0 0 30px ${isComplete ? 'rgba(245,158,11,0.4)' : bgTheme.glow}` }}>
                  <span className="text-xl font-black text-white tabular-nums">{counter}</span>
                </motion.button>
                <motion.button whileTap={{ scale: 0.92 }} onClick={handleResetAll} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition-colors" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <RotateCcw className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-red-400">إعادة الكل</span>
                </motion.button>
              </div>

              {totalSessionCount > 0 && (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[10px]" style={{ color: `${bgTheme.muted}80` }}>
                    إجمالي الجلسة: <span className="font-bold tabular-nums" style={{ color: bgTheme.muted }}>{totalSessionCount}</span> تسبيحة
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <SettingsPanel
            beadIdx={beadThemeIdx} sepIdx={sepThemeIdx} bgIdx={bgThemeIdx}
            onBeadChange={handleBeadChange} onSepChange={handleSepChange} onBgChange={handleBgChange}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
