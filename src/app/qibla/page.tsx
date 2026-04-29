'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Navigation, MapPin, Loader2, RefreshCw, ShieldCheck, ShieldX, Compass } from 'lucide-react';

// ========== Qibla Calculation ==========
function calculateQibla(lat: number, lng: number): number {
  const phiK = 21.4225 * Math.PI / 180;
  const lambdaK = 39.8262 * Math.PI / 180;
  const phiP = lat * Math.PI / 180;
  const lambdaP = lng * Math.PI / 180;

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
  const [facingQibla, setFacingQibla] = useState(false);
  const orientationCleanupRef = useRef<(() => void) | null>(null);

  // Check if facing Qibla (within ±5 degrees)
  useEffect(() => {
    if (!compassActive || qiblaAngle === null) {
      setFacingQibla(false);
      return;
    }
    let diff = Math.abs(compassHeading - qiblaAngle);
    if (diff > 180) diff = 360 - diff;
    setFacingQibla(diff < 8);
  }, [compassActive, compassHeading, qiblaAngle]);

  // Step 1: Get location + calculate Qibla
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
      setQiblaAngle(calculateQibla(latitude, longitude));
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

  useEffect(() => { getLocationAndCalculate(); }, [getLocationAndCalculate]);

  // Step 2: Activate compass with Absolute Orientation
  const enableRealCompass = useCallback(async () => {
    setCompassLoading(true);
    setError(null);
    setPermissionDenied(false);

    // HTTPS check
    const isSecure = window.isSecureContext;
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isSecure && !isLocal) {
      alert('⚠️ يتطلب تفعيل البوصلة اتصال آمن (HTTPS).\nيرجى فتح الموقع عبر رابط آمن.');
      setError('البوصلة تتطلب اتصال HTTPS');
      setCompassSupported(false);
      setCompassLoading(false);
      return;
    }

    // DeviceOrientation check
    if (!('DeviceOrientationEvent' in window)) {
      alert('❌ متصفحك لا يدعم حساس البوصلة.\nيرجى استخدام Chrome أو Safari.');
      setError('جهازك لا يدعم حساس البوصلة');
      setCompassSupported(false);
      setCompassLoading(false);
      return;
    }

    // iOS permission
    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof DOE.requestPermission === 'function') {
      try {
        const perm = await DOE.requestPermission();
        if (perm !== 'granted') {
          alert('❌ تم رفض إذن حساس البوصلة.');
          setError('يرجى السماح بالوصول إلى حساس البوصلة');
          setPermissionDenied(true);
          setCompassLoading(false);
          return;
        }
      } catch {
        alert('❌ تعذر طلب إذن البوصلة.');
        setError('تعذر طلب إذن البوصلة');
        setPermissionDenied(true);
        setCompassLoading(false);
        return;
      }
    }

    setCompassSupported(true);
    setCompassActive(true);

    let headingReceived = false;
    let fallbackTimeout: ReturnType<typeof setTimeout>;

    const handleOrientation = (event: Event) => {
      const evt = event as DeviceOrientationEventExt;

      // iOS: webkitCompassHeading (0-360, clockwise from north)
      if (evt.webkitCompassHeading !== undefined && evt.webkitCompassHeading !== null && !isNaN(evt.webkitCompassHeading)) {
        setCompassHeading(evt.webkitCompassHeading);
        headingReceived = true;
        return;
      }

      // Android: deviceorientationabsolute → alpha is compass heading (CW from north)
      if (event.type === 'deviceorientationabsolute' && evt.alpha !== null && !isNaN(evt.alpha)) {
        setCompassHeading(evt.alpha);
        headingReceived = true;
        return;
      }

      // Android fallback: deviceorientation with absolute flag
      if (evt.absolute === true && evt.alpha !== null && !isNaN(evt.alpha)) {
        setCompassHeading(evt.alpha);
        headingReceived = true;
        return;
      }
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    window.addEventListener('deviceorientation', handleOrientation, true);

    fallbackTimeout = setTimeout(() => {
      if (!headingReceived) {
        setError('لم يتم الكشف عن حساس مغناطيسي. تأكد أن هاتفك يحتوي على حساس البوصلة.');
        setCompassActive(false);
        setCompassSupported(false);
        window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
        window.removeEventListener('deviceorientation', handleOrientation, true);
        orientationCleanupRef.current = null;
      }
    }, 4000);

    orientationCleanupRef.current = () => {
      clearTimeout(fallbackTimeout);
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };

    setCompassLoading(false);
  }, []);

  useEffect(() => {
    return () => { orientationCleanupRef.current?.(); };
  }, []);

  // ========== KEY LOGIC ==========
  // The compass DIAL rotates with phone heading so the phone's facing direction is always "up"
  // Dial rotation = -compassHeading (negative = counterclockwise when heading increases CW)
  // The Qibla indicator is fixed at qiblaAngle on the dial
  // When compassHeading ≈ qiblaAngle → N label aligns with Qibla indicator → facing Qibla!
  const dialRotation = compassActive ? -compassHeading : 0;

  const displayHeading = compassActive ? Math.round(compassHeading) : null;
  const qiblaDeg = qiblaAngle !== null ? Math.round(qiblaAngle) : 0;

  return (
    <div className="h-[100dvh] bg-gradient-to-b from-background via-background to-primary/5 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-lg border-b border-primary/10">
        <button onClick={() => window.history.back()} className="p-2 rounded-full hover:bg-primary/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground">بوصلة القبلة</h1>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-5">

        {/* Location */}
        {deviceLat !== null && deviceLng !== null && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 px-3 py-1.5 rounded-full"
          >
            <MapPin className="w-3 h-3 text-primary" />
            <span>{deviceLat.toFixed(4)}, {deviceLng.toFixed(4)}</span>
          </motion.div>
        )}

        {/* ============ COMPASS ============ */}
        <div className="relative" style={{ width: 300, height: 300 }}>
          {/* Fixed outer frame */}
          <div className="absolute inset-0 rounded-full" style={{
            boxShadow: '0 0 0 4px rgba(14,165,233,0.15), 0 0 0 10px rgba(14,165,233,0.06), 0 0 40px rgba(14,165,233,0.08)',
          }} />

          {/* === FIXED Qibla indicator (always at top) === */}
          {qiblaAngle !== null && (
            <div className="absolute z-30" style={{
              top: -12,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              {/* Downward pointing triangle (points into compass) */}
              <div style={{
                width: 0,
                height: 0,
                borderLeft: '10px solid transparent',
                borderRight: '10px solid transparent',
                borderTop: '14px solid #f59e0b',
                filter: 'drop-shadow(0 2px 6px rgba(245,158,11,0.5))',
              }} />
              <span style={{
                fontSize: '22px',
                marginTop: '-4px',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              }}>🕋</span>
            </div>
          )}

          {/* === Rotating dial (everything inside rotates with phone) === */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, #ffffff 0%, #f0f4f8 60%, #e2e8f0 100%)',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.06)',
              transform: `rotate(${dialRotation}deg)`,
              transition: compassActive ? 'transform 0.2s ease-out' : 'none',
            }}
          >
            {/* Degree ticks (72 ticks × 5° = 360°) */}
            {Array.from({ length: 72 }).map((_, i) => {
              const angle = i * 5;
              const isCardinal = angle % 90 === 0;
              const isMajor = angle % 30 === 0;
              const isMinor = angle % 15 === 0;
              return (
                <div key={`t-${i}`} style={{
                  position: 'absolute',
                  height: isCardinal ? 16 : isMajor ? 10 : isMinor ? 6 : 3,
                  width: isCardinal ? 2.5 : isMajor ? 1.5 : 1,
                  background: isCardinal ? '#0ea5e9' : isMajor ? 'rgba(14,165,233,0.6)' : 'rgba(14,165,233,0.2)',
                  top: 4,
                  left: 'calc(50% - 1px)',
                  transformOrigin: '1px 0',
                  transform: `rotate(${angle}deg)`,
                  borderRadius: 1,
                }} />
              );
            })}

            {/* Cardinal labels (rotating with dial) */}
            {[
              { label: 'شمال', angle: 0, color: '#ef4444', size: 13, bold: true },
              { label: 'شرق', angle: 90, color: '#64748b', size: 11, bold: false },
              { label: 'جنوب', angle: 180, color: '#64748b', size: 11, bold: false },
              { label: 'غرب', angle: 270, color: '#64748b', size: 11, bold: false },
            ].map(({ label, angle, color, size, bold }) => (
              <div key={label} style={{
                position: 'absolute',
                top: angle === 0 ? 22 : angle === 180 ? 'auto' : '50%',
                bottom: angle === 180 ? 22 : 'auto',
                left: angle === 270 ? 16 : angle === 90 ? 'auto' : '50%',
                right: angle === 90 ? 16 : 'auto',
                transform: (angle === 0 || angle === 180) ? 'translateX(-50%)' : (angle === 90 || angle === 270) ? 'translateY(-50%)' : 'none',
                fontSize: size,
                fontWeight: bold ? '800' : '600',
                color,
                zIndex: 10,
                userSelect: 'none',
              }}>
                {label}
              </div>
            ))}

            {/* Qibla angle label on dial (fixed position relative to dial) */}
            {qiblaAngle !== null && compassActive && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: 120,
                height: 120,
                transform: `translate(-50%, -50%) rotate(${qiblaAngle}deg)`,
                transformOrigin: 'center center',
                pointerEvents: 'none',
              }}>
                {/* Qibla line on dial */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  width: 3,
                  height: '50%',
                  marginLeft: -1.5,
                  background: 'linear-gradient(to bottom, #f59e0b, #f59e0b88)',
                  borderRadius: 2,
                }} />
                {/* Small Kaaba at the end of the Qibla line */}
                <div style={{
                  position: 'absolute',
                  top: -2,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 16,
                }}>🕋</div>
              </div>
            )}

            {/* North arrow (part of rotating dial - always points North) */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 0,
              height: 0,
              borderTop: '55px solid #ef4444',
              borderLeft: '7px solid transparent',
              borderRight: '7px solid transparent',
              transform: 'translate(-50%, -100%)',
              filter: 'drop-shadow(0 2px 3px rgba(239,68,68,0.3))',
              zIndex: 20,
            }} />
            {/* South arrow (opposite) */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: 0,
              height: 0,
              borderBottom: '50px solid #94a3b8',
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              transform: 'translate(-50%, 0)',
              opacity: 0.35,
              zIndex: 20,
            }} />
          </div>

          {/* Center dot (fixed, on top of everything) */}
          <div className="absolute z-30" style={{
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 16, height: 16,
            borderRadius: '50%',
            background: '#0ea5e9',
            boxShadow: '0 0 10px rgba(14,165,233,0.5), 0 0 25px rgba(14,165,233,0.2)',
          }} />

          {/* Facing Qibla indicator */}
          <AnimatePresence>
            {facingQibla && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute z-40"
                style={{
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                }}
              >
                <div style={{
                  width: 320, height: 320,
                  borderRadius: '50%',
                  border: '3px solid #f59e0b',
                  boxShadow: '0 0 20px rgba(245,158,11,0.4), inset 0 0 20px rgba(245,158,11,0.1)',
                  animation: 'pulse 2s ease-in-out infinite',
                }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ====== Facing Qibla banner ====== */}
        <AnimatePresence>
          {facingQibla && compassActive && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="flex items-center gap-3 px-5 py-3 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #f59e0b22, #f59e0b11)',
                border: '1.5px solid #f59e0b44',
                boxShadow: '0 0 30px rgba(245,158,11,0.15)',
              }}
            >
              <span style={{ fontSize: 28 }}>🕋</span>
              <div>
                <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>أنت الآن متجه نحو القبلة</p>
                <p className="text-[10px]" style={{ color: '#f59e0b99' }}>اتجاه الهاتف يطابق اتجاه الكعبة المشرفة</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Heading display */}
        <AnimatePresence>
          {compassActive && displayHeading !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-4 text-center bg-card/60 backdrop-blur-sm rounded-xl px-5 py-3 border border-border/50"
            >
              <div className="flex flex-col items-center min-w-[70px]">
                <span className="text-[10px] text-muted-foreground">اتجاه هاتفك</span>
                <span className="text-xl font-bold text-foreground">{displayHeading}°</span>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex flex-col items-center min-w-[70px]">
                <span className="text-[10px] text-muted-foreground">اتجاه القبلة</span>
                <span className="text-xl font-bold" style={{ color: '#f59e0b' }}>{qiblaDeg}°</span>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="flex flex-col items-center min-w-[70px]">
                <span className="text-[10px] text-muted-foreground">الفرق</span>
                <span className="text-xl font-bold text-emerald-500">
                  {(() => {
                    let diff = Math.abs(compassHeading - (qiblaAngle || 0));
                    if (diff > 180) diff = 360 - diff;
                    return Math.round(diff) + '°';
                  })()}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Qibla Info (static, when compass not active) */}
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
              <p className="text-3xl font-bold" style={{ color: '#f59e0b' }}>{qiblaDeg}°</p>
              <p className="text-xs text-muted-foreground">{getBearingNameAr(qiblaAngle!)} من الشمال الحقيقي</p>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 text-center max-w-xs">
            <p className="text-sm text-destructive">{error}</p>
            {!compassActive && (
              <button onClick={getLocationAndCalculate} className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors">
                <RefreshCw className="w-3 h-3" />
                إعادة المحاولة
              </button>
            )}
          </motion.div>
        )}

        {/* ============ ACTIVATION BUTTON ============ */}
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
              className="relative flex flex-col items-center justify-center w-36 h-36 rounded-full shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                boxShadow: '0 0 40px rgba(14,165,233,0.3)',
              }}
            >
              {!compassLoading && (
                <span className="absolute inset-0 rounded-full border-2 animate-ping opacity-20" style={{ borderColor: '#0ea5e9' }} />
              )}
              <span className="absolute inset-1 rounded-full border border-white/20" />
              {compassLoading ? (
                <>
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                  <span className="text-xs text-white/80 mt-2 font-medium">جارٍ التفعيل...</span>
                </>
              ) : (
                <>
                  <Compass className="w-11 h-11 text-white group-hover:scale-110 transition-transform duration-200" />
                  <span className="text-sm text-white font-bold mt-2">تفعيل البوصلة</span>
                </>
              )}
            </motion.button>
            <p className="text-[10px] text-muted-foreground/50 text-center max-w-[200px] leading-relaxed">
              اضغط لتفعيل حساس البوصلة وعرض اتجاه القبلة في الوقت الحقيقي
            </p>
          </motion.div>
        )}

        {/* Active badge */}
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
                البوصلة مفعّلة — Absolute Orientation
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Not supported */}
        {compassSupported === false && qiblaAngle !== null && !compassActive && !permissionDenied && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2 text-center max-w-xs">
            <ShieldX className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              جهازك لا يدعم حساس البوصلة. يمكنك استخدام الاتجاه المعروض كمرجع.
            </p>
          </motion.div>
        )}

        {/* Permission denied */}
        {permissionDenied && qiblaAngle !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2 text-center max-w-xs">
            <ShieldX className="w-8 h-8 text-amber-500" />
            <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
              تم رفض إذن البوصلة. يمكنك إعادة المحاولة.
            </p>
            <button onClick={enableRealCompass} className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors mt-1">
              <RefreshCw className="w-3 h-3" />
              إعادة طلب الإذن
            </button>
          </motion.div>
        )}

        {/* Info note */}
        {!loading && qiblaAngle !== null && !compassActive && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
            className="text-[10px] text-muted-foreground/60 text-center max-w-xs leading-relaxed"
          >
            * زاوية القبلة محسوبة من الشمال الحقيقي. فعّل البوصلة للحصول على اتجاه دقيق حسب حركة هاتفك.
          </motion.p>
        )}
      </div>

      {/* Pulse animation CSS */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.03); }
        }
      `}</style>
    </div>
  );
}
