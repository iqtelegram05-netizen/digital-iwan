'use client';

import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

interface GeoShape {
  id: number;
  type: 'circle' | 'hexagon' | 'triangle';
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}

export default function GeometricBackground() {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  const shapes = useMemo<GeoShape[]>(() => {
    const arr: GeoShape[] = [];
    for (let i = 0; i < 15; i++) {
      arr.push({
        id: i,
        type: (['circle', 'hexagon', 'triangle'] as const)[i % 3],
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 20 + Math.random() * 60,
        delay: Math.random() * 5,
        duration: 6 + Math.random() * 8,
        opacity: 0.06 + Math.random() * 0.12,
      });
    }
    return arr;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const shapes = containerRef.current.querySelectorAll<HTMLElement>('.parallax-shape');
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      shapes.forEach((shape, i) => {
        const factor = (i % 3 + 1) * 5;
        shape.style.transform = `translate(${dx * factor}px, ${dy * factor}px)`;
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const isDark = resolvedTheme === 'dark';

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {shapes.map((shape) => (
        <motion.div
          key={shape.id}
          className={`parallax-shape absolute geo-shape ${
            shape.type === 'circle' ? 'geo-circle' : shape.type === 'hexagon' ? 'geo-hexagon' : 'geo-triangle'
          }`}
          style={{
            left: `${shape.x}%`,
            top: `${shape.y}%`,
            width: shape.size,
            height: shape.size,
            opacity: shape.opacity,
            borderColor: isDark ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.2)',
            animationDelay: `${shape.delay}s`,
            animationDuration: `${shape.duration}s`,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: shape.opacity }}
          transition={{ delay: shape.delay * 0.5, duration: 1.5, ease: 'easeOut' }}
        />
      ))}
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/30" />
    </div>
  );
}
