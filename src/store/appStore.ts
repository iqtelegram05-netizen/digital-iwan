import { create } from 'zustand';
import type { UsageInfoData } from '@/lib/usageLimit';

export type View = 'splash' | 'chat' | 'debate' | 'teacher' | 'research' | 'quiz' | 'profile' | 'admin' | 'reader' | 'about';
export type ChatMode = 'chat' | 'debate' | 'teacher' | 'research';

export interface ReaderItem {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
  text: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface ModeChatState {
  messages: Message[];
  sessionId: string | null;
  isLoading: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: string;
  isBlocked: boolean;
  lastLogin: string | null;
}

interface AppState {
  // Views
  currentView: View;
  setCurrentView: (view: View) => void;

  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  // Chat - separate state per mode to prevent cross-contamination
  chatState: Record<ChatMode, ModeChatState>;
  addMessage: (mode: ChatMode, message: Message) => void;
  clearMessages: (mode: ChatMode) => void;
  setIsLoading: (mode: ChatMode, loading: boolean) => void;
  setSessionId: (mode: ChatMode, id: string | null) => void;

  // Scholar selection
  selectedScholar: string | null;
  setSelectedScholar: (scholar: string | null) => void;

  // Quiz
  quizQuestions: QuizQuestion[];
  setQuizQuestions: (questions: QuizQuestion[]) => void;
  quizAnswers: Record<string, number>;
  setQuizAnswer: (questionId: string, answerIndex: number) => void;
  quizScore: number | null;
  setQuizScore: (score: number | null) => void;
  quizCategory: string | null;
  setQuizCategory: (category: string | null) => void;

  // Splash
  splashComplete: boolean;
  setSplashComplete: (complete: boolean) => void;

  // Sheet open
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;

  // User auth
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;

  // Usage tracking
  usageInfo: UsageInfoData | null;
  setUsageInfo: (info: UsageInfoData | null) => void;
  limitReachedModal: boolean;
  setLimitReachedModal: (open: boolean) => void;
  showAdReward: boolean;
  setShowAdReward: (show: boolean) => void;
  lastAdRewardMsg: string;
  setLastAdRewardMsg: (msg: string) => void;

  // Debate
  debatePhase: 'idle' | 'awaiting_stance' | 'active';
  setDebatePhase: (phase: 'idle' | 'awaiting_stance' | 'active') => void;
  debateTopic: string | null;
  setDebateTopic: (topic: string | null) => void;

  // Reader
  readerItem: ReaderItem | null;
  setReaderItem: (item: ReaderItem | null) => void;
  openReader: (item: ReaderItem) => void;
}

const emptyChatState: ModeChatState = {
  messages: [],
  sessionId: null,
  isLoading: false,
};

export const useAppStore = create<AppState>((set) => ({
  currentView: 'splash',
  setCurrentView: (view) => set({ currentView: view }),

  theme: 'dark',
  setTheme: (theme) => set({ theme }),

  chatState: {
    chat: { ...emptyChatState },
    debate: { ...emptyChatState },
    teacher: { ...emptyChatState },
    research: { ...emptyChatState },
  },

  addMessage: (mode, message) =>
    set((state) => ({
      chatState: {
        ...state.chatState,
        [mode]: {
          ...state.chatState[mode],
          messages: [...state.chatState[mode].messages, message],
        },
      },
    })),

  clearMessages: (mode) =>
    set((state) => ({
      chatState: {
        ...state.chatState,
        [mode]: { ...emptyChatState },
      },
    })),

  setIsLoading: (mode, loading) =>
    set((state) => ({
      chatState: {
        ...state.chatState,
        [mode]: {
          ...state.chatState[mode],
          isLoading: loading,
        },
      },
    })),

  setSessionId: (mode, id) =>
    set((state) => ({
      chatState: {
        ...state.chatState,
        [mode]: {
          ...state.chatState[mode],
          sessionId: id,
        },
      },
    })),

  selectedScholar: 'السيد السيستاني',
  setSelectedScholar: (scholar) => set({ selectedScholar: scholar }),

  quizQuestions: [],
  setQuizQuestions: (questions) => set({ quizQuestions: questions, quizAnswers: {}, quizScore: null }),
  quizAnswers: {},
  setQuizAnswer: (questionId, answerIndex) =>
    set((state) => ({ quizAnswers: { ...state.quizAnswers, [questionId]: answerIndex } })),
  quizScore: null,
  setQuizScore: (score) => set({ quizScore: score }),
  quizCategory: null,
  setQuizCategory: (category) => set({ quizCategory: category }),

  splashComplete: false,
  setSplashComplete: (complete) => set({ splashComplete: complete }),

  sheetOpen: false,
  setSheetOpen: (open) => set({ sheetOpen: open }),

  user: null,
  setUser: (user) => set({ user }),

  // Usage tracking
  usageInfo: null,
  setUsageInfo: (info) => set({ usageInfo: info }),
  limitReachedModal: false,
  setLimitReachedModal: (open) => set({ limitReachedModal: open }),
  showAdReward: false,
  setShowAdReward: (show) => set({ showAdReward: show }),
  lastAdRewardMsg: '',
  setLastAdRewardMsg: (msg) => set({ lastAdRewardMsg: msg }),

  // Debate
  debatePhase: 'idle',
  setDebatePhase: (phase) => set({ debatePhase: phase }),
  debateTopic: null,
  setDebateTopic: (topic) => set({ debateTopic: topic }),

  readerItem: null,
  setReaderItem: (item) => set({ readerItem: item }),
  openReader: (item) => set({ readerItem: item, currentView: 'reader', sheetOpen: false }),
}));
