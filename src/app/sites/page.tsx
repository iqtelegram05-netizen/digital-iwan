'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowLeft, Globe, ExternalLink, Search, ArrowUpLeft, Sparkles, Zap, Star } from 'lucide-react';

interface SiteItem {
  id: string;
  name: string;
  url: string;
  description: string | null;
  iconUrl: string | null;
  imageUrl: string | null;
  displayOrder: number;
  createdAt: string;
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    return '';
  }
}

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// Animated gradient border card component
function GradientCard({ children, className = '', index = 0 }: { children: React.ReactNode; className?: string; index?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [4, -4]), { stiffness: 200, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-4, 4]), { stiffness: 200, damping: 30 });
  const shineX = useSpring(useTransform(mouseX, [0, 1], ['0%', '100%']), { stiffness: 300, damping: 30 });
  const shineY = useSpring(useTransform(mouseY, [0, 1], ['0%', '100%']), { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  const colors = [
    ['#3b82f6', '#8b5cf6', '#06b6d4'],
    ['#8b5cf6', '#ec4899', '#6366f1'],
    ['#10b981', '#06b6d4', '#3b82f6'],
    ['#f59e0b', '#ef4444', '#f97316'],
    ['#ec4899', '#8b5cf6', '#f43f5e'],
    ['#06b6d4', '#3b82f6', '#10b981'],
  ];
  const [c1, c2, c3] = colors[index % colors.length];

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 800,
      }}
      className={`relative rounded-2xl ${className}`}
    >
      {/* Animated gradient border */}
      <div
        className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `conic-gradient(from 0deg, ${c1}33, ${c2}66, ${c3}33, ${c1}33)`,
        }}
      />
      {/* Inner card */}
      <div className="relative rounded-2xl overflow-hidden bg-[#0c1422]/90 backdrop-blur-xl border border-white/[0.06]">
        {/* Dynamic shine overlay */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10"
          style={{
            background: `radial-gradient(400px circle at ${shineX} ${shineY}, rgba(255,255,255,0.04), transparent 60%)`,
          }}
        />
        {children}
      </div>
    </motion.div>
  );
}

