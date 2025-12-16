import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import api from '../services/api';
import { ApiResponse, User, Course, ApiError } from '../types';
import { ArrowLeft, User as UserIcon, Lock, Key, X, BookOpen, Users } from 'lucide-react';
import SuccessModal from '../components/SuccessModal';
import { useAuthStore } from '../store/authStore';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
});

const updateTeacherSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно').max(50, 'Имя слишком длинное').optional(),
  lastName: z.string().min(1, 'Фамилия обязательна').max(50, 'Фамилия слишком длинная').optional(),
  phone: z.string()
    .min(10, 'Номер телефона должен содержать минимум 10 символов')
    .max(15, 'Номер телефона слишком длинный')
    .optional(),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
  isPaidTeacher: z.boolean().optional(),
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
type UpdateTeacherFormData = z.infer<typeof updateTeacherSchema>;

interface TeacherWithCourses extends User {
  coursesAsTeacher: Course[];
  _count: {
    coursesAsTeacher: number;
    createdUsers: number;
  };
}

export default function TeacherDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });

  // Проверка прав доступа
  if (user?.role !== 'ADMIN') {
    return (
      <div className="card p-12 text-center">
        <h3 className="text-xl font-semibold text-neutral-700 mb-2">Доступ запрещен</h3>
        <p className="text-neutral-600">Только администратор может просматривать детали учителя</p>
      </div>
    );
  }

  const { data: teacherResponse, isLoading } = useQuery(
    ['curator', id],
    async () => {
      const response = await api.get<ApiResponse<TeacherWithCourses>>(`/curators/${id}`);
      return response.data.data;
    }
  );

  const resetPasswordMutation = useMutation(
    async (data: ResetPasswordFormData) => {
      const response = await api.put<ApiResponse<{ success: boolean }>>(`/curators/${id}/reset-password`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['curator', id]);
        setSuccessModal({
          isOpen: true,
          message: 'Пароль успешно изменен',
        });
      },
    }
  );

  const updateTeacherMutation = useMutation(
    async (data: UpdateTeacherFormData) => {
      const response = await api.put<ApiResponse<User>>(`/curators/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['curator', id]);
        queryClient.invalidateQueries('curators');
        setSuccessModal({
          isOpen: true,
          message: 'Профиль учителя успешно обновлен',
        });
      },
    }
  );

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
    },
  });

  const {
    register: registerTeacher,
    handleSubmit: handleSubmitTeacher,
    formState: { errors: teacherErrors },
    reset: resetTeacherForm,
  } = useForm<UpdateTeacherFormData>({
    resolver: zodResolver(updateTeacherSchema),
  });

  // Обновить форму при загрузке данных учителя
  useEffect(() => {
    if (teacherResponse && !isLoading) {
      resetTeacherForm({
        firstName: teacherResponse.firstName,
        lastName: teacherResponse.lastName,
        phone: teacherResponse.phone,
        email: teacherResponse.email || '',
        isPaidTeacher: teacherResponse.isPaidTeacher || false,
      });
    }
  }, [teacherResponse, isLoading, resetTeacherForm]);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
        </div>
        <p className="mt-4 text-neutral-600">Загрузка учителя...</p>
      </div>
    );
  }

  const teacher = teacherResponse;
  if (!teacher) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600">Учитель не найден</p>
      </div>
    );
  }

  const onSubmitPassword = (data: ResetPasswordFormData) => {
    resetPasswordMutation.mutate(data, {
      onSuccess: () => {
        resetPassword();
      },
    });
  };

  const onSubmitTeacher = (data: UpdateTeacherFormData) => {
    updateTeacherMutation.mutate(data);
  };

  return (
    <div>
      <button
        onClick={() => navigate('/admin/curators')}
        className="flex items-center text-neutral-600 hover:text-primary-600 mb-6 transition-colors animate-slide-in"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Назад к учителям
      </button>

      <div className="relative mb-8 animate-fade-scale">
        <h1 className="text-xl md:text-2xl lg:text-4xl font-bold text-gradient break-words">
          {teacher.firstName} {teacher.lastName}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-1">
          <div className="card p-6 mb-6 animate-fade-scale">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white mb-4 animate-pulse-glow">
                <Users className="h-12 w-12" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                {teacher.firstName} {teacher.lastName}
              </h2>
              <p className="text-neutral-600">
                Телефон: {teacher.phone}
              </p>
              {teacher.email && (
                <p className="text-neutral-600">
                  Email: {teacher.email}
                </p>
              )}
              <div className="mt-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  teacher.isPaidTeacher 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {teacher.isPaidTeacher ? 'Оплачено' : 'Не оплачено'}
                </span>
              </div>
            </div>
          </div>

          <div className="card p-6 animate-fade-scale">
            <div className="flex items-center mb-6">
              <Key className="h-6 w-6 text-primary-500 mr-3" />
              <h2 className="text-xl font-semibold text-neutral-900">
                Сбросить пароль
              </h2>
            </div>
            <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
              <div className="animate-slide-in" style={{ animationDelay: '0.1s' }}>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Новый пароль
                </label>
                <input
                  {...registerPassword('newPassword')}
                  type="password"
                  className="input-field"
                  placeholder="Введите новый пароль"
                />
                {passwordErrors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword.message}</p>
                )}
              </div>

              {resetPasswordMutation.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {(resetPasswordMutation.error as ApiError)?.response?.data?.message || 'Ошибка при изменении пароля'}
                </div>
              )}

              <div className="animate-slide-in" style={{ animationDelay: '0.2s' }}>
                <button
                  type="submit"
                  disabled={resetPasswordMutation.isLoading}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  aria-busy={resetPasswordMutation.isLoading}
                >
                  <Lock className="h-5 w-5" />
                  {resetPasswordMutation.isLoading ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      <span>Сброс...</span>
                    </>
                  ) : (
                    'Сбросить пароль'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card p-6 mb-6 animate-fade-scale">
            <div className="flex items-center mb-6">
              <UserIcon className="h-6 w-6 text-primary-500 mr-3" />
              <h2 className="text-xl font-semibold text-neutral-900">
                Редактировать профиль
              </h2>
            </div>
            <form onSubmit={handleSubmitTeacher(onSubmitTeacher)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Имя <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...registerTeacher('firstName')}
                    type="text"
                    className="input-field"
                    placeholder="Введите имя"
                  />
                  {teacherErrors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{teacherErrors.firstName.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Фамилия <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...registerTeacher('lastName')}
                    type="text"
                    className="input-field"
                    placeholder="Введите фамилию"
                  />
                  {teacherErrors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{teacherErrors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Номер телефона
                </label>
                <input
                  {...registerTeacher('phone')}
                  type="text"
                  className="input-field"
                  placeholder="+998901234567"
                />
                {teacherErrors.phone && (
                  <p className="mt-1 text-sm text-red-600">{teacherErrors.phone.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Email
                </label>
                <input
                  {...registerTeacher('email')}
                  type="email"
                  className="input-field"
                  placeholder="email@example.com"
                />
                {teacherErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{teacherErrors.email.message}</p>
                )}
              </div>

              <div>
                <label className="flex items-center cursor-pointer">
                  <input
                    {...registerTeacher('isPaidTeacher')}
                    type="checkbox"
                    className="mr-2 w-4 h-4 text-primary-500 bg-white border-neutral-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-neutral-700">
                    Оплачена регистрация учителя
                  </span>
                </label>
              </div>

              {updateTeacherMutation.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {(updateTeacherMutation.error as ApiError)?.response?.data?.message || 'Ошибка при обновлении профиля'}
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={updateTeacherMutation.isLoading}
                  className="btn-primary w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  aria-busy={updateTeacherMutation.isLoading}
                >
                  {updateTeacherMutation.isLoading ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      <span>Сохранение...</span>
                    </>
                  ) : (
                    'Сохранить изменения'
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="card p-6 animate-fade-scale">
            <div className="flex items-center mb-6">
              <BookOpen className="h-6 w-6 text-primary-500 mr-3" />
              <h2 className="text-xl font-semibold text-neutral-900">
                Курсы учителя
              </h2>
            </div>
            
            {teacher.coursesAsTeacher && teacher.coursesAsTeacher.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-neutral-500">Нет курсов</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teacher.coursesAsTeacher?.map((course, index) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:border-primary-300 hover:bg-neutral-50 transition-all animate-slide-in"
                    style={{ animationDelay: `${0.1 * index}s` }}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900 mb-1">{course.title}</p>
                      {course.description && (
                        <p className="text-sm text-neutral-600 line-clamp-2">{course.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-neutral-200">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary-600">
                    {teacher._count?.coursesAsTeacher || 0}
                  </div>
                  <div className="text-sm text-neutral-600">Курсов</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary-600">
                    {teacher._count?.createdUsers || 0}
                  </div>
                  <div className="text-sm text-neutral-600">Студентов</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: '' })}
        message={successModal.message}
      />
    </div>
  );
}
