'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/i18n/useTranslation';

export default function QiblaCompass() {
  const [direction, setDirection] = useState<number | null>(null);
  const [bearing, setBearing] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t, tSection } = useTranslation();

  const compassLabels = tSection('qibla.compassLabels') as string[];

  const getBearingName = (deg: number): string => {
    if (deg >= 337.5 || deg < 22.5) return t('qibla.north');
    if (deg >= 22.5 && deg < 67.5) return t('qibla.northEast');
    if (deg >= 67.5 && deg < 112.5) return t('qibla.east');
    if (deg >= 112.5 && deg < 157.5) return t('qibla.southEast');
    if (deg >= 157.5 && deg < 202.5) return t('qibla.south');
    if (deg >= 202.5 && deg < 247.5) return t('qibla.southWest');
    if (deg >= 247.5 && deg < 292.5) return t('qibla.west');
    return t('qibla.northWest');
  };

  const calculateQibla = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const { latitude, longitude } = position.coords;

      const res = await fetch('/api/qibla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude }),
      });

      const data = await res.json();
      setDirection(data.direction);
      setBearing(getBearingName(data.direction));
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        setError(t('qibla.locationError'));
      } else {
        setError(t('qibla.calculationError'));
      }
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    calculateQibla();
  }, [calculateQibla]);

  const compassDeg = direction !== null ? direction : 0;

  const labels = compassLabels.length === 4 ? compassLabels : ['N', 'E', 'S', 'W'];

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Compass */}
      <div className="relative w-56 h-56 sm:w-64 sm:h-64">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-3 border-primary/20" />
        <div className="absolute inset-2 rounded-full border border-primary/10" />

        {/* Direction marks */}
        {labels.map((label, i) => {
          const angle = i * 90;
          return (
            <div
              key={label}
              className="absolute text-xs font-bold text-primary/60"
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${angle}deg) translateY(-45%) translateX(-50%)`,
                transformOrigin: '0 0',
              }}
            >
              {label}
            </div>
          );
        })}

        {/* Tick marks */}
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = i * 10;
          const isMain = i % 9 === 0;
          return (
            <div
              key={`tick-${i}`}
              className="absolute top-0 left-1/2 -translate-x-1/2"
              style={{
                height: isMain ? '10px' : '5px',
                width: isMain ? '2px' : '1px',
                background: isMain ? '#0ea5e9' : 'rgba(14,165,233,0.3)',
                transformOrigin: '50% 112px',
                transform: `rotate(${angle}deg)`,
              }}
            />
          );
        })}

        {/* Center dot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary/50" />

        {/* Qibla needle */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[100%] compass-needle"
          style={{ width: '4px', height: '40%' }}
          animate={{ rotate: compassDeg }}
          transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="w-full h-1/2 rounded-full bg-gradient-to-b from-yellow-500 to-primary" />
          <div className="w-full h-1/2 rounded-full bg-primary/30" />
        </motion.div>

        {/* Kaaba icon at center top */}
        <motion.div
          className="absolute top-3 left-1/2 -translate-x-1/2 text-lg"
          animate={{ rotate: compassDeg }}
          transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
        >
          🕋
        </motion.div>
      </div>

      {/* Direction Info */}
      {direction !== null && (
        <motion.div
          className="text-center space-y-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-3xl font-bold text-primary sky-glow-text">{Math.round(direction)}°</p>
          <p className="text-sm text-muted-foreground">{bearing}</p>
        </motion.div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-primary text-sm">
          <motion.div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin-slow" />
          {t('qibla.calculating')}
        </div>
      )}

      {error && (
        <div className="text-center">
          <p className="text-destructive text-sm mb-3">{error}</p>
          <button
            onClick={calculateQibla}
            className="text-primary text-sm underline hover:text-primary/80"
          >
            {t('qibla.retry')}
          </button>
        </div>
      )}
    </div>
  );
}
