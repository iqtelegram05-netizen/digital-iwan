// ============================================================
// IndexedDB Storage for Research Editor - Zero Server Architecture
// ============================================================

const DB_NAME = 'IwanResearchEditor';
const DB_VERSION = 1;

interface ResearchPaper {
  id: string;
  title: string;
  content: string;
  htmlContent: string;
  footnotes: Footnote[];
  settings: EditorSettings;
  createdAt: number;
  updatedAt: number;
  wordCount: number;
}

interface Footnote {
  id: string;
  number: number;
  text: string;
  source?: string;
}

interface EditorSettings {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: string;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  darkMode: boolean;
  showRulers: boolean;
  pageBorder: boolean;
}

interface ClipboardItem {
  id: string;
  text: string;
  source?: string;
  timestamp: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('papers')) {
        const store = db.createObjectStore('papers', { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
        store.createIndex('title', 'title', { unique: false });
      }
      if (!db.objectStoreNames.contains('clipboard')) {
        db.createObjectStore('clipboard', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    };
  });
}

// ========== Papers ==========

export async function savePaper(paper: ResearchPaper): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('papers', 'readwrite');
    tx.objectStore('papers').put(paper);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPaper(id: string): Promise<ResearchPaper | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('papers', 'readonly');
    const req = tx.objectStore('papers').get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllPapers(): Promise<ResearchPaper[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('papers', 'readonly');
    const req = tx.objectStore('papers').getAll();
    req.onsuccess = () => {
      const papers = (req.result as ResearchPaper[]).sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(papers);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deletePaper(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('papers', 'readwrite');
    tx.objectStore('papers').delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ========== Clipboard ==========

export async function addToClipboard(item: Omit<ClipboardItem, 'id' | 'timestamp'>): Promise<ClipboardItem> {
  const db = await openDB();
  const entry: ClipboardItem = {
    ...item,
    id: `clip_${Date.now()}`,
    timestamp: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clipboard', 'readwrite');
    tx.objectStore('clipboard').put(entry);
    tx.oncomplete = async () => {
      // Keep only last 20 items
      const all = await getAllClipboardItems();
      if (all.length > 20) {
        const toDelete = all.slice(20);
        const tx2 = db.transaction('clipboard', 'readwrite');
        for (const item of toDelete) {
          tx2.objectStore('clipboard').delete(item.id);
        }
      }
      resolve(entry);
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllClipboardItems(): Promise<ClipboardItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clipboard', 'readonly');
    const req = tx.objectStore('clipboard').getAll();
    req.onsuccess = () => {
      const items = (req.result as ClipboardItem[]).sort((a, b) => b.timestamp - a.timestamp);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearClipboard(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clipboard', 'readwrite');
    tx.objectStore('clipboard').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ========== Global Settings ==========

export async function saveGlobalSettings(settings: Record<string, unknown>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put({ id: 'global', ...settings });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getGlobalSettings(): Promise<Record<string, unknown> | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const req = tx.objectStore('settings').get('global');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ========== Export / Import ==========

export async function exportPaperAsJSON(paper: ResearchPaper): Promise<string> {
  return JSON.stringify(paper, null, 2);
}

export async function importPaperFromJSON(jsonString: string): Promise<ResearchPaper> {
  const paper = JSON.parse(jsonString) as ResearchPaper;
  if (!paper.id || !paper.content) throw new Error('Invalid paper format');
  await savePaper(paper);
  return paper;
}

export function generateId(): string {
  return `paper_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function countWords(text: string): number {
  const clean = text.replace(/<[^>]*>/g, '').trim();
  if (!clean) return 0;
  return clean.split(/\s+/).filter(w => w.length > 0).length;
}

export function estimatePages(wordCount: number, wordsPerPage = 250): number {
  return Math.max(1, Math.ceil(wordCount / wordsPerPage));
}

export type { ResearchPaper, Footnote, EditorSettings, ClipboardItem };
