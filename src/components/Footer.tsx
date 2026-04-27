'use client';

import { motion } from 'framer-motion';

export default function Footer() {
  return (
    <motion.footer
      className="mt-auto py-4 text-center border-t border-border/20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <p className="text-xs text-muted-foreground">
        تم تطوير البرنامج بواسطة فريق{' '}
        <span className="text-primary font-medium">قلم كود</span>
      </p>
    </motion.footer>
  );
}
