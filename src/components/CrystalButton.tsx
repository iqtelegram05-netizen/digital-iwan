'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BurstParticle {
  id: number;
  x: number;
  y: number;
  shape: 'hexagon' | 'diamond' | 'circle';
  size: number;
  angle: number;
  distance: number;
  color: string;
}

const COLORS = ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#059669'];

function getShapeClip(shape: 'hexagon' | 'diamond' | 'circle') {
  switch (shape) {
    case 'hexagon':
      return 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
    case 'diamond':
      return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
    case 'circle':
      return 'circle(50%)';
  }
}

interface CrystalButtonProps extends React.ComponentProps<typeof Button> {
  children: React.ReactNode;
}

export default function CrystalButton({ children, className, onClick, ...props }: CrystalButtonProps) {
  const [particles, setParticles] = useState<BurstParticle[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const nextId = useRef(0);

  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const shapes: Array<'hexagon' | 'diamond' | 'circle'> = ['hexagon', 'diamond', 'circle'];
    const newParticles: BurstParticle[] = Array.from({ length: 10 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.5;
      const distance = 30 + Math.random() * 50;
      return {
        id: nextId.current++,
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        size: 4 + Math.random() * 8,
        angle,
        distance,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    });

    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.find((np) => np.id === p.id)));
    }, 900);
    onClick?.(e);
  }, [onClick]);

  return (
    <div className="relative inline-block perspective-3d">
      <Button
        ref={buttonRef}
        className={cn(
          'relative overflow-hidden transition-all duration-300 btn-3d',
          className
        )}
        onClick={handleClick}
        {...props}
      >
        <motion.span
          className="relative z-10 flex items-center justify-center gap-2"
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
        >
          {children}
        </motion.span>
        {/* Shine effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full"
          whileHover={{ translateX: '200%' }}
          transition={{ duration: 0.6 }}
        />
        {/* Edge glow on hover */}
        <motion.div
          className="absolute inset-0 rounded-[inherit] opacity-0"
          style={{
            boxShadow: 'inset 0 0 20px rgba(16,185,129,0.2), 0 0 15px rgba(16,185,129,0.15)',
          }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      </Button>

      {/* Burst particles */}
      <AnimatePresence>
        {particles.map((p) => {
          const endX = Math.cos(p.angle) * p.distance;
          const endY = Math.sin(p.angle) * p.distance;
          return (
            <motion.div
              key={p.id}
              className="absolute pointer-events-none crystal-burst-particle"
              style={{
                left: p.x - p.size / 2,
                top: p.y - p.size / 2,
                width: p.size,
                height: p.size,
                background: p.color,
                clipPath: getShapeClip(p.shape),
                '--burst-x': `${endX}px`,
                '--burst-y': `${endY}px`,
              } as React.CSSProperties}
              initial={{ scale: 1.2, opacity: 1, rotate: 0 }}
              animate={{ scale: 0, opacity: 0, rotate: 720, x: endX, y: endY }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.75, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
