'use client';

import { useMemo } from 'react';

interface IslamicSymbol {
  id: number;
  symbol: string;
  left: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

const ISLAMIC_SYMBOLS = [
  '☪', '﷽', '✦', '◆', '✧', '⬡', '◇', '✶', '❖', '✴',
  '◕', '◈', '⬢', '✺', '✹', '⬣', '⬟', '✻', '✽', '✾',
];

export default function IslamicPatternBg() {
  const symbols = useMemo<IslamicSymbol[]>(() => {
    const arr: IslamicSymbol[] = [];
    for (let i = 0; i < 18; i++) {
      arr.push({
        id: i,
        symbol: ISLAMIC_SYMBOLS[i % ISLAMIC_SYMBOLS.length],
        left: Math.random() * 100,
        size: 1.2 + Math.random() * 2.2,
        duration: 18 + Math.random() * 25,
        delay: Math.random() * 20,
        opacity: 0.03 + Math.random() * 0.05,
      });
    }
    return arr;
  }, []);

  return (
    <div className="islamic-pattern-bg" aria-hidden="true">
      {symbols.map((s) => (
        <span
          key={s.id}
          className="islamic-pattern-symbol"
          style={{
            left: `${s.left}%`,
            bottom: '-3rem',
            fontSize: `${s.size}rem`,
            animationDuration: `${s.duration}s`,
            animationDelay: `${s.delay}s`,
            opacity: s.opacity,
          }}
        >
          {s.symbol}
        </span>
      ))}
    </div>
  );
}
