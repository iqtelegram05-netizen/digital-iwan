'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import CrystalButton from './CrystalButton';
import { useAppStore, type UserProfile } from '@/store/appStore';
import {
  User, Save, Sparkles, LogOut, Mail, Calendar, Shield,
  ChevronLeft, LogIn
} from 'lucide-react';
import Link from 'next/link';

const INTEREST_OPTIONS = [
  'عقائد', 'فقه', 'تفسير', 'حديث', 'تاريخ الإسلام',
  'فلسفة إسلامية', 'منطق', 'نحو', 'بلاغة', 'أصول الفقه',
];

export default function ProfileView() {
  const { user, setUser } = useAppStore();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [showFullProfile, setShowFullProfile] = useState(false);

  // استعادة حالة المستخدم من localStorage
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

  useEffect(() => {
    if (user) setName(user.name || '');
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
    localStorage.removeItem('iwan_user');
    setUser(null);
    setName('');
    setBio('');
    setInterests([]);
  }, [user, setUser]);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : prev.length < 5 ? [...prev, interest] : prev
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
            animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity }}
          >
            <User className="w-9 h-9 sm:w-12 sm:h-12 text-primary" />
          </motion.div>

          <h2 className="text-lg sm:text-2xl font-bold text-foreground mb-2">الملف الشخصي</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mb-8 leading-relaxed">
            سجّل دخولك عبر حسابك في Google لحفظ تفضيلاتك ومتابعة تقدّمك في العلوم الإسلامية
          </p>

          {/* زر الذهاب لصفحة تسجيل الدخول */}
          <Link href="/login">
            <motion.div
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 sm:py-4 rounded-xl bg-card border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 group cursor-pointer"
              whileTap={{ scale: 0.97 }}
              whileHover={{ y: -2 }}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <LogIn className="w-5 h-5 text-foreground/70 group-hover:text-primary transition-colors" />
              <span className="text-sm sm:text-base font-medium text-foreground group-hover:text-primary transition-colors">
                تسجيل الدخول بـ Google
              </span>
            </motion.div>
          </Link>

          {/* مميزات */}
          <div className="mt-8 space-y-3 text-right">
            <p className="text-xs text-muted-foreground font-medium mb-3">مميزات تسجيل الدخول:</p>
            {['حفظ محادثاتك واختباراتك', 'متابعة تقدّمك في العلوم الإسلامية', 'تخصيص تجربتك حسب اهتماماتك'].map((feature, i) => (
              <motion.div
                key={i} className="flex items-center gap-2 text-xs sm:text-sm text-foreground/70"
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
              <div className="text-center space-y-1 pt-2">
                <h2 className="text-base sm:text-xl font-bold text-foreground">{user.name || 'مستخدم'}</h2>
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="w-3 h-3" />
                  <span className="truncate max-w-[220px]">{user.email}</span>
                </div>
              </div>

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
