'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type View } from '@/store/appStore';
import SplashScreen from '@/components/SplashScreen';
import GeometricBackground from '@/components/GeometricBackground';
import IslamicPatternBg from '@/components/IslamicPatternBg';
import Header from '@/components/Header';
import ChatView from '@/components/ChatView';
import QuizView from '@/components/QuizView';
import ProfileView from '@/components/ProfileView';
import AdminPanel from '@/components/AdminPanel';
import SideDrawer from '@/components/SideDrawer';
import Footer from '@/components/Footer';
import { BookOpen, Swords, GraduationCap, Brain, User } from 'lucide-react';

const TABS: { view: View; label: string; icon: React.ReactNode }[] = [
  { view: 'chat', label: 'الأيوان', icon: <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { view: 'debate', label: 'المحاور', icon: <Swords className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { view: 'teacher', label: 'الأستاذ', icon: <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { view: 'quiz', label: 'اختبر', icon: <Brain className="w-4 h-4 sm:w-5 sm:h-5" /> },
  { view: 'profile', label: 'الملف', icon: <User className="w-4 h-4 sm:w-5 sm:h-5" /> },
];

const ADMIN_CODE = 'qalamadmin2024';

export default function Home() {
  const {
    currentView,
    setCurrentView,
    splashComplete,
    setSheetOpen,
    setSplashComplete,
  } = useAppStore();

  // Auto-complete splash after 4.5 seconds as fallback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!splashComplete) {
        setSplashComplete(true);
      }
    }, 4500);
    return () => clearTimeout(timer);
  }, [splashComplete, setSplashComplete]);

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
            {/* Cosmic pattern (bottom layer) */}
            <div className="cosmic-pattern" />
            {/* Hex grid overlay */}
            <div className="hex-grid-overlay" />
            {/* Islamic floating symbols */}
            <IslamicPatternBg />
            {/* Geometric shapes with parallax */}
            <GeometricBackground />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main App */}
      <AnimatePresence>
        {splashComplete && (
          <motion.div
            className="relative z-10 flex flex-col h-full min-h-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            {/* Header */}
            <Header onMenuClick={() => setSheetOpen(true)} />

            {/* Side Drawer */}
            <SideDrawer />

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden pb-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentView}
                  className="flex-1 overflow-hidden"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  {currentView === 'chat' && <ChatView />}
                  {currentView === 'debate' && <ChatView />}
                  {currentView === 'teacher' && <ChatView />}
                  {currentView === 'quiz' && <QuizView />}
                  {currentView === 'profile' && <ProfileView />}
                  {currentView === 'admin' && <AdminPanel />}
                </motion.div>
              </AnimatePresence>
            </main>

            {/* Bottom Tab Bar */}
            <nav className="sticky bottom-0 z-30 glass-card border-t border-border/20">
              <div className="flex items-center justify-around px-0.5 py-0.5 max-w-2xl mx-auto">
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

            {/* Footer */}
            <Footer />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
