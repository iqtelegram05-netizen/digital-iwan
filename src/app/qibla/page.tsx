'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Navigation, MapPin, Loader2, RefreshCw } from 'lucide-react';

// ========== Qibla Calculation ==========
function calculateQibla(lat: number, lng: number): number {
  const phiK = 21.4225 * Math.PI / 180;   // Mecca latitude in radians
  const lambdaK = 39.8262 * Math.PI / 180;  // Mecca longitude in radians
  const phiP = lat * Math.PI / 180;         // User latitude
  const lambdaP = lng * Math.PI / 180;      // User longitude

  const y = Math.sin(lambdaK - lambdaP);
  const x = Math.cos(phiP) * Math.tan(phiK) - Math.sin(phiP) * Math.cos(lambdaK - lambdaP);

  let qiblaAngle = Math.atan2(y, x) * 180 / Math.PI;
  return (qiblaAngle + 360) % 360;
}

function getBearingNameAr(deg: number): string {
  if (deg >= 337.5 || deg < 22.5) return 'شمال';
  if (deg >= 22.5 && deg < 67.5) return 'شمال شرق';
  if (deg >= 67.5 && deg < 112.5) return 'شرق';
  if (deg >= 112.5 && deg < 157.5) return 'جنوب شرق';
  if (deg >= 157.5 && deg < 202.5) return 'جنوب';
  if (deg >= 202.5 && deg < 247.5) return 'جنوب غرب';
  if (deg >= 247.5 && deg < 292.5) return 'غرب';
  return 'شمال غرب';
}

// Type for device orientation event
interface DeviceOrientationEventExt extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  absolute?: boolean;
}

