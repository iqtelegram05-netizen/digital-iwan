'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { useTheme } from 'next-themes';
import { useTranslation } from '@/i18n/useTranslation';

const LOGO_URL = 'https://www.image2url.com/r2/default/images/1777330045986-560b3c15-7c7b-4c2f-af23-6499ce631950.png';

const ISLAMIC_SYMBOLS = ['☪', '﷽', '✦', '◆', '⬡', '✧', '◈', '✶', '◕', '⬢'];

// Deterministic pseudo-random using seed (avoids hydration mismatch)
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

// Pre-computed shapes with deterministic values (no Math.random at module level)
const floatingShapes = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  type: (['circle', 'hexagon', 'triangle', 'diamond'] as const)[i % 4],
  startX: (seededRandom(i * 4) - 0.5) * 250,
  startY: (seededRandom(i * 4 + 1) - 0.5) * 250,
  size: 12 + seededRandom(i * 4 + 2) * 40,
  delay: seededRandom(i * 4 + 3) * 2,
}));

export default function SplashScreen() {
  const { splashComplete, setSplashComplete } = useAppStore();
  const { resolvedTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = resolvedTheme === 'dark';
  const [mounted, setMounted] = useState(false);

  // Only render random-dependent content on client to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-compute particles deterministically
  const particles = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => ({
      width: 2 + seededRandom(i * 5) * 5,
      height: 2 + seededRandom(i * 5 + 1) * 5,
      left: 5 + seededRandom(i * 5 + 2) * 90,
      top: 5 + seededRandom(i * 5 + 3) * 90,
      yEnd: 80 + seededRandom(i * 5 + 4) * 80,
      xStart: (seededRandom(i * 3) - 0.5) * 50,
      xEnd: (seededRandom(i * 3 + 1) - 0.5) * 70,
      duration: 2.5 + seededRandom(i * 2) * 2,
      delay: 0.2 + seededRandom(i * 2 + 1) * 1.5,
      repeatDelay: seededRandom(i) * 1.5,
    })),
  []
  );

  const islamicSymbols = useMemo(() =>
    ISLAMIC_SYMBOLS.map((symbol, i) => ({
      symbol,
      fontSize: 1.5 + seededRandom(i * 3) * 2,
      left: 5 + seededRandom(i * 3 + 1) * 90,
      duration: 6 + seededRandom(i * 3 + 2) * 6,
      repeatDelay: seededRandom(i) * 3,
    })),
  []
  );

  // Dynamic colors based on theme
  const particleColor = isDark ? 'bg-sky-500' : 'bg-sky-500';
  const symbolColor = isDark ? 'text-sky-500/10' : 'text-sky-500/8';
  const glowColor = isDark
    ? 'radial-gradient(circle, rgba(14,165,233,0.35) 0%, rgba(14,165,233,0.1) 40%, transparent 70%)'
    : 'radial-gradient(circle, rgba(14,165,233,0.25) 0%, rgba(14,165,233,0.08) 40%, transparent 70%)';
  const ringColor = isDark ? 'border-sky-500/10' : 'border-sky-500/15';
  const titleColor = isDark ? 'text-sky-400' : 'text-sky-600';
  const subtitleColor = isDark ? 'text-sky-300/60' : 'text-sky-700/60';
  const glowTextClass = isDark ? 'sky-glow-text' : '';
  const bgColor = isDark ? 'bg-[#050505]' : 'bg-gradient-to-br from-sky-50 via-white to-sky-50';
  const spinnerBorder = isDark ? 'border-sky-500/30 border-t-sky-500' : 'border-sky-400/30 border-t-sky-500';

  return (
    <AnimatePresence>
      {!splashComplete && (
        <motion.div
          className={`fixed inset-0 z-[100] flex items-center justify-center ${bgColor} overflow-hidden`}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          {/* Particles */}
          {mounted && particles.map((p, i) => (
            <motion.div
              key={`particle-${i}`}
              className={`absolute rounded-full ${particleColor}`}
              style={{
                width: p.width,
                height: p.height,
                left: `${p.left}%`,
                top: `${p.top}%`,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 0.8, 0],
                scale: [0, 1, 0],
                y: [0, -p.yEnd],
                x: [p.xStart, p.xEnd],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                repeatDelay: p.repeatDelay,
              }}
            />
          ))}

          {/* Islamic floating symbols during splash */}
          {mounted && islamicSymbols.map((item, i) => (
            <motion.span
              key={`islamic-${i}`}
              className={`absolute ${symbolColor} select-none`}
              style={{
                fontSize: `${item.fontSize}rem`,
                left: `${item.left}%`,
              }}
              initial={{ y: '100vh', opacity: 0, rotate: 0 }}
              animate={{
                y: '-100px',
                opacity: [0, 0.08, 0.08, 0],
                rotate: 360,
              }}
              transition={{
                duration: item.duration,
                delay: 0.5 + i * 0.4,
                repeat: Infinity,
                repeatDelay: item.repeatDelay,
                ease: 'linear',
              }}
            >
              {item.symbol}
            </motion.span>
          ))}

          {/* Geometric shapes flowing from edges to center */}
          {floatingShapes.map((shape) => (
            <motion.div
              key={shape.id}
              className={`absolute geo-shape ${
                shape.type === 'circle'
                  ? 'geo-circle'
                  : shape.type === 'hexagon'
                  ? 'geo-hexagon'
                  : shape.type === 'diamond'
                  ? 'geo-circle'
                  : 'geo-triangle'
              }`}
              style={{
                width: shape.size,
                height: shape.size,
                clipPath: shape.type === 'diamond'
                  ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
                  : undefined,
              }}
              initial={{
                x: shape.startX * 3,
                y: shape.startY * 3,
                opacity: 0,
                scale: 0.5,
              }}
              animate={{
                x: shape.startX * 0.3,
                y: shape.startY * 0.3,
                opacity: 0.25,
                scale: 1,
                rotate: 360,
              }}
              transition={{
                duration: 2.5,
                delay: shape.delay,
                ease: 'easeInOut',
              }}
            />
          ))}

          {/* Central glow */}
          <motion.div
            className="absolute w-56 h-56 rounded-full"
            style={{ background: glowColor }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 2.2, 1.5], opacity: [0, 0.9, 0.6] }}
            transition={{ duration: 2.5, delay: 1, ease: 'easeOut' }}
          />

          {/* Secondary glow ring */}
          <motion.div
            className={`absolute w-72 h-72 rounded-full border ${ringColor}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.5, 1.2], opacity: [0, 0.3, 0.15], rotate: 180 }}
            transition={{ duration: 3, delay: 1.2, ease: 'easeOut' }}
          />

          {/* Logo */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-4"
            initial={{ opacity: 0, scale: 0.5, filter: 'blur(20px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 1.2, delay: 2, ease: 'easeOut' }}
          >
            <motion.img
              src={LOGO_URL}
              alt="Qalam Code"
              className="w-72 h-72 sm:w-[360px] sm:h-[360px] object-contain"
              animate={{ rotate: [0, 2, -2, 0] }}
              transition={{ duration: 4, delay: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.h1
              className={`text-2xl sm:text-3xl font-bold ${titleColor} ${glowTextClass}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.5, duration: 0.8 }}
            >
              {t('app.title')}
            </motion.h1>
            <motion.p
              className={`${subtitleColor} text-sm`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3, duration: 0.6 }}
            >
              {t('app.subtitle')}
            </motion.p>
          </motion.div>

          {/* Auto-transition timer */}
          <motion.div
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.2, duration: 0.5 }}
          >
            <motion.div
              className={`w-12 h-12 border-2 ${spinnerBorder} rounded-full animate-spin-slow`}
              onAnimationComplete={() => setSplashComplete(true)}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
