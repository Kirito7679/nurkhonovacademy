import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { ApiResponse, IntermediateTest, IntermediateTestQuestion } from '../types';
import { ArrowLeft, Save, Plus, Trash2, Edit2 } from 'lucide-react';
import { useState } from 'react';
import ErrorModal from '../components/ErrorModal';

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

  const { register, handleSubmit, formState: { errors }, reset } = useForm<TestFormData>({
    resolver: zodResolver(testSchema),
    defaultValues: {
      title: '',
      description: '',
      passingScore: 70,
      timeLimit: undefined,
      order: 0,
    },
  });

  const createTestMutation = useMutation(
    async (data: TestFormData) => {
      const response = await api.post<ApiResponse<IntermediateTest>>(`/tests`, {
        ...data,
        courseId,
      });
      return response.data.data;
    },
    {
      onSuccess: () => {
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Проходной балл (%) *
                </label>
                <input
                  {...register('passingScore', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  max="100"
                  className="input-field"
                  defaultValue={70}
                />
                {errors.passingScore && (
                  <p className="mt-1 text-sm text-red-600">{errors.passingScore.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Лимит времени (минуты)
                </label>
                <input
                  {...register('timeLimit', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="input-field"
                  placeholder="Не ограничено"
                />
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
            <h2 className="text-xl font-semibold text-neutral-900">Вопросы</h2>
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
            <div className="text-center py-8 text-neutral-500">
              <p>Добавьте вопросы к тесту</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, index) => (
                <div key={q.id || index} className="border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">{q.question}</p>
                      <p className="text-sm text-neutral-600 mt-1">
                        Тип: {q.type === 'SINGLE' ? 'Один ответ' : q.type === 'MULTIPLE' ? 'Несколько ответов' : 'Текст'} • 
                        Баллов: {q.points}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingQuestion(q)}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuestions(questions.filter((_, i) => i !== index))}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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

      <ErrorModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
      />
    </div>
  );
}
