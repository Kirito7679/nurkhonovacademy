import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { Quiz as QuizType, QuizQuestion, ApiResponse, QuizResult } from '../types';
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import InteractiveQuiz from './InteractiveQuiz';

interface QuizProps {
  lessonId: string;
  onComplete?: (result: QuizResult) => void;
}

export default function LessonQuiz({ lessonId, onComplete }: QuizProps) {
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  const { data: quizResponse, isLoading } = useQuery(
    ['quiz', lessonId],
    async () => {
      const response = await api.get<ApiResponse<QuizType>>(`/quizzes/lesson/${lessonId}`);
      return response.data.data;
    },
    { enabled: !!lessonId }
  );

  const submitMutation = useMutation(
    async (answers: Record<string, string>) => {
      const response = await api.post<ApiResponse<QuizResult>>(
        `/quizzes/lesson/${lessonId}/submit`,
        { answers }
      );
      return response.data.data!;
    },
    {
      onSuccess: (data) => {
        setResult(data);
        setSubmitted(true);
        queryClient.invalidateQueries(['quiz', lessonId]);
        if (onComplete) {
          onComplete(data);
        }
      },
    }
  );

  const handleAnswerChange = (questionId: string, answer: string | any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: typeof answer === 'string' ? answer : JSON.stringify(answer),
    }));
  };

  const handleSubmit = () => {
    if (quizResponse && Object.keys(answers).length === quizResponse.questions.length) {
      // Convert answers to proper format for API
      const formattedAnswers: Record<string, string> = {};
      Object.keys(answers).forEach((questionId) => {
        formattedAnswers[questionId] = answers[questionId];
      });
      submitMutation.mutate(formattedAnswers);
    }
  };

  if (isLoading) {
    return (
      <div className="card p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500 mx-auto mb-4" />
        <p className="text-neutral-600">Загрузка теста...</p>
      </div>
    );
  }

  if (!quizResponse) {
    return null;
  }

  const allAnswered = Object.keys(answers).length === quizResponse.questions.length;
  const canSubmit = allAnswered && !submitted && !submitMutation.isLoading;

  return (
    <div className="card p-6 md:p-8 animate-fade-scale">
      <div className="mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gradient mb-2">
          {quizResponse.title || 'Тест по уроку'}
        </h2>
        {quizResponse.description && (
          <p className="text-neutral-600 mb-4">{quizResponse.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-neutral-500">
          <span>Вопросов: {quizResponse.questions.length}</span>
          <span>Проходной балл: {quizResponse.passingScore}%</span>
        </div>
      </div>

      {submitted && result ? (
        <div className="space-y-6">
          <div
            className={`p-6 rounded-lg border-2 ${
              result.passed
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              {result.passed ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
              <div>
                <h3
                  className={`text-xl font-bold ${
                    result.passed ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {result.passed ? 'Тест пройден!' : 'Тест не пройден'}
                </h3>
                <p
                  className={`text-sm ${
                    result.passed ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  Ваш результат: {result.score}%
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Правильных ответов:</span>
                <span className="font-semibold">
                  {result.correctAnswers} из {result.totalQuestions}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600">Проходной балл:</span>
                <span className="font-semibold">{result.passingScore}%</span>
              </div>
            </div>
          </div>

          {/* Show correct answers */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900">Правильные ответы:</h3>
            {quizResponse.questions.map((question, index) => {
              const studentAnswer = answers[question.id];
              const isCorrect = question.type === 'MULTIPLE_CHOICE'
                ? question.options?.find(opt => opt.id === studentAnswer)?.isCorrect
                : studentAnswer === question.correctAnswer;

              return (
                <div
                  key={question.id}
                  className={`p-4 rounded-lg border-2 ${
                    isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-2 mb-3">
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-neutral-900 mb-2">
                        {index + 1}. {question.question}
                      </p>
                      {question.type === 'MULTIPLE_CHOICE' && question.options && (
                        <div className="space-y-2">
                          {question.options.map((option) => {
                            const isSelected = option.id === studentAnswer;
                            const isCorrectOption = option.isCorrect;

                            return (
                              <div
                                key={option.id}
                                className={`p-2 rounded ${
                                  isCorrectOption
                                    ? 'bg-green-100 border-2 border-green-300'
                                    : isSelected
                                    ? 'bg-red-100 border-2 border-red-300'
                                    : 'bg-neutral-50 border border-neutral-200'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {isCorrectOption && (
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                  )}
                                  {isSelected && !isCorrectOption && (
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  )}
                                  <span
                                    className={
                                      isCorrectOption
                                        ? 'font-semibold text-green-700'
                                        : isSelected
                                        ? 'text-red-700'
                                        : 'text-neutral-700'
                                    }
                                  >
                                    {option.text}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {question.type === 'TRUE_FALSE' && (
                        <div className="space-y-2">
                          <div
                            className={`p-2 rounded ${
                              question.correctAnswer === 'true'
                                ? 'bg-green-100 border-2 border-green-300'
                                : 'bg-neutral-50 border border-neutral-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {question.correctAnswer === 'true' && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                              <span
                                className={
                                  question.correctAnswer === 'true'
                                    ? 'font-semibold text-green-700'
                                    : 'text-neutral-700'
                                }
                              >
                                Верно
                              </span>
                            </div>
                          </div>
                          <div
                            className={`p-2 rounded ${
                              question.correctAnswer === 'false'
                                ? 'bg-green-100 border-2 border-green-300'
                                : 'bg-neutral-50 border border-neutral-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {question.correctAnswer === 'false' && (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                              <span
                                className={
                                  question.correctAnswer === 'false'
                                    ? 'font-semibold text-green-700'
                                    : 'text-neutral-700'
                                }
                              >
                                Неверно
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {quizResponse.questions.map((question, index) => (
            <div key={question.id} className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-primary text-white font-semibold flex-shrink-0">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-neutral-900 mb-3">{question.question}</p>
                  {question.type === 'MULTIPLE_CHOICE' && question.options && (
                    <div className="space-y-2">
                      {question.options.map((option) => (
                        <label
                          key={option.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            answers[question.id] === option.id
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-neutral-200 hover:border-primary-300 hover:bg-neutral-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={question.id}
                            value={option.id}
                            checked={answers[question.id] === option.id}
                            onChange={() => handleAnswerChange(question.id, option.id)}
                            className="w-4 h-4 text-primary-500 focus:ring-primary-500"
                          />
                          <span className="text-neutral-700">{option.text}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {question.type === 'TRUE_FALSE' && (
                    <div className="space-y-2">
                      <label
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          answers[question.id] === 'true'
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-neutral-200 hover:border-primary-300 hover:bg-neutral-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value="true"
                          checked={answers[question.id] === 'true'}
                          onChange={() => handleAnswerChange(question.id, 'true')}
                          className="w-4 h-4 text-primary-500 focus:ring-primary-500"
                        />
                        <span className="text-neutral-700">Верно</span>
                      </label>
                      <label
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          answers[question.id] === 'false'
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-neutral-200 hover:border-primary-300 hover:bg-neutral-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value="false"
                          checked={answers[question.id] === 'false'}
                          onChange={() => handleAnswerChange(question.id, 'false')}
                          className="w-4 h-4 text-primary-500 focus:ring-primary-500"
                        />
                        <span className="text-neutral-700">Неверно</span>
                      </label>
                    </div>
                  )}
                  {(question.type === 'DRAG_DROP' || question.type === 'MATCHING' || question.type === 'FILL_BLANK') && (
                    <InteractiveQuiz
                      question={question}
                      onAnswer={(answer) => handleAnswerChange(question.id, answer)}
                      showResult={submitted}
                      correctAnswer={question.correctAnswer ? JSON.parse(question.correctAnswer) : undefined}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="pt-4 border-t border-neutral-200">
            {!allAnswered && (
              <div className="flex items-center gap-2 text-amber-600 mb-4">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">
                  Ответьте на все вопросы для завершения теста
                </span>
              </div>
            )}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="btn-primary w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitMutation.isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Отправка...</span>
                </span>
              ) : (
                'Завершить тест'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

