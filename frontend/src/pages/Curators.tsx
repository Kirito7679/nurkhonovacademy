import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { ApiResponse, User, ApiError } from '../types';
import { Search, User as UserIcon, Plus, X, Users, Trash2, Eye, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import Skeleton from '../components/Skeleton';
import { useAuthStore } from '../store/authStore';
import ConfirmModal from '../components/ConfirmModal';
import { useToastStore } from '../store/toastStore';

// Phone validation regex for Uzbekistan format: +998XXXXXXXXX or 998XXXXXXXXX
const phoneRegex = /^(\+?998)?[0-9]{9}$/;

// Password strength validation (must contain letters and numbers)
const passwordStrengthRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

const createCuratorSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно').max(50, 'Имя слишком длинное'),
  lastName: z.string().min(1, 'Фамилия обязательна').max(50, 'Фамилия слишком длинная'),
  phone: z.string()
    .min(10, 'Номер телефона должен содержать минимум 10 символов')
    .max(15, 'Номер телефона слишком длинный')
    .regex(phoneRegex, 'Неверный формат номера телефона'),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
  password: z.string()
    .min(6, 'Пароль должен содержать минимум 6 символов')
    .regex(passwordStrengthRegex, 'Пароль должен содержать буквы и цифры')
    .optional(),
});

type CreateCuratorFormData = z.infer<typeof createCuratorSchema>;

