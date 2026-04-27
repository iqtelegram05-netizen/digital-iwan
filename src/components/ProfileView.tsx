'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import CrystalButton from './CrystalButton';
import { User, Save, Sparkles, X } from 'lucide-react';

const INTEREST_OPTIONS = [
  'عقائد', 'فقه', 'تفسير', 'حديث', 'تاريخ الإسلام',
  'فلسفة إسلامية', 'منطق', 'نحو', 'بلاغة', 'أصول الفقه',
];

export default function ProfileView() {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : prev.length < 5
        ? [...prev, interest]
        : prev
    );
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col items-center px-4 py-6 min-h-[60vh] max-w-lg mx-auto">
      <motion.div
        className="w-full"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Profile Card */}
        <Card className="glass-card border-primary/10 overflow-hidden">
          {/* Avatar area */}
          <div className="relative h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center">
            <motion.div
              className="w-24 h-24 rounded-full bg-primary/20 border-4 border-primary/30 flex items-center justify-center sky-glow"
              whileHover={{ scale: 1.05 }}
            >
              <User className="w-10 h-10 text-primary" />
            </motion.div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(14,165,233,0.1),transparent)]" />
          </div>

          <CardContent className="p-6 space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">الاسم</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="أدخل اسمك"
                className="border-primary/20 focus:ring-primary/30 bg-card/50"
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">نبذة عنك</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="أخبرنا عن اهتماماتك العلمية..."
                className="min-h-[80px] resize-none border-primary/20 focus:ring-primary/30 bg-card/50"
                rows={3}
              />
            </div>

            {/* Interests */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground/80">
                الاهتمامات <span className="text-muted-foreground">(اختر حتى 5)</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((interest) => {
                  const selected = interests.includes(interest);
                  return (
                    <motion.button
                      key={interest}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                        selected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card/50 border-primary/20 text-foreground/70 hover:bg-primary/10 hover:border-primary/40'
                      }`}
                      onClick={() => toggleInterest(interest)}
                      whileTap={{ scale: 0.95 }}
                    >
                      {selected && <span className="ml-1">✓</span>}
                      {interest}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Save */}
            <CrystalButton
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3 rounded-xl"
              onClick={handleSave}
            >
              {saved ? (
                <>
                  <Sparkles className="w-4 h-4 ml-2" />
                  تم الحفظ بنجاح!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 ml-2" />
                  تحديث الملف الشخصي
                </>
              )}
            </CrystalButton>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
