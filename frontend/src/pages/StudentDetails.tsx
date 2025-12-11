import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { ApiResponse, User, Course, StudentCourseStatus } from '../types';
import { ArrowLeft, CheckCircle, XCircle, BookOpen, Save, Plus, User as UserIcon, Lock, Key, X, Calendar, Trash2 } from 'lucide-react';

const updateStudentSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно'),
  lastName: z.string().min(1, 'Фамилия обязательна'),
  phone: z.string().min(10, 'Номер телефона должен содержать минимум 10 символов'),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
});

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

type UpdateStudentFormData = z.infer<typeof updateStudentSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
type AssignCourseFormData = z.infer<typeof assignCourseSchema>;

export default function StudentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasResetRef = useRef(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const { data: studentResponse, isLoading } = useQuery(
    ['student', id],
    async () => {
      const response = await api.get<ApiResponse<User & { studentCourses: any[]; progress: any[] }>>(`/students/${id}`);
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

  const updateStudentMutation = useMutation(
    async (data: UpdateStudentFormData) => {
      const response = await api.put<ApiResponse<User>>(`/students/${id}`, data);
      return response.data.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['student', id]);
      },
    }
  );

  const approveCourseMutation = useMutation(
    async ({ courseId, action }: { courseId: string; action: 'approve' | 'reject' }) => {
      const response = await api.put<ApiResponse<any>>(`/students/${id}/courses/${courseId}`, { action });
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
      const response = await api.post<ApiResponse<any>>(`/students/${id}/courses/${courseId}`, data);
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
      const response = await api.delete<ApiResponse<any>>(`/students/${id}/courses/${courseId}`);
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
      const response = await api.put<ApiResponse<any>>(`/students/${id}/reset-password`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['student', id]);
      },
    }
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateStudentFormData>({
    resolver: zodResolver(updateStudentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
    },
  });

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

  useEffect(() => {
    if (studentResponse && !hasResetRef.current) {
      reset({
        firstName: studentResponse.firstName,
        lastName: studentResponse.lastName,
        phone: studentResponse.phone,
        email: studentResponse.email || '',
      });
      hasResetRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentResponse]);

  if (isLoading) {
    return (
      <div className="text-center py-12 code-bg particle-bg">
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#39ff14]/30 border-t-[#39ff14]"></div>
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-[#39ff14]/20"></div>
        </div>
        <p className="mt-4 text-gray-400 font-mono">loading student...</p>
      </div>
    );
  }

  const student = studentResponse;
  if (!student) {
    return (
      <div className="text-center py-12 code-bg particle-bg">
        <div className="font-mono text-gray-400">
          <span className="text-[#39ff14]">error:</span> Student not found
        </div>
      </div>
    );
  }

  const studentCourses = (student as any).studentCourses || [];
  const allCourses = coursesResponse || [];
  const assignedCourseIds = studentCourses.map((sc: any) => sc.courseId);
  const availableCourses = allCourses.filter((c) => !assignedCourseIds.includes(c.id));

  const onSubmit = (data: UpdateStudentFormData) => {
    updateStudentMutation.mutate(data);
  };

  const onSubmitPassword = (data: ResetPasswordFormData) => {
    resetPasswordMutation.mutate(data, {
      onSuccess: () => {
        resetPassword();
        alert('Пароль успешно изменен');
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
    <div className="code-bg particle-bg">
      <button
        onClick={() => navigate('/teacher/students')}
        className="flex items-center text-gray-400 hover:text-[#39ff14] mb-6 transition-all hover:neon-glow font-mono animate-slide-in"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        <span className="text-[#39ff14]">return</span> students
      </button>

      <div className="relative mb-8 animate-fade-scale">
        <h1 className="text-xl md:text-2xl lg:text-4xl font-bold text-gradient neon-glow font-mono break-words">
          <span className="text-[#39ff14]">const</span> student <span className="text-[#39ff14]">=</span>{' '}
          <span className="text-white">'{student.firstName} {student.lastName}'</span>;
        </h1>
        <div className="absolute top-0 right-0 text-xs font-mono text-gray-600 animate-pulse">
          // Student Details
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-1">
          <div className="card p-6 mb-6 animate-fade-scale">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center w-24 h-24 rounded-full bg-gradient-primary text-white mb-4 animate-pulse-glow">
                <UserIcon className="h-12 w-12" />
              </div>
              <h2 className="text-2xl font-bold text-white font-mono mb-2">
                <span className="text-[#00ff88]">student.name</span>
              </h2>
              <p className="text-gray-400 font-mono">
                <span className="text-[#39ff14]">phone:</span> {student.phone}
              </p>
              {student.email && (
                <p className="text-gray-400 font-mono">
                  <span className="text-[#39ff14]">email:</span> {student.email}
                </p>
              )}
            </div>
          </div>

          <div className="card p-6 animate-fade-scale">
            <div className="flex items-center mb-6">
              <Save className="h-6 w-6 text-[#39ff14] mr-3 animate-pulse-glow" />
              <h2 className="text-xl font-semibold text-white font-mono">
                <span className="text-[#39ff14]">function</span> updateProfile()
              </h2>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="animate-slide-in" style={{ animationDelay: '0.1s' }}>
                <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                  <span className="text-[#39ff14]">const</span> firstName <span className="text-[#00ff88]">=</span> <span className="text-gray-500">''</span>;
                </label>
                <input
                  {...register('firstName')}
                  className="mt-1 block w-full px-3 py-2 bg-[#1f2937] border border-[#374151] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent text-white font-mono hover:border-[#39ff14]/50 transition-all"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-400 font-mono">error: {errors.firstName.message}</p>
                )}
              </div>

              <div className="animate-slide-in" style={{ animationDelay: '0.2s' }}>
                <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                  <span className="text-[#39ff14]">const</span> lastName <span className="text-[#00ff88]">=</span> <span className="text-gray-500">''</span>;
                </label>
                <input
                  {...register('lastName')}
                  className="mt-1 block w-full px-3 py-2 bg-[#1f2937] border border-[#374151] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent text-white font-mono hover:border-[#39ff14]/50 transition-all"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-400 font-mono">error: {errors.lastName.message}</p>
                )}
              </div>

              <div className="animate-slide-in" style={{ animationDelay: '0.3s' }}>
                <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                  <span className="text-[#39ff14]">const</span> phone <span className="text-[#00ff88]">=</span> <span className="text-gray-500">''</span>;
                </label>
                <input
                  {...register('phone')}
                  className="mt-1 block w-full px-3 py-2 bg-[#1f2937] border border-[#374151] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent text-white font-mono hover:border-[#39ff14]/50 transition-all"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-400 font-mono">error: {errors.phone.message}</p>
                )}
              </div>

              <div className="animate-slide-in" style={{ animationDelay: '0.4s' }}>
                <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                  <span className="text-[#39ff14]">const</span> email <span className="text-[#00ff88]">=</span> <span className="text-gray-500">null</span>; <span className="text-gray-600">// optional</span>
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="mt-1 block w-full px-3 py-2 bg-[#1f2937] border border-[#374151] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent text-white font-mono hover:border-[#39ff14]/50 transition-all"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400 font-mono">error: {errors.email.message}</p>
                )}
              </div>

              <div className="animate-slide-in" style={{ animationDelay: '0.5s' }}>
                {updateStudentMutation.error && (
                  <div className="mb-4 bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg font-mono text-sm">
                    error: {(updateStudentMutation.error as any)?.response?.data?.message || 'Ошибка при сохранении'}
                  </div>
                )}
                {updateStudentMutation.isSuccess && (
                  <div className="mb-4 bg-[#39ff14]/20 border border-[#39ff14]/50 text-[#39ff14] px-4 py-3 rounded-lg font-mono text-sm">
                    ✓ Данные успешно сохранены
                  </div>
                )}
                <button
                  type="submit"
                  disabled={updateStudentMutation.isLoading}
                  className="glow-button w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-gradient-primary hover:shadow-lg hover:shadow-[#39ff14]/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#39ff14] disabled:opacity-50 transition-all duration-200 font-mono font-bold relative z-10"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {updateStudentMutation.isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⟳</span>
                      <span>saving...</span>
                    </span>
                  ) : (
                    'save()'
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="card p-6 animate-fade-scale mt-6">
            <div className="flex items-center mb-6">
              <Key className="h-6 w-6 text-[#39ff14] mr-3 animate-pulse-glow" />
              <h2 className="text-xl font-semibold text-white font-mono">
                <span className="text-[#39ff14]">function</span> resetPassword()
              </h2>
            </div>
            <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
              <div className="animate-slide-in" style={{ animationDelay: '0.1s' }}>
                <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                  <span className="text-[#39ff14]">const</span> newPassword <span className="text-[#00ff88]">=</span> <span className="text-gray-500">''</span>;
                </label>
                <input
                  {...registerPassword('newPassword')}
                  type="password"
                  className="mt-1 block w-full px-3 py-2 bg-[#1f2937] border border-[#374151] rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent text-white font-mono hover:border-[#39ff14]/50 transition-all"
                  placeholder="'Новый пароль'"
                />
                {passwordErrors.newPassword && (
                  <p className="mt-1 text-sm text-red-400 font-mono">error: {passwordErrors.newPassword.message}</p>
                )}
              </div>

              {resetPasswordMutation.error && (
                <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg font-mono text-sm">
                  error: {(resetPasswordMutation.error as any)?.response?.data?.message || 'Ошибка при изменении пароля'}
                </div>
              )}

              <div className="animate-slide-in" style={{ animationDelay: '0.2s' }}>
                <button
                  type="submit"
                  disabled={resetPasswordMutation.isLoading}
                  className="glow-button w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-gradient-primary hover:shadow-lg hover:shadow-[#39ff14]/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#39ff14] disabled:opacity-50 transition-all duration-200 font-mono font-bold relative z-10"
                >
                  <Lock className="h-5 w-5 mr-2" />
                  {resetPasswordMutation.isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⟳</span>
                      <span>resetting...</span>
                    </span>
                  ) : (
                    'resetPassword()'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card p-6 mb-6 animate-fade-scale">
            <div className="flex items-center mb-6">
              <BookOpen className="h-6 w-6 text-[#39ff14] mr-3 animate-pulse-glow" />
              <h2 className="text-xl font-semibold text-white font-mono">
                <span className="text-[#39ff14]">const</span> courses <span className="text-[#39ff14]">=</span> <span className="text-[#00ff88]">[]</span>;
              </h2>
            </div>
            
            {studentCourses.length === 0 ? (
              <div className="text-center py-8">
                <div className="font-mono text-gray-500">
                  <span className="text-[#39ff14]">if</span>{' '}
                  <span className="text-white">(courses.length === 0)</span>{' '}
                  <span className="text-[#39ff14]">return</span>{' '}
                  <span className="text-gray-500">'Нет курсов'</span>;
                </div>
              </div>
            ) : (
              <div className="space-y-3 mb-6">
                {studentCourses.map((sc: any, index: number) => (
                  <div
                    key={sc.id}
                    className="flex items-center justify-between p-4 border border-[#374151] rounded-lg hover:border-[#39ff14]/50 hover:bg-[#1f2937]/50 transition-all animate-slide-in"
                    style={{ animationDelay: `${0.1 * index}s` }}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-white font-mono mb-1">{sc.course?.title}</p>
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
                            if (confirm('Вы уверены, что хотите открепить этот курс от студента?')) {
                              detachCourseMutation.mutate(sc.courseId);
                            }
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
                              if (confirm('Одобрить этот курс для студента?')) {
                                approveCourseMutation.mutate({ courseId: sc.courseId, action: 'approve' });
                              }
                            }}
                            className="p-2 text-[#39ff14] hover:bg-[#39ff14]/10 rounded-lg border border-[#39ff14]/50 hover:border-[#39ff14] transition-all"
                            title="Одобрить курс"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Вы уверены, что хотите удалить этот отклоненный курс из списка?')) {
                                detachCourseMutation.mutate(sc.courseId);
                              }
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
                <Plus className="h-6 w-6 text-[#39ff14] mr-3 animate-pulse-glow" />
                <h3 className="text-lg font-semibold text-white font-mono">
                  <span className="text-[#39ff14]">function</span> assignCourse()
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
                    <span className="font-medium text-white font-mono group-hover:text-[#39ff14] transition-colors">
                      {course.title}
                    </span>
                    <BookOpen className="h-5 w-5 text-gray-400 group-hover:text-[#39ff14] transition-colors" />
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
                  <h3 className="text-xl font-bold text-gradient font-mono">
                    <span className="text-[#39ff14]">function</span> assignCourse()
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
                    <p className="text-gray-300 font-mono mb-4">
                      Курс: <span className="text-[#39ff14]">{availableCourses.find(c => c.id === selectedCourseId)?.title}</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                      <span className="text-[#39ff14]">const</span> accessType <span className="text-[#00ff88]">=</span>{' '}
                      <span className="text-gray-500">'unlimited'</span>; <span className="text-gray-600">// или со сроком</span>
                    </label>
                    <div className="space-y-3">
                      <div>
                        <label className="flex items-center text-gray-300 font-mono cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!hasTimeLimit}
                            onChange={(e) => {
                              if (!e.target.checked) {
                                resetAssignForm({ accessStartDate: '', accessEndDate: '' });
                              }
                            }}
                            className="mr-2 w-4 h-4 text-[#39ff14] bg-[#1f2937] border-[#374151] rounded focus:ring-[#39ff14]"
                          />
                          <span>Установить срок доступа</span>
                        </label>
                      </div>

                      {hasTimeLimit && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                              <span className="text-[#39ff14]">const</span> accessStartDate <span className="text-[#00ff88]">=</span>{' '}
                              <span className="text-gray-500">''</span>;
                            </label>
                            <input
                              {...registerAssign('accessStartDate')}
                              type="date"
                              className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
                            />
                            {assignErrors.accessStartDate && (
                              <p className="mt-1 text-sm text-red-400 font-mono">{assignErrors.accessStartDate.message}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                              <span className="text-[#39ff14]">const</span> accessEndDate <span className="text-[#00ff88]">=</span>{' '}
                              <span className="text-gray-500">''</span>;
                            </label>
                            <input
                              {...registerAssign('accessEndDate')}
                              type="date"
                              className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
                            />
                            {assignErrors.accessEndDate && (
                              <p className="mt-1 text-sm text-red-400 font-mono">{assignErrors.accessEndDate.message}</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {assignCourseMutation.error && (
                    <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg font-mono text-sm">
                      error: {(assignCourseMutation.error as any)?.response?.data?.message || 'Ошибка при прикреплении курса'}
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
                      className="flex-1 px-4 py-2 border border-[#374151] text-gray-300 rounded-lg hover:bg-[#1f2937] transition-all font-mono"
                    >
                      cancel()
                    </button>
                    <button
                      type="submit"
                      disabled={assignCourseMutation.isLoading}
                      className="glow-button flex-1 px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-gradient-primary hover:shadow-lg hover:shadow-[#39ff14]/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#39ff14] disabled:opacity-50 transition-all duration-200 font-mono font-bold relative z-10"
                    >
                      {assignCourseMutation.isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin">⟳</span>
                          <span>assigning...</span>
                        </span>
                      ) : (
                        'assign()'
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

