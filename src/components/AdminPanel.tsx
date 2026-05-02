'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import CrystalButton from './CrystalButton';
import { useAppStore } from '@/store/appStore';
import { useTranslation } from '@/i18n/useTranslation';
import {
  Key,
  Link2,
  Plus,
  Trash2,
  RefreshCw,
  Globe,
  Shield,
  Users,
  BookOpen,
  Ban,
  ShieldCheck,
  ShieldAlert,
  Save,
  Eye,
  ArrowRight,
  Zap,
  Activity,
  Clock,
  RotateCcw,
  AlertTriangle,
  Server,
  Gauge,
  Tv,
  Cpu,
  TrendingUp,
  Database,
  CircleDot,
  ChevronDown,
  ImagePlus,
  X,
  Upload,
} from 'lucide-react';

// ========== Types ==========
interface ApiKey {
  key: string;
  status: 'active' | 'waiting' | 'consumed';
  name: string;
  createdAt: string;
}

interface AdminData {
  ragLinks: string[];
  apiKeys: ApiKey[];
  stats?: {
    totalApiKeys: number;
    activeKeys: number;
    waitingKeys: number;
    consumedKeys: number;
    totalRagLinks: number;
  };
}

interface AppUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isBlocked: boolean;
  lastLogin: string | null;
  loginCount: number;
  createdAt: string;
}

interface PrayerItem {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  text: string;
  isPublished: boolean;
}

// Load Balancer types
interface LBKey {
  id: string;
  keyFingerprint: string | null;
  label: string | null;
  status: string;
  tokensUsed: number;
  tokensLimit: number | null;
  requestCount: number;
  lastUsedAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  cooldownUntil: string | null;
  priority: number;
  createdAt: string;
}

interface LBProvider {
  id: string;
  name: string;
  label: string;
  baseUrl: string | null;
  isActive: boolean;
  keys: LBKey[];
}

interface LBStats {
  total: number;
  active: number;
  standby: number;
  cooldown: number;
  exhausted: number;
  totalTokens: number;
  totalRequests: number;
  providers: LBProvider[];
}

interface AdminAd {
  id: string;
  title: string;
  imageUrl: string | null;
  linkUrl: string | null;
  htmlCode: string | null;
  isActive: boolean;
  priority: number;
  impressions: number;
  clicks: number;
  createdAt: string;
}

// HuggingFace types
interface HFKeyInfo {
  id: string;
  fingerprint: string;
  label: string | null;
  model: string;
  status: string;
  priority: number;
  requestCount: number;
  successCount: number;
  failCount: number;
  tokensUsed: number;
  tokensLimit: number | null;
  lastUsedAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  cooldownUntil: string | null;
}

interface HFStats {
  total: number;
  active: number;
  cooldown: number;
  exhausted: number;
  disabled: number;
  totalTokens: number;
  totalRequests: number;
  totalSuccess: number;
  totalFail: number;
  keys: HFKeyInfo[];
}

interface DailyUsageInfo {
  date: string;
  totalRequests: number;
  cacheHits: number;
  aiCalls: number;
  hfCalls: number;
  fallbackCalls: number;
  failedCalls: number;
  totalTokens: number;
}

type AdminTab = 'keys' | 'users' | 'prayers' | 'loadbalancer' | 'ads' | 'huggingface' | 'tasbeeh' | 'sites';

