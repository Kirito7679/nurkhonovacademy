import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { ApiResponse, User } from '../types';
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
        <h1 className="text-3xl md:text-4xl font-bold text-gradient font-mono">
          <span className="text-[#39ff14]">const</span> students <span className="text-[#39ff14]">=</span> <span className="text-[#00ff88]">[]</span>;
        </h1>
        <div className="flex gap-3">
          <button
            onClick={() => {
              const token = localStorage.getItem('token');
              window.open(`/api/export/students?token=${token}`, '_blank');
            }}
            className="inline-flex items-center px-4 py-2 border border-[#374151] shadow-sm text-sm font-medium rounded-lg text-gray-300 hover:text-[#39ff14] hover:border-[#39ff14] hover:bg-[#1f2937] transition-all font-mono"
          >
            <Download className="h-5 w-5 mr-2" />
            <span className="hidden sm:inline">export()</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="glow-button inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-black bg-gradient-primary hover:shadow-lg hover:shadow-[#39ff14]/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#39ff14] transition-all duration-200 font-mono font-bold relative z-10"
          >
            <Plus className="h-5 w-5 mr-2" />
            <span className="hidden sm:inline">createStudent()</span>
            <span className="sm:hidden">Create</span>
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

            <div className="inline-block align-bottom bg-[#111827] rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-[#39ff14]/50 neon-border">
              <div className="bg-[#111827] px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gradient font-mono">
                    <span className="text-[#39ff14]">function</span> createStudent()
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-gray-400 hover:text-[#39ff14] transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {createStudentMutation.error && (
                    <div className="bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg font-mono text-sm">
                      error: {(createStudentMutation.error as any)?.response?.data?.message || 'Ошибка при создании студента'}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                      <span className="text-[#39ff14]">const</span> firstName <span className="text-[#00ff88]">=</span> <span className="text-gray-500">''</span>;
                    </label>
                    <input
                      {...register('firstName')}
                      type="text"
                      className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
                      placeholder="'Имя'"
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-400 font-mono">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                      <span className="text-[#39ff14]">const</span> lastName <span className="text-[#00ff88]">=</span> <span className="text-gray-500">''</span>;
                    </label>
                    <input
                      {...register('lastName')}
                      type="text"
                      className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
                      placeholder="'Фамилия'"
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-400 font-mono">{errors.lastName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                      <span className="text-[#39ff14]">const</span> phone <span className="text-[#00ff88]">=</span> <span className="text-gray-500">''</span>;
                    </label>
                    <input
                      {...register('phone')}
                      type="text"
                      className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
                      placeholder="'+998901234567'"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-400 font-mono">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                      <span className="text-[#39ff14]">const</span> email <span className="text-[#00ff88]">=</span> <span className="text-gray-500">null</span>; <span className="text-gray-600">// optional</span>
                    </label>
                    <input
                      {...register('email')}
                      type="email"
                      className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
                      placeholder="'email@example.com'"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-400 font-mono">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 font-mono">
                      <span className="text-[#39ff14]">const</span> password <span className="text-[#00ff88]">=</span> <span className="text-gray-500">'123456'</span>; <span className="text-gray-600">// default</span>
                    </label>
                    <input
                      {...register('password')}
                      type="password"
                      className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
                      placeholder="'Пароль (по умолчанию: 123456)'"
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-400 font-mono">{errors.password.message}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500 font-mono">
                      // Если не указан, будет установлен пароль по умолчанию: 123456
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-4 py-2 border border-[#374151] text-gray-300 rounded-lg hover:bg-[#1f2937] transition-all font-mono"
                    >
                      cancel()
                    </button>
                    <button
                      type="submit"
                      disabled={createStudentMutation.isLoading}
                      className="glow-button flex-1 px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-gradient-primary hover:shadow-lg hover:shadow-[#39ff14]/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#39ff14] disabled:opacity-50 transition-all duration-200 font-mono font-bold relative z-10"
                    >
                      {createStudentMutation.isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin">⟳</span>
                          <span>creating...</span>
                        </span>
                      ) : (
                        'create()'
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            type="text"
            placeholder="Поиск по имени, фамилии или телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Поиск студентов"
            className="w-full pl-10 pr-4 py-2 bg-[#1f2937] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-neon-glow focus:border-transparent"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {/* Desktop Skeleton */}
          <div className="hidden md:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#374151]">
                <thead className="bg-[#1f2937]">
                  <tr>
                    <th className="px-6 py-3"><Skeleton height={16} width={100} /></th>
                    <th className="px-6 py-3"><Skeleton height={16} width={100} /></th>
                    <th className="px-6 py-3"><Skeleton height={16} width={100} /></th>
                    <th className="px-6 py-3"><Skeleton height={16} width={80} /></th>
                    <th className="px-6 py-3"><Skeleton height={16} width={80} /></th>
                  </tr>
                </thead>
                <tbody className="bg-[#111827] divide-y divide-[#374151]">
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
          <UserIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-400 mb-2 font-mono">
            <span className="text-[#39ff14]">if</span>{' '}
            <span className="text-white">(students.length === 0)</span>{' '}
            <span className="text-[#39ff14]">return</span>{' '}
            <span className="text-gray-500">'Студенты не найдены'</span>;
          </h3>
          {debouncedSearch && (
            <p className="text-sm text-gray-500 font-mono mt-2">
              <span className="text-[#39ff14]">//</span> Попробуйте изменить параметры поиска
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block card overflow-hidden">
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#374151]">
              <thead className="bg-[#1f2937]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Студент
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Телефон
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Курсов
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-[#111827] divide-y divide-[#374151]">
                {students.map((student: any) => (
                  <tr key={student.id} className="hover:bg-[#1f2937]/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {student.firstName} {student.lastName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {student.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {student.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {student._count?.studentCourses || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        to={`/teacher/students/${student.id}`}
                        className="group inline-flex items-center gap-2 px-4 py-2 text-[#39ff14] hover:text-white border border-[#39ff14]/50 rounded-lg hover:bg-[#39ff14]/10 hover:border-[#39ff14] hover:neon-border transition-all duration-300 font-mono text-sm relative overflow-hidden"
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-[#39ff14]/0 via-[#39ff14]/20 to-[#39ff14]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                        <Eye className="h-4 w-4 relative z-10 animate-pulse group-hover:animate-none" />
                        <span className="relative z-10">view()</span>
                        <ArrowRight className="h-4 w-4 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
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
          {students.map((student: any) => (
            <div key={student.id} className="card p-4 hover:bg-[#1f2937]/50 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 h-12 w-12">
                    <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center">
                      <UserIcon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-medium text-white truncate">
                      {student.firstName} {student.lastName}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">{student.phone}</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                <span>Email: {student.email || '-'}</span>
                <span>Курсов: {student._count?.studentCourses || 0}</span>
              </div>
              <Link
                to={`/teacher/students/${student.id}`}
                className="group inline-flex items-center justify-center gap-2 w-full px-4 py-2 text-[#39ff14] hover:text-white border border-[#39ff14]/50 rounded-lg hover:bg-[#39ff14]/10 hover:border-[#39ff14] hover:neon-border transition-all duration-300 font-mono text-sm relative overflow-hidden"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-[#39ff14]/0 via-[#39ff14]/20 to-[#39ff14]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></span>
                <Eye className="h-4 w-4 relative z-10 animate-pulse group-hover:animate-none" />
                <span className="relative z-10">view()</span>
                <ArrowRight className="h-4 w-4 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
}

