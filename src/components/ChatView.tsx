'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, type Message } from '@/store/appStore';
import { Send, Trash2, BookOpen, Swords, GraduationCap } from 'lucide-react';
import CrystalButton from './CrystalButton';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

const VIEW_CONFIG: Record<string, { title: string; icon: React.ReactNode; placeholder: string }> = {
  chat: {
    title: 'الأيوان العلمي',
    icon: <BookOpen className="w-5 h-5" />,
    placeholder: 'اسأل سؤالك في العلوم الإسلامية...',
  },
  debate: {
    title: 'المحاور الرقمي',
    icon: <Swords className="w-5 h-5" />,
    placeholder: 'قدّم حجتك للنقاش...',
  },
  teacher: {
    title: 'الأستاذ الرقمي',
    icon: <GraduationCap className="w-5 h-5" />,
    placeholder: 'اسأل أي موضوع تريد فهمه ببساطة...',
  },
};

export default function ChatView() {
  const {
    currentView,
    messages,
    addMessage,
    clearMessages,
    isLoading,
    setIsLoading,
    sessionId,
    setSessionId,
    selectedScholar,
  } = useAppStore();

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const config = VIEW_CONFIG[currentView] || VIEW_CONFIG.chat;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    addMessage(userMessage);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId,
          mode: currentView === 'chat' ? 'chat' : currentView === 'debate' ? 'debate' : 'teacher',
          scholar: selectedScholar,
        }),
      });

      const data = await res.json();

      if (data.sessionId) {
        setSessionId(data.sessionId);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || 'عذراً، حدث خطأ في المعالجة.',
        sources: data.sources,
      };

      addMessage(assistantMessage);
    } catch {
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'عذراً، حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, addMessage, currentView, sessionId, selectedScholar, setSessionId, setIsLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* View Title */}
      <motion.div
        className="flex items-center gap-2 px-4 py-3 text-primary"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {config.icon}
        <h2 className="text-lg font-bold">{config.title}</h2>
      </motion.div>

      {/* Clear chat button */}
      {messages.length > 0 && (
        <motion.div
          className="px-4 pb-2 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <CrystalButton
            variant="ghost"
            size="sm"
            className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 text-xs"
            onClick={clearMessages}
          >
            <Trash2 className="w-3.5 h-3.5 ml-1" />
            مسح المحادثة
          </CrystalButton>
        </motion.div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        {messages.length === 0 && (
          <motion.div
            className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary green-glow">
              {config.icon}
            </div>
            <p className="text-sm text-center max-w-xs">{config.placeholder}</p>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 ${
                  msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'
                }`}
              >
                <p className="text-sm leading-relaxed arabic-text whitespace-pre-wrap">{msg.content}</p>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-primary/10">
                    <p className="text-[10px] text-primary/60 mb-1">المصادر:</p>
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

      {/* Input area */}
      <motion.div
        className="sticky bottom-0 p-3 sm:p-4 bg-background/80 backdrop-blur-lg border-t border-border/30"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={config.placeholder}
            className="min-h-[44px] max-h-[120px] resize-none text-sm border-primary/20 bg-card/50 focus:ring-primary/30 rounded-xl"
            rows={1}
            disabled={isLoading}
          />
          <CrystalButton
            size="icon"
            className="shrink-0 h-11 w-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
          >
            <Send className="w-4 h-4 rotate-180" />
          </CrystalButton>
        </div>
      </motion.div>
    </div>
  );
}
