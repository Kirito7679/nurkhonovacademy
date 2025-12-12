import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { ApiResponse, User, ApiError } from '../types';
import { Search, User as UserIcon, ArrowRight, Eye, Plus, X, Download } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import Skeleton from '../components/Skeleton';

const createStudentSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно'),
  lastName: z.string().min(1, 'Фамилия обязательна'),
  phone: z.string().min(10, 'Номер телефона должен содержать минимум 10 символов'),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов').optional(),
});

type CreateStudentFormData = z.infer<typeof createStudentSchema>;

export default function Students() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: studentsResponse, isLoading } = useQuery(
    ['students', debouncedSearch],
    async () => {
      const params = debouncedSearch ? { search: debouncedSearch } : {};
      const response = await api.get<ApiResponse<User[]>>('/students', { params });
      return response.data.data || [];
    }
  );

  const students = studentsResponse || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateStudentFormData>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
    },
  });

  const createStudentMutation = useMutation(
    async (data: CreateStudentFormData) => {
      const response = await api.post<ApiResponse<User>>('/students', data);
      return response.data.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('students');
        setIsModalOpen(false);
        reset();
      },
    }
  );

  const onSubmit = (data: CreateStudentFormData) => {
    createStudentMutation.mutate(data);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gradient">
          Студенты
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => {
              const token = localStorage.getItem('token');
              window.open(`/api/export/students?token=${token}`, '_blank');
            }}
            className="btn-secondary inline-flex items-center"
          >
            <Download className="h-5 w-5 mr-2" />
            <span>Экспорт</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary inline-flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            <span>Создать студента</span>
          </button>
        </div>
      </div>

      {/* Modal для создания студента */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 transition-opacity bg-black/75"
              onClick={() => setIsModalOpen(false)}
            ></div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-soft-lg transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-neutral-200">
              <div className="bg-white px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gradient">
                    Создать студента
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {createStudentMutation.error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {(createStudentMutation.error as ApiError)?.response?.data?.message || 'Ошибка при создании студента'}
                    </div>
                  )}

                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700 mb-2">
                      Имя <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('firstName')}
                      id="firstName"
                      type="text"
                      className="input-field"
                      placeholder="Введите имя"
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700 mb-2">
                      Фамилия <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('lastName')}
                      id="lastName"
                      type="text"
                      className="input-field"
                      placeholder="Введите фамилию"
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-2">
                      Номер телефона <span className="text-red-500">*</span>
                    </label>
                    <input
                      {...register('phone')}
                      id="phone"
                      type="text"
                      className="input-field"
                      placeholder="+998901234567"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                      Email <span className="text-neutral-500 text-xs">(необязательно)</span>
                    </label>
                    <input
                      {...register('email')}
                      id="email"
                      type="email"
                      className="input-field"
                      placeholder="email@example.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
                      Пароль <span className="text-neutral-500 text-xs">(необязательно)</span>
                    </label>
                    <input
                      {...register('password')}
                      id="password"
                      type="password"
                      className="input-field"
                      placeholder="Пароль (по умолчанию: 123456)"
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                    )}
                    <p className="mt-1 text-xs text-neutral-500">
                      Если не указан, будет установлен пароль по умолчанию: 123456
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="btn-secondary flex-1"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={createStudentMutation.isLoading}
                      className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {createStudentMutation.isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin">⟳</span>
                          <span>Создание...</span>
                        </span>
                      ) : (
                        'Создать'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Поиск по имени, фамилии или телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Поиск студентов"
            className="input-field pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {/* Desktop Skeleton */}
          <div className="hidden md:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-6 py-3"><Skeleton height={16} width={100} /></th>
                    <th className="px-6 py-3"><Skeleton height={16} width={100} /></th>
                    <th className="px-6 py-3"><Skeleton height={16} width={100} /></th>
                    <th className="px-6 py-3"><Skeleton height={16} width={80} /></th>
                    <th className="px-6 py-3"><Skeleton height={16} width={80} /></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><Skeleton height={40} width={150} /></td>
                      <td className="px-6 py-4"><Skeleton height={20} width={120} /></td>
                      <td className="px-6 py-4"><Skeleton height={20} width={150} /></td>
                      <td className="px-6 py-4"><Skeleton height={20} width={50} /></td>
                      <td className="px-6 py-4"><Skeleton height={32} width={80} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Mobile Skeleton */}
          <div className="md:hidden space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card p-4">
                <Skeleton height={48} className="mb-3" />
                <Skeleton height={20} className="mb-2" />
                <Skeleton height={32} width={120} />
              </div>
            ))}
          </div>
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-12 animate-fade-scale">
          <UserIcon className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
          <h3 className="text-lg font-medium text-neutral-600 mb-2">
            Студенты не найдены
          </h3>
          {debouncedSearch && (
            <p className="text-sm text-neutral-500 mt-2">
              Попробуйте изменить параметры поиска
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block card overflow-hidden">
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Студент
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Телефон
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Курсов
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-neutral-600 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {students.map((student: User) => (
                  <tr key={student.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-soft">
                            <UserIcon className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-neutral-900">
                            {student.firstName} {student.lastName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {student.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {student.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {student._count?.studentCourses || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/teacher/students/${student.id}`}
                        className="group inline-flex items-center gap-2 px-4 py-2 text-primary-600 hover:text-primary-700 border border-primary-300 rounded-lg hover:bg-primary-50 transition-all duration-200 text-sm"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Просмотр</span>
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {students.map((student: User) => (
            <div key={student.id} className="card p-4 hover:bg-neutral-50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 h-12 w-12">
                    <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center shadow-soft">
                      <UserIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-medium text-neutral-900 truncate">
                      {student.firstName} {student.lastName}
                    </div>
                    <div className="text-sm text-neutral-600 mt-1">{student.phone}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-neutral-600 mb-3">
                <span>Email: {student.email || '-'}</span>
                <span>Курсов: {student._count?.studentCourses || 0}</span>
              </div>
              <Link
                to={`/teacher/students/${student.id}`}
                className="group inline-flex items-center justify-center gap-2 w-full px-4 py-2 text-primary-600 hover:text-primary-700 border border-primary-300 rounded-lg hover:bg-primary-50 transition-all duration-200 text-sm"
              >
                <Eye className="h-4 w-4" />
                <span>Просмотр</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
}