export default function Curators() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; curatorId: string | null }>({
    isOpen: false,
    curatorId: null,
  });
  const queryClient = useQueryClient();

  // Проверка прав доступа
  if (user?.role !== 'ADMIN') {
    return (
      <div className="card p-12 text-center">
        <h3 className="text-xl font-semibold text-neutral-700 mb-2">Доступ запрещен</h3>
        <p className="text-neutral-600">Только администратор может управлять учителями</p>
      </div>
    );
  }

  const { data: curatorsResponse, isLoading } = useQuery(
    ['curators', debouncedSearch],
    async () => {
      const params = debouncedSearch ? { search: debouncedSearch } : {};
      const response = await api.get<ApiResponse<User[]>>('/curators', { params });
      return response.data.data || [];
    }
  );

  const curators = curatorsResponse || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateCuratorFormData>({
    resolver: zodResolver(createCuratorSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
    },
  });

  const { showToast } = useToastStore();

  const createCuratorMutation = useMutation(
    async (data: CreateCuratorFormData) => {
      const response = await api.post<ApiResponse<User>>('/curators', data);
      return response.data.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('curators');
        setIsModalOpen(false);
        reset();
        showToast('Учитель успешно создан', 'success');
      },
      onError: (error: ApiError) => {
        showToast(error.response?.data?.message || 'Ошибка при создании учителя', 'error');
      },
    }
  );

  const deleteCuratorMutation = useMutation(
    async (curatorId: string) => {
      await api.delete(`/curators/${curatorId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('curators');
        setDeleteConfirm({ isOpen: false, curatorId: null });
        showToast('Учитель успешно удален', 'success');
      },
      onError: (error: ApiError) => {
        showToast(error.response?.data?.message || 'Ошибка при удалении учителя', 'error');
      },
    }
  );

  const onSubmit = (data: CreateCuratorFormData) => {
    createCuratorMutation.mutate(data);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gradient">
            Учителя
          </h1>
          <p className="text-neutral-600 mt-2">
            Управление учителями платформы
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary inline-flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          <span>Создать учителя</span>
        </button>
      </div>

      {/* Modal для создания куратора */}
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
                    Создать учителя
                  </h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {createCuratorMutation.error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {(createCuratorMutation.error as ApiError)?.response?.data?.message || 'Ошибка при создании учителя'}
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
                      disabled={createCuratorMutation.isLoading}
                      className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {createCuratorMutation.isLoading ? (
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
            aria-label="Поиск учителей"
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><Skeleton height={40} width={150} /></td>
                      <td className="px-6 py-4"><Skeleton height={20} width={120} /></td>
                      <td className="px-6 py-4"><Skeleton height={20} width={150} /></td>
                      <td className="px-6 py-4"><Skeleton height={20} width={100} /></td>
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
              </div>
            ))}
          </div>
        </div>
      ) : curators.length === 0 ? (
        <div className="text-center py-12 animate-fade-scale">
          <Users className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
          <h3 className="text-lg font-medium text-neutral-600 mb-2">
            {debouncedSearch ? 'Учителя не найдены' : 'Нет учителей'}
          </h3>
          {!debouncedSearch && (
            <p className="text-sm text-neutral-500 mt-2 mb-6">
              Создайте первого учителя для работы на платформе
            </p>
          )}
          {!debouncedSearch && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Создать учителя
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                      Учитель
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                      Телефон
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider hidden xl:table-cell">
                      Email
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-neutral-600 uppercase tracking-wider">
                      Дата создания
                    </th>
                    <th className="px-4 xl:px-6 py-3 text-right text-xs font-medium text-neutral-600 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-200">
                  {curators.map((curator: User) => (
                    <tr key={curator.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 xl:px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-soft">
                              <Users className="h-6 w-6 text-white" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-neutral-900">
                              {curator.firstName} {curator.lastName}
                            </div>
                            <div className="text-xs text-neutral-500">
                              Учитель
                            </div>
                            <div className="text-xs text-neutral-500 xl:hidden mt-1">{curator.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 xl:px-6 py-4 text-sm text-neutral-600 hidden xl:table-cell">
                        {curator.phone}
                      </td>
                      <td className="px-4 xl:px-6 py-4 text-sm text-neutral-600 hidden xl:table-cell">
                        {curator.email || '-'}
                      </td>
                      <td className="px-4 xl:px-6 py-4 text-sm text-neutral-600">
                        {new Date(curator.createdAt).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 xl:px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, curatorId: curator.id })}
                          className="inline-flex items-center gap-1 xl:gap-2 px-2 xl:px-4 py-2 text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-all duration-200 text-xs xl:text-sm"
                          title="Удалить учителя"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden xl:inline">Удалить</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Tablet and Mobile View */}
          <div className="lg:hidden space-y-4">
            {curators.map((curator: User) => (
              <div key={curator.id} className="card p-4 hover:bg-neutral-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 h-12 w-12">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-soft">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-medium text-neutral-900">
                        {curator.firstName} {curator.lastName}
                      </div>
                      <div className="text-sm text-neutral-600 mt-1">{curator.phone}</div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-3 text-sm text-neutral-600">
                  <div>
                    <span className="text-xs text-neutral-500">Email:</span>
                    <div className="font-medium">{curator.email || '-'}</div>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500">Дата создания:</span>
                    <div className="font-medium">
                      {new Date(curator.createdAt).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/admin/curators/${curator.id}`}
                    className="group inline-flex items-center justify-center gap-2 flex-1 px-4 py-2 text-primary-600 hover:text-primary-700 border border-primary-300 rounded-lg hover:bg-primary-50 transition-all duration-200 text-sm"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Просмотр</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </Link>
                  <button
                    onClick={() => setDeleteConfirm({ isOpen: true, curatorId: curator.id })}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-all duration-200 text-sm"
                    title="Удалить учителя"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Удалить</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {curators.map((curator: User) => (
              <div key={curator.id} className="card p-4 hover:bg-neutral-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 h-12 w-12">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-soft">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-base font-medium text-neutral-900">
                      {curator.firstName} {curator.lastName}
                    </div>
                    <div className="text-sm text-neutral-600 mt-1">{curator.phone}</div>
                    <div className="text-xs text-neutral-500 mt-1">
                      Email: {curator.email || 'не указан'}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      Создан: {new Date(curator.createdAt).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Link
                    to={`/admin/curators/${curator.id}`}
                    className="group inline-flex items-center justify-center gap-2 flex-1 px-4 py-2 text-primary-600 hover:text-primary-700 border border-primary-300 rounded-lg hover:bg-primary-50 transition-all duration-200 text-sm"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Просмотр</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </Link>
                  <button
                    onClick={() => setDeleteConfirm({ isOpen: true, curatorId: curator.id })}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-all duration-200 text-sm"
                    title="Удалить куратора"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Удалить</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, curatorId: null })}
        onConfirm={() => {
          if (deleteConfirm.curatorId) {
            deleteCuratorMutation.mutate(deleteConfirm.curatorId);
          }
        }}
        title="Удаление учителя"
        message="Вы уверены, что хотите удалить этого учителя? Это действие нельзя отменить."
        confirmText={deleteCuratorMutation.isLoading ? 'Удаление...' : 'Удалить'}
        cancelText="Отмена"
        variant="danger"
      />
    </div>
  );
}


