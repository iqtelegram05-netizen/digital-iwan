import { create } from 'zustand';

export type View = 'splash' | 'chat' | 'debate' | 'teacher' | 'quiz' | 'profile' | 'admin';
export type ChatMode = 'chat' | 'debate' | 'teacher';

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

  selectedScholar: 'السيد علي السيستاني',
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
}));
