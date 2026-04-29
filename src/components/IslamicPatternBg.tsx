'use client';

import { useMemo, useState, useEffect } from 'react';

// Deterministic pseudo-random using seed (avoids hydration mismatch)
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const symbols = useMemo<IslamicSymbol[]>(() => {
    const arr: IslamicSymbol[] = [];
    for (let i = 0; i < 18; i++) {
      arr.push({
        id: i,
        symbol: ISLAMIC_SYMBOLS[i % ISLAMIC_SYMBOLS.length],
        left: seededRandom(i * 5) * 100,
        size: 1.2 + seededRandom(i * 5 + 1) * 2.2,
        duration: 18 + seededRandom(i * 5 + 2) * 25,
        delay: seededRandom(i * 5 + 3) * 20,
        opacity: 0.03 + seededRandom(i * 5 + 4) * 0.05,
      });
    }
    return arr;
  }, []);

  return (
    <div className="islamic-pattern-bg" aria-hidden="true">
      {mounted && symbols.map((s) => (
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
