'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Globe, ExternalLink, Search } from 'lucide-react';
import { useTheme } from 'next-themes';

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
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
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
  const { theme } = useTheme();
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
        background: 'linear-gradient(170deg, #0c1a2e 0%, #0f2847 30%, #132e4a 60%, #0a1628 100%)',
      }}
    >
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <button
          onClick={() => window.history.back()}
          className="p-2 rounded-full hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white/70" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center">
            <Globe className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white">مواقعنا</h1>
            <p className="text-[10px] text-white/40 -mt-0.5">مجموعة مواقعنا المميزة</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="shrink-0 px-4 py-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن موقع..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-sm text-white placeholder-white/25 focus:outline-none focus:border-primary/30 focus:bg-white/8 transition-all"
            dir="rtl"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-2 pb-6">
        {/* Stats Bar */}
        {!loading && sites.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 flex items-center justify-between"
          >
            <p className="text-xs text-white/40">
              {filteredSites.length} {filteredSites.length === 1 ? 'موقع' : 'مواقع'}
              {searchQuery && ` مطابق للبحث`}
            </p>
          </motion.div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-xs text-white/40">جاري تحميل المواقع...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && sites.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center mb-4">
              <Globe className="w-8 h-8 text-white/20" />
            </div>
            <h3 className="text-base font-bold text-white/60 mb-1">لا توجد مواقع بعد</h3>
            <p className="text-xs text-white/30 max-w-[240px]">
              سيتم إضافة المواقع المميزة قريباً من خلال لوحة التحكم
            </p>
          </motion.div>
        )}

        {/* No Search Results */}
        {!loading && sites.length > 0 && filteredSites.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <Search className="w-8 h-8 text-white/20 mb-3" />
            <p className="text-sm text-white/40">لا توجد نتائج لـ &quot;{searchQuery}&quot;</p>
          </motion.div>
        )}

        {/* Sites Grid */}
        <AnimatePresence mode="wait">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredSites.map((site, index) => (
              <motion.a
                key={site.id}
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer block"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
                  border: '1.5px solid rgba(255,255,255,0.06)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(14,165,233,0.25)';
                  (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(14,165,233,0.08), rgba(14,165,233,0.03))';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                  (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))';
                }}
              >
                {/* Site Image (if available) */}
                {site.imageUrl && (
                  <div className="relative h-36 w-full overflow-hidden">
                    <img
                      src={site.imageUrl}
                      alt={site.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    {/* Name overlay on image */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white truncate">{site.name}</h3>
                        <ExternalLink className="w-3 h-3 text-white/50 shrink-0" />
                      </div>
                      {site.description && (
                        <p className="text-[11px] text-white/70 mt-0.5 line-clamp-1">{site.description}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Content area */}
                <div className={site.imageUrl ? 'p-3 pt-2' : 'p-4'}>
                  {/* Top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {!site.imageUrl && (
                    <div className="flex items-start gap-3">
                      {/* Site Icon / Favicon */}
                      <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/8 border border-primary/10 flex items-center justify-center overflow-hidden group-hover:border-primary/25 transition-colors">
                        {site.iconUrl ? (
                          <img
                            src={site.iconUrl}
                            alt={site.name}
                            className="w-8 h-8 object-contain rounded"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-lg font-black text-primary">${site.name[0]}</span>`;
                            }}
                          />
                        ) : (
                          <img
                            src={getFaviconUrl(site.url)}
                            alt=""
                            className="w-7 h-7 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-lg font-black text-primary">${site.name[0]}</span>`;
                            }}
                          />
                        )}
                      </div>

                      {/* Site Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white truncate group-hover:text-primary transition-colors">
                            {site.name}
                          </h3>
                          <ExternalLink className="w-3 h-3 text-white/20 group-hover:text-primary/50 transition-colors shrink-0" />
                        </div>
                        <p className="text-[11px] text-white/30 truncate mt-0.5" dir="ltr">
                          {getDomainFromUrl(site.url)}
                        </p>
                        {site.description && (
                          <p className="text-xs text-white/40 mt-2 line-clamp-2 leading-relaxed">
                            {site.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Visit Button */}
                  <div className="flex items-center justify-end">
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold text-primary/70 bg-primary/5 border border-primary/10 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      زيارة الموقع
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        </AnimatePresence>

        {/* Bottom spacing */}
        <div className="h-6" />
      </div>
    </div>
  );
}
