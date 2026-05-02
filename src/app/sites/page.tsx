'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Globe, ExternalLink, Search, ArrowUpLeft, Sparkles } from 'lucide-react';

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

// Color palette for site cards without images
const CARD_ACCENTS = [
  { gradient: 'from-blue-500/20 via-cyan-500/10 to-blue-600/5', border: 'border-blue-500/15', hoverBorder: 'rgba(59,130,246,0.35)', iconBg: 'bg-blue-500/10', glow: 'rgba(59,130,246,0.15)' },
  { gradient: 'from-purple-500/20 via-violet-500/10 to-purple-600/5', border: 'border-purple-500/15', hoverBorder: 'rgba(168,85,247,0.35)', iconBg: 'bg-purple-500/10', glow: 'rgba(168,85,247,0.15)' },
  { gradient: 'from-emerald-500/20 via-teal-500/10 to-emerald-600/5', border: 'border-emerald-500/15', hoverBorder: 'rgba(16,185,129,0.35)', iconBg: 'bg-emerald-500/10', glow: 'rgba(16,185,129,0.15)' },
  { gradient: 'from-amber-500/20 via-orange-500/10 to-amber-600/5', border: 'border-amber-500/15', hoverBorder: 'rgba(245,158,11,0.35)', iconBg: 'bg-amber-500/10', glow: 'rgba(245,158,11,0.15)' },
  { gradient: 'from-rose-500/20 via-pink-500/10 to-rose-600/5', border: 'border-rose-500/15', hoverBorder: 'rgba(244,63,94,0.35)', iconBg: 'bg-rose-500/10', glow: 'rgba(244,63,94,0.15)' },
  { gradient: 'from-sky-500/20 via-blue-400/10 to-sky-600/5', border: 'border-sky-500/15', hoverBorder: 'rgba(14,165,233,0.35)', iconBg: 'bg-sky-500/10', glow: 'rgba(14,165,233,0.15)' },
];

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
        background: 'linear-gradient(170deg, #080e1a 0%, #0d1b30 25%, #111f38 50%, #0a1525 75%, #060c18 100%)',
      }}
    >
      {/* Header */}
      <motion.div
        className="shrink-0 px-4 pt-4 pb-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => window.history.back()}
            className="p-2.5 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 hover:border-white/15 transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0d1b30]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Noto Kufi Arabic', 'IBM Plex Sans Arabic', sans-serif" }}>
                مواقعنا
              </h1>
              <p className="text-[11px] text-white/35 mt-0.5" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
                مجموعة مواقعنا المميزة
              </p>
            </div>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-white/5 border border-white/8">
            <span className="text-[10px] text-white/40 font-medium">{sites.length} موقع</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-blue-400 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن موقع..."
            className="w-full pr-10 pl-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-500/30 focus:bg-white/[0.05] transition-all duration-300"
            dir="rtl"
            style={{ fontFamily: "'IBM Plex Sans Arabic', 'Noto Sans Arabic', sans-serif" }}
          />
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 border-2 border-blue-500/20 border-t-blue-400 rounded-full animate-spin" />
                <Globe className="w-5 h-5 text-blue-400/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-xs text-white/30" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>جاري تحميل المواقع...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && sites.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500/5 to-cyan-500/3 border border-white/5 flex items-center justify-center mb-5">
              <Globe className="w-10 h-10 text-white/10" />
            </div>
            <h3 className="text-lg font-bold text-white/50 mb-2" style={{ fontFamily: "'Noto Kufi Arabic', sans-serif" }}>لا توجد مواقع بعد</h3>
            <p className="text-xs text-white/25 max-w-[260px] leading-relaxed" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              سيتم إضافة المواقع المميزة قريباً من خلال لوحة التحكم
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
            <Search className="w-8 h-8 text-white/15 mb-3" />
            <p className="text-sm text-white/30" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              لا توجد نتائج لـ &quot;{searchQuery}&quot;
            </p>
          </motion.div>
        )}

        {/* Sites Grid */}
        <AnimatePresence mode="wait">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredSites.map((site, index) => {
              const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
              return (
                <motion.a
                  key={site.id}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.06, duration: 0.4, ease: 'easeOut' }}
                  className="group relative block rounded-2xl overflow-hidden cursor-pointer"
                  style={{
                    border: '1px solid rgba(255,255,255,0.05)',
                    background: 'rgba(255,255,255,0.015)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = accent.hoverBorder;
                    el.style.boxShadow = `0 8px 40px ${accent.glow}, 0 0 0 1px ${accent.hoverBorder}`;
                    el.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = 'rgba(255,255,255,0.05)';
                    el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.15)';
                    el.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Card with image */}
                  {site.imageUrl ? (
                    <div>
                      {/* Image */}
                      <div className="relative h-36 w-full overflow-hidden">
                        <img
                          src={site.imageUrl}
                          alt={site.name}
                          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        />
                        {/* Multi-layer gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
                        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />

                        {/* External link indicator */}
                        <div className="absolute top-2.5 left-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                          <div className="w-7 h-7 rounded-lg bg-white/15 backdrop-blur-md border border-white/10 flex items-center justify-center">
                            <ArrowUpLeft className="w-3.5 h-3.5 text-white/80" />
                          </div>
                        </div>

                        {/* Content on image */}
                        <div className="absolute bottom-0 left-0 right-0 p-3.5">
                          {/* Favicon + Name */}
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-md border border-white/15 flex items-center justify-center shrink-0 overflow-hidden">
                              <img
                                src={getFaviconUrl(site.url)}
                                alt=""
                                className="w-5 h-5 object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3
                                className="text-[15px] font-bold text-white truncate drop-shadow-lg"
                                style={{ fontFamily: "'Noto Kufi Arabic', 'IBM Plex Sans Arabic', sans-serif" }}
                              >
                                {site.name}
                              </h3>
                            </div>
                          </div>
                          {site.description && (
                            <p
                              className="text-[11px] text-white/60 mt-1.5 line-clamp-1 mr-[42px]"
                              style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
                            >
                              {site.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Bottom bar */}
                      <div className="px-3.5 py-2.5 bg-white/[0.02] border-t border-white/[0.04] flex items-center justify-between">
                        <p className="text-[10px] text-white/20 truncate mr-2" dir="ltr" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
                          {getDomainFromUrl(site.url)}
                        </p>
                        <span
                          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium text-blue-400/60 bg-blue-500/5 border border-blue-500/10 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-all duration-300"
                          style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
                        >
                          زيارة
                          <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Card without image */
                    <div className={`p-4 bg-gradient-to-br ${accent.gradient}`}>
                      {/* Top accent glow */}
                      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                      <div className="flex items-start gap-3.5">
                        {/* Favicon */}
                        <div className={`shrink-0 w-12 h-12 rounded-xl ${accent.iconBg} border ${accent.border} flex items-center justify-center overflow-hidden group-hover:scale-105 transition-transform duration-300`}>
                          <img
                            src={getFaviconUrl(site.url)}
                            alt=""
                            className="w-7 h-7 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-base font-bold" style="font-family:'Noto Kufi Arabic',sans-serif;color:rgba(255,255,255,0.4)">${site.name[0]}</span>`;
                            }}
                          />
                        </div>

                        {/* Site Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3
                              className="text-[15px] font-bold text-white truncate group-hover:text-blue-300 transition-colors duration-300"
                              style={{ fontFamily: "'Noto Kufi Arabic', 'IBM Plex Sans Arabic', sans-serif" }}
                            >
                              {site.name}
                            </h3>
                            <ExternalLink className="w-3 h-3 text-white/15 group-hover:text-blue-400/50 transition-colors shrink-0" />
                          </div>
                          <p
                            className="text-[10px] text-white/20 truncate mt-1"
                            dir="ltr"
                            style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
                          >
                            {getDomainFromUrl(site.url)}
                          </p>
                          {site.description && (
                            <p
                              className="text-[11px] text-white/30 mt-2 line-clamp-2 leading-relaxed group-hover:text-white/40 transition-colors duration-300"
                              style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
                            >
                              {site.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Visit Button */}
                      <div className="flex items-center justify-end mt-3.5 pt-3 border-t border-white/[0.04]">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-medium text-white/30 bg-white/[0.03] border border-white/[0.06] group-hover:bg-white/[0.06] group-hover:text-blue-400 group-hover:border-blue-500/15 transition-all duration-300"
                          style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
                        >
                          زيارة الموقع
                          <ArrowUpLeft className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Shine effect on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 45%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.03) 55%, transparent 60%)',
                    }}
                  />
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
