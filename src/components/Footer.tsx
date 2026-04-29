'use client';

import { motion } from 'framer-motion';
import { useTranslation } from '@/i18n/useTranslation';

export default function Footer() {
  const { t } = useTranslation();
  return (
    <motion.footer
      className="hidden sm:block mt-auto py-3 text-center border-t border-border/20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <p className="text-xs text-muted-foreground">
        تم التطوير بواسطة{' '}
        <span className="text-primary font-medium">سجاد علي العبيدي</span>
      </p>
    </motion.footer>
  );
}