export default function AdminPanel() {
  const { setCurrentView, adminInitialTab, setAdminInitialTab } = useAppStore();
  const { t } = useTranslation();

  const KEY_STATUS: Record<string, { label: string; color: string }> = {
    active: { label: t('admin.loadBalancer.activeKeys'), color: 'bg-emerald-500 text-white' },
    standby: { label: t('admin.loadBalancer.standbyKeys'), color: 'bg-sky-500 text-white' },
    exhausted: { label: t('admin.loadBalancer.exhaustedKeys'), color: 'bg-orange-500 text-white' },
    cooldown: { label: t('admin.loadBalancer.cooldownKeys'), color: 'bg-red-500 text-white' },
  };

  const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    active: { label: t('admin.apiKeys.active'), color: 'bg-sky-500 text-white' },
    waiting: { label: t('admin.apiKeys.waiting'), color: 'bg-yellow-500 text-white' },
    consumed: { label: t('admin.apiKeys.consumed'), color: 'bg-red-500 text-white' },
  };

  const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
    owner: { label: t('admin.roles.owner'), color: 'bg-purple-600 text-white' },
    supervisor: { label: t('admin.roles.supervisor'), color: 'bg-blue-600 text-white' },
    user: { label: t('admin.roles.user'), color: 'bg-gray-500 text-white' },
  };

  const [activeTab, setActiveTab] = useState<AdminTab>('keys');

  // Sites state (persisted in DB via /api/sites)
  const [sites, setSites] = useState<{ id: string; name: string; url: string; description?: string | null; iconUrl?: string | null; imageUrl?: string | null }[]>([]);
  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [siteDesc, setSiteDesc] = useState('');
  const [siteImage, setSiteImage] = useState<string>(''); // uploaded image URL
  const [siteImagePreview, setSiteImagePreview] = useState<string>(''); // preview URL
  const [uploadingImage, setUploadingImage] = useState(false);

  // Read adminInitialTab on mount and set active tab accordingly
  useEffect(() => {
    if (adminInitialTab) {
      const validTabs: AdminTab[] = ['keys', 'users', 'prayers', 'loadbalancer', 'ads', 'huggingface', 'tasbeeh', 'sites'];
      if (validTabs.includes(adminInitialTab as AdminTab)) {
        setActiveTab(adminInitialTab as AdminTab);
      }
      setAdminInitialTab(null);
    }
  }, [adminInitialTab, setAdminInitialTab]);

  // Sites management (API-based)
  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch('/api/sites');
      if (res.ok) {
        const data = await res.json();
        setSites(data.sites || []);
      }
    } catch { /* silent */ }
  }, []);

  // Convert image to base64 directly in browser (works on Vercel)
  const uploadSiteImage = (file: File) => {
    if (file.size > 1024 * 1024) {
      alert('حجم الصورة كبير جداً. الحد الأقصى 1MB');
      return;
    }
    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSiteImage(base64);
      setSiteImagePreview(base64);
      setUploadingImage(false);
    };
    reader.onerror = () => {
      alert('فشل في قراءة الصورة');
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const addSite = async () => {
    if (!siteName.trim() || !siteUrl.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: siteName.trim(), url: siteUrl.trim(), description: siteDesc.trim() || undefined, imageUrl: siteImage || undefined }),
      });
      if (res.ok) {
        await fetchSites();
        setSiteName('');
        setSiteUrl('');
        setSiteDesc('');
        setSiteImage('');
        setSiteImagePreview('');
      }
    } catch { /* silent */ } finally { setSaving(false); }
  };
  const removeSite = async (id: string) => {
    if (!confirm('هل تريد حذف هذا الموقع؟')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/sites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await fetchSites();
      }
    } catch { /* silent */ } finally { setSaving(false); }
  };
  const [data, setData] = useState<AdminData | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [prayers, setPrayers] = useState<PrayerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLink, setNewLink] = useState('');
  const [saving, setSaving] = useState(false);

  // API Key form
  const [keySlotIndex, setKeySlotIndex] = useState('0');
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');

  // Prayer form
  const [prayerTitle, setPrayerTitle] = useState('');
  const [prayerSubtitle, setPrayerSubtitle] = useState('');
  const [prayerCategory, setPrayerCategory] = useState('دعاء');
  const [prayerText, setPrayerText] = useState('');

  // Load Balancer state
  const [lbStats, setLbStats] = useState<LBStats | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(true);
  const [singleKey, setSingleKey] = useState('');
  const [singleKeyLabel, setSingleKeyLabel] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('auto');
  const [lbError, setLbError] = useState<string | null>(null);
  const [lbSuccess, setLbSuccess] = useState<string | null>(null);

  // Ads management state
  const [adminAds, setAdminAds] = useState<AdminAd[]>([]);
  const [adTitle, setAdTitle] = useState('');
  const [adImageUrl, setAdImageUrl] = useState('');
  const [adLinkUrl, setAdLinkUrl] = useState('');
  const [adPriority, setAdPriority] = useState('0');

  // HuggingFace state
  const [hfStats, setHfStats] = useState<HFStats | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsageInfo | null>(null);
  const [hfBulkTokens, setHfBulkTokens] = useState('');
  const [hfSingleToken, setHfSingleToken] = useState('');
  const [hfSingleLabel, setHfSingleLabel] = useState('');
  const [hfModelError, setHfModelError] = useState<string | null>(null);
  const [hfModelSuccess, setHfModelSuccess] = useState<string | null>(null);

  // Tasbeeh state
  const [tasbeehGroups, setTasbeehGroups] = useState<{ id: string; name: string; description?: string; iconUrl?: string; isActive: boolean; items: { id: string; text: string; description?: string; count: number; isActive: boolean }[] }[]>([]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newItemText, setNewItemText] = useState('');
  const [newItemCount, setNewItemCount] = useState('33');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [adminRes, usersRes, prayersRes, keysRes, adsRes, hfRes, tasbeehRes, sitesRes] = await Promise.all([
        fetch('/api/admin'),
        fetch('/api/admin/users'),
        fetch('/api/prayers?all=true'),
        fetch('/api/keys'),
        fetch('/api/admin/ads'),
        fetch('/api/hf-keys'),
        fetch('/api/tasbeeh'),
        fetch('/api/sites'),
      ]);
      if (adminRes.ok) setData(await adminRes.json());
      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(uData.users || []);
      }
      if (prayersRes.ok) {
        const pData = await prayersRes.json();
        setPrayers(pData.prayers || []);
      }
      if (keysRes.ok) {
        setLbStats(await keysRes.json());
      }
      if (adsRes.ok) {
        const adsData = await adsRes.json();
        setAdminAds(adsData.ads || []);
      }
      if (hfRes.ok) {
        const hfData = await hfRes.json();
        if (hfData.hf) setHfStats(hfData.hf);
        if (hfData.dailyUsage) setDailyUsage(hfData.dailyUsage);
      }
      if (tasbeehRes.ok) {
        const tData = await tasbeehRes.json();
        setTasbeehGroups(tData.groups || []);
      }
      if (sitesRes.ok) {
        const sData = await sitesRes.json();
        setSites(sData.sites || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ========== RAG Links ==========
  const addLink = async () => {
    if (!newLink.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ragLinks: [...(data?.ragLinks || []), newLink.trim()] }),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setNewLink('');
      }
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const removeLink = async (link: string) => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ragLinks: data.ragLinks.filter((l) => l !== link) }),
      });
      if (res.ok) setData(await res.json());
    } catch { /* silent */ } finally { setSaving(false); }
  };

  // ========== API Keys ==========
  const addApiKey = async () => {
    if (!newKeyValue.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addKey',
          key: newKeyValue.trim(),
          name: newKeyName.trim() || `${t('admin.apiKeys.keyN', { n: parseInt(keySlotIndex) + 1 })}`,
          slotIndex: parseInt(keySlotIndex),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setNewKeyValue('');
        setNewKeyName('');
      }
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const swapKey = async (index: number) => {
    if (!newKeyValue.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'swapKey',
          slotIndex: index,
          newKey: newKeyValue.trim(),
          newName: newKeyName.trim() || data?.apiKeys[index]?.name || `${t('admin.apiKeys.keyN', { n: index + 1 })}`,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setNewKeyValue('');
        setNewKeyName('');
      }
    } catch { /* silent */ } finally { setSaving(false); }
  };

  // ========== User Management ==========
  const updateUser = async (userId: string, updates: { role?: string; isBlocked?: boolean }) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...updates }),
      });
      if (res.ok) {
        const json = await res.json();
        setUsers(json.users || []);
      }
    } catch { /* silent */ } finally { setSaving(false); }
  };

  // ========== Prayers Management ==========
  const addPrayer = async () => {
    if (!prayerTitle.trim() || !prayerText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/prayers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: prayerTitle.trim(),
          subtitle: prayerSubtitle.trim() || undefined,
          category: prayerCategory,
          text: prayerText.trim(),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setPrayers((prev) => [...prev, json.prayer]);
        setPrayerTitle('');
        setPrayerSubtitle('');
        setPrayerText('');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || `خطأ: ${res.status}`);
      }
    } catch (err) {
      alert('خطأ في الاتصال بالخادم');
    } finally { setSaving(false); }
  };

  const deletePrayer = async (id: string) => {
    if (!confirm('هل تريد حذف هذا العنصر؟')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/prayers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setPrayers((prev) => prev.filter((p) => p.id !== id));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'فشل في الحذف');
      }
    } catch (err) {
      alert('خطأ في الاتصال بالخادم');
    } finally { setSaving(false); }
  };

  const togglePublish = async (prayer: PrayerItem) => {
    setSaving(true);
    try {
      const res = await fetch('/api/prayers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: prayer.id, isPublished: !prayer.isPublished }),
      });
      if (res.ok) {
        setPrayers((prev) => prev.map((p) => p.id === prayer.id ? { ...p, isPublished: !p.isPublished } : p));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'فشل في التحديث');
      }
    } catch (err) {
      alert('خطأ في الاتصال بالخادم');
    } finally { setSaving(false); }
  };

  // ========== Tasbeeh Management ==========
  const addTasbeehGroup = async () => {
    if (!newGroupName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/tasbeeh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addGroup', name: newGroupName.trim() }),
      });
      if (res.ok) {
        const json = await res.json();
        setTasbeehGroups((prev) => [...prev, json.group]);
        setExpandedGroupId(json.group.id);
        setNewGroupName('');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'فشل في إضافة التسبيحة');
      }
    } catch { alert('خطأ في الاتصال بالخادم'); } finally { setSaving(false); }
  };

  const deleteTasbeehGroup = async (id: string) => {
    if (!confirm('هل تريد حذف هذه التسبيحة وجميع التسبيحات الفرعية؟')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/tasbeeh', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteGroup', id }),
      });
      if (res.ok) {
        setTasbeehGroups((prev) => prev.filter((g) => g.id !== id));
        if (expandedGroupId === id) setExpandedGroupId(null);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'فشل في الحذف');
      }
    } catch { alert('خطأ في الاتصال بالخادم'); } finally { setSaving(false); }
  };

  const addTasbeehItem = async (groupId: string) => {
    if (!newItemText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/tasbeeh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addItem', groupId, text: newItemText.trim(), count: parseInt(newItemCount) || 33 }),
      });
      if (res.ok) {
        const json = await res.json();
        setTasbeehGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, items: [...g.items, json.item] } : g));
        setNewItemText('');
        setNewItemCount('33');
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'فشل في إضافة التسبيحة');
      }
    } catch { alert('خطأ في الاتصال بالخادم'); } finally { setSaving(false); }
  };

  const deleteTasbeehItem = async (groupId: string, itemId: string) => {
    if (!confirm('هل تريد حذف هذه التسبيحة؟')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/tasbeeh', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deleteItem', id: itemId }),
      });
      if (res.ok) {
        setTasbeehGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, items: g.items.filter((i) => i.id !== itemId) } : g));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'فشل في الحذف');
      }
    } catch { alert('خطأ في الاتصال بالخادم'); } finally { setSaving(false); }
  };

  // ========== Clear All Data ==========
  const [cleanResult, setCleanResult] = useState<string | null>(null);

  // ========== Load Balancer Actions ==========
  const lbAction = async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.stats) setLbStats(json.stats);
      if (json.message) alert(json.message);
      return json;
    } catch (err) {
      alert(t('admin.loadBalancer.connectionError'));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const lbUpdate = async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/keys', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.stats) setLbStats(json.stats);
      return json;
    } catch {
      return null;
    } finally {
      setSaving(false);
    }
  };

  const lbDelete = async (body: Record<string, unknown>) => {
    if (!confirm(t('admin.loadBalancer.confirmDelete'))) return;
    setSaving(true);
    try {
      const res = await fetch('/api/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.stats) setLbStats(json.stats);
      if (json.message) alert(json.message);
    } catch {
      alert(t('admin.loadBalancer.deleteError'));
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim()) return;
    setLbError(null);
    setLbSuccess(null);
    const result = await lbAction({ action: 'bulkAdd', text: bulkText });
    if (result) {
      setBulkText('');
      await fetchData();
    }
  };

  const handleSingleKeyAdd = async () => {
    if (!singleKey.trim()) {
      setLbError('يرجى إدخال مفتاح API');
      return;
    }
    setLbError(null);
    setLbSuccess(null);
    const result = await lbAction({ action: 'bulkAdd', text: singleKey.trim() });
    if (result) {
      setSingleKey('');
      setSingleKeyLabel('');
      setLbSuccess(`تم إضافة المفتاح بنجاح (${result.added || 0} مضاف)`);
      await fetchData();
    } else {
      setLbError('فشل في إضافة المفتاح');
    }
  };

  const clearAllData = async () => {
    if (!confirm(t('admin.loadBalancer.confirmClearAll'))) return;
    setSaving(true);
    setCleanResult(null);
    try {
      const res = await fetch('/api/setup/clean', { method: 'POST' });
      const json = await res.json();

      // عرض كل التفاصيل
      const lines = Object.entries(json.details || {}).map(([k, v]) => `${k}: ${v}`).join('\n');
      setCleanResult(lines);

      if (json.success) {
        await fetchData();
      }

      // نسخ النتيجة للحافظة لسهولة الإرسال
      try {
        await navigator.clipboard.writeText(`${t('admin.loadBalancer.clearResult')}:\n${lines}`);
      } catch { /* silent */ }

      alert(`${t('admin.loadBalancer.clearResultCopied')}:\n${lines}`);
    } catch (err) {
      const msg = t('admin.loadBalancer.connectionError') + ': ' + (err instanceof Error ? err.message : String(err));
      setCleanResult(msg);
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  // ========== Loading Spinner ==========
  const spinner = (
    <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
      <motion.div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin-slow ml-2" />
      {t('common.loading')}
    </div>
  );

  return (
    <div className="flex flex-col h-full px-3 sm:px-4 py-3 sm:py-6 max-w-3xl mx-auto overflow-y-auto">
      <motion.div
        className="w-full space-y-4 sm:space-y-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/10 flex items-center justify-center sky-glow">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-bold">{t('admin.title')}</h2>
              <p className="text-xs text-muted-foreground">{t('admin.ownerOnly')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CrystalButton
              variant="outline"
              size="sm"
              className="border-red-500/30 hover:bg-red-500/10 text-red-600 text-[10px] sm:text-xs gap-1"
              onClick={clearAllData}
              disabled={saving}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('admin.clearData')}</span>
            </CrystalButton>
            <CrystalButton
              variant="outline"
              size="sm"
              className="border-primary/20 hover:bg-primary/10 text-xs gap-1"
              onClick={() => setCurrentView('profile')}
            >
              <ArrowRight className="w-4 h-4" />
              {t('admin.back')}
            </CrystalButton>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {([
            { id: 'loadbalancer', label: t('admin.tabs.loadBalancer'), icon: Zap },
            { id: 'keys', label: t('admin.tabs.keysAndLinks'), icon: Key },
            { id: 'users', label: t('admin.tabs.users'), icon: Users },
            { id: 'prayers', label: t('admin.tabs.prayers'), icon: BookOpen },
            { id: 'ads', label: 'إعلانات', icon: Tv },
            { id: 'huggingface', label: 'HuggingFace', icon: Cpu },
            { id: 'tasbeeh', label: 'تسبيحات', icon: CircleDot },
            { id: 'sites', label: 'مواقعنا', icon: Globe },
          ] as { id: AdminTab; label: string; icon: typeof Key }[]).map((tab) => (
            <CrystalButton
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              size="sm"
              className={`shrink-0 gap-1 sm:gap-1.5 text-[10px] sm:text-xs rounded-lg ${activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'border-primary/20 hover:bg-primary/10'}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </CrystalButton>
          ))}
        </div>

        {/* ========== TAB 1: Keys & Links ========== */}
        {activeTab === 'keys' && (
          <div className="space-y-6">
            {/* RAG Links */}
            <Card className="glass-card border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-primary" />
                  {t('admin.ragLinks.title')}
                  {data?.stats && (
                    <Badge variant="secondary" className="text-[10px] mr-auto">{data.stats.totalRagLinks} {t('admin.ragLinks.link')}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? spinner : (
                  <>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {data?.ragLinks.map((link) => (
                        <div key={link} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card/50 border border-border/30">
                          <span className="text-xs text-foreground/70 truncate flex-1">{link}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive shrink-0" onClick={() => removeLink(link)} disabled={saving}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                      {data?.ragLinks.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">{t('admin.ragLinks.noLinks')}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Input value={newLink} onChange={(e) => setNewLink(e.target.value)} placeholder="https://example.com/knowledge" className="text-xs border-primary/20 bg-card/50" onKeyDown={(e) => e.key === 'Enter' && addLink()} />
                      <CrystalButton size="sm" className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg" onClick={addLink} disabled={saving || !newLink.trim()}>
                        <Plus className="w-4 h-4" />
                      </CrystalButton>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* API Keys - 10 Slots */}
            <Card className="glass-card border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  {t('admin.apiKeys.title')}
                  {data?.stats && (
                    <div className="flex gap-1 mr-auto">
                      <Badge variant="secondary" className="text-[9px] bg-sky-500/20 text-sky-600">{data.stats.activeKeys} {t('admin.apiKeys.active')}</Badge>
                      <Badge variant="secondary" className="text-[9px] bg-yellow-500/20 text-yellow-600">{data.stats.waitingKeys} {t('admin.apiKeys.waiting')}</Badge>
                      <Badge variant="secondary" className="text-[9px] bg-red-500/20 text-red-600">{data.stats.consumedKeys} {t('admin.apiKeys.consumed')}</Badge>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? spinner : (
                  <>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {data?.apiKeys.map((key, idx) => {
                        const status = STATUS_CONFIG[key.status] || STATUS_CONFIG.waiting;
                        return (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/30">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Key className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium">{key.name}</p>
                                {key.key && (
                                  <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">{key.key}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${status.color}`}>
                                {status.label}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <Separator className="bg-primary/10" />

                    {/* Add/Swap Key Form */}
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-foreground/80">{t('admin.apiKeys.addSwap')}</p>
                      <div className="flex gap-2">
                        <Select value={keySlotIndex} onValueChange={setKeySlotIndex}>
                          <SelectTrigger className="w-28 text-xs border-primary/20 bg-card/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {data?.apiKeys.map((k, i) => (
                              <SelectItem key={i} value={i.toString()} className="text-xs">
                                {k.name} {k.key ? `(${t('admin.apiKeys.existing')})` : `(${t('admin.apiKeys.empty')})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder={t('admin.apiKeys.keyName')} className="text-xs border-primary/20 bg-card/50 flex-1" />
                      </div>
                      <div className="flex gap-2">
                        <Input value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} placeholder={t('admin.apiKeys.keyValue')} className="text-xs border-primary/20 bg-card/50 flex-1" />
                        <CrystalButton size="sm" className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg" onClick={() => swapKey(parseInt(keySlotIndex))} disabled={saving || !newKeyValue.trim()}>
                          <Save className="w-4 h-4 ml-1" />
                          {t('admin.save')}
                        </CrystalButton>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========== TAB 2: Users ========== */}
        {activeTab === 'users' && (
          <Card className="glass-card border-primary/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                {t('admin.usersMgmt.title')}
                <Badge variant="secondary" className="text-[10px] mr-auto">{users.length} {t('admin.usersMgmt.userN')}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? spinner : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-2">
                    {users.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">{t('admin.usersMgmt.noUsers')}</p>}
                    {users.map((user) => {
                      const role = ROLE_CONFIG[user.role] || ROLE_CONFIG.user;
                      return (
                        <motion.div
                          key={user.id}
                          className="p-3 rounded-xl bg-card/50 border border-border/30 space-y-2"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary text-sm font-bold">
                                {(user.name || user.email)[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{user.name || t('admin.usersMgmt.noName')}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${role.color}`}>{role.label}</Badge>
                              {user.isBlocked && <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-red-500 text-white">{t('admin.usersMgmt.banned')}</Badge>}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                            <div className="flex gap-3">
                              <span>{t('admin.usersMgmt.registered')} {new Date(user.createdAt).toLocaleDateString('ar')}</span>
                              <span>{t('admin.usersMgmt.logins')} {user.loginCount} {t('admin.usersMgmt.times')}</span>
                              {user.lastLogin && <span>{t('admin.usersMgmt.lastLogin')} {new Date(user.lastLogin).toLocaleDateString('ar')}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <Select value={user.role} onValueChange={(val) => updateUser(user.id, { role: val })} disabled={saving}>
                              <SelectTrigger className="h-7 text-[10px] w-24 border-primary/20 bg-card/50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user" className="text-xs">{t('admin.roles.user')}</SelectItem>
                                <SelectItem value="supervisor" className="text-xs">{t('admin.roles.supervisor')}</SelectItem>
                                <SelectItem value="owner" className="text-xs">{t('admin.roles.owner')}</SelectItem>
                              </SelectContent>
                            </Select>

                            {user.isBlocked ? (
                              <CrystalButton variant="outline" size="sm" className="h-7 text-[10px] border-sky-500/30 hover:bg-sky-500/10 text-sky-600 rounded-lg" onClick={() => updateUser(user.id, { isBlocked: false })} disabled={saving}>
                                <ShieldCheck className="w-3 h-3 ml-1" />
                                {t('admin.usersMgmt.unblock')}
                              </CrystalButton>
                            ) : (
                              <CrystalButton variant="outline" size="sm" className="h-7 text-[10px] border-red-500/30 hover:bg-red-500/10 text-red-600 rounded-lg" onClick={() => updateUser(user.id, { isBlocked: true })} disabled={saving}>
                                <Ban className="w-3 h-3 ml-1" />
                                {t('admin.usersMgmt.block')}
                              </CrystalButton>
                            )}

                            {!user.isBlocked && user.role === 'user' && (
                              <CrystalButton variant="outline" size="sm" className="h-7 text-[10px] border-blue-500/30 hover:bg-blue-500/10 text-blue-600 rounded-lg" onClick={() => updateUser(user.id, { role: 'supervisor' })} disabled={saving}>
                                <ShieldAlert className="w-3 h-3 ml-1" />
                                {t('admin.usersMgmt.promote')}
                              </CrystalButton>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {/* ========== TAB 3: Prayers ========== */}
        {activeTab === 'prayers' && (
          <div className="space-y-6">
            {/* Add Prayer Form */}
            <Card className="glass-card border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  {t('admin.addPrayer')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input value={prayerTitle} onChange={(e) => setPrayerTitle(e.target.value)} placeholder={t('admin.titleField')} className="text-xs border-primary/20 bg-card/50" />
                  <Input value={prayerSubtitle} onChange={(e) => setPrayerSubtitle(e.target.value)} placeholder={t('admin.subtitleField')} className="text-xs border-primary/20 bg-card/50" />
                  <Select value={prayerCategory} onValueChange={setPrayerCategory}>
                    <SelectTrigger className="w-24 text-xs border-primary/20 bg-card/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="دعاء" className="text-xs">{t('admin.prayersMgmt.categoryPrayer')}</SelectItem>
                      <SelectItem value="زيارة" className="text-xs">{t('admin.prayersMgmt.categoryVisit')}</SelectItem>
                      <SelectItem value="خطب" className="text-xs">{t('admin.prayersMgmt.categorySermon')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea value={prayerText} onChange={(e) => setPrayerText(e.target.value)} placeholder={t('admin.textField')} className="min-h-[120px] text-xs border-primary/20 bg-card/50 resize-none" />
                <CrystalButton className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg" onClick={addPrayer} disabled={saving || !prayerTitle.trim() || !prayerText.trim()}>
                  <Save className="w-4 h-4 ml-2" />
                  {t('admin.addPrayerShort')}
                </CrystalButton>
              </CardContent>
            </Card>

            {/* Existing Prayers */}
            <Card className="glass-card border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  {t('admin.prayersMgmt.title')}
                  <Badge variant="secondary" className="text-[10px] mr-auto">{prayers.length} {t('admin.prayersMgmt.itemN')}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? spinner : (
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-2">
                      {prayers.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">{t('admin.prayersMgmt.noItems')}</p>}
                      {prayers.map((prayer) => (
                        <div key={prayer.id} className="p-3 rounded-lg bg-card/50 border border-border/30" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'start' }}>
                          <div style={{ minWidth: 0, overflow: 'hidden' }}>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-medium truncate" style={{ minWidth: 0 }}>{prayer.title}</p>
                              <Badge variant="secondary" className="text-[9px] shrink-0">{prayer.category}</Badge>
                              {!prayer.isPublished && (
                                <Badge variant="secondary" className="text-[9px] bg-yellow-500/20 text-yellow-600 shrink-0">{t('admin.prayersMgmt.draft')}</Badge>
                              )}
                            </div>
                            {prayer.subtitle && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 truncate" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prayer.subtitle}</p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1 truncate" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prayer.text.substring(0, 80)}...</p>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive" onClick={() => deletePrayer(prayer.id)} disabled={saving}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-primary/70 hover:text-primary" onClick={() => togglePublish(prayer)} disabled={saving}>
                              {prayer.isPublished ? <Eye className="w-3 h-3" /> : <Eye className="w-3 h-3 opacity-40" />}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========== TAB: Load Balancer ========== */}
        {activeTab === 'loadbalancer' && (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: t('admin.loadBalancer.activeKeys'), value: lbStats?.active || 0, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { label: t('admin.loadBalancer.standbyKeys'), value: lbStats?.standby || 0, icon: Clock, color: 'text-sky-500', bg: 'bg-sky-500/10' },
                { label: t('admin.loadBalancer.cooldownKeys'), value: lbStats?.cooldown || 0, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
                { label: t('admin.loadBalancer.exhaustedKeys'), value: lbStats?.exhausted || 0, icon: Gauge, color: 'text-orange-500', bg: 'bg-orange-500/10' },
              ].map((s) => (
                <Card key={s.label} className="glass-card border-primary/10">
                  <CardContent className="p-3 text-center">
                    <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Total Stats */}
            <Card className="glass-card border-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-around text-center">
                  <div>
                    <p className="text-lg font-bold text-primary">{lbStats?.total || 0}</p>
                    <p className="text-[10px] text-muted-foreground">{t('admin.loadBalancer.totalKeys')}</p>
                  </div>
                  <Separator orientation="vertical" className="h-10 bg-primary/10" />
                  <div>
                    <p className="text-lg font-bold text-primary">{(lbStats?.totalRequests || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{t('admin.loadBalancer.totalRequests')}</p>
                  </div>
                  <Separator orientation="vertical" className="h-10 bg-primary/10" />
                  <div>
                    <p className="text-lg font-bold text-primary">{(lbStats?.totalTokens || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{t('admin.loadBalancer.tokensUsed')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Input */}
            <Card className="glass-card border-primary/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Server className="w-4 h-4 text-primary" />
                    {t('admin.loadBalancer.addKeys')}
                  </CardTitle>
                  <div className="flex gap-2">
                    <CrystalButton variant="outline" size="sm" className="text-[10px] gap-1 border-primary/20 hover:bg-primary/10" onClick={() => setShowBulkInput(!showBulkInput)}>
                      {showBulkInput ? 'إخفاء لصق بالجملة' : 'لصق عدة مفاتيح'}
                    </CrystalButton>
                    <CrystalButton variant="outline" size="sm" className="text-[10px] gap-1 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600" onClick={() => lbUpdate({ action: 'reactivateAll' })} disabled={saving}>
                      <RotateCcw className="w-3 h-3" />
                      {t('admin.loadBalancer.reactivateAll')}
                    </CrystalButton>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Source indicator: DB vs ENV */}
                {lbStats?.source === 'env' && (
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11px] space-y-1">
                    <p className="font-medium flex items-center gap-1"><Server className="w-3.5 h-3.5" /> وضع متغيرات البيئة (Vercel)</p>
                    <p>المفاتيح تُقرأ من متغيرات البيئة. لإضافة/تعديل المفاتيح:</p>
                    <ul className="list-disc list-inside text-[10px] space-y-0.5 opacity-90">
                      <li><code className="bg-black/10 px-1 rounded">GROQ_API_KEY</code> - مفتاح Groq</li>
                      <li><code className="bg-black/10 px-1 rounded">DEEPSEEK_API_KEY</code> - مفتاح DeepSeek</li>
                      <li><code className="bg-black/10 px-1 rounded">GEMINI_API_KEY</code> - مفتاح Gemini</li>
                      <li><code className="bg-black/10 px-1 rounded">OPENAI_API_KEY</code> - مفتاح OpenAI</li>
                      <li><code className="bg-black/10 px-1 rounded">AI_KEYS</code> - عدة مفاتيح: <code>groq:gsk_xxx,deepseek:sk_xxx</code></li>
                    </ul>
                    <p className="text-[10px] opacity-80 mt-1">لإضافة مفاتيح، اذهب إلى إعدادات المشروع في Vercel → Environment Variables</p>
                  </div>
                )}

                {/* Error / Success messages */}
                {lbError && (
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 text-[11px]">{lbError}</div>
                )}
                {lbSuccess && (
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-[11px]">{lbSuccess}</div>
                )}

                {/* Single Key Input */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground/80">إضافة مفتاح واحد</p>
                  <div className="flex gap-2">
                    <Input
                      value={singleKey}
                      onChange={(e) => { setSingleKey(e.target.value); setLbError(null); setLbSuccess(null); }}
                      placeholder="gsk_... أو sk-... أو AIza..."
                      className="text-xs border-primary/20 bg-card/50 flex-1 font-mono"
                      onKeyDown={(e) => e.key === 'Enter' && handleSingleKeyAdd()}
                    />
                    <Input
                      value={singleKeyLabel}
                      onChange={(e) => setSingleKeyLabel(e.target.value)}
                      placeholder="تسمية (اختياري)"
                      className="text-xs border-primary/20 bg-card/50 w-28"
                    />
                    <CrystalButton
                      className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
                      onClick={handleSingleKeyAdd}
                      disabled={saving || !singleKey.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </CrystalButton>
                  </div>
                  <p className="text-[9px] text-muted-foreground text-center">يتم كشف مزود الخدمة تلقائيًا (Groq, DeepSeek, Gemini, OpenAI, OpenRouter)</p>
                </div>

                <Separator className="bg-primary/10" />

                {/* Bulk Paste */}
                {showBulkInput ? (
                  <>
                    <p className="text-xs font-medium text-foreground/80">لصق عدة مفاتيح دفعة واحدة</p>
                    <Textarea
                      value={bulkText}
                      onChange={(e) => { setBulkText(e.target.value); setLbError(null); setLbSuccess(null); }}
                      placeholder={t('admin.loadBalancer.bulkPlaceholder')}
                      className="min-h-[100px] text-xs border-primary/20 bg-card/50 resize-none font-mono"
                    />
                    <div className="flex gap-2">
                      <CrystalButton className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg" onClick={handleBulkAdd} disabled={saving || !bulkText.trim()}>
                        <Save className="w-4 h-4 ml-2" />
                        {t('admin.loadBalancer.autoSave')}
                      </CrystalButton>
                      <CrystalButton variant="outline" className="border-red-500/30 hover:bg-red-500/10 text-red-600 rounded-lg" onClick={() => lbDelete({ action: 'deleteAll' })} disabled={saving}>
                        <Trash2 className="w-4 h-4 ml-1" />
                        {t('admin.loadBalancer.deleteAll')}
                      </CrystalButton>
                    </div>
                    <p className="text-[9px] text-muted-foreground text-center">{t('admin.loadBalancer.autoDetect')}</p>
                  </>
                ) : null}
              </CardContent>
            </Card>

            {/* Keys by Provider */}
            {lbStats?.providers && lbStats.providers.length > 0 ? (
              lbStats.providers.map((provider) => (
                <Card key={provider.id} className="glass-card border-primary/10">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-primary" />
                        {provider.label}
                        <Badge variant="secondary" className="text-[9px]">{provider.keys.length} {t('admin.loadBalancer.keyN')}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {!provider.isActive && <Badge variant="secondary" className="text-[9px] bg-red-500/20 text-red-600">{t('admin.loadBalancer.disabled')}</Badge>}
                        <CrystalButton variant="outline" size="sm" className="h-6 text-[9px] border-red-500/30 hover:bg-red-500/10 text-red-600" onClick={() => lbDelete({ providerId: provider.id })}>
                          <Trash2 className="w-3 h-3" />
                        </CrystalButton>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-[300px]">
                      <div className="space-y-2">
                        {provider.keys.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-3">{t('admin.loadBalancer.noKeys')}</p>
                        )}
                        {provider.keys.map((key) => {
                          const statusConf = KEY_STATUS[key.status] || KEY_STATUS.active;
                          const cooldownLeft = key.cooldownUntil
                            ? Math.max(0, Math.ceil((new Date(key.cooldownUntil).getTime() - Date.now()) / 60000))
                            : 0;
                          return (
                            <div key={key.id} className="p-2.5 rounded-lg bg-card/50 border border-border/30 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Key className={`w-3.5 h-3.5 shrink-0 ${key.status === 'active' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-medium truncate">
                                      {key.label || key.keyFingerprint || t('admin.loadBalancer.keyN')}
                                    </p>
                                    <p className="text-[9px] text-muted-foreground">
                                      {t('admin.loadBalancer.requests')}: {key.requestCount} | Tokens: {key.tokensUsed.toLocaleString()}
                                      {key.lastUsedAt && ` | ${new Date(key.lastUsedAt).toLocaleTimeString('ar')}`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${statusConf.color}`}>
                                    {statusConf.label}
                                  </Badge>
                                  {cooldownLeft > 0 && (
                                    <span className="text-[8px] text-red-500 font-mono">{cooldownLeft}{t('admin.loadBalancer.minutesShort')}</span>
                                  )}
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive" onClick={() => lbDelete({ keyId: key.id })}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                              {key.lastError && (
                                <p className="text-[9px] text-red-400/80 truncate">{t('admin.loadBalancer.connectionError')}: {key.lastError}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="glass-card border-primary/10">
                <CardContent className="p-8 text-center">
                  <Zap className="w-10 h-10 text-primary/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">لا توجد مفاتيح API بعد</p>
                  <p className="text-[10px] text-muted-foreground mt-1">أضف مفتاح Groq أو DeepSeek أو Gemini من الأعلى للبدء</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ========== TAB: Ads ========== */}
        {activeTab === 'ads' && (
          <div className="space-y-6">
            {/* Add Ad Form */}
            <Card className="glass-card border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Tv className="w-4 h-4 text-primary" />
                  إضافة إعلان جديد
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Input
                    value={adTitle}
                    onChange={(e) => setAdTitle(e.target.value)}
                    placeholder="عنوان الإعلان (مطلوب)"
                    className="text-xs border-primary/20 bg-card/50"
                  />
                  <div className="flex gap-2">
                    <Input
                      value={adImageUrl}
                      onChange={(e) => setAdImageUrl(e.target.value)}
                      placeholder="رابط الصورة (اختياري)"
                      className="text-xs border-primary/20 bg-card/50 flex-1"
                    />
                    <Input
                      value={adLinkUrl}
                      onChange={(e) => setAdLinkUrl(e.target.value)}
                      placeholder="رابط التوجيه (اختياري)"
                      className="text-xs border-primary/20 bg-card/50 flex-1"
                    />
                  </div>
                  <Input
                    value={adPriority}
                    onChange={(e) => setAdPriority(e.target.value)}
                    placeholder="الأولوية (رقم، الافتراضي 0)"
                    type="number"
                    className="text-xs border-primary/20 bg-card/50"
                  />
                </div>
                <CrystalButton
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
                  onClick={async () => {
                    if (!adTitle.trim() || saving) return;
                    setSaving(true);
                    try {
                      const res = await fetch('/api/admin/ads', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          title: adTitle.trim(),
                          imageUrl: adImageUrl.trim() || undefined,
                          linkUrl: adLinkUrl.trim() || undefined,
                          priority: parseInt(adPriority) || 0,
                        }),
                      });
                      if (res.ok) {
                        const json = await res.json();
                        setAdminAds((prev) => [...prev, json.ad]);
                        setAdTitle('');
                        setAdImageUrl('');
                        setAdLinkUrl('');
                        setAdPriority('0');
                      }
                    } catch { /* silent */ } finally { setSaving(false); }
                  }}
                  disabled={saving || !adTitle.trim()}
                >
                  <Save className="w-4 h-4 ml-2" />
                  إضافة الإعلان
                </CrystalButton>
              </CardContent>
            </Card>

            {/* Ads List */}
            <Card className="glass-card border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Tv className="w-4 h-4 text-primary" />
                  إدارة الإعلانات
                  <Badge variant="secondary" className="text-[10px] mr-auto">{adminAds.length} إعلان</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? spinner : (
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-2">
                      {adminAds.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-6">لا توجد إعلانات بعد</p>
                      )}
                      {adminAds.map((ad) => (
                        <div key={ad.id} className="p-3 rounded-lg bg-card/50 border border-border/30">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs font-medium truncate">{ad.title}</p>
                                <Badge
                                  variant="secondary"
                                  className={`text-[9px] px-2 py-0.5 ${ad.isActive ? 'bg-green-500/20 text-green-600' : 'bg-gray-500/20 text-gray-500'}`}
                                >
                                  {ad.isActive ? 'فعّال' : 'معطّل'}
                                </Badge>
                              </div>
                              {ad.imageUrl && (
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5">🖼 {ad.imageUrl}</p>
                              )}
                              {ad.linkUrl && (
                                <p className="text-[10px] text-primary truncate">🔗 {ad.linkUrl}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                <span>👁 {ad.impressions}</span>
                                <span>👆 {ad.clicks}</span>
                                <span>⭐ {ad.priority}</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-6 w-6 ${ad.isActive ? 'text-green-500/70 hover:text-green-500' : 'text-gray-400 hover:text-gray-500'}`}
                                onClick={async () => {
                                  if (saving) return;
                                  setSaving(true);
                                  try {
                                    const res = await fetch('/api/admin/ads', {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ id: ad.id, isActive: !ad.isActive }),
                                    });
                                    if (res.ok) {
                                      const json = await res.json();
                                      setAdminAds((prev) => prev.map((a) => a.id === ad.id ? { ...a, isActive: json.ad.isActive } : a));
                                    }
                                  } catch { /* silent */ } finally { setSaving(false); }
                                }}
                                disabled={saving}
                              >
                                {ad.isActive ? <Eye className="w-3 h-3" /> : <Eye className="w-3 h-3 opacity-40" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive/70 hover:text-destructive"
                                onClick={async () => {
                                  if (!confirm('هل تريد حذف هذا الإعلان؟')) return;
                                  setSaving(true);
                                  try {
                                    const res = await fetch('/api/admin/ads', {
                                      method: 'DELETE',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ id: ad.id }),
                                    });
                                    if (res.ok) {
                                      setAdminAds((prev) => prev.filter((a) => a.id !== ad.id));
                                    }
                                  } catch { /* silent */ } finally { setSaving(false); }
                                }}
                                disabled={saving}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Refresh Button */}
        <div className="flex justify-center">
          <CrystalButton variant="outline" className="border-primary/20 hover:bg-primary/10" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 ml-2" />
            {t('admin.loadBalancer.refreshData')}
          </CrystalButton>
        </div>

        {/* ========== TAB: HuggingFace ========== */}
        {activeTab === 'huggingface' && (
          <div className="space-y-6">
            {/* HF Stats Overview */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {[
                { label: 'نشط', value: hfStats?.active || 0, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                { label: 'إصدار', value: hfStats?.disabled || 0, icon: Gauge, color: 'text-gray-500', bg: 'bg-gray-500/10' },
                { label: 'تجميد', value: hfStats?.cooldown || 0, icon: Clock, color: 'text-red-500', bg: 'bg-red-500/10' },
                { label: 'مستنفد', value: hfStats?.exhausted || 0, icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
                { label: 'إجمالي التوكن', value: (hfStats?.totalTokens || 0).toLocaleString(), icon: Database, color: 'text-primary', bg: 'bg-primary/10' },
              ].map((s) => (
                <Card key={s.label} className="glass-card border-primary/10">
                  <CardContent className="p-3 text-center">
                    <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
                    <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] text-muted-foreground">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Daily Usage Monitor */}
            <Card className="glass-card border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  مراقب الاستهلاك اليومي
                  <Badge variant="secondary" className="text-[10px] mr-auto">{dailyUsage?.totalRequests || 0} طلب</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
                  {[
                    { label: 'كاش', value: dailyUsage?.cacheHits || 0, color: 'text-emerald-500' },
                    { label: 'HF', value: dailyUsage?.hfCalls || 0, color: 'text-blue-500' },
                    { label: 'احتياطي', value: dailyUsage?.fallbackCalls || 0, color: 'text-orange-500' },
                    { label: 'فاشل', value: dailyUsage?.failedCalls || 0, color: 'text-red-500' },
                    { label: 'AI كلي', value: dailyUsage?.aiCalls || 0, color: 'text-purple-500' },
                    { label: 'توكن', value: (dailyUsage?.totalTokens || 0).toLocaleString(), color: 'text-primary' },
                  ].map((s) => (
                    <div key={s.label}>
                      <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-[9px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
                {dailyUsage && dailyUsage.totalRequests > 0 && (
                  <div className="mt-3 h-2 rounded-full bg-card/50 overflow-hidden flex">
                    <div className="bg-emerald-500 h-full" style={{ width: `${(dailyUsage.cacheHits / dailyUsage.totalRequests) * 100}%` }} title={`كاش: ${dailyUsage.cacheHits}`} />
                    <div className="bg-blue-500 h-full" style={{ width: `${(dailyUsage.hfCalls / dailyUsage.totalRequests) * 100}%` }} title={`HF: ${dailyUsage.hfCalls}`} />
                    <div className="bg-orange-500 h-full" style={{ width: `${(dailyUsage.fallbackCalls / dailyUsage.totalRequests) * 100}%` }} title={`احتياطي: ${dailyUsage.fallbackCalls}`} />
                    <div className="bg-red-500 h-full" style={{ width: `${(dailyUsage.failedCalls / dailyUsage.totalRequests) * 100}%` }} title={`فاشل: ${dailyUsage.failedCalls}`} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add HF Token */}
            <Card className="glass-card border-primary/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-primary" />
                    إدارة مفاتيح HuggingFace
                    <Badge variant="secondary" className="text-[10px] mr-auto">{hfStats?.total || 0} مفتاح</Badge>
                  </CardTitle>
                  <div className="flex gap-2">
                    <CrystalButton variant="outline" size="sm" className="text-[10px] gap-1 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600" onClick={async () => { setSaving(true); const r = await fetch('/api/hf-keys', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reactivateAll' }) }); const d = await r.json(); setSaving(false); await fetchData(); }} disabled={saving}>
                      <RotateCcw className="w-3 h-3" />
                      إعادة تفعيل الكل
                    </CrystalButton>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add Single Token */}
                <div className="flex gap-2">
                  <Input value={hfSingleLabel} onChange={(e) => setHfSingleLabel(e.target.value)} placeholder="تسمية (اختياري)" className="text-xs border-primary/20 bg-card/50 w-28" />
                  <Input value={hfSingleToken} onChange={(e) => setHfSingleToken(e.target.value)} placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxx" className="text-xs border-primary/20 bg-card/50 flex-1" />
                  <CrystalButton size="sm" className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg" onClick={async () => { if (!hfSingleToken.trim()) return; setHfModelError(null); setHfModelSuccess(null); setSaving(true); try { const r = await fetch('/api/hf-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add', token: hfSingleToken.trim(), label: hfSingleLabel.trim() || undefined }) }); const d = await r.json(); if (r.ok && d.success) { setHfSingleToken(''); setHfSingleLabel(''); setHfModelSuccess('تم إضافة المفتاح بنجاح'); } else { setHfModelError(d.error || 'فشل في إضافة المفتاح'); } } catch { setHfModelError('خطأ في الاتصال بالخادم'); } setSaving(false); await fetchData(); }} disabled={saving || !hfSingleToken.trim()}>
                    <Plus className="w-4 h-4" />
                  </CrystalButton>
                </div>

                {/* Bulk Add */}
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground">أو الصق عدة مفاتيح (مفتاح واحد لكل سطر):</p>
                  <Textarea value={hfBulkTokens} onChange={(e) => setHfBulkTokens(e.target.value)} placeholder={'hf_token_1\nhf_token_2\nhf_token_3'} className="min-h-[80px] text-xs border-primary/20 bg-card/50 resize-none" />
                  <CrystalButton variant="outline" className="w-full text-xs gap-1 border-primary/20 hover:bg-primary/10" onClick={async () => { if (!hfBulkTokens.trim()) return; setHfModelError(null); setHfModelSuccess(null); setSaving(true); try { const tokens = hfBulkTokens.split('\n').map(t => t.trim()).filter(t => t.length > 10); const r = await fetch('/api/hf-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'bulkAdd', tokens }) }); const d = await r.json(); if (r.ok && d.success) { setHfBulkTokens(''); let msg = `تم إضافة: ${d.added || 0} مفتاح بنجاح`; if (d.skipped > 0) msg += ` | مكررة/موجودة: ${d.skipped}`; if (d.errors > 0) msg += ` | أخطاء: ${d.errors}`; setHfModelSuccess(msg); } else { setHfModelError(d.error || 'فشل في إضافة المفاتيح'); } } catch { setHfModelError('خطأ في الاتصال بالخادم'); } setSaving(false); await fetchData(); }} disabled={saving || !hfBulkTokens.trim()}>
                    <Save className="w-3 h-3" />
                    إضافة {hfBulkTokens.split('\n').filter(t => t.trim().length > 10).length} مفتاح
                  </CrystalButton>
                </div>

                {hfModelSuccess && <p className="text-[10px] text-emerald-500">{hfModelSuccess}</p>}
                {hfModelError && <p className="text-[10px] text-red-500">{hfModelError}</p>}

                {/* Keys List */}
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2">
                    {(!hfStats || hfStats.keys.length === 0) && <p className="text-xs text-muted-foreground text-center py-4">لا توجد مفاتيح HuggingFace بعد. أضف مفاتيح أعلاه.</p>}
                    {hfStats?.keys.map((key) => {
                      const statusColors: Record<string, string> = {
                        active: 'bg-emerald-500 text-white',
                        cooldown: 'bg-red-500 text-white',
                        exhausted: 'bg-orange-500 text-white',
                        disabled: 'bg-gray-500 text-white',
                      };
                      const statusLabels: Record<string, string> = {
                        active: 'نشط',
                        cooldown: 'مجمد',
                        exhausted: 'مستنفد',
                        disabled: 'معطل',
                      };
                      const successRate = key.requestCount > 0 ? Math.round((key.successCount / key.requestCount) * 100) : 100;
                      const barColor = successRate >= 90 ? 'bg-emerald-500' : successRate >= 70 ? 'bg-yellow-500' : 'bg-red-500';

                      return (
                        <motion.div key={key.id} className="p-3 rounded-xl bg-card/50 border border-border/30 space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Cpu className="w-3 h-3 text-primary" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] font-medium truncate">{key.label || key.fingerprint}</p>
                                <p className="text-[9px] text-muted-foreground">{key.model.split('/').pop()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant="secondary" className={`text-[9px] px-1.5 py-0.5 ${statusColors[key.status] || statusColors.disabled}`}>{statusLabels[key.status] || key.status}</Badge>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive" onClick={async () => { if (!confirm('حذف هذا المفتاح؟')) return; await fetch(`/api/hf-keys?keyId=${key.id}`, { method: 'DELETE' }); await fetchData(); }}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          {/* Success Rate Bar */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-card/80 overflow-hidden">
                              <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${successRate}%` }} />
                            </div>
                            <span className="text-[9px] text-muted-foreground shrink-0">{successRate}%</span>
                          </div>
                          {/* Stats Row */}
                          <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
                            <span>طلبات: {key.requestCount}</span>
                            <span>نجاح: {key.successCount}</span>
                            <span>فشل: {key.failCount}</span>
                            <span>توكن: {key.tokensUsed.toLocaleString()}</span>
                            {key.lastError && <span className="text-red-400 truncate max-w-[120px]" title={key.lastError}>{key.lastError.slice(0, 30)}</span>}
                          </div>
                          {key.cooldownUntil && new Date(key.cooldownUntil) > new Date() && (
                            <p className="text-[9px] text-orange-400">مجمد حتى: {new Date(key.cooldownUntil).toLocaleTimeString('ar')}</p>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
        {/* ========== TAB: Tasbeeh (تسبيحات) ========== */}
        {activeTab === 'tasbeeh' && (
          <div className="space-y-6">
            {/* إضافة تسبيحة جديدة */}
            <Card className="glass-card border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CircleDot className="w-4 h-4 text-emerald-500" />
                  إضافة تسبيحة جديدة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-[10px] font-medium text-foreground/70 mb-1 block">اسم التسبيحة</label>
                  <Input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="مثال: تسبيح الزهراء عليها السلام" className="text-xs border-primary/20 bg-card/50" />
                </div>
                <CrystalButton
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg"
                  onClick={addTasbeehGroup}
                  disabled={saving || !newGroupName.trim()}
                >
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة التسبيحة
                </CrystalButton>
              </CardContent>
            </Card>

            {/* التسبيحات المضافة */}
            <Card className="glass-card border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-500" />
                  التسبيحات المضافة
                  <Badge variant="secondary" className="text-[10px] mr-auto">{tasbeehGroups.length} تسبيحة</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? spinner : (
                  <ScrollArea className="max-h-[500px]">
                    <div className="space-y-3">
                      {tasbeehGroups.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">لا توجد تسبيحات بعد</p>}
                      {tasbeehGroups.map((group) => (
                        <motion.div
                          key={group.id}
                          className="rounded-xl bg-card/50 border border-border/30 overflow-hidden"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                        >
                          {/* رأس التسبيحة */}
                          <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-card/80 transition-colors" onClick={() => setExpandedGroupId(expandedGroupId === group.id ? null : group.id)}>
                            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                              <CircleDot className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">{group.name}</p>
                              <p className="text-[10px] text-muted-foreground">{group.items.length} تسبيحة فرعية</p>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${expandedGroupId === group.id ? 'rotate-180' : ''}`} />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive/70 hover:text-destructive shrink-0"
                              onClick={(e) => { e.stopPropagation(); deleteTasbeehGroup(group.id); }}
                              disabled={saving}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>

                          {/* التسبيحات الفرعية الموسعة */}
                          {expandedGroupId === group.id && (
                            <div className="border-t border-border/20 bg-card/30 p-3 space-y-3">
                              {/* إضافة تسبيحة فرعية: التسبيحة + عدد التسبيح */}
                              <div className="space-y-2">
                                <p className="text-[11px] font-semibold text-emerald-500">إضافة تسبيحة فرعية</p>
                                <div className="space-y-2">
                                  <div>
                                    <label className="text-[10px] font-medium text-foreground/70 mb-1 block">التسبيح</label>
                                    <Input
                                      value={newItemText}
                                      onChange={(e) => setNewItemText(e.target.value)}
                                      placeholder="مثال: الله اكبر"
                                      className="text-xs border-emerald-500/20 bg-card/50 w-full"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-medium text-foreground/70 mb-1 block">عدد التسبيح</label>
                                    <Input
                                      value={newItemCount}
                                      onChange={(e) => setNewItemCount(e.target.value)}
                                      placeholder="مثال: 15"
                                      className="text-xs border-emerald-500/20 bg-card/50 w-24 text-center"
                                      dir="ltr"
                                      type="number"
                                      min="1"
                                    />
                                  </div>
                                </div>
                                <CrystalButton
                                  className="w-full bg-emerald-600/80 text-white hover:bg-emerald-700 rounded-lg text-xs h-8"
                                  onClick={() => addTasbeehItem(group.id)}
                                  disabled={saving || !newItemText.trim()}
                                >
                                  <Plus className="w-3.5 h-3.5 ml-1" />
                                  إضافة التسبيحة الفرعية
                                </CrystalButton>
                              </div>

                              {/* قائمة التسبيحات الفرعية */}
                              <div className="space-y-2">
                                {group.items.length === 0 && (
                                  <p className="text-[10px] text-muted-foreground text-center py-3">لا توجد تسبيحات فرعية</p>
                                )}
                                {group.items.map((item, idx) => (
                                  <div key={item.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-card/60 border border-emerald-500/10">
                                    <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 text-[10px] font-bold text-emerald-600">{idx + 1}</div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">{item.text}</p>
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] shrink-0 bg-emerald-500/15 text-emerald-600 border-emerald-500/20">{item.count} مرة</Badge>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-destructive/70 hover:text-destructive shrink-0"
                                      onClick={() => deleteTasbeehItem(group.id, item.id)}
                                      disabled={saving}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========== TAB: Sites ========== */}
        {activeTab === 'sites' && (
          <div className="space-y-6">
            {/* Add Site Form */}
            <Card className="glass-card border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  إضافة موقع جديد
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="اسم الموقع" className="text-xs border-primary/20 bg-card/50 flex-1" onKeyDown={(e) => e.key === 'Enter' && addSite()} />
                  <Input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://example.com" className="text-xs border-primary/20 bg-card/50 flex-1" onKeyDown={(e) => e.key === 'Enter' && addSite()} />
                </div>
                <Input value={siteDesc} onChange={(e) => setSiteDesc(e.target.value)} placeholder="وصف اختياري للموقع..." className="text-xs border-primary/20 bg-card/50" onKeyDown={(e) => e.key === 'Enter' && addSite()} />
                {/* Image Upload */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ImagePlus className="w-3.5 h-3.5" />
                    صورة الموقع (اختياري)
                  </p>
                  {siteImagePreview ? (
                    <div className="relative group">
                      <img src={siteImagePreview} alt="معاينة" className="w-full h-32 object-cover rounded-xl border border-primary/15" />
                      <button
                        onClick={() => { setSiteImage(''); setSiteImagePreview(''); }}
                        className="absolute top-1.5 left-1.5 p-1.5 rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        type="button"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 h-28 rounded-xl border-2 border-dashed border-primary/15 bg-primary/3 hover:bg-primary/5 hover:border-primary/25 cursor-pointer transition-all">
                      <Upload className="w-6 h-6 text-primary/40" />
                      <span className="text-[11px] text-muted-foreground">
                        {uploadingImage ? 'جاري الرفع...' : 'اضغط لاختيار صورة'}
                      </span>
                      <span className="text-[9px] text-muted-foreground/60">JPEG, PNG, GIF, WebP — حتى 2MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadSiteImage(file);
                        }}
                        disabled={uploadingImage}
                      />
                    </label>
                  )}
                </div>
                <CrystalButton className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg" onClick={addSite} disabled={saving || !siteName.trim() || !siteUrl.trim() || uploadingImage}>
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة موقع
                </CrystalButton>
              </CardContent>
            </Card>

            {/* Existing Sites */}
            <Card className="glass-card border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  المواقع المضافة
                  <Badge variant="secondary" className="text-[10px] mr-auto">{sites.length} موقع</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {sites.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">لا توجد مواقع مضافة بعد</p>}
                    {sites.map((site) => (
                      <motion.div
                        key={site.id}
                        className="flex items-center justify-between gap-2 p-3 rounded-xl bg-card/50 border border-border/30"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {site.imageUrl ? (
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden border border-primary/10">
                              <img src={site.imageUrl} alt={site.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary text-sm font-bold">
                              {site.name[0].toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{site.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{site.url}</p>
                            {site.description && (
                              <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{site.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a href={site.url} target="_blank" rel="noopener noreferrer">
                            <CrystalButton variant="outline" size="sm" className="h-7 text-[10px] border-sky-500/30 hover:bg-sky-500/10 text-sky-600 rounded-lg">
                              <Link2 className="w-3 h-3 ml-1" />
                              زيارة
                            </CrystalButton>
                          </a>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/70 hover:text-destructive shrink-0" onClick={() => removeSite(site.id)} disabled={saving}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>
    </div>
  );
}
