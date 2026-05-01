'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ResearchPaper, Footnote, EditorSettings, ClipboardItem } from '@/lib/editorDB';
import {
  savePaper, getPaper, getAllPapers, deletePaper,
  addToClipboard, getAllClipboardItems, clearClipboard,
  generateId, countWords, estimatePages,
  exportPaperAsJSON, importPaperFromJSON
} from '@/lib/editorDB';
import {
  ArrowRight, Plus, Trash2, FileText, Upload, Printer,
  Type, AlignRight, AlignLeft, AlignCenter, AlignJustify,
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  Quote, RotateCcw, Moon, Sun, Palette,
  Sparkles, BookMarked, ChevronDown, X, Check, Copy,
  Save, FileJson, Eye, Hash, ZoomIn, ZoomOut, ImagePlus,
  Paintbrush
} from 'lucide-react';

// ========== Arabic Fonts Map ==========
const ARABIC_FONTS = [
  { name: 'Noto Naskh Arabic', label: 'نسخ عربي', css: "'Noto Naskh Arabic', serif" },
  { name: 'Noto Serif Arabic', label: 'خط عربي', css: "'Noto Serif Arabic', serif" },
  { name: 'Amiri', label: 'أميري', css: "Amiri, serif" },
  { name: 'Scheherazade New', label: 'شهرزاد', css: "'Scheherazade New', serif" },
  { name: 'Lateef', label: 'لطيف', css: "Lateef, serif" },
  { name: 'Markazi Text', label: 'مركزي', css: "'Markazi Text', serif" },
  { name: 'Aref Ruqaa', label: 'عارف رقعة', css: "'Aref Ruqaa', serif" },
  { name: 'Katibeh', label: 'كاتبة', css: "Katibeh, serif" },
  { name: 'Mirza', label: 'ميرزا', css: "Mirza, serif" },
  { name: 'Noto Kufi Arabic', label: 'كوفي', css: "'Noto Kufi Arabic', sans-serif" },
  { name: 'Reem Kufi', label: 'ريم كوفي', css: "'Reem Kufi', sans-serif" },
  { name: 'Lalezar', label: 'لاله زار', css: "Lalezar, display" },
  { name: 'IBM Plex Sans Arabic', label: 'آي بي أم', css: "'IBM Plex Sans Arabic', sans-serif" },
  { name: 'IBM Plex Serif Arabic', label: 'آي بي أم سيريف', css: "'IBM Plex Serif Arabic', serif" },
];

// ========== Islamic Decorations ==========
const DECORATIONS = [
  { id: 'basmala1', label: 'بسملة - أميري', html: '<p style="text-align:center;font-family:Amiri,serif;font-size:28px;color:#1a5276;margin:16px 0;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>' },
  { id: 'basmala2', label: 'بسملة - ثلث', html: '<p style="text-align:center;font-family:Aref Ruqaa,serif;font-size:32px;color:#2c3e50;margin:16px 0;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>' },
  { id: 'basmala3', label: 'بسملة - نستعليق', html: '<p style="text-align:center;font-family:Lateef,serif;font-size:26px;color:#1a5276;margin:16px 0;">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>' },
  { id: 'salawat', label: 'صلاة على محمد وآله', html: '<p style="text-align:center;font-family:Amiri,serif;font-size:20px;color:#6c3483;margin:12px 0;">اَللّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَآلِ مُحَمَّدٍ</p>' },
  { id: 'separator1', label: 'فاصل - نجمة', html: '<div style="text-align:center;margin:20px 0;color:#0ea5e9;font-size:18px;">✦ ❖ ✦</div>' },
  { id: 'separator2', label: 'فاصل - هندسي', html: '<div style="text-align:center;margin:20px 0;color:#0ea5e9;font-size:14px;letter-spacing:4px;">◈ ◇ ◈ ◇ ◈</div>' },
  { id: 'separator3', label: 'فاصل - زخرفي', html: '<div style="text-align:center;margin:20px 0;color:#1a5276;font-size:16px;">❊ ❊ ❊ ❊ ❊</div>' },
  { id: 'frame1', label: 'إطار - عنوان مزخرف', html: '<div style="border:2px solid #0ea5e9;border-radius:12px;padding:16px;margin:16px 0;text-align:center;"><p style="font-family:Amiri,serif;font-size:22px;color:#1a5276;">العنوان هنا</p></div>' },
  { id: 'ayah', label: 'آية كريمة', html: '<div style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-right:4px solid #0ea5e9;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0;"><p style="font-family:Amiri,serif;font-size:18px;color:#0c4a6e;line-height:2.2;">﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾</p><p style="font-size:12px;color:#6b7280;margin-top:4px;">سورة طه - الآية ١١٤</p></div>' },
];

