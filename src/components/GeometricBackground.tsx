'use client';

import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

interface GeoShape {
  id: number;
  type: 'circle' | 'hexagon' | 'triangle' | 'diamond' | 'star';
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
  depthFactor: number;
}

export default function GeometricBackground() {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);

  const shapes = useMemo<GeoShape[]>(() => {
    const arr: GeoShape[] = [];
    const types: Array<'circle' | 'hexagon' | 'triangle' | 'diamond' | 'star'> = [
      'circle', 'hexagon', 'triangle', 'diamond', 'star',
    ];
    for (let i = 0; i < 20; i++) {
      arr.push({
        id: i,
        type: types[i % types.length],
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 15 + Math.random() * 65,
        delay: Math.random() * 5,
        duration: 6 + Math.random() * 10,
        opacity: 0.04 + Math.random() * 0.1,
        depthFactor: 1 + Math.floor(Math.random() * 4),
      });
    }
    return arr;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const shapeElements = containerRef.current.querySelectorAll<HTMLElement>('.parallax-shape');
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      shapeElements.forEach((shape) => {
        const factor = parseFloat(shape.dataset.depth || '5');
        shape.style.transform = `translate(${dx * factor}px, ${dy * factor}px)`;
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const isDark = resolvedTheme === 'dark';

  const getShapeClass = (type: GeoShape['type']) => {
    switch (type) {
      case 'circle': return 'geo-circle';
      case 'hexagon': return 'geo-hexagon';
      case 'triangle': return 'geo-triangle';
      case 'diamond':
        return 'geo-circle'; // reuse and apply diamond clip via style
      case 'star':
        return 'geo-hexagon'; // reuse and apply star clip via style
      default:
        return 'geo-circle';
    }
  };

  const getClipPath = (type: GeoShape['type']) => {
    switch (type) {
      case 'diamond':
        return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
      case 'star':
        return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
      default:
        return undefined;
    }
  };

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {shapes.map((shape) => (
        <motion.div
          key={shape.id}
          className={`parallax-shape absolute geo-shape geo-shimmer ${getShapeClass(shape.type)}`}
          data-depth={shape.depthFactor * 6}
          style={{
            left: `${shape.x}%`,
            top: `${shape.y}%`,
            width: shape.size,
            height: shape.size,
            opacity: shape.opacity,
            borderColor: isDark ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.2)',
            animationDelay: `${shape.delay}s`,
            animationDuration: `${shape.duration}s`,
            clipPath: getClipPath(shape.type),
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: shape.opacity }}
          transition={{ delay: shape.delay * 0.5, duration: 1.5, ease: 'easeOut' }}
        />
      ))}
      {/* Gradient overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/10 via-transparent to-background/10" />
    </div>
  );
}
