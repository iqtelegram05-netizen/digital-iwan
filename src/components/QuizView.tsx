'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store/appStore';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import CrystalButton from './CrystalButton';
import { Brain, CheckCircle, XCircle, RotateCcw, Trophy, ArrowLeft } from 'lucide-react';

const CATEGORIES = [
  { id: 'عقائد', label: 'عقائد', icon: '🕌' },
  { id: 'منطق', label: 'منطق', icon: '🧠' },
  { id: 'علم', label: 'علم الكلام', icon: '📚' },
  { id: 'نحو', label: 'نحو', icon: '✍️' },
  { id: 'فقه', label: 'فقه', icon: '⚖️' },
];

export default function QuizView() {
  const {
    quizQuestions,
    setQuizQuestions,
    quizAnswers,
    setQuizAnswer,
    quizScore,
    setQuizScore,
    quizCategory,
    setQuizCategory,
  } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startQuiz = useCallback(async (category: string) => {
    setLoading(true);
    setError(null);
    setQuizCategory(category);
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      });
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        setQuizQuestions(data.questions);
        setCurrentQuestion(0);
        setShowResults(false);
      } else {
        setError('لم يتم إنشاء الأسئلة. يرجى المحاولة مرة أخرى.');
      }
    } catch {
      setError('حدث خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  }, [setQuizQuestions, setQuizCategory]);

  const submitQuiz = useCallback(async () => {
    if (!quizCategory || quizQuestions.length === 0) return;
    setLoading(true);
    try {
      // Convert answers object to array format expected by API
      const answersArray = Object.entries(quizAnswers).map(([questionId, selectedAnswer]) => ({
        questionId,
        selectedAnswer,
      }));
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: answersArray,
          category: quizCategory,
          questions: quizQuestions,
        }),
      });
      const data = await res.json();
      setQuizScore(data.score);
      setShowResults(true);
    } catch {
      setError('حدث خطأ في تسجيل الإجابات');
    } finally {
      setLoading(false);
    }
  }, [quizCategory, quizQuestions, quizAnswers, setQuizScore]);

  const getGrade = (score: number) => {
    if (score >= 90) return { label: 'ممتاز', color: 'text-sky-500' };
    if (score >= 80) return { label: 'جيد جداً', color: 'text-sky-400' };
    if (score >= 70) return { label: 'جيد', color: 'text-yellow-500' };
    if (score >= 50) return { label: 'مقبول', color: 'text-orange-500' };
    return { label: 'يحتاج تحسين', color: 'text-red-500' };
  };

  const resetQuiz = () => {
    setQuizQuestions([]);
    setQuizAnswers({});
    setQuizScore(null);
    setQuizCategory(null);
    setCurrentQuestion(0);
    setShowResults(false);
    setError(null);
  };

  // Category Selection
  if (!quizCategory || quizQuestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8">
        <motion.div
          className="flex flex-col items-center gap-6 w-full max-w-md"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary sky-glow">
            <Brain className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-bold text-foreground">اختبر نفسك</h2>
          <p className="text-sm text-muted-foreground text-center">اختر تصنيفاً لبدء الاختبار</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full mt-2">
            {CATEGORIES.map((cat) => (
              <CrystalButton
                key={cat.id}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 border-primary/20 hover:bg-primary/10 hover:border-primary/40 rounded-xl"
                onClick={() => startQuiz(cat.id)}
                disabled={loading}
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-sm font-medium">{cat.label}</span>
              </CrystalButton>
            ))}
          </div>

          {loading && (
            <div className="flex items-center gap-2 text-primary text-sm">
              <motion.div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin-slow" />
              جارٍ إنشاء الأسئلة...
            </div>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}
        </motion.div>
      </div>
    );
  }

  // Results Screen
  if (showResults && quizScore !== null) {
    const grade = getGrade(quizScore);
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8">
        <motion.div
          className="flex flex-col items-center gap-6 w-full max-w-md"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Trophy className="w-16 h-16 text-yellow-500" />
          <h2 className="text-2xl font-bold">نتيجة الاختبار</h2>

          <motion.div
            className="text-6xl font-bold text-primary sky-glow-text"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
          >
            {quizScore}
          </motion.div>
          <p className="text-muted-foreground">من 100</p>
          <Badge variant="secondary" className={`text-lg px-4 py-1 ${grade.color}`}>
            {grade.label}
          </Badge>

          {/* Answer review */}
          <div className="w-full space-y-2 mt-4 max-h-64 overflow-y-auto">
            {quizQuestions.map((q, i) => {
              const userAnswer = quizAnswers[q.id];
              const isCorrect = userAnswer === q.correctAnswer;
              return (
                <motion.div
                  key={q.id}
                  className="flex items-start gap-2 p-3 rounded-lg bg-card/50 border border-border/30 text-sm"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                >
                  {isCorrect ? (
                    <CheckCircle className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium mb-1">{q.question}</p>
                    {!isCorrect && (
                      <p className="text-xs text-sky-500">
                        الإجابة الصحيحة: {q.options[q.correctAnswer]}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="flex gap-3 mt-4">
            <CrystalButton
              variant="outline"
              className="border-primary/20 hover:bg-primary/10"
              onClick={() => startQuiz(quizCategory)}
            >
              <RotateCcw className="w-4 h-4 ml-2" />
              إعادة الاختبار
            </CrystalButton>
            <CrystalButton variant="outline" className="border-primary/20 hover:bg-primary/10" onClick={resetQuiz}>
              <ArrowLeft className="w-4 h-4 ml-2" />
              تغيير التصنيف
            </CrystalButton>
          </div>
        </motion.div>
      </div>
    );
  }

  // Quiz Questions
  const question = quizQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / quizQuestions.length) * 100;

  return (
    <div className="flex flex-col items-center px-4 py-6 min-h-[60vh] max-w-2xl mx-auto">
      {/* Progress */}
      <div className="w-full mb-6">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>السؤال {currentQuestion + 1} من {quizQuestions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2 bg-primary/10" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          className="w-full flex flex-col gap-4"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <h3 className="text-lg font-bold text-foreground leading-relaxed">{question.question}</h3>

          <div className="space-y-3">
            {question.options.map((option, idx) => {
              const isSelected = quizAnswers[question.id] === idx;
              return (
                <CrystalButton
                  key={idx}
                  variant={isSelected ? 'default' : 'outline'}
                  className={`w-full h-auto py-3 px-4 text-right justify-start text-sm rounded-xl transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-lg sky-glow'
                      : 'border-primary/20 hover:bg-primary/10 hover:border-primary/40'
                  }`}
                  onClick={() => setQuizAnswer(question.id, idx)}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isSelected
                          ? 'bg-white/20 text-primary-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {String.fromCharCode(1571 + idx)}
                    </span>
                    {option}
                  </span>
                </CrystalButton>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between w-full mt-8">
        <CrystalButton
          variant="outline"
          className="border-primary/20 hover:bg-primary/10"
          onClick={() => setCurrentQuestion((p) => Math.max(0, p - 1))}
          disabled={currentQuestion === 0}
        >
          السابق
        </CrystalButton>

        {currentQuestion < quizQuestions.length - 1 ? (
          <CrystalButton
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setCurrentQuestion((p) => p + 1)}
          >
            التالي
          </CrystalButton>
        ) : (
          <CrystalButton
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={submitQuiz}
            disabled={loading}
          >
            {loading ? 'جارٍ التصحيح...' : 'إنهاء الاختبار'}
          </CrystalButton>
        )}
      </div>
    </div>
  );
}