export default function QiblaPage() {
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null);
  const [compassHeading, setCompassHeading] = useState<number>(0);
  const [deviceLat, setDeviceLat] = useState<number | null>(null);
  const [deviceLng, setDeviceLng] = useState<number | null>(null);
  const [compassActive, setCompassActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [compassLoading, setCompassLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compassSupported, setCompassSupported] = useState<boolean | null>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const compassContainerRef = useRef<HTMLDivElement>(null);

  // Step 1: Get user location and calculate Qibla angle
  const getLocationAndCalculate = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });

      const { latitude, longitude } = position.coords;
      setDeviceLat(latitude);
      setDeviceLng(longitude);

      const angle = calculateQibla(latitude, longitude);
      setQiblaAngle(angle);
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case 1: setError('يرجى السماح بالوصول إلى الموقع لتحديد اتجاه القبلة'); break;
          case 2: setError('تعذر تحديد الموقع. تأكد من تفعيل GPS'); break;
          case 3: setError('انتهت مهلة تحديد الموقع. حاول مرة أخرى'); break;
          default: setError('حدث خطأ في تحديد الموقع');
        }
      } else {
        setError('حدث خطأ غير متوقع');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getLocationAndCalculate();
  }, [getLocationAndCalculate]);

  // Step 2: Activate real device compass
  const enableRealCompass = useCallback(async () => {
    setCompassLoading(true);
    setError(null);

    try {
      // Request permission for iOS 13+
      if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
        const permission = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        if (permission !== 'granted') {
          setError('يرجى السماح بالوصول إلى حساس البوصلة');
          setCompassLoading(false);
          return;
        }
      }

      // Check if device orientation is supported
      if (!('DeviceOrientationEvent' in window)) {
        setError('جهازك لا يدعم حساس البوصلة');
        setCompassSupported(false);
        setCompassLoading(false);
        return;
      }

      setCompassSupported(true);
      setCompassActive(true);

      const handleOrientation = (event: Event) => {
        const evt = event as DeviceOrientationEventExt;

        // iOS uses webkitCompassHeading (0-360, clockwise from north)
        if (evt.webkitCompassHeading !== undefined && evt.webkitCompassHeading !== null) {
          setCompassHeading(evt.webkitCompassHeading);
          return;
        }

        // Android uses alpha (need absolute for compass)
        if (evt.absolute && evt.alpha !== null) {
          // alpha is 0-360 counterclockwise, we need clockwise
          setCompassHeading((360 - evt.alpha) % 360);
        }
      };

      window.addEventListener('deviceorientation', handleOrientation, true);

      // Store cleanup reference
      return () => {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      };
    } catch (err) {
      setError('حدث خطأ في تفعيل البوصلة: ' + String(err));
      setCompassSupported(false);
    } finally {
      setCompassLoading(false);
    }
  }, []);

  // Cleanup compass listener on unmount
  useEffect(() => {
    return () => {
      // compass listener cleanup handled above
    };
  }, [compassActive]);

  // Calculate the rotation for the arrow
  // If compass is active: arrow points to Qibla relative to device heading
  // If compass is not active: arrow points to Qibla direction (static)
  const arrowRotation = qiblaAngle !== null
    ? (compassActive ? qiblaAngle - compassHeading : qiblaAngle)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-lg border-b border-primary/10">
        <button
          onClick={() => window.history.back()}
          className="p-2 rounded-full hover:bg-primary/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">بوصلة القبلة</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6">
        {/* Location Info */}
        {deviceLat !== null && deviceLng !== null && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 px-3 py-1.5 rounded-full"
          >
            <MapPin className="w-3 h-3 text-primary" />
            <span>{deviceLat.toFixed(4)}, {deviceLng.toFixed(4)}</span>
          </motion.div>
        )}

        {/* Compass */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="compass-wrapper"
          ref={compassContainerRef}
        >
          {/* Outer decorative rings */}
          <div className="compass-outer-ring" />

          {/* Degree marks */}
          <div className="compass-degree-ring">
            {Array.from({ length: 72 }).map((_, i) => {
              const angle = i * 5;
              const isCardinal = angle % 90 === 0;
              const isMajor = angle % 30 === 0;
              const isMinor = angle % 15 === 0;
              return (
                <div
                  key={`deg-${i}`}
                  className="compass-tick"
                  style={{
                    height: isCardinal ? '14px' : isMajor ? '10px' : isMinor ? '6px' : '3px',
                    width: isCardinal ? '2.5px' : isMajor ? '1.5px' : '1px',
                    background: isCardinal ? '#0ea5e9' : isMajor ? 'rgba(14,165,233,0.6)' : 'rgba(14,165,233,0.25)',
                    transform: `rotate(${angle}deg)`,
                    transformOrigin: '50% 100%',
                    position: 'absolute',
                    top: '4px',
                    left: 'calc(50% - 0.75px)',
                  }}
                />
              );
            })}
          </div>

          {/* Cardinal labels */}
          {[
            { label: 'ش', angle: 0, color: '#ef4444' },
            { label: 'شرق', angle: 90, color: '#64748b' },
            { label: 'ج', angle: 180, color: '#64748b' },
            { label: 'غرب', angle: 270, color: '#64748b' },
          ].map(({ label, angle, color }) => (
            <div
              key={label}
              style={{
                position: 'absolute',
                top: angle === 0 ? '8px' : angle === 180 ? 'auto' : '50%',
                bottom: angle === 180 ? '8px' : 'auto',
                left: angle === 90 ? '10px' : angle === 270 ? 'auto' : '50%',
                right: angle === 270 ? '10px' : 'auto',
                transform: angle === 0 || angle === 180
                  ? 'translateX(-50%)'
                  : angle === 90 || angle === 270
                  ? 'translateY(-50%)'
                  : 'none',
                fontSize: angle === 0 ? '14px' : '11px',
                fontWeight: angle === 0 ? 'bold' : '600',
                color,
                zIndex: 10,
              }}
            >
              {label}
            </div>
          ))}

          {/* Qibla direction indicator (Kaaba) */}
          {qiblaAngle !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="compass-qibla-marker"
              style={{
                transform: `rotate(${qiblaAngle}deg)`,
              }}
            >
              <div className="compass-qibla-icon">🕋</div>
            </motion.div>
          )}

          {/* Compass Arrow */}
          <div
            ref={arrowRef}
            className="compass-arrow"
            style={{
              transform: `translate(-50%, -100%) rotate(${arrowRotation}deg)`,
              transition: compassActive ? 'transform 0.1s ease-out' : 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div className="arrow-north" />
            <div className="arrow-south" />
          </div>

          {/* Center dot */}
          <div className="compass-center-dot" />
        </motion.div>

        {/* Qibla Info Card */}
        <AnimatePresence>
          {qiblaAngle !== null && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-card/80 backdrop-blur-sm border border-primary/15 rounded-2xl px-6 py-4 text-center space-y-2 shadow-lg shadow-primary/5"
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-xl">🕋</span>
                <span className="text-sm font-semibold text-foreground">اتجاه القبلة</span>
              </div>
              <p className="text-3xl font-bold text-primary">{Math.round(qiblaAngle)}°</p>
              <p className="text-xs text-muted-foreground">{getBearingNameAr(qiblaAngle)} من الشمال الحقيقي</p>
              {compassActive && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[10px] text-emerald-500 flex items-center justify-center gap-1"
                >
                  <Navigation className="w-3 h-3" />
                  البوصلة الفعلية مفعّلة
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">جارٍ تحديد الموقع وحساب اتجاه القبلة...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 text-center max-w-xs"
          >
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={getLocationAndCalculate}
              className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              إعادة المحاولة
            </button>
          </motion.div>
        )}

        {/* Enable Real Compass Button */}
        {!loading && qiblaAngle !== null && !compassActive && compassSupported !== false && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.95 }}
            onClick={enableRealCompass}
            disabled={compassLoading}
            className="flex items-center gap-3 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all disabled:opacity-50"
          >
            {compassLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Navigation className="w-5 h-5" />
            )}
            {compassLoading ? 'جارٍ تفعيل البوصلة...' : 'تفعيل البوصلة الفعلي'}
          </motion.button>
        )}

        {/* Compass not supported */}
        {compassSupported === false && qiblaAngle !== null && (
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            جهازك لا يدعم حساس البوصلة. يمكنك استخدام الاتجاه المعروض كمرجع من الشمال الحقيقي.
          </p>
        )}

        {/* Info note */}
        {!loading && qiblaAngle !== null && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-[10px] text-muted-foreground/60 text-center max-w-xs leading-relaxed"
          >
            * زاوية القبلة محسوبة من الشمال الحقيقي. فعّل البوصلة الفعللي للحصول على اتجاه دقيق حسب اتجاه هاتفك.
          </motion.p>
        )}
      </div>
    </div>
  );
}
