'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import CrystalButton from './CrystalButton';
import {
  Settings,
  Key,
  Link2,
  Plus,
  Trash2,
  RefreshCw,
  Shield,
  ExternalLink,
} from 'lucide-react';

interface ApiKey {
  name: string;
  status: 'active' | 'waiting' | 'consumed';
}

interface AdminData {
  ragLinks: string[];
  apiKeys: ApiKey[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'يعمل', color: 'bg-emerald-500 text-white' },
  waiting: { label: 'قيد الانتظار', color: 'bg-yellow-500 text-white' },
  consumed: { label: 'مستهلك', color: 'bg-red-500 text-white' },
};

export default function AdminPanel() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newLink, setNewLink] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAdmin = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin');
      const json = await res.json();
      setData(json);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmin();
  }, [fetchAdmin]);

  const addLink = async () => {
    if (!newLink.trim() || !data) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ragLinks: [...data.ragLinks, newLink.trim()],
        }),
      });
      const json = await res.json();
      setData(json);
      setNewLink('');
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  };

  const removeLink = async (link: string) => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ragLinks: data.ragLinks.filter((l) => l !== link),
        }),
      });
      const json = await res.json();
      setData(json);
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center px-4 py-6 min-h-[60vh] max-w-2xl mx-auto">
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
            <h2 className="text-xl font-bold">لوحة الإدارة</h2>
            <p className="text-xs text-muted-foreground">إدارة المفاتيح وقاعدة المعرفة</p>
          </div>
        </div>

        {/* RAG Links */}
        <Card className="glass-card border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              روابط قاعدة المعرفة (RAG)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                <motion.div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin-slow ml-2" />
                جارٍ التحميل...
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {data?.ragLinks.map((link) => (
                    <div
                      key={link}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card/50 border border-border/30"
                    >
                      <span className="text-xs text-foreground/70 truncate flex-1">{link}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive/70 hover:text-destructive shrink-0"
                        onClick={() => removeLink(link)}
                        disabled={saving}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  {data?.ragLinks.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">لا توجد روابط بعد</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={newLink}
                    onChange={(e) => setNewLink(e.target.value)}
                    placeholder="https://example.com/knowledge"
                    className="text-xs border-primary/20 bg-card/50 focus:ring-primary/30"
                    onKeyDown={(e) => e.key === 'Enter' && addLink()}
                  />
                  <CrystalButton
                    size="sm"
                    className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
                    onClick={addLink}
                    disabled={saving || !newLink.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </CrystalButton>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card className="glass-card border-primary/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              مفاتيح API
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                <motion.div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin-slow ml-2" />
                جارٍ التحميل...
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data?.apiKeys.map((key, idx) => {
                  const status = STATUS_CONFIG[key.status] || STATUS_CONFIG.waiting;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/30"
                    >
                      <div className="flex items-center gap-3">
                        <Key className="w-4 h-4 text-primary/50" />
                        <span className="text-sm font-medium">{key.name || `مفتاح ${idx + 1}`}</span>
                      </div>
                      <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${status.color}`}>
                        {status.label}
                      </Badge>
                    </div>
                  );
                })}
                {(!data?.apiKeys || data.apiKeys.length === 0) && (
                  <p className="text-xs text-muted-foreground text-center py-3">لا توجد مفاتيح</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Refresh */}
        <div className="flex justify-center">
          <CrystalButton
            variant="outline"
            className="border-primary/20 hover:bg-primary/10"
            onClick={fetchAdmin}
          >
            <RefreshCw className="w-4 h-4 ml-2" />
            تحديث البيانات
          </CrystalButton>
        </div>
      </motion.div>
    </div>
  );
}
