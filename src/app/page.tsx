'use client';

import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type View, type UserProfile } from '@/store/appStore';
import SplashScreen from '@/components/SplashScreen';
import GeometricBackground from '@/components/GeometricBackground';
import IslamicPatternBg from '@/components/IslamicPatternBg';
import Header from '@/components/Header';
import ChatView from '@/components/ChatView';
import QuizView from '@/components/QuizView';
import ProfileView from '@/components/ProfileView';
import AdminPanel from '@/components/AdminPanel';
import ReaderView from '@/components/ReaderView';
import SideDrawer from '@/components/SideDrawer';
import Footer from '@/components/Footer';
import { BookOpen, Swords, GraduationCap, Brain, User, Search } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

const ADMIN_CODE = 'qalamadmin2024';

export default function Home() {
  const {
    currentView,
    setCurrentView,
    splashComplete,
    setSheetOpen,
    setSplashComplete,
    setUser,
  } = useAppStore();

  const { t } = useTranslation();

  const isReaderView = currentView === 'reader';

  const TABS = useMemo(() => [
    { view: 'chat' as View, label: t('tabs.iwan'), icon: <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { view: 'debate' as View, label: t('tabs.debater'), icon: <Swords className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { view: 'research' as View, label: 'بحث خارج', icon: <Search className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { view: 'teacher' as View, label: t('tabs.teacher'), icon: <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { view: 'quiz' as View, label: t('tabs.quiz'), icon: <Brain className="w-4 h-4 sm:w-5 sm:h-5" /> },
    { view: 'profile' as View, label: t('tabs.profile'), icon: <User className="w-4 h-4 sm:w-5 sm:h-5" /> },
  ], [t]);

  // معالجة تسجيل الدخول من Google - يُنفذ دائماً عند تحميل الصفحة
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authSuccess = params.get('auth_success');
    const authError = params.get('auth_error');

    // معالجة نجاح تسجيل الدخول (من التبويب الكامل fallback)
    if (authSuccess) {
      try {
        const decoded = decodeURIComponent(authSuccess);
        const userData: UserProfile = JSON.parse(atob(decoded));
        if (userData.email) {
          localStorage.setItem('iwan_user', JSON.stringify(userData));
          setUser(userData);
          setCurrentView('profile');
        }
      } catch (e) {
        console.error('Failed to parse auth_success:', e);
      }
      // تنظيف URL
      window.history.replaceState({}, '', '/');
    }

    // معالجة خطأ تسجيل الدخول
    if (authError) {
      console.error('Google auth error:', authError);
      window.history.replaceState({}, '', '/');
      // إظهار رسالة خطأ للمستخدم عبر tab الملف الشخصي
      setCurrentView('profile');
    }

    // استعادة المستخدم من localStorage (دائماً)
    const savedUser = localStorage.getItem('iwan_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.email) {
          // التحقق من دور المالك مباشرة في الواجهة
          const ownerEmails = ['iqtelegram05@gmail.com'];
          if (ownerEmails.includes(parsed.email.toLowerCase()) && parsed.role !== 'owner') {
            parsed.role = 'owner';
            localStorage.setItem('iwan_user', JSON.stringify(parsed));
          }
          setUser(parsed);
        }
      } catch {
        localStorage.removeItem('iwan_user');
      }
    }
  }, [setUser, setCurrentView]);

  // Auto-complete splash after 4.5 seconds as fallback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!splashComplete) {
        setSplashComplete(true);
        // إذا لم يكن هناك view محدد، اذهب للدردشة
        if (currentView === 'splash') {
          setCurrentView('chat');
        }
      }
    }, 4500);
    return () => clearTimeout(timer);
  }, [splashComplete, setSplashComplete, currentView, setCurrentView]);

  // Listen for admin access via special sequence
  useEffect(() => {
    let buffer = '';
    const handleKeyDown = (e: KeyboardEvent) => {
      buffer += e.key;
      if (buffer.length > 20) buffer = buffer.slice(-20);
      if (buffer.includes(ADMIN_CODE)) {
        setCurrentView('admin');
        buffer = '';
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setCurrentView]);

  return (
    <div className="h-full flex flex-col bg-background relative overflow-hidden">
      {/* Splash Screen */}
      <SplashScreen />

      {/* Background Layers */}
      <AnimatePresence>
        {splashComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 z-0"
          >
            <div className="cosmic-pattern" />
            <div className="hex-grid-overlay" />
            <IslamicPatternBg />
            <GeometricBackground />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main App */}
      <AnimatePresence>
        {splashComplete && currentView !== 'splash' && (
          <motion.div
            className="relative z-10 flex flex-col h-full min-h-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            {!isReaderView && <Header onMenuClick={() => setSheetOpen(true)} />}
            <SideDrawer />

            <main className="flex-1 flex flex-col overflow-hidden min-h-0 pb-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentView}
                  className="flex-1 flex flex-col overflow-hidden min-h-0"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentView === 'chat' && <ChatView />}
                  {currentView === 'debate' && <ChatView />}
                  {currentView === 'research' && <ChatView />}
                  {currentView === 'teacher' && <ChatView />}
                  {currentView === 'quiz' && <QuizView />}
                  {currentView === 'profile' && <ProfileView />}
                  {currentView === 'admin' && <AdminPanel />}
                  {currentView === 'reader' && <ReaderView />}
                </motion.div>
              </AnimatePresence>
            </main>

            {/* Bottom Tab Bar - hidden in reader view */}
            {!isReaderView && (
            <nav className="sticky bottom-0 z-30 glass-card border-t border-border/20 shrink-0">
              <div className="flex items-center justify-around px-1 py-0.5 max-w-2xl mx-auto overflow-hidden">
                {TABS.map((tab) => {
                  const isActive = currentView === tab.view;
                  return (
                    <motion.button
                      key={tab.view}
                      className="flex flex-col items-center gap-0 py-1.5 sm:py-2 px-1 sm:px-2 rounded-lg sm:rounded-xl transition-all relative min-w-[48px] sm:min-w-[60px]"
                      onClick={() => setCurrentView(tab.view)}
                      whileTap={{ scale: 0.9 }}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className={`relative z-10 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                        {tab.icon}
                      </span>
                      <span
                        className={`relative z-10 text-[8px] sm:text-[10px] font-medium leading-tight ${
                          isActive ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        {tab.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </nav>
            )}

            <Footer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
