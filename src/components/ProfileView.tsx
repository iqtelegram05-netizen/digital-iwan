'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import CrystalButton from './CrystalButton';
import { useAppStore, type UserProfile } from '@/store/appStore';
import {
  User, Save, Sparkles, LogOut, Mail, Calendar, Shield,
  ChevronLeft, AlertCircle, Loader2
} from 'lucide-react';

const INTEREST_OPTIONS = [
  'عقائد', 'فقه', 'تفسير', 'حديث', 'تاريخ الإسلام',
  'فلسفة إسلامية', 'منطق', 'نحو', 'بلاغة', 'أصول الفقه',
];

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

function decodeJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

// دالة عالمية لحفظ بيانات المستخدم - يمكن استدعاؤها من أي مكان
function saveGoogleUser(credential: string) {
  const decoded = decodeJwt(credential);
  if (!decoded || !decoded.email) return false;

  const userProfile: UserProfile = {
    id: decoded.sub || Date.now().toString(),
    email: decoded.email,
    name: decoded.name || null,
    avatar: decoded.picture || null,
    role: 'user',
    isBlocked: false,
    lastLogin: new Date().toISOString(),
  };

  // حفظ في localStorage مباشرة
  localStorage.setItem('iwan_user', JSON.stringify(userProfile));

  // إرسال للسيرفر في الخلفية
  fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: decoded.email, name: decoded.name, avatar: decoded.picture }),
  }).catch(() => {});

  return true;
}

// تعريف الدالة كعنصر عالمي في window ليستخدمه Google GSI
if (typeof window !== 'undefined') {
  (window as any).handleGoogleLogin = function (response: any) {
    const success = saveGoogleUser(response.credential);
    if (success) {
      // إعادة تحميل الصفحة لقراءة البيانات المحفوظة
      window.location.reload();
    }
  };
}

