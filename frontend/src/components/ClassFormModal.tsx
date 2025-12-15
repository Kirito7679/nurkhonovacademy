import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from 'react-query';
import api from '../services/api';
import { ApiResponse, Class, ApiError } from '../types';
import { X } from 'lucide-react';

const classSchema = z.object({
  name: z.string().min(1, 'Название класса обязательно'),
  description: z.string().optional(),
  maxStudents: z.number().int().min(1).max(50).default(10),
  level: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),
  language: z.string().optional(),
});

type ClassFormData = z.infer<typeof classSchema>;

interface ClassFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classData?: Class;
}

export default function ClassFormModal({
  isOpen,
  onClose,
  onSuccess,
  classData,
}: ClassFormModalProps) {
  const [error, setError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: classData
      ? {
          name: classData.name,
          description: classData.description || '',
          maxStudents: classData.maxStudents,
          level: (classData.level as 'Beginner' | 'Intermediate' | 'Advanced') || undefined,
          language: classData.language || '',
        }
      : {
          name: '',
          description: '',
          maxStudents: 10,
          level: undefined,
          language: '',
        },
  });

  const createClassMutation = useMutation(
    async (data: ClassFormData) => {
      const response = await api.post<ApiResponse<Class>>('/classes', data);
      return response.data.data;
    },
    {
      onSuccess: () => {
        reset();
        setError('');
        onSuccess();
      },
      onError: (err: ApiError) => {
        setError(err.response?.data?.message || 'Ошибка при создании класса');
      },
    }
  );

  const updateClassMutation = useMutation(
    async (data: ClassFormData) => {
      const response = await api.put<ApiResponse<Class>>(`/classes/${classData?.id}`, data);
      return response.data.data;
    },
    {
      onSuccess: () => {
        reset();
        setError('');
        onSuccess();
      },
      onError: (err: ApiError) => {
        setError(err.response?.data?.message || 'Ошибка при обновлении класса');
      },
    }
  );

  const onSubmit = (data: ClassFormData) => {
    setError('');
    if (classData) {
      updateClassMutation.mutate(data);
    } else {
      createClassMutation.mutate(data);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-xl font-semibold text-neutral-900">
            {classData ? 'Редактировать класс' : 'Создать новый класс'}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-2">
              Название класса *
            </label>
            <input
              {...register('name')}
              type="text"
              id="name"
              className="input-field"
              placeholder="Например: Английский для начинающих - Группа A"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-neutral-700 mb-2">
              Описание
            </label>
            <textarea
              {...register('description')}
              id="description"
              rows={3}
              className="input-field"
              placeholder="Описание класса, цели обучения..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="maxStudents" className="block text-sm font-medium text-neutral-700 mb-2">
                Максимум студентов *
              </label>
              <input
                {...register('maxStudents', { valueAsNumber: true })}
                type="number"
                id="maxStudents"
                min="1"
                max="50"
                className="input-field"
              />
              {errors.maxStudents && (
                <p className="mt-1 text-sm text-red-600">{errors.maxStudents.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="level" className="block text-sm font-medium text-neutral-700 mb-2">
                Уровень
              </label>
              <select {...register('level')} id="level" className="input-field">
                <option value="">Не указан</option>
                <option value="Beginner">Начинающий</option>
                <option value="Intermediate">Средний</option>
                <option value="Advanced">Продвинутый</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="language" className="block text-sm font-medium text-neutral-700 mb-2">
              Язык обучения
            </label>
            <input
              {...register('language')}
              type="text"
              id="language"
              className="input-field"
              placeholder="Например: English, Русский"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={createClassMutation.isLoading || updateClassMutation.isLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={createClassMutation.isLoading || updateClassMutation.isLoading}
            >
              {createClassMutation.isLoading || updateClassMutation.isLoading
                ? 'Сохранение...'
                : classData
                ? 'Сохранить'
                : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

