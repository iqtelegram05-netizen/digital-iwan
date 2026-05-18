'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Globe, ExternalLink, Search, ArrowUpLeft, ChevronLeft } from 'lucide-react';

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

  // Split into featured (with image) and regular sites
  const featuredSites = filteredSites.filter(s => s.imageUrl);
  const regularSites = filteredSites.filter(s => !s.imageUrl);

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-[#05070a]">
      {/* Subtle mesh gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-indigo-900/[0.07] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-950/[0.08] rounded-full blur-[150px]" />
      </div>

      {/* Header */}
      <motion.header
        className="shrink-0 px-5 pt-5 pb-4 relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => window.history.back()}
            className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </button>

          <div className="text-center">
            <h1
              className="text-[22px] font-extrabold text-white"
              style={{
                fontFamily: "'Readex Pro', 'IBM Plex Sans Arabic', sans-serif",
                letterSpacing: '-0.02em',
              }}
            >
              المواقع
            </h1>
          </div>

          <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center">
            <Globe className="w-4 h-4 text-white/40" />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-[15px] h-[15px] text-white/15" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث هنا..."
            className="w-full pr-11 pl-4 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-[13px] text-white/80 placeholder-white/15 focus:outline-none focus:bg-white/[0.06] focus:border-white/[0.1] transition-all duration-300"
            dir="rtl"
            style={{ fontFamily: "'Readex Pro', sans-serif" }}
          />
        </div>
      </motion.header>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 pb-10 relative z-10">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-white/[0.08] border-t-white/30 rounded-full animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && sites.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center py-24"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4">
              <Globe className="w-7 h-7 text-white/[0.08]" />
            </div>
            <p className="text-[13px] text-white/20" style={{ fontFamily: "'Readex Pro', sans-serif" }}>
              لا توجد مواقع مضافة بعد
            </p>
          </motion.div>
        )}

        {/* No results */}
        {!loading && sites.length > 0 && filteredSites.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-20"
          >
            <p className="text-[13px] text-white/20" style={{ fontFamily: "'Readex Pro', sans-serif" }}>
              لا توجد نتائج
            </p>
          </motion.div>
        )}

        {/* Featured Sites (with images) - Horizontal scroll cards */}
        {featuredSites.length > 0 && (
          <div className="mb-6">
            <AnimatePresence mode="wait">
              {featuredSites.map((site, index) => (
                <motion.a
                  key={site.id}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block mb-4 last:mb-0"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                >
                  <div className="relative rounded-[20px] overflow-hidden bg-white/[0.03] border border-white/[0.06] active:scale-[0.98] transition-transform duration-200">
                    {/* Image */}
                    <div className="relative h-36 w-full overflow-hidden">
                      <img
                        src={site.imageUrl}
                        alt={site.name}
                        className="w-full h-full object-cover transition-transform duration-600 group-hover:scale-[1.06]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-[#05070a]/40 to-transparent" />

                      {/* Domain badge - top right */}
                      <div className="absolute top-3 left-3">
                        <div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md">
                          <span
                            className="text-[10px] text-white/60 font-medium tracking-wide"
                            style={{ fontFamily: "'IBM Plex Sans Arabic', monospace" }}
                            dir="ltr"
                          >
                            {getDomainFromUrl(site.url)}
                          </span>
                        </div>
                      </div>

                      {/* Visit icon - top left */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                          <ArrowUpLeft className="w-3.5 h-3.5 text-white/70" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                            <img
                              src={getFaviconUrl(site.url)}
                              alt=""
                              className="w-5 h-5 object-contain"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                          <div className="min-w-0">
                            <h3
                              className="text-[16px] font-bold text-white leading-snug"
                              style={{
                                fontFamily: "'Readex Pro', sans-serif",
                                letterSpacing: '-0.01em',
                              }}
                            >
                              {site.name}
                            </h3>
                            {site.description && (
                              <p
                                className="text-[11px] text-white/45 mt-0.5 truncate leading-relaxed"
                                style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
                              >
                                {site.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.a>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Regular Sites - Clean list items */}
        {regularSites.length > 0 && featuredSites.length > 0 && (
          <div className="flex items-center gap-2 mb-3 mt-2 px-1">
            <div className="h-[1px] flex-1 bg-white/[0.04]" />
            <span
              className="text-[10px] text-white/15 font-medium uppercase tracking-widest"
              style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
            >
              المزيد من المواقع
            </span>
            <div className="h-[1px] flex-1 bg-white/[0.04]" />
          </div>
        )}

        {regularSites.length > 0 && (
          <div className="space-y-2">
            <AnimatePresence mode="wait">
              {regularSites.map((site, index) => (
                <motion.a
                  key={site.id}
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: (featuredSites.length + index) * 0.04, duration: 0.35 }}
                >
                  <div className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-white/[0.025] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.08] active:scale-[0.98] transition-all duration-200">
                    {/* Favicon */}
                    <div className="shrink-0 w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.06] flex items-center justify-center overflow-hidden group-hover:bg-white/[0.08] transition-colors">
                      <img
                        src={getFaviconUrl(site.url)}
                        alt=""
                        className="w-5 h-5 object-contain"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.style.display = 'none';
                          el.parentElement!.innerHTML = `<span class="text-sm font-bold" style="font-family:'Readex Pro',sans-serif;color:rgba(255,255,255,0.2)">${site.name[0]}</span>`;
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-[14px] font-semibold text-white/85 truncate group-hover:text-white transition-colors leading-tight"
                        style={{
                          fontFamily: "'Readex Pro', sans-serif",
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {site.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-[10px] text-white/20 truncate"
                          dir="ltr"
                          style={{ fontFamily: "'IBM Plex Sans Arabic', monospace" }}
                        >
                          {getDomainFromUrl(site.url)}
                        </span>
                        {site.description && (
                          <>
                            <span className="text-white/[0.06]">·</span>
                            <span
                              className="text-[10px] text-white/20 truncate"
                              style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
                            >
                              {site.description}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="shrink-0">
                      <ChevronLeft className="w-4 h-4 text-white/[0.12] group-hover:text-white/30 group-hover:-translate-x-0.5 transition-all duration-200" />
                    </div>
                  </div>
                </motion.a>
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="h-6" />
      </div>
    </div>
  );
}