export default function ProfileView() {
  const { user, setUser } = useAppStore();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [error, setError] = useState('');
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // استعادة حالة المستخدم من localStorage عند التحميل
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('iwan_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.email) {
          setUser(parsed);
        }
      }
    } catch {
      localStorage.removeItem('iwan_user');
    }
  }, [setUser]);

  // تعبئة البيانات عندما يتغير المستخدم
  useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
  }, [user]);

  // تهيئة Google GSI وزر تسجيل الدخول
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtnRef.current || user) return;

    const initGoogle = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id) return false;

      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (window as any).handleGoogleLogin,
        auto_select: false,
      });

      google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        width: 280,
        locale: 'ar',
      });

      return true;
    };

    // محاولة مباشرة
    if (!initGoogle()) {
      // انتظار تحميل السكربت
      const timer = setInterval(() => {
        if (initGoogle()) clearInterval(timer);
      }, 200);

      // إيقاف بعد 10 ثوان
      const timeout = setTimeout(() => clearInterval(timer), 10000);
      return () => { clearInterval(timer); clearTimeout(timeout); };
    }
  }, [user]);

  const handleLogout = useCallback(async () => {
    if (!user) return;
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, action: 'logout', userId: user.id }),
      });
    } catch {}
    if ((window as any).google?.accounts?.id) {
      (window as any).google.accounts.id.disableAutoSelect();
    }
    localStorage.removeItem('iwan_user');
    setUser(null);
    setName('');
    setBio('');
    setInterests([]);
  }, [user, setUser]);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : prev.length < 5 ? [...prev, interest] : prev
    );
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'غير محدد';
    return new Date(dateStr).toLocaleDateString('ar-IQ', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  // ======== شاشة تسجيل الدخول ========
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 py-8 max-w-md mx-auto overflow-y-auto">
        <motion.div className="w-full text-center" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <motion.div
            className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto mb-6 sky-glow"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <User className="w-9 h-9 sm:w-12 sm:h-12 text-primary" />
          </motion.div>

          <h2 className="text-lg sm:text-2xl font-bold text-foreground mb-2">الملف الشخصي</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed">
            سجّل دخولك عبر حسابك في Google لحفظ تفضيلاتك ومتابعة تقدّمك
          </p>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* زر Google - يتم تحميله من Google GSI */}
          <div className="flex justify-center mb-4">
            <div ref={googleBtnRef} />
          </div>

          {!GOOGLE_CLIENT_ID && (
            <p className="text-xs text-destructive/70 text-center">
              Google Client ID غير مضبوط في متغيرات البيئة
            </p>
          )}

          {/* مميزات */}
          <div className="mt-6 space-y-3 text-right">
            <p className="text-xs text-muted-foreground font-medium mb-3">مميزات تسجيل الدخول:</p>
            {['حفظ محادثاتك واختباراتك', 'متابعة تقدّمك في العلوم الإسلامية', 'تخصيص تجربتك حسب اهتماماتك'].map((feature, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-2 text-xs sm:text-sm text-foreground/70"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {feature}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ======== شاشة الملف الشخصي ========
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex flex-col items-center px-3 sm:px-4 py-3 sm:py-6 max-w-lg mx-auto w-full">
        <motion.div className="w-full" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-card border-primary/10 overflow-hidden">
            {/* صورة المستخدم */}
            <div className="relative h-24 sm:h-36 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-end pb-4 sm:pb-6 justify-center">
              <motion.div
                className="absolute top-3 sm:top-6 left-1/2 -translate-x-1/2 rounded-full border-3 sm:border-4 border-primary/30 flex items-center justify-center sky-glow overflow-hidden bg-card/80"
                whileHover={{ scale: 1.05 }} style={{ width: '72px', height: '72px' }}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name || 'المستخدم'} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <User className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                )}
              </motion.div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(14,165,233,0.1),transparent)]" />
            </div>

            <CardContent className="p-3 sm:p-6 space-y-4">
              {/* الاسم والبريد */}
              <div className="text-center space-y-1 pt-2">
                <h2 className="text-base sm:text-xl font-bold text-foreground">{user.name || 'مستخدم'}</h2>
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="w-3 h-3" />
                  <span className="truncate max-w-[220px]">{user.email}</span>
                </div>
              </div>

              {/* معلومات الحساب */}
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-card/50 border border-border/30">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary/70" />
                    <span className="text-xs text-muted-foreground">آخر دخول</span>
                  </div>
                  <span className="text-xs font-medium">{formatDate(user.lastLogin)}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-card/50 border border-border/30">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary/70" />
                    <span className="text-xs text-muted-foreground">حالة الحساب</span>
                  </div>
                  <span className="text-xs font-medium text-green-500">نشط</span>
                </div>
              </div>

              {!showFullProfile && (
                <button onClick={() => setShowFullProfile(true)} className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-primary hover:text-primary/80 transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
                  تعديل الملف الشخصي
                </button>
              )}

              <AnimatePresence>
                {showFullProfile && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm font-medium text-foreground/80">الاسم</Label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="أدخل اسمك" className="text-sm border-primary/20 focus:ring-primary/30 bg-card/50 h-9 sm:h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs sm:text-sm font-medium text-foreground/80">نبذة عنك</Label>
                      <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="أخبرنا عن اهتماماتك العلمية..." className="min-h-[60px] resize-none text-sm border-primary/20 focus:ring-primary/30 bg-card/50" rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm font-medium text-foreground/80">الاهتمامات <span className="text-muted-foreground">(اختر حتى 5)</span></Label>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {INTEREST_OPTIONS.map((interest) => {
                          const selected = interests.includes(interest);
                          return (
                            <motion.button key={interest} className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium transition-all border ${selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-card/50 border-primary/20 text-foreground/70 hover:bg-primary/10'}`} onClick={() => toggleInterest(interest)} whileTap={{ scale: 0.95 }}>
                              {selected && <span className="ml-1">✓</span>}{interest}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                    <CrystalButton className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-2.5 rounded-xl text-sm" onClick={handleSave}>
                      {saved ? (<><Sparkles className="w-4 h-4 ml-2" />تم الحفظ بنجاح!</>) : (<><Save className="w-4 h-4 ml-2" />تحديث الملف الشخصي</>)}
                    </CrystalButton>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-destructive/30 text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-all text-sm" whileTap={{ scale: 0.97 }}>
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </motion.button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
