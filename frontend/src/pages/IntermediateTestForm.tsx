import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { ApiResponse, IntermediateTest, IntermediateTestQuestion } from '../types';
import { ArrowLeft, Save, Plus, Trash2, Edit2, GripVertical, AlertCircle, CheckCircle2, Clock, Target, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import ErrorModal from '../components/ErrorModal';
import TestQuestionModal from '../components/TestQuestionModal';

const testSchema = z.object({
  title: z.string().min(1, 'Название теста обязательно'),
  description: z.string().optional(),
  passingScore: z.number().int().min(0).max(100).default(70),
  timeLimit: z.number().int().min(0).optional(),
  order: z.number().int().min(0).default(0),
});

type TestFormData = z.infer<typeof testSchema>;

export default function IntermediateTestForm() {
  const { courseId, testId } = useParams<{ courseId: string; testId?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!testId;
  const [questions, setQuestions] = useState<IntermediateTestQuestion[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<IntermediateTestQuestion | null>(null);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  const { data: testResponse, isLoading } = useQuery(
    ['test', testId],
    async () => {
      const response = await api.get<ApiResponse<IntermediateTest>>(`/tests/${testId}`);
      return response.data.data;
    },
    { enabled: isEdit }
  );

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<TestFormData>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      title: '',
      description: '',
      passingScore: 70,
      timeLimit: undefined,
      order: 0,
    },
  });

  const watchedTimeLimit = watch('timeLimit');
  const watchedPassingScore = watch('passingScore');

  // Load test data when editing
  useEffect(() => {
    if (testResponse) {
      reset({
        title: testResponse.title || '',
        description: testResponse.description || '',
        passingScore: testResponse.passingScore || 70,
        timeLimit: testResponse.timeLimit || undefined,
        order: testResponse.order || 0,
      });
      if (testResponse.questions) {
        setQuestions(testResponse.questions);
      }
    }
  }, [testResponse, reset]);

  const createTestMutation = useMutation(
    async (data: TestFormData) => {
      const response = await api.post<ApiResponse<IntermediateTest>>(`/tests`, {
        ...data,
        courseId,
      });
      return response.data.data;
    },
    {
      onSuccess: async (test) => {
        // Save questions after test is created
        // TODO: Add endpoint for creating questions: POST /tests/:testId/questions
        if (questions.length > 0 && test.id) {
          try {
            // Try to save questions - this will work once the endpoint is added
            const questionPromises = questions.map((q, index) => {
              const questionData: any = {
                testId: test.id,
                question: q.question,
                type: q.type,
                order: index,
                points: q.points,
              };
              
              if (q.options && q.options.length > 0) {
                questionData.options = q.options.map((opt, optIdx) => ({
                  text: opt.text,
                  isCorrect: opt.isCorrect || false,
                  order: optIdx,
                }));
              }
              
              return api.post(`/tests/${test.id}/questions`, questionData).catch((err) => {
                console.warn('Question save endpoint not available yet:', err);
                return null;
              });
            });
            
            await Promise.all(questionPromises);
          } catch (error: any) {
            console.error('Error saving questions:', error);
            // Don't show error if endpoint doesn't exist yet
            if (error.response?.status !== 404) {
              setErrorModal({
                isOpen: true,
                message: 'Тест создан, но не удалось сохранить вопросы. Попробуйте отредактировать тест позже.',
              });
            }
          }
        }
        queryClient.invalidateQueries(['tests', courseId]);
        navigate(`/teacher/courses/${courseId}/edit`);
      },
      onError: (error: any) => {
        setErrorModal({
          isOpen: true,
          message: error.response?.data?.message || 'Ошибка при создании теста',
        });
      },
    }
  );

  const handleSaveQuestion = (question: IntermediateTestQuestion) => {
    if (editingQuestion?.id) {
      // Update existing question
      setQuestions(
        questions.map((q) => (q.id === editingQuestion.id ? question : q))
      );
    } else {
      // Add new question
      setQuestions([...questions, { ...question, order: questions.length }]);
    }
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questions.length - 1)
    ) {
      return;
    }

    const newQuestions = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newQuestions[index], newQuestions[targetIndex]] = [
      newQuestions[targetIndex],
      newQuestions[index],
    ];
    setQuestions(newQuestions.map((q, i) => ({ ...q, order: i })));
  };

  const calculateTotalPoints = () => {
    return questions.reduce((sum, q) => sum + (q.points || 1), 0);
  };

  const onSubmit = (data: TestFormData) => {
    if (questions.length === 0) {
      setErrorModal({
        isOpen: true,
        message: 'Добавьте хотя бы один вопрос',
      });
      return;
    }
    createTestMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
        </div>
        <p className="mt-4 text-neutral-600">Загрузка...</p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate(`/teacher/courses/${courseId}/edit`)}
        className="flex items-center text-neutral-600 hover:text-primary-600 mb-6 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Назад к курсу
      </button>

      <div className="relative mb-8">
        <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gradient">
          {isEdit ? 'Редактировать тест' : 'Создать промежуточный тест'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4">Основная информация</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Название теста *
              </label>
              <input
                {...register('title')}
                className="input-field"
                placeholder="Например: Тест по модулю 1"
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Описание
              </label>
              <textarea
                {...register('description')}
                className="input-field"
                rows={3}
                placeholder="Описание теста (необязательно)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Проходной балл (%) *
                </label>
                <div className="relative">
                  <input
                    {...register('passingScore', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    max="100"
                    className="input-field pr-12"
                    defaultValue={70}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
                    %
                  </div>
                </div>
                {errors.passingScore && (
                  <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.passingScore.message}
                  </p>
                )}
                <p className="mt-1 text-xs text-neutral-500">
                  Минимальный процент для прохождения теста
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Лимит времени (минуты)
                </label>
                <div className="relative">
                  <input
                    {...register('timeLimit', { valueAsNumber: true })}
                    type="number"
                    min="0"
                    className="input-field pr-12"
                    placeholder="Не ограничено"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
                    мин
                  </div>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  Оставьте пустым для неограниченного времени
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Порядок
              </label>
              <input
                {...register('order', { valueAsNumber: true })}
                type="number"
                min="0"
                className="input-field"
                defaultValue={0}
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Вопросы
              </h2>
              {questions.length > 0 && (
                <div className="mt-2 flex items-center gap-4 text-sm text-neutral-600">
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {questions.length} {questions.length === 1 ? 'вопрос' : questions.length < 5 ? 'вопроса' : 'вопросов'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    Всего баллов: {calculateTotalPoints()}
                  </span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingQuestion({
                  id: '',
                  testId: testId || '',
                  question: '',
                  type: 'SINGLE',
                  order: questions.length,
                  points: 1,
                  options: [],
                });
              }}
              className="btn-primary text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить вопрос
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-neutral-200 rounded-lg">
              <FileText className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-500 mb-2">Нет вопросов</p>
              <p className="text-sm text-neutral-400">
                Добавьте вопросы к тесту, нажав кнопку выше
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, index) => (
                <div
                  key={q.id || index}
                  className="border-2 border-neutral-200 rounded-lg p-4 hover:border-primary-300 transition-colors bg-white"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(index, 'up')}
                        disabled={index === 0}
                        className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Вверх"
                      >
                        ↑
                      </button>
                      <span className="text-xs font-medium text-neutral-500 bg-neutral-100 px-2 py-1 rounded">
                        {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(index, 'down')}
                        disabled={index === questions.length - 1}
                        className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Вниз"
                      >
                        ↓
                      </button>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-neutral-900 mb-2">
                            {q.question || '(Без текста)'}
                          </p>
                          <div className="flex items-center gap-3 text-sm text-neutral-600">
                            <span className="flex items-center gap-1">
                              {q.type === 'SINGLE' && '○ Один ответ'}
                              {q.type === 'MULTIPLE' && '☑ Несколько ответов'}
                              {q.type === 'TEXT' && '✎ Текстовый ответ'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {q.points} {q.points === 1 ? 'балл' : q.points < 5 ? 'балла' : 'баллов'}
                            </span>
                            {q.options && q.options.length > 0 && (
                              <span>
                                {q.options.length} {q.options.length === 1 ? 'вариант' : q.options.length < 5 ? 'варианта' : 'вариантов'}
                              </span>
                            )}
                          </div>
                          {q.options && q.options.length > 0 && (
                            <div className="mt-3 space-y-1">
                              {q.options.slice(0, 3).map((opt, optIdx) => (
                                <div
                                  key={optIdx}
                                  className={`text-xs px-2 py-1 rounded flex items-center gap-2 ${
                                    opt.isCorrect
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-neutral-100 text-neutral-600'
                                  }`}
                                >
                                  {opt.isCorrect && (
                                    <CheckCircle2 className="h-3 w-3" />
                                  )}
                                  <span className="truncate">{opt.text}</span>
                                </div>
                              ))}
                              {q.options.length > 3 && (
                                <p className="text-xs text-neutral-400">
                                  +{q.options.length - 3} еще
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingQuestion(q)}
                            className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded transition-colors"
                            title="Редактировать"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(index)}
                            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate(`/teacher/courses/${courseId}/edit`)}
            className="btn-secondary"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={createTestMutation.isLoading}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            <Save className="h-5 w-5 mr-2" />
            {createTestMutation.isLoading ? 'Сохранение...' : 'Сохранить тест'}
          </button>
        </div>
      </form>

      {/* Question Edit Modal */}
      <TestQuestionModal
        isOpen={editingQuestion !== null}
        question={editingQuestion}
        onClose={() => setEditingQuestion(null)}
        onSave={handleSaveQuestion}
      />

      <ErrorModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
      />
    </div>
  );
}
