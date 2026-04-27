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
import {
  Key,
  Link2,
  Plus,
  Trash2,
  RefreshCw,
  Shield,
  Users,
  BookOpen,
  Ban,
  ShieldCheck,
  ShieldAlert,
  Save,
  Eye,
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

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'يعمل', color: 'bg-emerald-500 text-white' },
  waiting: { label: 'قيد الانتظار', color: 'bg-yellow-500 text-white' },
  consumed: { label: 'مستهلك', color: 'bg-red-500 text-white' },
};

const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  owner: { label: 'مالك', color: 'bg-purple-600 text-white' },
  supervisor: { label: 'مشرف', color: 'bg-blue-600 text-white' },
  user: { label: 'مستخدم', color: 'bg-gray-500 text-white' },
};

type AdminTab = 'keys' | 'users' | 'prayers';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>('keys');
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [adminRes, usersRes, prayersRes] = await Promise.all([
        fetch('/api/admin'),
        fetch('/api/admin/users'),
        fetch('/api/prayers'),
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
          name: newKeyName.trim() || `مفتاح ${parseInt(keySlotIndex) + 1}`,
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
          newName: newKeyName.trim() || data?.apiKeys[index]?.name || `مفتاح ${index + 1}`,
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
      }
    } catch { /* silent */ } finally { setSaving(false); }
  };

  const deletePrayer = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/prayers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setPrayers((prev) => prev.filter((p) => p.id !== id));
      }
    } catch { /* silent */ } finally { setSaving(false); }
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
      }
    } catch { /* silent */ } finally { setSaving(false); }
  };

  // ========== Loading Spinner ==========
  const spinner = (
    <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
      <motion.div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin-slow ml-2" />
      جارٍ التحميل...
    </div>
  );

  return (
    <div className="flex flex-col px-4 py-6 min-h-[60vh] max-w-3xl mx-auto">
      <motion.div
        className="w-full space-y-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center green-glow">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">لوحة التحكم</h2>
            <p className="text-xs text-muted-foreground">للمالك والمشرفين حصراً</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {([
            { id: 'keys', label: 'المفاتيح والروابط', icon: Key },
            { id: 'users', label: 'المستخدمون', icon: Users },
            { id: 'prayers', label: 'الأدعية والزيارات', icon: BookOpen },
          ] as const).map((tab) => (
            <CrystalButton
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              size="sm"
              className={`shrink-0 gap-1.5 text-xs rounded-lg ${activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'border-primary/20 hover:bg-primary/10'}`}
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
                  روابط قاعدة المعرفة (RAG)
                  {data?.stats && (
                    <Badge variant="secondary" className="text-[10px] mr-auto">{data.stats.totalRagLinks} رابط</Badge>
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
                      {data?.ragLinks.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">لا توجد روابط بعد</p>}
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
                  مفاتيح API (10 خانات)
                  {data?.stats && (
                    <div className="flex gap-1 mr-auto">
                      <Badge variant="secondary" className="text-[9px] bg-emerald-500/20 text-emerald-600">{data.stats.activeKeys} يعمل</Badge>
                      <Badge variant="secondary" className="text-[9px] bg-yellow-500/20 text-yellow-600">{data.stats.waitingKeys} انتظار</Badge>
                      <Badge variant="secondary" className="text-[9px] bg-red-500/20 text-red-600">{data.stats.consumedKeys} مستهلك</Badge>
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
                      <p className="text-xs font-medium text-foreground/80">إضافة / تبديل مفتاح</p>
                      <div className="flex gap-2">
                        <Select value={keySlotIndex} onValueChange={setKeySlotIndex}>
                          <SelectTrigger className="w-28 text-xs border-primary/20 bg-card/50">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {data?.apiKeys.map((k, i) => (
                              <SelectItem key={i} value={i.toString()} className="text-xs">
                                {k.name} {k.key ? `(موجود)` : '(فارغ)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="اسم المفتاح" className="text-xs border-primary/20 bg-card/50 flex-1" />
                      </div>
                      <div className="flex gap-2">
                        <Input value={newKeyValue} onChange={(e) => setNewKeyValue(e.target.value)} placeholder="قيمة مفتاح API" className="text-xs border-primary/20 bg-card/50 flex-1" />
                        <CrystalButton size="sm" className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg" onClick={() => swapKey(parseInt(keySlotIndex))} disabled={saving || !newKeyValue.trim()}>
                          <Save className="w-4 h-4 ml-1" />
                          حفظ
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
                المستخدمون المسجلون
                <Badge variant="secondary" className="text-[10px] mr-auto">{users.length} مستخدم</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? spinner : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-2">
                    {users.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">لا يوجد مستخدمون مسجلون بعد</p>}
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
                                <p className="text-sm font-medium truncate">{user.name || 'بدون اسم'}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${role.color}`}>{role.label}</Badge>
                              {user.isBlocked && <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-red-500 text-white">محظور</Badge>}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                            <div className="flex gap-3">
                              <span>تسجيل: {new Date(user.createdAt).toLocaleDateString('ar')}</span>
                              <span>دخول: {user.loginCount} مرة</span>
                              {user.lastLogin && <span>آخر دخول: {new Date(user.lastLogin).toLocaleDateString('ar')}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <Select value={user.role} onValueChange={(val) => updateUser(user.id, { role: val })} disabled={saving}>
                              <SelectTrigger className="h-7 text-[10px] w-24 border-primary/20 bg-card/50">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user" className="text-xs">مستخدم</SelectItem>
                                <SelectItem value="supervisor" className="text-xs">مشرف</SelectItem>
                                <SelectItem value="owner" className="text-xs">مالك</SelectItem>
                              </SelectContent>
                            </Select>

                            {user.isBlocked ? (
                              <CrystalButton variant="outline" size="sm" className="h-7 text-[10px] border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 rounded-lg" onClick={() => updateUser(user.id, { isBlocked: false })} disabled={saving}>
                                <ShieldCheck className="w-3 h-3 ml-1" />
                                رفع الحظر
                              </CrystalButton>
                            ) : (
                              <CrystalButton variant="outline" size="sm" className="h-7 text-[10px] border-red-500/30 hover:bg-red-500/10 text-red-600 rounded-lg" onClick={() => updateUser(user.id, { isBlocked: true })} disabled={saving}>
                                <Ban className="w-3 h-3 ml-1" />
                                حظر
                              </CrystalButton>
                            )}

                            {!user.isBlocked && user.role === 'user' && (
                              <CrystalButton variant="outline" size="sm" className="h-7 text-[10px] border-blue-500/30 hover:bg-blue-500/10 text-blue-600 rounded-lg" onClick={() => updateUser(user.id, { role: 'supervisor' })} disabled={saving}>
                                <ShieldAlert className="w-3 h-3 ml-1" />
                                رفع مشرف
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
                  إضافة دعاء أو زيارة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input value={prayerTitle} onChange={(e) => setPrayerTitle(e.target.value)} placeholder="عنوان الدعاء أو الزيارة" className="text-xs border-primary/20 bg-card/50" />
                  <Input value={prayerSubtitle} onChange={(e) => setPrayerSubtitle(e.target.value)} placeholder="وصف مختصر" className="text-xs border-primary/20 bg-card/50" />
                  <Select value={prayerCategory} onValueChange={setPrayerCategory}>
                    <SelectTrigger className="w-24 text-xs border-primary/20 bg-card/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="دعاء" className="text-xs">دعاء</SelectItem>
                      <SelectItem value="زيارة" className="text-xs">زيارة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea value={prayerText} onChange={(e) => setPrayerText(e.target.value)} placeholder="نص الدعاء أو الزيارة..." className="min-h-[120px] text-xs border-primary/20 bg-card/50 resize-none" />
                <CrystalButton className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg" onClick={addPrayer} disabled={saving || !prayerTitle.trim() || !prayerText.trim()}>
                  <Save className="w-4 h-4 ml-2" />
                  إضافة
                </CrystalButton>
              </CardContent>
            </Card>

            {/* Existing Prayers */}
            <Card className="glass-card border-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  الأدعية والزيارات المضافة
                  <Badge variant="secondary" className="text-[10px] mr-auto">{prayers.length} عنصر</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? spinner : (
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-2">
                      {prayers.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">لم تتم إضافة أي أدعية أو زيارات بعد</p>}
                      {prayers.map((prayer) => (
                        <div key={prayer.id} className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border/30">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-medium">{prayer.title}</p>
                              <Badge variant="secondary" className="text-[9px]">{prayer.category}</Badge>
                              {!prayer.isPublished && (
                                <Badge variant="secondary" className="text-[9px] bg-yellow-500/20 text-yellow-600">مسودة</Badge>
                              )}
                            </div>
                            {prayer.subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{prayer.subtitle}</p>}
                            <p className="text-[10px] text-muted-foreground mt-1 truncate max-w-full">{prayer.text.substring(0, 80)}...</p>
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

        {/* Refresh Button */}
        <div className="flex justify-center">
          <CrystalButton variant="outline" className="border-primary/20 hover:bg-primary/10" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث البيانات
          </CrystalButton>
        </div>
      </motion.div>
    </div>
  );
}