// ========== Color Palettes ==========
const TEXT_COLORS = [
  '#1a1a2e', '#1a5276', '#0c4a6e', '#14532d', '#6c3483',
  '#92400e', '#991b1b', '#1e40af', '#dc2626', '#e97a1f',
  '#059669', '#7c3aed', '#db2777', '#0891b2', '#000000',
];
const BG_COLORS = [
  '#fef3c7', '#fce7f3', '#dbeafe', '#d1fae5', '#ede9fe',
  '#fed7aa', '#fecdd3', '#e0e7ff', '#ccfbf1', '#f3e8ff',
  '#fef08a', '#d9f99d', '#bfdbfe', '#a5f3fc', '#fbcfe8',
  '#f5f5f4', '#e7e5e4', '#d6d3d1', '#fecaca', '#fde68a',
];

const DEFAULT_SETTINGS: EditorSettings = {
  fontFamily: 'Noto Naskh Arabic',
  fontSize: 16,
  lineHeight: 2.2,
  letterSpacing: 0,
  textAlign: 'justify',
  marginTop: 40,
  marginBottom: 40,
  marginLeft: 60,
  marginRight: 60,
  darkMode: false,
  showRulers: true,
  pageBorder: true,
};

// ========== Main Component ==========
export default function EditorView() {
  const [papers, setPapers] = useState<ResearchPaper[]>([]);
  const [currentPaper, setCurrentPaper] = useState<ResearchPaper | null>(null);
  const [showList, setShowList] = useState(true);

  const [title, setTitle] = useState('');
  const [settings, setSettings] = useState<EditorSettings>(DEFAULT_SETTINGS);
  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);

  // Zoom level
  const [zoomLevel, setZoomLevel] = useState(100);

  // UI state
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [showDecorDropdown, setShowDecorDropdown] = useState(false);
  const [showClipboard, setShowClipboard] = useState(false);
  const [clipboardItems, setClipboardItems] = useState<ClipboardItem[]>([]);
  const [wordCount, setWordCount] = useState(0);
  const [footnotes, setFootnotes] = useState<Footnote[]>([]);
  const [footnoteCounter, setFootnoteCounter] = useState(1);
  const [showFootnotes, setShowFootnotes] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Floating toolbar state
  const [floatingToolbar, setFloatingToolbar] = useState<{
    visible: boolean; x: number; y: number;
  }>({ visible: false, x: 0, y: 0 });
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = useState(false);

  // Dropdown position refs (for fixed positioning)
  const fontBtnRef = useRef<HTMLButtonElement>(null);
  const decorBtnRef = useRef<HTMLButtonElement>(null);
  const [fontDropdownPos, setFontDropdownPos] = useState({ top: 0, right: 0 });
  const [decorDropdownPos, setDecorDropdownPos] = useState({ top: 0, right: 0 });

  // Track last loaded paper ID to avoid content reset
  const lastLoadedPaperId = useRef<string | null>(null);

  // ========== Apply editor styles directly to DOM ==========
  const applyEditorStyles = useCallback(() => {
    if (!editorRef.current) return;
    const currentFontCSS = ARABIC_FONTS.find(f => f.name === settings.fontFamily)?.css || "'Noto Naskh Arabic', serif";
    editorRef.current.style.fontFamily = currentFontCSS;
    editorRef.current.style.fontSize = `${settings.fontSize}px`;
    editorRef.current.style.lineHeight = String(settings.lineHeight);
    editorRef.current.style.letterSpacing = `${settings.letterSpacing}px`;
    editorRef.current.style.textAlign = settings.textAlign;
    editorRef.current.style.color = settings.darkMode ? '#e2e8f0' : '#1e293b';
  }, [settings]);

  // ========== Load content into editor ONLY on paper change ==========
  useEffect(() => {
    if (currentPaper && editorRef.current && currentPaper.id !== lastLoadedPaperId.current) {
      editorRef.current.innerHTML = currentPaper.htmlContent || '';
      lastLoadedPaperId.current = currentPaper.id;
      setWordCount(currentPaper.wordCount || 0);
      // Apply styles after content loads
      setTimeout(() => applyEditorStyles(), 0);
    }
  }, [currentPaper, applyEditorStyles]);

  // ========== Close dropdowns on outside click ==========
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showFontDropdown && !target.closest('[data-font-dropdown]')) setShowFontDropdown(false);
      if (showDecorDropdown && !target.closest('[data-decor-dropdown]')) setShowDecorDropdown(false);
      if (showTextColorPicker && !target.closest('[data-text-color-picker]')) setShowTextColorPicker(false);
      if (showBgColorPicker && !target.closest('[data-bg-color-picker]')) setShowBgColorPicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFontDropdown, showDecorDropdown, showTextColorPicker, showBgColorPicker]);

  // ========== Load Papers ==========
  useEffect(() => { loadPapers(); }, []);

  const loadPapers = async () => {
    try {
      const all = await getAllPapers();
      setPapers(all);
    } catch (e) {
      console.error('Failed to load papers:', e);
    }
  };

  // ========== Auto Save ==========
  useEffect(() => {
    if (!currentPaper) return;
    autoSaveTimerRef.current = setInterval(() => { handleAutoSave(); }, 5000);
    return () => { if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current); };
  }, [currentPaper, title, settings, footnotes]);

  const handleAutoSave = useCallback(async () => {
    if (!editorRef.current || !currentPaper) return;
    const content = editorRef.current.innerText || '';
    const htmlContent = editorRef.current.innerHTML || '';
    const wc = countWords(content);
    setWordCount(wc);

    const updated: ResearchPaper = {
      ...currentPaper,
      title: title || 'بدون عنوان',
      content,
      htmlContent,
      footnotes,
      settings,
      updatedAt: Date.now(),
      wordCount: wc,
    };

    try {
      await savePaper(updated);
      setCurrentPaper(updated);
      setLastSaved(new Date().toLocaleTimeString('ar'));
      setShowSaveIndicator(true);
      setTimeout(() => setShowSaveIndicator(false), 2000);
    } catch (e) {
      console.error('Auto-save failed:', e);
    }
  }, [currentPaper, title, settings, footnotes]);

  // ========== Create New Paper ==========
  const createNewPaper = async () => {
    const id = generateId();
    const paper: ResearchPaper = {
      id, title: 'بحث جديد', content: '', htmlContent: '',
      footnotes: [], settings: DEFAULT_SETTINGS,
      createdAt: Date.now(), updatedAt: Date.now(), wordCount: 0,
    };
    await savePaper(paper);
    setCurrentPaper(paper);
    setTitle(paper.title);
    setSettings(paper.settings);
    setFootnotes([]);
    setFootnoteCounter(1);
    setWordCount(0);
    setShowList(false);
    setZoomLevel(100);
    setLastSaved(new Date().toLocaleTimeString('ar'));
    await loadPapers();
  };

  // ========== Open Paper ==========
  const openPaper = async (paper: ResearchPaper) => {
    setCurrentPaper(paper);
    setTitle(paper.title);
    setSettings(paper.settings);
    setFootnotes(paper.footnotes || []);
    setFootnoteCounter((paper.footnotes || []).length + 1);
    setWordCount(paper.wordCount || 0);
    setZoomLevel(100);
    setShowList(false);
  };

  // ========== Delete Paper ==========
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deletePaper(id);
    await loadPapers();
    if (currentPaper?.id === id) {
      setCurrentPaper(null);
      setShowList(true);
      lastLoadedPaperId.current = null;
    }
  };

  // ========== Editor Commands ==========
  const execCmd = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
  }, []);

  const insertHTML = useCallback((html: string) => {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
  }, []);

  // ========== Dropdown position calculators ==========
  const calcFontDropdownPos = () => {
    if (fontBtnRef.current) {
      const rect = fontBtnRef.current.getBoundingClientRect();
      setFontDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.left });
    }
  };

  const calcDecorDropdownPos = () => {
    if (decorBtnRef.current) {
      const rect = decorBtnRef.current.getBoundingClientRect();
      setDecorDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
  };

  // ========== Selection / Floating Toolbar ==========
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0 && editorRef.current?.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setFloatingToolbar({
          visible: true,
          x: rect.left + rect.width / 2 - 160,
          y: rect.top - 56,
        });
      } else {
        setFloatingToolbar(prev => ({ ...prev, visible: false }));
        setShowTextColorPicker(false);
        setShowBgColorPicker(false);
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  // ========== Add Footnote ==========
  const addFootnote = () => {
    const sel = window.getSelection();
    const selectedText = sel?.toString();
    if (!selectedText?.trim() || !editorRef.current) return;

    const fn: Footnote = {
      id: `fn_${Date.now()}`,
      number: footnoteCounter,
      text: selectedText,
      source: '',
    };

    setFootnotes(prev => [...prev, fn]);
    setFootnoteCounter(prev => prev + 1);

    const superscript = document.createElement('sup');
    superscript.style.cssText = 'color:#0ea5e9;cursor:pointer;font-size:10px;';
    superscript.textContent = String(fn.number);
    const range = sel.getRangeAt(0);
    if (range) {
      range.deleteContents();
      range.insertNode(superscript);
    }

    setShowFootnotes(true);
  };

  // ========== Insert Image ==========
  const handleImageInsert = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editorRef.current) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      editorRef.current?.focus();
      const imgHtml = `<img src="${base64}" style="max-width:100%;height:auto;display:block;margin:12px auto;border-radius:4px;" alt="صورة" />`;
      document.execCommand('insertHTML', false, imgHtml);
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  // ========== Clipboard ==========
  const loadClipboard = async () => {
    const items = await getAllClipboardItems();
    setClipboardItems(items);
  };

  useEffect(() => {
    const handleCopy = () => {
      const sel = window.getSelection();
      const text = sel?.toString();
      if (text && text.trim().length > 3 && currentPaper) {
        addToClipboard({ text: text.trim(), source: currentPaper.title });
      }
    };
    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, [currentPaper]);

  // ========== Export PDF ==========
  const exportPDF = () => {
    const content = editorRef.current?.innerHTML || '';
    const fnHtml = footnotes.length > 0
      ? `<hr style="margin:20px 0;border:1px solid #ddd;"/><h3 style="font-family:Amiri,serif;">الهوامش</h3>${footnotes.map(fn => `<p style="font-size:12px;color:#666;"><sup>${fn.number}</sup> ${fn.text}${fn.source ? ` — <em>${fn.source}</em>` : ''}</p>`).join('')}`
      : '';

    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Naskh+Arabic:wght@400;700&family=Noto+Serif+Arabic:wght@400;700&family=Aref+Ruqaa:wght@400;700&family=Lateef:wght@400;700&family=Markazi+Text:wght@400;700&family=Katibeh&family=Mirza:wght@400;700&family=Noto+Kufi+Arabic:wght@400;700&family=Reem+Kufi:wght@400;700&family=Lalezar&family=IBM+Plex+Sans+Arabic:wght@400;700&family=IBM+Plex+Serif+Arabic:wght@400;700&family=Scheherazade+New:wght@400;700&display=swap" rel="stylesheet">
      <style>
        body{font-family:'${settings.fontFamily}',serif;font-size:${settings.fontSize}px;line-height:${settings.lineHeight};letter-spacing:${settings.letterSpacing}px;padding:${settings.marginTop}px ${settings.marginRight}px ${settings.marginBottom}px ${settings.marginLeft}px;text-align:${settings.textAlign};direction:rtl;max-width:210mm;margin:0 auto;background:#fff;color:#1a1a2e;}
        h1{text-align:center;margin-bottom:30px;color:#1a5276;font-size:28px;}
        .watermark{position:fixed;bottom:10px;left:10px;opacity:0.15;font-size:11px;color:#999;}
        @media print{.watermark{display:none;}.no-print{display:none;}}
        sup{color:#0ea5e9;cursor:pointer;}
        img{max-width:100%;height:auto;}
      </style></head><body>
      <h1>${title || 'بدون عنوان'}</h1>
      <div>${content}</div>
      ${fnHtml}
      <div class="watermark">الإيوان الرقمي — Digital Iwan — فريق قلم كود</div>
      <script>setTimeout(()=>{window.print();},500);</script>
      </body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  // ========== Export JSON ==========
  const exportJSON = async () => {
    if (!currentPaper) return;
    const json = await exportPaperAsJSON(currentPaper);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPaper.title}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ========== Import JSON ==========
  const importJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const paper = await importPaperFromJSON(text);
      await loadPapers();
      openPaper(paper);
      setShowImportDialog(false);
    } catch (err) {
      alert('خطأ في استيراد الملف. تأكد من صيغة JSON.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleDarkMode = () => setSettings(s => ({ ...s, darkMode: !s.darkMode }));

  // ========== Dynamic button styles for dark mode ==========
  const isDark = settings.darkMode;
  const btnBase = isDark
    ? "p-1.5 rounded-lg transition-colors cursor-pointer"
    : "p-1.5 rounded-lg hover:bg-primary/10 transition-colors text-foreground/70 hover:text-primary cursor-pointer";
  const btnDark = isDark
    ? `${btnBase} hover:bg-white/10 text-gray-300 hover:text-white`
    : btnBase;
  const activeBtnDark = isDark
    ? "p-1.5 rounded-lg bg-white/15 text-white transition-colors"
    : "p-1.5 rounded-lg bg-primary/15 text-primary transition-colors";

  const selectStyleDark = isDark
    ? { background: '#334155', borderColor: 'rgba(255,255,255,0.15)', color: '#e2e8f0' }
    : { background: '#f8fafc', borderColor: 'rgba(0,0,0,0.1)', color: '#1e293b' };
  const optionStyle = isDark ? { background: '#1e293b', color: '#e2e8f0' } : { background: '#ffffff', color: '#1e293b' };

  // ========== RENDER: Papers List ==========
  if (showList && !currentPaper) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: isDark ? '#0f172a' : '#f8fafc' }}>
        <div className="shrink-0 border-b px-4 py-3" style={{
          background: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        }}>
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.15), rgba(14,165,233,0.05))' }}>
                <BookMarked className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-bold" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>محرر البحوث</h1>
                <p className="text-[10px]" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>فريق قلم كود — معالجة محلية بالكامل</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleDarkMode} className={btnDark}>
                {isDark ? <Sun className="w-4 h-4 text-yellow-300" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={() => setShowImportDialog(true)} className={btnDark} title="استيراد">
                <Upload className="w-4 h-4" />
              </button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={createNewPaper}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90">
                <Plus className="w-4 h-4" /> بحث جديد
              </motion.button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-4">
            {papers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: isDark ? 'rgba(14,165,233,0.1)' : 'rgba(14,165,233,0.08)' }}>
                  <FileText className="w-8 h-8 text-primary/50" />
                </div>
                <p className="text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>لا توجد بحوث محفوظة بعد</p>
                <motion.button whileTap={{ scale: 0.95 }} onClick={createNewPaper}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-bold">
                  <Plus className="w-4 h-4" /> أنشئ بحثك الأول
                </motion.button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {papers.map((paper) => (
                  <motion.div key={paper.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    onClick={() => openPaper(paper)}
                    className="p-4 rounded-xl cursor-pointer transition-all border"
                    style={{
                      background: isDark ? 'rgba(30,41,59,0.8)' : 'rgba(255,255,255,0.9)',
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold truncate" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>{paper.title}</h3>
                        <p className="text-[11px] mt-1" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
                          {paper.wordCount || 0} كلمة — {estimatePages(paper.wordCount || 0)} صفحة
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: isDark ? '#475569' : '#cbd5e1' }}>
                          {new Date(paper.updatedAt).toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                      <button onClick={(e) => handleDelete(paper.id, e)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400/50 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Import Dialog */}
        <AnimatePresence>
          {showImportDialog && (
            <motion.div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowImportDialog(false)}>
              <motion.div className="p-6 rounded-2xl max-w-sm w-full"
                style={{ background: isDark ? '#1e293b' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}` }}
                initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold" style={{ color: isDark ? '#e2e8f0' : '#0f172a' }}>استيراد بحث</h3>
                  <button onClick={() => setShowImportDialog(false)} className={btnDark}><X className="w-4 h-4" /></button>
                </div>
                <p className="text-xs mb-3" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>اختر ملف JSON محفوظ سابقاً</p>
                <input ref={fileInputRef} type="file" accept=".json" onChange={importJSON}
                  className="w-full text-xs file:mr-2 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary file:text-white file:text-xs file:font-bold file:cursor-pointer" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ========== RENDER: Editor View ==========
  const bgColor = isDark ? '#0f172a' : '#f1f5f9';
  const paperBg = isDark ? '#1a2332' : '#ffffff';
  const textColor = isDark ? '#e2e8f0' : '#1e293b';
  const currentFontCSS = ARABIC_FONTS.find(f => f.name === settings.fontFamily)?.css || "'Noto Naskh Arabic', serif";

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: bgColor }}>
      {/* Hidden image input */}
      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageInsert} className="hidden" />

      {/* ===== TOP TOOLBAR ===== */}
      <div className="shrink-0 border-b relative" style={{
        background: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      }}>
        {/* Scrollable button row */}
        <div className="flex items-center gap-0.5 px-1.5 py-1.5 overflow-x-auto scrollbar-hide">

          {/* Back */}
          <button onClick={() => { setCurrentPaper(null); setShowList(true); lastLoadedPaperId.current = null; }} className={btnDark} title="العودة">
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Undo */}
          <button onClick={() => execCmd('undo')} className={btnDark} title="تراجع">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-5 mx-0.5 shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} />

          {/* Font Selector Button */}
          <button ref={fontBtnRef}
            onClick={() => { calcFontDropdownPos(); setShowFontDropdown(!showFontDropdown); setShowDecorDropdown(false); }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium cursor-pointer transition-colors ${showFontDropdown ? (isDark ? 'bg-white/15 text-white' : 'bg-primary/15 text-primary') : (isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-primary/10 text-foreground/70 hover:text-primary')}`}
            data-font-dropdown>
            <Type className="w-3 h-3" />
            <span className="max-w-[60px] truncate">{ARABIC_FONTS.find(f => f.name === settings.fontFamily)?.label || 'خط'}</span>
            <ChevronDown className="w-2.5 h-2.5" />
          </button>

          {/* Font Size - FIX: use String comparison for select */}
          <select
            value={String(settings.fontSize)}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              setSettings(s => ({ ...s, fontSize: newSize }));
              // Apply immediately to DOM
              if (editorRef.current) editorRef.current.style.fontSize = `${newSize}px`;
            }}
            className="h-6 w-14 text-[10px] rounded-lg border px-1 shrink-0 cursor-pointer"
            style={selectStyleDark}>
            {[12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 28, 32].map(s => (
              <option key={s} value={String(s)} style={optionStyle}>{s}px</option>
            ))}
          </select>

          {/* Line Height - FIX: use String comparison */}
          <select
            value={String(settings.lineHeight)}
            onChange={(e) => {
              const newLH = Number(e.target.value);
              setSettings(s => ({ ...s, lineHeight: newLH }));
              // Apply immediately to DOM
              if (editorRef.current) editorRef.current.style.lineHeight = String(newLH);
            }}
            className="h-6 w-[70px] text-[10px] rounded-lg border px-1 shrink-0 cursor-pointer"
            style={selectStyleDark}>
            {[1.5, 1.8, 2, 2.2, 2.5, 3].map(s => (
              <option key={s} value={String(s)} style={optionStyle}>ارتفاع {s}</option>
            ))}
          </select>

          <div className="w-px h-5 mx-0.5 shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} />

          {/* Formatting */}
          <button onClick={() => execCmd('bold')} className={btnDark} title="عريض"><Bold className="w-3.5 h-3.5" /></button>
          <button onClick={() => execCmd('italic')} className={btnDark} title="مائل"><Italic className="w-3.5 h-3.5" /></button>
          <button onClick={() => execCmd('underline')} className={btnDark} title="تسطير"><Underline className="w-3.5 h-3.5" /></button>
          <button onClick={() => execCmd('strikeThrough')} className={btnDark} title="يتوسطه خط"><Strikethrough className="w-3.5 h-3.5" /></button>

          <div className="w-px h-5 mx-0.5 shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} />

          {/* Alignment */}
          {[['justify', AlignJustify], ['right', AlignRight], ['center', AlignCenter], ['left', AlignLeft]].map(([align, Icon]) => (
            <button key={align} onClick={() => { editorRef.current?.focus(); setSettings(s => ({ ...s, textAlign: align as string })); }}
              className={`${settings.textAlign === align ? activeBtnDark : btnDark}`}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}

          <div className="w-px h-5 mx-0.5 shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} />

          {/* Lists */}
          <button onClick={() => execCmd('insertUnorderedList')} className={btnDark} title="قائمة نقطية"><List className="w-3.5 h-3.5" /></button>
          <button onClick={() => execCmd('insertOrderedList')} className={btnDark} title="قائمة مرقمة"><ListOrdered className="w-3.5 h-3.5" /></button>
          <button onClick={() => execCmd('formatBlock', 'blockquote')} className={btnDark} title="اقتباس"><Quote className="w-3.5 h-3.5" /></button>

          {/* Letter Spacing */}
          <select
            value={String(settings.letterSpacing)}
            onChange={(e) => {
              const newLS = Number(e.target.value);
              setSettings(s => ({ ...s, letterSpacing: newLS }));
              if (editorRef.current) editorRef.current.style.letterSpacing = `${newLS}px`;
            }}
            className="h-6 w-[70px] text-[10px] rounded-lg border px-1 shrink-0 cursor-pointer"
            style={selectStyleDark}>
            {[0, 0.5, 1, 1.5, 2].map(s => (
              <option key={s} value={String(s)} style={optionStyle}>تباعد {s}</option>
            ))}
          </select>

          <div className="flex-1" />

          {/* Image Insert */}
          <button onClick={() => imageInputRef.current?.click()} className={btnDark} title="إدراج صورة">
            <ImagePlus className="w-3.5 h-3.5" />
          </button>

          {/* Footnote */}
          <button onClick={addFootnote} className={btnDark} title="حاشية سفلية"><Hash className="w-3.5 h-3.5" /></button>
          <button onClick={() => setShowFootnotes(!showFootnotes)} className={`${showFootnotes ? activeBtnDark : btnDark}`} title="الهوامش">
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Decorations Button */}
          <button ref={decorBtnRef}
            onClick={() => { calcDecorDropdownPos(); setShowDecorDropdown(!showDecorDropdown); setShowFontDropdown(false); }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] cursor-pointer transition-colors shrink-0 ${showDecorDropdown ? (isDark ? 'bg-white/15 text-white' : 'bg-primary/15 text-primary') : (isDark ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-primary/10 text-foreground/70 hover:text-primary')}`}
            data-decor-dropdown>
            <Sparkles className="w-3 h-3" />
            <span>زخارف</span>
          </button>

          {/* Clipboard */}
          <button onClick={async () => { await loadClipboard(); setShowClipboard(!showClipboard); }} className={`${showClipboard ? activeBtnDark : btnDark}`} title="سجل الاقتباسات">
            <Copy className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-5 mx-0.5 shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} />

          <button onClick={toggleDarkMode} className={btnDark} title="الوضع الليلي">
            {isDark ? <Sun className="w-3.5 h-3.5 text-yellow-300" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <button onClick={exportPDF} className={btnDark} title="تصدير PDF"><Printer className="w-3.5 h-3.5" /></button>
          <button onClick={exportJSON} className={btnDark} title="تصدير JSON"><FileJson className="w-3.5 h-3.5" /></button>

          {/* Save */}
          <motion.button whileTap={{ scale: 0.9 }} onClick={handleAutoSave}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold shrink-0 cursor-pointer">
            <Save className="w-3 h-3" />
            {showSaveIndicator ? (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-0.5">
                <Check className="w-2.5 h-2.5" /> تم
              </motion.span>
            ) : lastSaved ? <span>{lastSaved}</span> : null}
          </motion.button>
        </div>
      </div>

      {/* ===== FONT DROPDOWN (position: fixed) ===== */}
      <AnimatePresence>
        {showFontDropdown && (
          <motion.div
            className="fixed z-[9999] w-48 rounded-xl border shadow-2xl overflow-hidden max-h-72 overflow-y-auto"
            style={{
              top: fontDropdownPos.top,
              right: fontDropdownPos.right,
              background: isDark ? '#1e293b' : '#fff',
              borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
            }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            data-font-dropdown>
            {ARABIC_FONTS.map(font => (
              <button key={font.name}
                onClick={() => {
                  setSettings(s => ({ ...s, fontFamily: font.name }));
                  if (editorRef.current) editorRef.current.style.fontFamily = font.css;
                  setShowFontDropdown(false);
                  if (editorRef.current) editorRef.current.focus();
                }}
                className={`w-full text-right px-3 py-2 text-xs cursor-pointer hover:bg-primary/10 transition-colors ${settings.fontFamily === font.name ? 'bg-primary/15 text-primary' : ''}`}
                style={{ color: isDark ? '#e2e8f0' : '#1e293b', fontFamily: font.css }}>
                {font.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== DECORATIONS DROPDOWN (position: fixed) ===== */}
      <AnimatePresence>
        {showDecorDropdown && (
          <motion.div
            className="fixed z-[9999] w-56 rounded-xl border shadow-2xl overflow-hidden max-h-72 overflow-y-auto"
            style={{
              top: decorDropdownPos.top,
              right: decorDropdownPos.right,
              background: isDark ? '#1e293b' : '#fff',
              borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)',
            }}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            data-decor-dropdown>
            {DECORATIONS.map(dec => (
              <button key={dec.id}
                onClick={() => { insertHTML(dec.html); setShowDecorDropdown(false); }}
                className="w-full text-right px-3 py-2 text-[11px] cursor-pointer hover:bg-primary/10 transition-colors"
                style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}>
                {dec.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== STATUS BAR ===== */}
      <div className="shrink-0 flex items-center justify-between px-3 py-0.5 text-[10px] border-b" style={{
        background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(248,250,252,0.95)',
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        color: isDark ? '#94a3b8' : '#64748b',
      }}>
        <span>{wordCount} كلمة — {estimatePages(wordCount)} صفحة</span>
        <span>{title || 'بدون عنوان'}</span>
      </div>

      {/* ===== RULER ===== */}
      {settings.showRulers && (
        <div className="shrink-0 h-4 flex items-center justify-center overflow-hidden" style={{ background: isDark ? '#1e293b' : '#e2e8f0' }}>
          <div className="h-full flex items-end" style={{ width: 'calc(100% - 40px)', maxWidth: '210mm', margin: '0 auto' }}>
            {Array.from({ length: 40 }).map((_, i) => (
              <div key={i} className="flex-1 flex items-end justify-center">
                <div style={{ width: 1, height: i % 5 === 0 ? 8 : 4, background: i % 10 === 0 ? (isDark ? '#94a3b8' : '#64748b') : (isDark ? '#475569' : '#cbd5e1') }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== ZOOM CONTROLS ===== */}
      <div className="shrink-0 flex items-center justify-center gap-2 px-3 py-1 border-b" style={{
        background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(248,250,252,0.95)',
        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      }}>
        <button onClick={() => setZoomLevel(z => Math.max(50, z - 10))} className={btnDark} title="تصغير">
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-bold min-w-[36px] text-center" style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}>
          {zoomLevel}%
        </span>
        <button onClick={() => setZoomLevel(z => Math.min(200, z + 10))} className={btnDark} title="تكبير">
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        {zoomLevel !== 100 && (
          <button onClick={() => setZoomLevel(100)} className="text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer transition-colors"
            style={{ color: isDark ? '#94a3b8' : '#64748b', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }}>
            إعادة تعيين
          </button>
        )}
      </div>

      {/* ===== MAIN EDITOR AREA ===== */}
      <div className="flex-1 overflow-y-auto relative" id="editor-scroll-area">
        <div className="min-h-full flex justify-center py-4">
          <div className="relative shadow-2xl" style={{
            width: '210mm', maxWidth: '100%', minHeight: '297mm',
            background: paperBg, margin: '20px', padding: '30px 40px',
            borderRadius: settings.pageBorder ? '2px' : '0',
            border: settings.pageBorder ? `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}` : 'none',
            boxShadow: `0 4px 40px ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)'}`,
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
          }}>
            {/* Title */}
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full text-center text-xl font-bold border-0 outline-none mb-4 bg-transparent"
              style={{ fontFamily: currentFontCSS, color: isDark ? '#e2e8f0' : '#1a5276' }}
              placeholder="عنوان البحث..." />

            {/* Editor Content */}
            <div ref={editorRef} contentEditable suppressContentEditableWarning
              className="outline-none min-h-[400px]"
              style={{
                fontFamily: currentFontCSS,
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineHeight,
                letterSpacing: `${settings.letterSpacing}px`,
                textAlign: settings.textAlign as React.CSSProperties['textAlign'],
                color: isDark ? '#e2e8f0' : '#1e293b',
                direction: 'rtl',
              }}
              onInput={() => {
                if (editorRef.current) {
                  setWordCount(countWords(editorRef.current.innerText || ''));
                }
              }}
            />

            {/* Footnotes */}
            {showFootnotes && footnotes.length > 0 && (
              <div className="mt-8 pt-4 border-t-2 border-dashed" style={{ borderColor: 'rgba(14,165,233,0.3)' }}>
                <h3 className="text-sm font-bold mb-3" style={{ fontFamily: 'Amiri, serif', color: isDark ? '#e2e8f0' : '#1a5276' }}>الهوامش</h3>
                {footnotes.map(fn => (
                  <div key={fn.id} className="flex gap-2 mb-2 text-[12px]" style={{ color: isDark ? '#94a3b8' : '#4a5568' }}>
                    <sup className="text-primary font-bold mt-0.5">{fn.number}</sup>
                    <div className="flex-1">
                      <p>{fn.text}</p>
                      {fn.source && <p className="text-[10px] text-primary/60 mt-0.5 italic">{fn.source}</p>}
                    </div>
                    <button onClick={() => setFootnotes(prev => prev.filter(f => f.id !== fn.id))} className="text-red-400/50 hover:text-red-500 shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Watermark */}
            <div className="absolute bottom-3 left-4 text-[9px] opacity-10 pointer-events-none" style={{ color: '#94a3b8' }}>
              الإيوان الرقمي — فريق قلم كود
            </div>
          </div>
        </div>
      </div>

      {/* ===== FLOATING TOOLBAR ===== */}
      <AnimatePresence>
        {floatingToolbar.visible && (
          <motion.div className="fixed z-[9999] flex items-center gap-0.5 px-2 py-1 rounded-xl shadow-2xl border"
            style={{
              top: floatingToolbar.y,
              left: Math.max(10, floatingToolbar.x),
              background: isDark ? '#1e293b' : '#fff',
              borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
            }}
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
            <button onClick={() => execCmd('bold')} className={btnDark} title="عريض"><Bold className="w-3.5 h-3.5" /></button>
            <button onClick={() => execCmd('italic')} className={btnDark} title="مائل"><Italic className="w-3.5 h-3.5" /></button>
            <button onClick={() => execCmd('underline')} className={btnDark} title="تسطير"><Underline className="w-3.5 h-3.5" /></button>
            <button onClick={() => execCmd('strikeThrough')} className={btnDark} title="يتوسطه خط"><Strikethrough className="w-3.5 h-3.5" /></button>
            <div className="w-px h-4 mx-0.5" style={{ background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} />

            {/* Text Color Picker */}
            <div className="relative" data-text-color-picker>
              <button
                onClick={() => { setShowTextColorPicker(!showTextColorPicker); setShowBgColorPicker(false); }}
                className={btnDark} title="لون النص">
                <Type className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {showTextColorPicker && (
                  <motion.div className="absolute bottom-full left-0 mb-1 p-2 rounded-lg border shadow-xl"
                    style={{ background: isDark ? '#0f172a' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}>
                    <p className="text-[9px] mb-1.5 font-bold" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>لون النص</p>
                    <div className="grid grid-cols-5 gap-1">
                      {TEXT_COLORS.map(c => (
                        <button key={c} onClick={() => { execCmd('foreColor', c); setShowTextColorPicker(false); }}
                          className="w-5 h-5 rounded border cursor-pointer hover:scale-110 transition-transform"
                          style={{ background: c, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Background Color Picker */}
            <div className="relative" data-bg-color-picker>
              <button
                onClick={() => { setShowBgColorPicker(!showBgColorPicker); setShowTextColorPicker(false); }}
                className={btnDark} title="لون الخلفية">
                <Paintbrush className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {showBgColorPicker && (
                  <motion.div className="absolute bottom-full left-0 mb-1 p-2 rounded-lg border shadow-xl"
                    style={{ background: isDark ? '#0f172a' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}>
                    <p className="text-[9px] mb-1.5 font-bold" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>خلفية النص</p>
                    <div className="grid grid-cols-5 gap-1">
                      {BG_COLORS.map(c => (
                        <button key={c} onClick={() => { execCmd('hiliteColor', c); setShowBgColorPicker(false); }}
                          className="w-5 h-5 rounded border cursor-pointer hover:scale-110 transition-transform"
                          style={{ background: c, borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="w-px h-4 mx-0.5" style={{ background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }} />
            <button onClick={addFootnote} className={btnDark} title="حاشية"><Hash className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== CLIPBOARD DRAWER ===== */}
      <AnimatePresence>
        {showClipboard && (
          <>
            <motion.div className="fixed inset-0 z-[9998] bg-black/30" onClick={() => setShowClipboard(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.div className="fixed top-0 left-0 bottom-0 z-[9999] w-72 border-r overflow-y-auto p-4"
              style={{ background: isDark ? '#1e293b' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold" style={{ color: textColor }}>سجل الاقتباسات</h3>
                <div className="flex gap-2">
                  <button onClick={clearClipboard} className="text-[10px] text-red-400 hover:text-red-500 cursor-pointer">مسح الكل</button>
                  <button onClick={() => setShowClipboard(false)} className={btnDark}><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {clipboardItems.length === 0 ? (
                <p className="text-[11px] text-center py-8" style={{ color: isDark ? '#475569' : '#94a3b8' }}>
                  لا توجد اقتباسات بعد.<br />انسخ أي نص من المحرر ليظهر هنا.
                </p>
              ) : (
                <div className="space-y-2">
                  {clipboardItems.map(item => (
                    <div key={item.id}
                      className="p-2.5 rounded-lg border cursor-pointer hover:bg-primary/5 transition-colors"
                      style={{ background: isDark ? 'rgba(30,41,59,0.5)' : '#f8fafc', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }}
                      onClick={() => { if (editorRef.current) { editorRef.current.focus(); document.execCommand('insertHTML', false, item.text); } setShowClipboard(false); }}>
                      <p className="text-[11px] leading-relaxed" style={{ color: textColor }} dir="rtl">
                        {item.text.length > 100 ? item.text.slice(0, 100) + '...' : item.text}
                      </p>
                      <p className="text-[9px] mt-1" style={{ color: isDark ? '#475569' : '#cbd5e1' }}>
                        {item.source} — {new Date(item.timestamp).toLocaleTimeString('ar')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
