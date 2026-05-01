'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type Message, type ChatMode } from '@/store/appStore';
import { Send, Trash2, BookOpen, Swords, GraduationCap, Search, Pin, Shield, Gavel } from 'lucide-react';
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
    debatePhase,
    setDebatePhase,
    debateTopic,
    setDebateTopic,
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
      placeholder: 'اكتب الموضوع الذي تريد أن نتحاور حوله...',
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

  // Pinned messages for debate mode - strict debater intro
  const PINNED_MESSAGES: Record<string, Array<{ role: 'user' | 'assistant'; content: string }>> = {
    debate: [
      {
        role: 'assistant',
        content: '⚔️ مرحباً في ساحة المحاورة.\n\nأنا المحاور الرقمي، متخصص في المناظرة العلمية والكلامية وفق المنهج الشيعي الإمامي.\n\nاختر أي موضوع تريد أن نتحاور حوله — بعد أن تكتبه، اختر هل تريد مني الإثبات أو النفي، وسأكون جاهزاً بأسلحتي من الأدلة القاطعة.\n\nاكتب موضوعك الآن.',
      },
    ],
  };

  const pinnedMsgs = PINNED_MESSAGES[chatMode] || [];
  const displayMessages = pinnedMsgs.length > 0
    ? [...pinnedMsgs.map((m, i) => ({ ...m, id: `pinned-${i}`, pinned: true })), ...messages]
    : messages;

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, debatePhase]);

  const sendMessage = useCallback(async (customMessage?: string) => {
    const messageText = customMessage || input.trim();
    if (!messageText || isLoading) return;

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
      content: messageText,
    };

    addMessage(chatMode, userMessage);
    if (!customMessage) setInput('');
    setIsLoading(chatMode, true);

    // Track debate phase
    if (chatMode === 'debate') {
      if (debatePhase === 'idle') {
        setDebatePhase('awaiting_stance');
        setDebateTopic(messageText);
      } else if (debatePhase === 'awaiting_stance') {
        // User chose a stance
        setDebatePhase('active');
      }
    }

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
  }, [input, isLoading, addMessage, chatMode, sessionId, selectedScholar, setSessionId, setIsLoading, t, user, usageInfo, setUsageInfo, setLimitReachedModal, debatePhase, setDebatePhase, setDebateTopic]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClearMessages = useCallback(() => {
    clearMessages(chatMode);
    // Reset debate phase when clearing messages
    if (chatMode === 'debate') {
      setDebatePhase('idle');
      setDebateTopic(null);
    }
  }, [clearMessages, chatMode, setDebatePhase, setDebateTopic]);

  // Debate stance handler
  const handleStance = (stance: 'prove' | 'deny') => {
    const topic = debateTopic || '';
    const stanceLabel = stance === 'prove' ? 'إثبات' : 'نفي';
    // Send explicit stance context for the AI to understand
    const message = `[موقف المحاورة: ${stanceLabel}] الموضوع: ${topic}`;
    sendMessage(message);
  };

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
      {messages.length > 0 && (
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
                        {src}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Debate stance buttons */}
        {chatMode === 'debate' && debatePhase === 'awaiting_stance' && !isLoading && (
          <motion.div
            className="flex flex-col items-center gap-3 py-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <div className="flex items-center gap-2 text-primary text-xs sm:text-sm font-medium">
              <Gavel className="w-4 h-4" />
              <span>أتريدني أن أُثبت أم أنفي؟</span>
            </div>
            <div className="flex gap-3 w-full max-w-xs">
              <CrystalButton
                className="flex-1 h-auto py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold"
                onClick={() => handleStance('prove')}
                disabled={isLoading}
              >
                <span className="flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4" />
                  أُثبت
                </span>
              </CrystalButton>
              <CrystalButton
                className="flex-1 h-auto py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold"
                onClick={() => handleStance('deny')}
                disabled={isLoading}
              >
                <span className="flex items-center justify-center gap-2">
                  <Swords className="w-4 h-4" />
                  أنفي
                </span>
              </CrystalButton>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">أو اكتب ردك مباشرة</p>
          </motion.div>
        )}

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
        {/* Hide input in debate mode when awaiting stance */}
        {!(chatMode === 'debate' && debatePhase === 'awaiting_stance') && (
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
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
            >
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 rotate-180" />
            </CrystalButton>
          </div>
        )}
      </motion.div>
    </div>
  );
}
