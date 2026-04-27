import { create } from 'zustand';

export type View = 'splash' | 'chat' | 'debate' | 'teacher' | 'quiz' | 'profile' | 'admin';
export type SidePanel = 'none' | 'prayers' | 'qibla' | 'sermons' | 'events';

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

export interface AppState {
  // Views
  currentView: View;
  setCurrentView: (view: View) => void;

  // Side panel
  sidePanel: SidePanel;
  setSidePanel: (panel: SidePanel) => void;

  // Theme
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;

  // Chat
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;

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

export const useAppStore = create<AppState>((set) => ({
  currentView: 'splash',
  setCurrentView: (view) => set({ currentView: view }),

  sidePanel: 'none',
  setSidePanel: (panel) => set({ sidePanel: panel }),

  theme: 'dark',
  setTheme: (theme) => set({ theme }),

  messages: [],
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [], sessionId: null }),
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),

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