export default function SitesPage() {
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchSites() {
      try {
        const res = await fetch('/api/sites');
        if (res.ok) {
          const data = await res.json();
          setSites(data.sites || []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchSites();
  }, []);

  const filteredSites = sites.filter((site) =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (site.description && site.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div
      className="h-[100dvh] flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(170deg, #060a14 0%, #0a1225 30%, #0d1830 50%, #091422 75%, #050910 100%)',
      }}
    >
      {/* Ambient background glow effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/[0.03] blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-15%] w-[400px] h-[400px] rounded-full bg-violet-500/[0.03] blur-[100px]" />
        <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full bg-cyan-500/[0.02] blur-[80px]" />
      </div>

      {/* Header */}
      <motion.div
        className="shrink-0 px-4 pt-4 pb-3 relative z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => window.history.back()}
            className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.12] transition-all duration-300 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-white/60" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 via-violet-500/15 to-cyan-500/10 border border-white/[0.08] flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0a1225] animate-pulse" />
            </div>
            <div>
              <h1
                className="text-2xl font-bold text-white tracking-tight"
                style={{ fontFamily: "var(--font-cairo), 'Cairo', 'Noto Sans Arabic', sans-serif" }}
              >
                مواقعنا
              </h1>
              <p
                className="text-[11px] text-white/30 mt-0.5"
                style={{ fontFamily: "var(--font-cairo), 'Cairo', sans-serif" }}
              >
                اكتشف مجموعة المواقع المميزة
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/[0.08] to-violet-500/[0.08] border border-white/[0.06]">
            <Zap className="w-3 h-3 text-blue-400/60" />
            <span
              className="text-[11px] text-white/40 font-semibold"
              style={{ fontFamily: "var(--font-cairo), 'Cairo', sans-serif" }}
            >
              {sites.length}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 via-violet-500/0 to-cyan-500/0 group-focus-within:from-blue-500/[0.05] group-focus-within:via-violet-500/[0.03] group-focus-within:to-cyan-500/[0.05] transition-all duration-500 blur-sm" />
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-blue-400 transition-colors duration-300 z-10" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن موقع..."
            className="relative w-full pr-10 pl-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/20 focus:bg-white/[0.05] transition-all duration-300 z-10"
            dir="rtl"
            style={{ fontFamily: "var(--font-cairo), 'Cairo', 'Noto Sans Arabic', sans-serif" }}
          />
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 relative z-10">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl border border-blue-500/20 bg-blue-500/[0.05] animate-pulse flex items-center justify-center">
                  <Globe className="w-6 h-6 text-blue-400/40 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
              </div>
              <p className="text-xs text-white/25" style={{ fontFamily: "var(--font-cairo), 'Cairo', sans-serif" }}>جاري التحميل...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && sites.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500/[0.05] to-violet-500/[0.03] border border-white/[0.04] flex items-center justify-center mb-5">
              <Globe className="w-10 h-10 text-white/[0.08]" />
            </div>
            <h3 className="text-lg font-bold text-white/40 mb-2" style={{ fontFamily: "var(--font-cairo), 'Cairo', sans-serif" }}>لا توجد مواقع بعد</h3>
            <p className="text-xs text-white/20 max-w-[260px] leading-relaxed" style={{ fontFamily: "var(--font-cairo), 'Cairo', sans-serif" }}>
              سيتم إضافة المواقع المميزة قريباً
            </p>
          </motion.div>
        )}

        {/* No Search Results */}
        {!loading && sites.length > 0 && filteredSites.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <Search className="w-8 h-8 text-white/[0.08] mb-3" />
            <p className="text-sm text-white/25" style={{ fontFamily: "var(--font-cairo), 'Cairo', sans-serif" }}>
              لا توجد نتائج لـ &quot;{searchQuery}&quot;
            </p>
          </motion.div>
        )}

        {/* Sites Grid */}
        <AnimatePresence mode="wait">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredSites.map((site, index) => {
              return (
                <motion.a
                  key={site.id}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                >
                  <GradientCard index={index}>
                    {site.imageUrl ? (
                      /* Card with image */
                      <div className="relative">
                        {/* Image */}
                        <div className="relative h-36 w-full overflow-hidden">
                          <img
                            src={site.imageUrl}
                            alt={site.name}
                            className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-[1.08] group-hover:brightness-110"
                          />
                          {/* Premium gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0c1422] via-[#0c1422]/50 to-transparent" />

                          {/* Top-left badge */}
                          <div className="absolute top-3 right-3 flex items-center gap-1.5">
                            <div className="px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-xl border border-white/[0.08]">
                              <span
                                className="text-[10px] text-white/70 font-semibold"
                                style={{ fontFamily: "var(--font-cairo), 'Cairo', sans-serif" }}
                              >
                                {getDomainFromUrl(site.url)}
                              </span>
                            </div>
                          </div>

                          {/* External link - top right */}
                          <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100">
                            <div className="w-8 h-8 rounded-xl bg-white/[0.12] backdrop-blur-xl border border-white/[0.1] flex items-center justify-center">
                              <ArrowUpLeft className="w-3.5 h-3.5 text-white/80" />
                            </div>
                          </div>

                          {/* Bottom content overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <div className="flex items-end justify-between gap-3">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                {/* Favicon with glow ring */}
                                <div className="relative shrink-0">
                                  <div className="w-10 h-10 rounded-xl bg-white/[0.12] backdrop-blur-xl border border-white/[0.15] flex items-center justify-center overflow-hidden shadow-lg shadow-black/20">
                                    <img
                                      src={getFaviconUrl(site.url)}
                                      alt=""
                                      className="w-6 h-6 object-contain"
                                      onError={(e) => {
                                        const el = e.target as HTMLImageElement;
                                        el.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                </div>
                                <div className="min-w-0">
                                  <h3
                                    className="text-[15px] font-bold text-white truncate leading-tight"
                                    style={{ fontFamily: "var(--font-cairo), 'Cairo', 'Noto Sans Arabic', sans-serif" }}
                                  >
                                    {site.name}
                                  </h3>
                                  {site.description && (
                                    <p
                                      className="text-[11px] text-white/50 mt-0.5 truncate leading-relaxed"
                                      style={{ fontFamily: "var(--font-cairo), 'Cairo', sans-serif" }}
                                    >
                                      {site.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom visit bar */}
                        <div className="px-4 py-2.5 flex items-center justify-between bg-white/[0.02] border-t border-white/[0.04]">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-violet-400/40" />
                            <span
                              className="text-[10px] text-white/20 font-medium"
                              style={{ fontFamily: "var(--font-cairo), 'Cairo', sans-serif" }}
                            >
                              موقع موصى به
                            </span>
                          </div>
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-blue-400/70 bg-blue-500/[0.08] border border-blue-500/[0.1] group-hover:bg-blue-500/[0.15] group-hover:text-blue-300 group-hover:border-blue-500/[0.2] transition-all duration-300 active:scale-95"
                            style={{ fontFamily: "var(--font-cairo), 'Cairo', sans-serif" }}
                          >
                            زيارة
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Card without image */
                      <div className="p-4">
                        {/* Top accent line */}
                        <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

                        <div className="flex items-start gap-3">
                          {/* Favicon with animated ring */}
                          <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center overflow-hidden group-hover:bg-white/[0.08] group-hover:border-white/[0.12] transition-all duration-300 group-hover:scale-105">
                              <img
                                src={getFaviconUrl(site.url)}
                                alt=""
                                className="w-7 h-7 object-contain"
                                onError={(e) => {
                                  const el = e.target as HTMLImageElement;
                                  el.style.display = 'none';
                                  el.parentElement!.innerHTML = `<span class="text-lg font-bold" style="font-family:var(--font-cairo),'Cairo',sans-serif;color:rgba(255,255,255,0.3)">${site.name[0]}</span>`;
                                }}
                              />
                            </div>
                            {/* Hover glow ring */}
                            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-blue-500/0 to-violet-500/0 group-hover:from-blue-500/10 group-hover:to-violet-500/10 transition-all duration-500 blur-sm -z-10" />
                          </div>

                          {/* Site Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3
                                className="text-[15px] font-bold text-white/90 truncate group-hover:text-white transition-colors duration-300"
                                style={{ fontFamily: "var(--font-cairo), 'Cairo', 'Noto Sans Arabic', sans-serif" }}
                              >
                                {site.name}
                              </h3>
                              <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <ArrowUpLeft className="w-3 h-3 text-blue-400/50" />
                              </div>
                            </div>
                            <p
                              className="text-[10px] text-white/20 truncate mt-0.5"
                              dir="ltr"
                              style={{ fontFamily: "var(--font-cairo), 'Cairo', sans-serif" }}
                            >
                              {getDomainFromUrl(site.url)}
                            </p>
                            {site.description && (
                              <p
                                className="text-[11px] text-white/25 mt-2 line-clamp-2 leading-relaxed group-hover:text-white/35 transition-colors duration-300"
                                style={{ fontFamily: "var(--font-cairo), 'Cairo', sans-serif" }}
                              >
                                {site.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Visit Button */}
                        <div className="flex items-center justify-end mt-3 pt-3 border-t border-white/[0.04]">
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-white/25 bg-white/[0.03] border border-white/[0.06] group-hover:bg-blue-500/[0.08] group-hover:text-blue-300 group-hover:border-blue-500/[0.15] transition-all duration-300 active:scale-95"
                            style={{ fontFamily: "var(--font-cairo), 'Cairo', sans-serif" }}
                          >
                            زيارة الموقع
                            <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      </div>
                    )}
                  </GradientCard>
                </motion.a>
              );
            })}
          </div>
        </AnimatePresence>

        {/* Bottom spacing */}
        <div className="h-8" />
      </div>
    </div>
  );
}
