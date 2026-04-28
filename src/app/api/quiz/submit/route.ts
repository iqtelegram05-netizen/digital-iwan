import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface SubmitAnswer {
  questionId: string;
  selectedAnswer: number;
}

interface QuizSubmitRequestBody {
  answers: SubmitAnswer[];
  category: string;
  questions: Array<{
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    const body: QuizSubmitRequestBody = await request.json();
    const { answers, category, questions } = body;

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'الإجابات مطلوبة' },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: 'التصنيف مطلوب' },
        { status: 400 }
      );
    }

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'بيانات الأسئلة مطلوبة' },
        { status: 400 }
      );
    }

    // Calculate score
    let correctCount = 0;
    const details: Array<{
      questionId: string;
      question: string;
      selectedAnswer: number;
      correctAnswer: number;
      isCorrect: boolean;
      selectedOption: string;
      correctOption: string;
    }> = [];

    answers.forEach((answer) => {
      const question = questions.find((q) => q.id === answer.questionId);
      if (question) {
        const isCorrect = answer.selectedAnswer === question.correctAnswer;
        if (isCorrect) correctCount++;

        details.push({
          questionId: answer.questionId,
          question: question.question,
          selectedAnswer: answer.selectedAnswer,
          correctAnswer: question.correctAnswer,
          isCorrect,
          selectedOption: question.options[answer.selectedAnswer] || 'غير محدد',
          correctOption: question.options[question.correctAnswer] || 'غير محدد',
        });
      }
    });

    const totalQuestions = questions.length;
    const wrongCount = totalQuestions - correctCount;
    const score = Math.round((correctCount / totalQuestions) * 100);

    // Store result in database
    const quizResult = await db.quizResult.create({
      data: {
        category,
        score,
        total: 100,
        answers: JSON.stringify({
          answers,
          details,
          totalQuestions,
          correctCount,
          wrongCount,
        }),
      },
    });

    return NextResponse.json({
      id: quizResult.id,
      score,
      total: 100,
      correct: correctCount,
      wrong: wrongCount,
      totalQuestions,
      percentage: `${score}%`,
      grade: getGrade(score),
      details,
      createdAt: quizResult.createdAt,
    });
  } catch (error) {
    console.error('Quiz Submit Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تسجيل النتيجة. يرجى المحاولة مرة أخرى.' },
      { status: 500 }
    );
  }
}

// GET: Get quiz history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const category = searchParams.get('category');

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (category) where.category = category;

    const results = await db.quizResult.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const formattedResults = results.map((result) => {
      const parsedAnswers = JSON.parse(result.answers);
      return {
        id: result.id,
        category: result.category,
        score: result.score,
        total: result.total,
        details: parsedAnswers.details || [],
        correct: parsedAnswers.correctCount || 0,
        wrong: parsedAnswers.wrongCount || 0,
        totalQuestions: parsedAnswers.totalQuestions || 0,
        grade: getGrade(result.score),
        createdAt: result.createdAt,
      };
    });

    return NextResponse.json({
      results: formattedResults,
    });
  } catch (error) {
    console.error('Quiz History Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء جلب النتائج' },
      { status: 500 }
    );
  }
}

function getGrade(score: number): string {
  if (score >= 90) return 'ممتاز';
  if (score >= 80) return 'جيد جدًا';
  if (score >= 70) return 'جيد';
  if (score >= 60) return 'مقبول';
  return 'يحتاج تحسين';
}
