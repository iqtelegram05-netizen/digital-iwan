'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Trash2, BookOpen, Link2, Save, RefreshCw,
  ChevronDown, ChevronUp, ExternalLink, Settings, GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SCHOLARS = [
  'السيد السيستاني',
  'السيد كمال الحيدري',
  'السيد القزويني',
  'السيد محمد صادق الصدر',
  'الشيخ بشير النجفي',
  'السيد الشيرازي',
];

interface ScholarSource {
  id: string;
  scholarName: string;
  title: string;
  sourceType: string;
  url: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ScholarSourcesModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ScholarSourcesModal({ open, onClose }: ScholarSourcesModalProps) {
  const [selectedScholar, setSelectedScholar] = useState(SCHOLARS[0]);
  const [customScholar, setCustomScholar] = useState('');
  const [showCustomScholar, setShowCustomScholar] = useState(false);
  const [sources, setSources] = useState<ScholarSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // نموذج إضافة مصدر جديد
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'book' | 'link'>('book');
  const [newUrl, setNewUrl] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // حالة عرض الكتب/الروابط
  const [expandedBooks, setExpandedBooks] = useState(true);
  const [expandedLinks, setExpandedLinks] = useState(true);

  const fetchSources = useCallback(async (scholar: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/scholar-sources?scholar=${encodeURIComponent(scholar)}`);
      const data = await res.json();
      setSources(data.sources || []);
    } catch (err) {
      console.error('Fetch sources error:', err);
      setSources([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchSources(selectedScholar);
    }
  }, [open, selectedScholar, fetchSources]);

  const handleScholarChange = (scholar: string) => {
    setSelectedScholar(scholar);
    setNewTitle('');
    setNewUrl('');
    setNewDesc('');
  };

  const handleCustomScholar = () => {
    if (customScholar.trim()) {
      setSelectedScholar(customScholar.trim());
      setCustomScholar('');
      setShowCustomScholar(false);
    }
  };

  const handleAddSource = async () => {
    if (!newTitle.trim()) return;

    if (newType === 'link' && !newUrl.trim()) return;

    setIsAdding(true);
    try {
      const res = await fetch('/api/scholar-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scholarName: selectedScholar,
          title: newTitle.trim(),
          sourceType: newType,
          url: newUrl.trim() || undefined,
          description: newDesc.trim() || undefined,
        }),
      });

      if (res.ok) {
        setNewTitle('');
        setNewUrl('');
        setNewDesc('');
        fetchSources(selectedScholar);
      }
    } catch (err) {
      console.error('Add source error:', err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteSource = async (id: string) => {
    try {
      await fetch(`/api/scholar-sources?id=${id}`, { method: 'DELETE' });
      fetchSources(selectedScholar);
    } catch (err) {
      console.error('Delete source error:', err);
    }
  };

  const handleToggleSource = async (source: ScholarSource) => {
    try {
      await fetch('/api/scholar-sources', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: source.id,
          isActive: !source.isActive,
        }),
      });
      fetchSources(selectedScholar);
    } catch (err) {
      console.error('Toggle source error:', err);
    }
  };

  const books = sources.filter(s => s.sourceType === 'book');
  const links = sources.filter(s => s.sourceType === 'link');

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-card border border-border/50 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-primary/5">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">إعدادات المصادر</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Scholar Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  اختر المرجع أو العالم
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {SCHOLARS.map((scholar) => (
                    <button
                      key={scholar}
                      className={`text-[10px] sm:text-xs px-2 py-2 rounded-lg border transition-all ${
                        selectedScholar === scholar
                          ? 'bg-primary text-primary-foreground border-primary shadow-md'
                          : 'bg-card border-border/30 text-muted-foreground hover:border-primary/50 hover:bg-primary/5'
                      }`}
                      onClick={() => handleScholarChange(scholar)}
                    >
                      {scholar}
                    </button>
                  ))}
                </div>

                {/* Custom scholar input */}
                {showCustomScholar ? (
                  <div className="flex gap-1.5">
                    <Input
                      value={customScholar}
                      onChange={(e) => setCustomScholar(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCustomScholar()}
                      placeholder="اسم العالم..."
                      className="text-xs border-primary/20 bg-card/50 h-8"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      className="shrink-0 h-8 w-8 bg-primary hover:bg-primary/90 rounded-lg"
                      onClick={handleCustomScholar}
                    >
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0 h-8 w-8 text-muted-foreground"
                      onClick={() => setShowCustomScholar(false)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <button
                    className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                    onClick={() => setShowCustomScholar(true)}
                  >
                    <Plus className="w-3 h-3" />
                    إضافة عالم آخر...
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-border/20" />

              {/* Current sources count */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  مصادر <span className="font-bold text-foreground">{selectedScholar}</span>
                </span>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{books.length} كتاب</span>
                  <span>·</span>
                  <span>{links.length} رابط</span>
                  {isLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                </div>
              </div>

              {/* Books Section */}
              <div className="space-y-1.5">
                <button
                  className="flex items-center justify-between w-full text-xs font-bold text-foreground/80 hover:text-foreground transition-colors"
                  onClick={() => setExpandedBooks(!expandedBooks)}
                >
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    الكتب ({books.length})
                  </span>
                  {expandedBooks ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <AnimatePresence>
                  {expandedBooks && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {books.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground py-2 px-2 bg-muted/20 rounded-lg text-center">
                          لا توجد كتب مضافة بعد
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {books.map((book) => (
                            <div
                              key={book.id}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all ${
                                book.isActive
                                  ? 'bg-card border-border/20'
                                  : 'bg-muted/10 border-border/10 opacity-50'
                              }`}
                            >
                              <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-foreground truncate">{book.title}</p>
                                {book.description && (
                                  <p className="text-[10px] text-muted-foreground truncate">{book.description}</p>
                                )}
                              </div>
                              <button
                                className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1"
                                onClick={() => handleToggleSource(book)}
                                title={book.isActive ? 'تعطيل' : 'تفعيل'}
                              >
                                {book.isActive ? (
                                  <span className="text-green-500">●</span>
                                ) : (
                                  <span className="text-red-400">○</span>
                                )}
                              </button>
                              <button
                                className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
                                onClick={() => handleDeleteSource(book.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Links Section */}
              <div className="space-y-1.5">
                <button
                  className="flex items-center justify-between w-full text-xs font-bold text-foreground/80 hover:text-foreground transition-colors"
                  onClick={() => setExpandedLinks(!expandedLinks)}
                >
                  <span className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-blue-500" />
                    الروابط ({links.length})
                  </span>
                  {expandedLinks ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <AnimatePresence>
                  {expandedLinks && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      {links.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground py-2 px-2 bg-muted/20 rounded-lg text-center">
                          لا توجد روابط مضافة بعد
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {links.map((link) => (
                            <div
                              key={link.id}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all ${
                                link.isActive
                                  ? 'bg-card border-border/20'
                                  : 'bg-muted/10 border-border/10 opacity-50'
                              }`}
                            >
                              <Link2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-foreground truncate">{link.title}</p>
                                {link.url && (
                                  <p className="text-[9px] text-blue-400/70 truncate">{link.url}</p>
                                )}
                              </div>
                              {link.url && (
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="shrink-0 text-muted-foreground hover:text-blue-500 transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              <button
                                className="shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
                                onClick={() => handleDeleteSource(link.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Divider */}
              <div className="border-t border-border/20" />

              {/* Add New Source Form */}
              <div className="space-y-2.5 bg-primary/3 border border-primary/10 rounded-xl p-3">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  إضافة مصدر جديد لـ {selectedScholar}
                </p>

                {/* Type selector */}
                <div className="flex gap-1.5">
                  <button
                    className={`flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-lg border transition-all ${
                      newType === 'book'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border/30 text-muted-foreground hover:border-primary/50'
                    }`}
                    onClick={() => setNewType('book')}
                  >
                    <BookOpen className="w-3 h-3" />
                    كتاب
                  </button>
                  <button
                    className={`flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-lg border transition-all ${
                      newType === 'link'
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-card border-border/30 text-muted-foreground hover:border-blue-500/50'
                    }`}
                    onClick={() => setNewType('link')}
                  >
                    <Link2 className="w-3 h-3" />
                    رابط
                  </button>
                </div>

                {/* Title */}
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={newType === 'book' ? 'اسم الكتاب (مثال: المنهاج في الفقه)' : 'عنوان الرابط'}
                  className="text-xs border-primary/20 bg-card/50 h-8"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
                />

                {/* URL (for links) */}
                {newType === 'link' && (
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://example.com/fatwa"
                    className="text-xs border-blue-500/20 bg-card/50 h-8"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
                    dir="ltr"
                  />
                )}

                {/* Description */}
                <Input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="وصف اختياري (مثال: الجزء الأول - الطهارة)"
                  className="text-xs border-primary/20 bg-card/50 h-8"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
                />

                {/* Add button */}
                <Button
                  className="w-full h-8 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-lg"
                  onClick={handleAddSource}
                  disabled={isAdding || !newTitle.trim() || (newType === 'link' && !newUrl.trim())}
                >
                  {isAdding ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  إضافة المصدر
                </Button>
              </div>

              {/* Info note */}
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-2.5">
                <p className="text-[10px] text-blue-400/80 leading-relaxed">
                  المصادر المضافة هنا سيتم إرسالها للذكاء الاصطناعي مع كل سؤال، وسيتم استخدامها كمراجع أساسية للإجابة بدلاً من الكتب الافتراضية.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
