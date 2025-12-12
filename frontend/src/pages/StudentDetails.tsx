import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import api from '../services/api';
import { ApiResponse, User, Course, StudentCourse, StudentCourseStatus, StudentWithCourses, ApiError } from '../types';
import { ArrowLeft, CheckCircle, XCircle, BookOpen, Plus, User as UserIcon, Lock, Key, X, Calendar, Trash2 } from 'lucide-react';
import SuccessModal from '../components/SuccessModal';
import ConfirmModal from '../components/ConfirmModal';

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
});

const assignCourseSchema = z.object({
  accessStartDate: z.string().optional(),
  accessEndDate: z.string().optional(),
}).refine((data) => {
  if (data.accessEndDate && data.accessStartDate) {
    return new Date(data.accessEndDate) >= new Date(data.accessStartDate);
  }
  return true;
}, {
  message: 'Дата окончания не может быть раньше даты начала',
  path: ['accessEndDate'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
type AssignCourseFormData = z.infer<typeof assignCourseSchema>;

export default function StudentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const { data: studentResponse, isLoading } = useQuery(
    ['student', id],
    async () => {
      const response = await api.get<ApiResponse<StudentWithCourses>>(`/students/${id}`);
      return response.data.data;
    }
  );

  const { data: coursesResponse } = useQuery(
    'allCourses',
    async () => {
      const response = await api.get<ApiResponse<Course[]>>('/courses');
      return response.data.data || [];
    }
  );

  const approveCourseMutation = useMutation(
    async ({ courseId, action }: { courseId: string; action: 'approve' | 'reject' }) => {
      const response = await api.put<ApiResponse<{ status: StudentCourseStatus }>>(`/students/${id}/courses/${courseId}`, { action });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['student', id]);
      },
    }
  );

  const assignCourseMutation = useMutation(
    async ({ courseId, data }: { courseId: string; data: AssignCourseFormData }) => {
      const response = await api.post<ApiResponse<StudentCourse>>(`/students/${id}/courses/${courseId}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['student', id]);
        setIsAssignModalOpen(false);
        setSelectedCourseId(null);
        resetAssignForm();
      },
    }
  );

  const detachCourseMutation = useMutation(
    async (courseId: string) => {
      const response = await api.delete<ApiResponse<{ success: boolean }>>(`/students/${id}/courses/${courseId}`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['student', id]);
      },
    }
  );

  const resetPasswordMutation = useMutation(
    async (data: ResetPasswordFormData) => {
      const response = await api.put<ApiResponse<{ success: boolean }>>(`/students/${id}/reset-password`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['student', id]);
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
    register: registerAssign,
    handleSubmit: handleSubmitAssign,
    formState: { errors: assignErrors },
    reset: resetAssignForm,
    watch: watchAssign,
  } = useForm<AssignCourseFormData>({
    resolver: zodResolver(assignCourseSchema),
    defaultValues: {
      accessStartDate: '',
      accessEndDate: '',
    },
  });

  const accessEndDateValue = watchAssign('accessEndDate');
  const hasTimeLimit = !!accessEndDateValue && accessEndDateValue.trim() !== '';

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
        </div>
        <p className="mt-4 text-neutral-600">Загрузка студента...</p>
      </div>
    );
  }

  const student = studentResponse;
  if (!student) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-600">Студент не найден</p>
      </div>
    );
  }

  const studentCourses = student?.studentCourses || [];
  const allCourses = coursesResponse || [];
  const assignedCourseIds = studentCourses.map((sc) => sc.courseId);
  const availableCourses = allCourses.filter((c) => !assignedCourseIds.includes(c.id));

  const onSubmitPassword = (data: ResetPasswordFormData) => {
    resetPasswordMutation.mutate(data, {
      onSuccess: () => {
        resetPassword();
        setSuccessModal({
          isOpen: true,
          message: 'Пароль успешно изменен',
        });
      },
    });
  };

  const onSubmitAssign = (data: AssignCourseFormData) => {
    if (!selectedCourseId) return;
    assignCourseMutation.mutate({
      courseId: selectedCourseId,
      data: {
        accessStartDate: data.accessStartDate || undefined,
        accessEndDate: data.accessEndDate || undefined,
      },
    });
  };

  const handleAssignClick = (courseId: string) => {
    setSelectedCourseId(courseId);
    setIsAssignModalOpen(true);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div>
      <button
        onClick={() => navigate('/teacher/students')}
        className="flex items-center text-neutral-600 hover:text-primary-600 mb-6 transition-colors animate-slide-in"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Назад к студентам
      </button>

      <div className="relative mb-8 animate-fade-scale">
        <h1 className="text-xl md:text-2xl lg:text-4xl font-bold text-gradient break-words">
          {student.firstName} {student.lastName}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-1">
          <div className="card p-6 mb-6 animate-fade-scale">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center w-24 h-24 rounded-full bg-gradient-primary text-white mb-4 animate-pulse-glow">
                <UserIcon className="h-12 w-12" />
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 mb-2">
                {student.firstName} {student.lastName}
              </h2>
              <p className="text-neutral-600">
                Телефон: {student.phone}
              </p>
              {student.email && (
                <p className="text-neutral-600">
                  Email: {student.email}
                </p>
              )}
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
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Lock className="h-5 w-5 mr-2" />
                  {resetPasswordMutation.isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⟳</span>
                      <span>Сброс...</span>
                    </span>
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
              <BookOpen className="h-6 w-6 text-primary-500 mr-3" />
              <h2 className="text-xl font-semibold text-neutral-900">
                Курсы студента
              </h2>
            </div>
            
            {studentCourses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-neutral-500">Нет курсов</p>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {studentCourses.map((sc, index: number) => (
                  <div
                    key={sc.id}
                    className="flex items-center justify-between p-4 border border-[#374151] rounded-lg hover:border-[#39ff14]/50 hover:bg-[#1f2937]/50 transition-all animate-slide-in"
                    style={{ animationDelay: `${0.1 * index}s` }}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900 mb-1">{sc.course?.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {sc.status === 'APPROVED' && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-mono bg-[#39ff14]/20 text-[#39ff14] border border-[#39ff14]/50">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            APPROVED
                          </span>
                        )}
                        {sc.status === 'PENDING' && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-mono bg-yellow-500/20 text-yellow-400 border border-yellow-500/50">
                            PENDING
                          </span>
                        )}
                        {sc.status === 'REJECTED' && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-mono bg-red-500/20 text-red-400 border border-red-500/50">
                            <XCircle className="h-3 w-3 mr-1" />
                            REJECTED
                          </span>
                        )}
                        {sc.status === 'APPROVED' && (sc.accessStartDate || sc.accessEndDate) && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-mono bg-blue-500/20 text-blue-400 border border-blue-500/50">
                            <Calendar className="h-3 w-3 mr-1" />
                            {sc.accessStartDate && sc.accessEndDate
                              ? `${formatDate(sc.accessStartDate)} - ${formatDate(sc.accessEndDate)}`
                              : sc.accessStartDate
                              ? `с ${formatDate(sc.accessStartDate)}`
                              : sc.accessEndDate
                              ? `до ${formatDate(sc.accessEndDate)}`
                              : 'бессрочно'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                    {sc.status === 'PENDING' && (
                        <>
                        <button
                          onClick={() => approveCourseMutation.mutate({ courseId: sc.courseId, action: 'approve' })}
                          className="p-2 text-[#39ff14] hover:bg-[#39ff14]/10 rounded-lg border border-[#39ff14]/50 hover:border-[#39ff14] transition-all"
                          title="Одобрить"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => approveCourseMutation.mutate({ courseId: sc.courseId, action: 'reject' })}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg border border-red-500/50 hover:border-red-500 transition-all"
                          title="Отклонить"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                        </>
                      )}
                      {sc.status === 'APPROVED' && (
                        <button
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: 'Открепить курс',
                              message: 'Вы уверены, что хотите открепить этот курс от студента?',
                              variant: 'danger',
                              onConfirm: () => {
                                detachCourseMutation.mutate(sc.courseId);
                                setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
                              },
                            });
                          }}
                          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg border border-red-500/50 hover:border-red-500 transition-all"
                          title="Открепить курс"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                      {sc.status === 'REJECTED' && (
                        <>
                          <button
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: 'Одобрить курс',
                                message: 'Одобрить этот курс для студента?',
                                variant: 'info',
                                onConfirm: () => {
                                  approveCourseMutation.mutate({ courseId: sc.courseId, action: 'approve' });
                                  setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
                                },
                              });
                            }}
                            className="p-2 text-[#39ff14] hover:bg-[#39ff14]/10 rounded-lg border border-[#39ff14]/50 hover:border-[#39ff14] transition-all"
                            title="Одобрить курс"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: 'Удалить курс',
                                message: 'Вы уверены, что хотите удалить этот отклоненный курс из списка?',
                                variant: 'danger',
                                onConfirm: () => {
                                  detachCourseMutation.mutate(sc.courseId);
                                  setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });
                                },
                              });
                            }}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg border border-red-500/50 hover:border-red-500 transition-all"
                            title="Удалить из списка"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {availableCourses.length > 0 && (
            <div className="card p-6 animate-fade-scale">
              <div className="flex items-center mb-4">
                <Plus className="h-6 w-6 text-primary-500 mr-3" />
                <h3 className="text-lg font-semibold text-neutral-900">
                  Назначить курс
                </h3>
              </div>
              <div className="space-y-2">
                {availableCourses.map((course, index) => (
                  <button
                    key={course.id}
                    onClick={() => handleAssignClick(course.id)}
                    disabled={assignCourseMutation.isLoading}
                    className="w-full flex items-center justify-between p-4 border border-[#374151] rounded-lg hover:border-[#39ff14]/50 hover:bg-[#1f2937]/50 text-left transition-all animate-slide-in group"
                    style={{ animationDelay: `${0.1 * index}s` }}
                  >
                    <span className="font-medium text-neutral-900 group-hover:text-primary-600 transition-colors">
                      {course.title}
                    </span>
                    <BookOpen className="h-5 w-5 text-neutral-400 group-hover:text-primary-500 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal для прикрепления курса */}
      {isAssignModalOpen && selectedCourseId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-black/75"
              onClick={() => {
                setIsAssignModalOpen(false);
                setSelectedCourseId(null);
                resetAssignForm();
              }}
            ></div>

            <div className="inline-block align-bottom bg-[#111827] rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-[#39ff14]/50 neon-border">
              <div className="bg-[#111827] px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gradient">
                    Назначить курс
                  </h3>
                  <button
                    onClick={() => {
                      setIsAssignModalOpen(false);
                      setSelectedCourseId(null);
                      resetAssignForm();
                    }}
                    className="text-gray-400 hover:text-[#39ff14] transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmitAssign(onSubmitAssign)} className="space-y-4">
                  <div>
                    <p className="text-neutral-700 mb-4">
                      Курс: <span className="text-primary-600 font-semibold">{availableCourses.find(c => c.id === selectedCourseId)?.title}</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Тип доступа
                    </label>
                    <div className="space-y-3">
                      <div>
                        <label className="flex items-center text-neutral-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!hasTimeLimit}
                            onChange={(e) => {
                              if (!e.target.checked) {
                                resetAssignForm({ accessStartDate: '', accessEndDate: '' });
                              }
                            }}
                            className="mr-2 w-4 h-4 text-primary-500 bg-white border-neutral-300 rounded focus:ring-primary-500"
                          />
                          <span>Установить срок доступа</span>
                        </label>
                      </div>

                      {hasTimeLimit && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Дата начала доступа
                            </label>
                            <input
                              {...registerAssign('accessStartDate')}
                              type="date"
                              className="input-field"
                            />
                            {assignErrors.accessStartDate && (
                              <p className="mt-1 text-sm text-red-600">{assignErrors.accessStartDate.message}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-2">
                              Дата окончания доступа
                            </label>
                            <input
                              {...registerAssign('accessEndDate')}
                              type="date"
                              className="input-field"
                            />
                            {assignErrors.accessEndDate && (
                              <p className="mt-1 text-sm text-red-600">{assignErrors.accessEndDate.message}</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {assignCourseMutation.error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {(assignCourseMutation.error as ApiError)?.response?.data?.message || 'Ошибка при прикреплении курса'}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAssignModalOpen(false);
                        setSelectedCourseId(null);
                        resetAssignForm();
                      }}
                      className="btn-secondary flex-1"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={assignCourseMutation.isLoading}
                      className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {assignCourseMutation.isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin">⟳</span>
                          <span>Назначение...</span>
                        </span>
                      ) : (
                        'Назначить'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

