'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Navigation, MapPin, Loader2, RefreshCw, ShieldCheck, ShieldX, Wifi, Compass } from 'lucide-react';

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

// Extended event type for iOS webkitCompassHeading
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
  const [permissionDenied, setPermissionDenied] = useState(false);
  const arrowRef = useRef<HTMLDivElement>(null);
  const compassContainerRef = useRef<HTMLDivElement>(null);
  const orientationCleanupRef = useRef<(() => void) | null>(null);

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

  // Step 2: Activate real device compass with Absolute Orientation
  const enableRealCompass = useCallback(async () => {
    setCompassLoading(true);
    setError(null);
    setPermissionDenied(false);

    // === CHECK 1: HTTPS Required ===
    const isSecure = window.isSecureContext;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecure && !isLocalhost) {
      alert('⚠️ يتطلب تفعيل البوصلة اتصال آمن (HTTPS).\nيرجى فتح الموقع عبر رابط آمن.\n\nThe compass requires HTTPS. Please open this site using a secure connection.');
      setError('البوصلة تتطلب اتصال HTTPS');
      setCompassSupported(false);
      setCompassLoading(false);
      return;
    }

    // === CHECK 2: DeviceOrientation API Support ===
    if (!('DeviceOrientationEvent' in window)) {
      alert('❌ متصفحك لا يدعم حساس البوصلة.\nيرجى استخدام متصفح حديث مثل Chrome أو Safari.\n\nYour browser does not support the compass sensor.\nPlease use a modern browser like Chrome or Safari.');
      setError('جهازك لا يدعم حساس البوصلة');
      setCompassSupported(false);
      setCompassLoading(false);
      return;
    }

    // === CHECK 3: iOS Permission Request (iOS 13+) ===
    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    if (typeof DOE.requestPermission === 'function') {
      try {
        const permission = await DOE.requestPermission();
        if (permission !== 'granted') {
          alert('❌ تم رفض إذن الوصول إلى حساس البوصلة.\nيمكنك تفعيله من إعدادات المتصفح.\n\nCompass permission denied. You can enable it in browser settings.');
          setError('يرجى السماح بالوصول إلى حساس البوصلة');
          setPermissionDenied(true);
          setCompassLoading(false);
          return;
        }
      } catch (permErr) {
        alert('❌ تعذر طلب إذن البوصلة.\nيرجى المحاولة مرة أخرى.\n\nFailed to request compass permission.');
        setError('تعذر طلب إذن البوصلة');
        setPermissionDenied(true);
        setCompassLoading(false);
        return;
      }
    }

    // === CHECK 4: Geolocation active ===
    if (!navigator.geolocation) {
      alert('❌ متصفحك لا يدعم خدمة الموقع (Geolocation).\n\nYour browser does not support Geolocation.');
      setError('جهازك لا يدعم خدمة تحديد الموقع');
      setCompassSupported(false);
      setCompassLoading(false);
      return;
    }

    // === ACTIVATE COMPASS ===
    setCompassSupported(true);
    setCompassActive(true);

    let headingReceived = false;
    let fallbackTimeout: ReturnType<typeof setTimeout>;

    const handleOrientation = (event: Event) => {
      const evt = event as DeviceOrientationEventExt;

      // --- iOS: webkitCompassHeading (0-360, clockwise from magnetic north) ---
      if (evt.webkitCompassHeading !== undefined && evt.webkitCompassHeading !== null && !isNaN(evt.webkitCompassHeading)) {
        setCompassHeading(evt.webkitCompassHeading);
        headingReceived = true;
        return;
      }

      // --- Android Absolute: alpha from deviceorientationabsolute ---
      // deviceorientationabsolute gives absolute alpha (magnetic north referenced)
      if (event.type === 'deviceorientationabsolute' && evt.alpha !== null && !isNaN(evt.alpha)) {
        // alpha is 0-360 counterclockwise from magnetic north → convert to clockwise
        setCompassHeading((360 - evt.alpha) % 360);
        headingReceived = true;
        return;
      }

      // --- Android Fallback: deviceorientation with absolute flag ---
      if (evt.absolute === true && evt.alpha !== null && !isNaN(evt.alpha)) {
        setCompassHeading((360 - evt.alpha) % 360);
        headingReceived = true;
        return;
      }
    };

    // Primary: Listen for deviceorientationabsolute (Android magnetic sensor)
    // This event provides true absolute heading relative to magnetic north
    window.addEventListener('deviceorientationabsolute', handleOrientation, true);

    // Secondary: Also listen to regular deviceorientation (iOS webkitCompassHeading + fallback)
    window.addEventListener('deviceorientation', handleOrientation, true);

    // Timeout: if no heading received in 4 seconds, warn user
    fallbackTimeout = setTimeout(() => {
      if (!headingReceived) {
        // Try one more check
        setError('لم يتم الكشف عن حساس مغناطيسي. تأكد أن هاتفك يحتوي على حساس البوصلة وأنك لست بالقرب من مجال مغناطيسي قوي.');
        setCompassActive(false);
        setCompassSupported(false);

        // Clean up listeners
        window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
        window.removeEventListener('deviceorientation', handleOrientation, true);
        orientationCleanupRef.current = null;
      }
    }, 4000);

    // Store cleanup function
    orientationCleanupRef.current = () => {
      clearTimeout(fallbackTimeout);
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };

    setCompassLoading(false);
  }, []);

  // Cleanup compass listener on unmount
  useEffect(() => {
    return () => {
      if (orientationCleanupRef.current) {
        orientationCleanupRef.current();
      }
    };
  }, []);

  // Calculate the rotation for the arrow
  // If compass is active: arrow points to Qibla relative to device heading
  // If compass is not active: arrow points to Qibla direction (static)
  const arrowRotation = qiblaAngle !== null
    ? (compassActive ? qiblaAngle - compassHeading : qiblaAngle)
    : 0;

  // Current compass heading display
  const displayHeading = compassActive ? Math.round(compassHeading) : null;

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
                transform: `rotate(${compassActive ? arrowRotation : qiblaAngle}deg)`,
                transition: compassActive ? 'transform 0.15s ease-out' : 'none',
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
              transition: compassActive ? 'transform 0.15s ease-out' : 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div className="arrow-north" />
            <div className="arrow-south" />
          </div>

          {/* Center dot */}
          <div className="compass-center-dot" />
        </motion.div>

        {/* Compass Heading (when active) */}
        <AnimatePresence>
          {compassActive && displayHeading !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-3 text-center"
            >
              <div className="flex flex-col items-center">
                <span className="text-xs text-muted-foreground">اتجاه هاتفك</span>
                <span className="text-lg font-bold text-foreground">{displayHeading}°</span>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex flex-col items-center">
                <span className="text-xs text-muted-foreground">اتجاه القبلة</span>
                <span className="text-lg font-bold text-primary">{qiblaAngle !== null ? Math.round(qiblaAngle) : '—'}°</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Qibla Info Card */}
        <AnimatePresence>
          {qiblaAngle !== null && !loading && !compassActive && (
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
            {!compassActive && (
              <button
                onClick={getLocationAndCalculate}
                className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                إعادة المحاولة
              </button>
            )}
          </motion.div>
        )}

        {/* ============ BIG ACTIVATION BUTTON ============ */}
        {!loading && qiblaAngle !== null && !compassActive && compassSupported !== false && !permissionDenied && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-3 mt-2"
          >
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={enableRealCompass}
              disabled={compassLoading}
              className="relative flex flex-col items-center justify-center w-40 h-40 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 shadow-2xl shadow-primary/30 hover:shadow-primary/50 active:shadow-primary/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {/* Outer pulse ring */}
              {!compassLoading && (
                <span className="absolute inset-0 rounded-full border-2 border-primary/40 animate-ping opacity-20" />
              )}
              {/* Inner border */}
              <span className="absolute inset-1 rounded-full border border-primary-foreground/20" />

              {compassLoading ? (
                <>
                  <Loader2 className="w-10 h-10 text-primary-foreground animate-spin" />
                  <span className="text-xs text-primary-foreground/80 mt-2 font-medium">جارٍ التفعيل...</span>
                </>
              ) : (
                <>
                  <Compass className="w-12 h-12 text-primary-foreground group-hover:scale-110 transition-transform duration-200" />
                  <span className="text-sm text-primary-foreground font-bold mt-2">تفعيل البوصلة</span>
                </>
              )}
            </motion.button>
            <p className="text-[10px] text-muted-foreground/50 text-center max-w-[200px] leading-relaxed">
              اضغط لتفعيل حساس البوصلة في هاتفك وعرض اتجاه القبلة في الوقت الحقيقي
            </p>
          </motion.div>
        )}

        {/* Compass Active Status */}
        <AnimatePresence>
          {compassActive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                البوصلة الفعلية مفعّلة — Absolute Orientation
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compass not supported */}
        {compassSupported === false && qiblaAngle !== null && !compassActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-2 text-center max-w-xs"
          >
            <ShieldX className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              جهازك لا يدعم حساس البوصلة أو لم يتم الكشف عنه. يمكنك استخدام الاتجاه المعروض كمرجع من الشمال الحقيقي.
            </p>
          </motion.div>
        )}

        {/* Permission denied */}
        {permissionDenied && qiblaAngle !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-2 text-center max-w-xs"
          >
            <ShieldX className="w-8 h-8 text-amber-500" />
            <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
              تم رفض إذن البوصلة. يمكنك إعادة المحاولة أو استخدام الاتجاه الثابت كمرجع.
            </p>
            <button
              onClick={enableRealCompass}
              className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors mt-1"
            >
              <RefreshCw className="w-3 h-3" />
              إعادة طلب الإذن
            </button>
          </motion.div>
        )}

        {/* Info note */}
        {!loading && qiblaAngle !== null && !compassActive && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-[10px] text-muted-foreground/60 text-center max-w-xs leading-relaxed"
          >
            * زاوية القبلة محسوبة من الشمال الحقيقي. فعّل البوصلة الفعلية للحصول على اتجاه دقيق حسب اتجاه هاتفك.
          </motion.p>
        )}

        {/* Technical note */}
        {compassActive && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-[9px] text-muted-foreground/40 text-center max-w-xs leading-relaxed"
          >
            🔒 يستخدم حساس البوصلة المغناطيسي عبر Absolute Orientation API
          </motion.p>
        )}
      </div>
    </div>
  );
}
