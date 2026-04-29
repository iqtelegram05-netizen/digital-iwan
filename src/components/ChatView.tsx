'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type Message, type ChatMode } from '@/store/appStore';
import { Send, Trash2, BookOpen, Swords, GraduationCap, Search, Pin } from 'lucide-react';
import CrystalButton from './CrystalButton';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/i18n/useTranslation';
import UsageBar from './UsageBar';

export default function ChatView() {
  const {
    currentView,
    chatState,
    addMessage,
    clearMessages,
    setIsLoading,
    setSessionId,
    selectedScholar,
    user,
    usageInfo,
    setUsageInfo,
    setLimitReachedModal,
  } = useAppStore();

  const { t } = useTranslation();

  const getViewConfig = () => ({
    chat: {
      title: t('chat.scientificIwan'),
      icon: <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />,
      placeholder: t('chat.askQuestion'),
      mode: 'chat' as ChatMode,
    },
    debate: {
      title: t('chat.digitalDebater'),
      icon: <Swords className="w-4 h-4 sm:w-5 sm:h-5" />,
      placeholder: 'قدم رأيك أو حجتك للنقاش...',
      mode: 'debate' as ChatMode,
    },
    teacher: {
      title: t('chat.digitalTeacher'),
      icon: <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />,
      placeholder: t('chat.askAnyTopic'),
      mode: 'teacher' as ChatMode,
    },
    research: {
      title: 'البحث الخارج',
      icon: <Search className="w-4 h-4 sm:w-5 sm:h-5" />,
      placeholder: 'ابحث عن مسألة فقهية أو عقدية من مصادر متعددة...',
      mode: 'research' as ChatMode,
    },
  });

  const config = getViewConfig()[currentView] || getViewConfig().chat;
  const chatMode = config.mode;
  const modeState = chatState[chatMode];
  const { messages, sessionId, isLoading } = modeState;

  // Pinned messages for debate mode
  const PINNED_MESSAGES: Record<string, Array<{ role: 'user' | 'assistant'; content: string }>> = {
    debate: [
      { role: 'user', content: 'انا هنا لاختبر معرفتك الدينية انت تثبت وانا انفي والعكس كذلك هل انت جاهز ؟' },
      { role: 'assistant', content: 'انا هنا للاجابة عن اي سؤال يدور في بالك حول عقيدتنا الالهية المحمدية' },
    ],
  };

  const pinnedMsgs = PINNED_MESSAGES[chatMode] || [];
  const displayMessages = pinnedMsgs.length > 0 ? [...pinnedMsgs.map((m, i) => ({ ...m, id: `pinned-${i}`, pinned: true })), ...messages] : messages;

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    // Check usage limit for non-admin logged-in users
    if (user && user.role !== 'owner' && user.role !== 'supervisor' && usageInfo) {
      if (!usageInfo.canSend) {
        setLimitReachedModal(true);
        return;
      }
    }

    // Check usage limit for GUEST (unauthenticated) users via localStorage
    if (!user) {
      const guestCheck = (window as any).__iwan_guest_info?.();
      if (guestCheck && !guestCheck.canSend) {
        setLimitReachedModal(true);
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    addMessage(chatMode, userMessage);
    setInput('');
    setIsLoading(chatMode, true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId,
          mode: chatMode,
          scholar: selectedScholar,
          userId: user?.id,
        }),
      });

      const data = await res.json();

      // Update usage info from response (logged-in users)
      if (data.usageInfo) {
        setUsageInfo(data.usageInfo);
      }

      // Increment guest usage counter via localStorage
      if (!user) {
        (window as any).__iwan_guest_increment?.();
      }

      // Handle limit reached from server
      if (res.status === 403 && data.error === 'limit_reached') {
        setLimitReachedModal(true);
        setIsLoading(chatMode, false);
        return;
      }

      if (data.sessionId) {
        setSessionId(chatMode, data.sessionId);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || t('chat.errorProcessing'),
        sources: data.sources,
      };

      addMessage(chatMode, assistantMessage);
    } catch {
      addMessage(chatMode, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: t('chat.errorConnection'),
      });
    } finally {
      setIsLoading(chatMode, false);
    }
  }, [input, isLoading, addMessage, chatMode, sessionId, selectedScholar, setSessionId, setIsLoading, t, user, usageInfo, setUsageInfo, setLimitReachedModal]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClearMessages = useCallback(() => {
    clearMessages(chatMode);
  }, [clearMessages, chatMode]);

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* View Title */}
      <motion.div
        className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-3 text-primary"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {config.icon}
        <h2 className="text-sm sm:text-lg font-bold">{config.title}</h2>
      </motion.div>

      {/* Usage Bar */}
      <UsageBar />

      {/* Clear chat button */}
      {messages.length > 0 && pinnedMsgs.length > 0 && (
        <motion.div
          className="px-3 sm:px-4 pb-1 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <CrystalButton
            variant="ghost"
            size="sm"
            className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 text-xs"
            onClick={handleClearMessages}
          >
            <Trash2 className="w-3.5 h-3.5 ml-1" />
            {t('chat.clearChat')}
          </CrystalButton>
        </motion.div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-1 sm:py-2 space-y-3 sm:space-y-4">
        {displayMessages.length === 0 && (
          <motion.div
            className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 sm:gap-4 py-8 sm:py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary sky-glow">
              {config.icon}
            </div>
            <p className="text-xs sm:text-sm text-center max-w-xs">{config.placeholder}</p>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {displayMessages.map((msg) => (
            <motion.div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <div
                className={`max-w-[88%] sm:max-w-[75%] px-3 py-2 sm:px-4 sm:py-3 relative ${
                  msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'
                }`}
              >
                {(msg as any).pinned && (
                  <div className="absolute -top-1.5 right-2 text-primary/50">
                    <Pin className="w-3 h-3" />
                  </div>
                )}
                <p className="text-xs sm:text-sm leading-relaxed arabic-text whitespace-pre-wrap">{msg.content}</p>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-primary/10">
                    <p className="text-[10px] text-primary/60 mb-1">{t('chat.sources')}</p>
                    {msg.sources.map((src, i) => (
                      <p key={i} className="text-[10px] text-primary/50">
                        • {src}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            className="flex justify-end"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="chat-bubble-assistant px-5 py-3 flex items-center gap-1">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Input area - compact, stuck above tab bar */}
      <motion.div
        className="shrink-0 px-1.5 sm:px-2 pt-1.5 pb-0.5 sm:pb-1 bg-background/80 backdrop-blur-lg border-t border-border/30"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex gap-1.5 items-end max-w-3xl mx-auto">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={config.placeholder}
            className="min-h-[32px] sm:min-h-[36px] max-h-[80px] resize-none text-xs sm:text-sm border-primary/20 bg-card/50 focus:ring-primary/30 rounded-lg"
            rows={1}
            disabled={isLoading}
          />
          <CrystalButton
            size="icon"
            className="shrink-0 h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
          >
            <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 rotate-180" />
          </CrystalButton>
        </div>
      </motion.div>
    </div>
  );
}
