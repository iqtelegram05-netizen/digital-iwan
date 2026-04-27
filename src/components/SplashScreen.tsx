'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';

const LOGO_URL = 'https://www.image2url.com/r2/default/images/1777330045986-560b3c15-7c7b-4c2f-af23-6499ce631950.png';

const ISLAMIC_SYMBOLS = ['☪', '﷽', '✦', '◆', '⬡', '✧', '◈', '✶', '◕', '⬢'];

const floatingShapes = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  type: (['circle', 'hexagon', 'triangle', 'diamond'] as const)[i % 4],
  startX: (Math.random() - 0.5) * 250,
  startY: (Math.random() - 0.5) * 250,
  size: 12 + Math.random() * 40,
  delay: Math.random() * 2,
}));

export default function SplashScreen() {
  const { splashComplete, setSplashComplete } = useAppStore();

  return (
    <AnimatePresence>
      {!splashComplete && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505] overflow-hidden"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          {/* Green particles */}
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={`particle-${i}`}
              className="absolute rounded-full bg-emerald-500"
              style={{
                width: 2 + Math.random() * 5,
                height: 2 + Math.random() * 5,
                left: `${5 + Math.random() * 90}%`,
                top: `${5 + Math.random() * 90}%`,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: [0, 0.8, 0],
                scale: [0, 1, 0],
                y: [0, -80 - Math.random() * 80],
                x: [(Math.random() - 0.5) * 50, (Math.random() - 0.5) * 70],
              }}
              transition={{
                duration: 2.5 + Math.random() * 2,
                delay: 0.2 + Math.random() * 1.5,
                repeat: Infinity,
                repeatDelay: Math.random() * 1.5,
              }}
            />
          ))}

          {/* Islamic floating symbols during splash */}
          {ISLAMIC_SYMBOLS.map((symbol, i) => (
            <motion.span
              key={`islamic-${i}`}
              className="absolute text-emerald-500/10 select-none"
              style={{
                fontSize: `${1.5 + Math.random() * 2}rem`,
                left: `${5 + Math.random() * 90}%`,
              }}
              initial={{ y: '100vh', opacity: 0, rotate: 0 }}
              animate={{
                y: '-100px',
                opacity: [0, 0.08, 0.08, 0],
                rotate: 360,
              }}
              transition={{
                duration: 6 + Math.random() * 6,
                delay: 0.5 + i * 0.4,
                repeat: Infinity,
                repeatDelay: Math.random() * 3,
                ease: 'linear',
              }}
            >
              {symbol}
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
            style={{
              background: 'radial-gradient(circle, rgba(16,185,129,0.35) 0%, rgba(16,185,129,0.1) 40%, transparent 70%)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 2.2, 1.5], opacity: [0, 0.9, 0.6] }}
            transition={{ duration: 2.5, delay: 1, ease: 'easeOut' }}
          />

          {/* Secondary glow ring */}
          <motion.div
            className="absolute w-72 h-72 rounded-full border border-emerald-500/10"
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
              alt="قلم كود"
              className="w-28 h-28 sm:w-36 sm:h-36 object-contain"
              animate={{ rotate: [0, 2, -2, 0] }}
              transition={{ duration: 4, delay: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.h1
              className="text-2xl sm:text-3xl font-bold text-emerald-400 green-glow-text"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.5, duration: 0.8 }}
            >
              قلم كود
            </motion.h1>
            <motion.p
              className="text-emerald-300/60 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 3, duration: 0.6 }}
            >
              المساعد الذكي للعلوم الإسلامية
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
              className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin-slow"
              onAnimationComplete={() => setSplashComplete(true)}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
