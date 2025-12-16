import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ApiResponse, Class, ClassStatus, ApiError } from '../types';
import { Plus, Users, Calendar, Settings, Search, Filter } from 'lucide-react';
import ClassFormModal from '../components/ClassFormModal';

export default function Classes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClassStatus | 'ALL'>('ALL');

  const { data: classesResponse, isLoading } = useQuery(
    ['classes', statusFilter],
    async () => {
      const params: any = {};
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      const response = await api.get<ApiResponse<Class[]>>('/classes', { params });
      return response.data.data || [];
    }
  );

  const deleteClassMutation = useMutation(
    async (classId: string) => {
      await api.delete(`/classes/${classId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('classes');
      },
    }
  );

  const classes = classesResponse || [];
  const filteredClasses = classes.filter((cls) =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: ClassStatus) => {
    switch (status) {
      case ClassStatus.ACTIVE:
        return 'bg-green-100 text-green-700 border-green-200';
      case ClassStatus.COMPLETED:
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case ClassStatus.CANCELLED:
        return 'bg-red-100 text-red-700 border-red-200';
      case ClassStatus.ARCHIVED:
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: ClassStatus) => {
    switch (status) {
      case ClassStatus.ACTIVE:
        return 'Активен';
      case ClassStatus.COMPLETED:
        return 'Завершен';
      case ClassStatus.CANCELLED:
        return 'Отменен';
      case ClassStatus.ARCHIVED:
        return 'Архивирован';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
        </div>
        <p className="mt-4 text-neutral-600">Загрузка классов...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gradient">
            Мои классы
          </h1>
          <p className="text-neutral-600 mt-2">
            Управляйте групповыми занятиями и студентами
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Создать класс
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Поиск по названию или описанию..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-neutral-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ClassStatus | 'ALL')}
              className="input-field"
            >
              <option value="ALL">Все статусы</option>
              <option value={ClassStatus.ACTIVE}>Активные</option>
              <option value={ClassStatus.COMPLETED}>Завершенные</option>
              <option value={ClassStatus.CANCELLED}>Отмененные</option>
              <option value={ClassStatus.ARCHIVED}>Архивированные</option>
            </select>
          </div>
        </div>
      </div>

      {/* Classes List */}
      {filteredClasses.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-neutral-700 mb-2">
            {searchTerm || statusFilter !== 'ALL' ? 'Классы не найдены' : 'Нет классов'}
          </h3>
          <p className="text-neutral-500 mb-6">
            {searchTerm || statusFilter !== 'ALL'
              ? 'Попробуйте изменить параметры поиска'
              : 'Создайте свой первый класс для групповых занятий'}
          </p>
          {!searchTerm && statusFilter === 'ALL' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Создать класс
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => (
            <div
              key={cls.id}
              className="card p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/classes/${cls.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                    {cls.name}
                  </h3>
                  {cls.description && (
                    <p className="text-sm text-neutral-600 line-clamp-2">
                      {cls.description}
                    </p>
                  )}
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                    cls.status
                  )}`}
                >
                  {getStatusText(cls.status)}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-neutral-600">
                  <Users className="h-4 w-4 mr-2" />
                  <span>
                    {cls._count?.students || cls.students?.length || 0} / {cls.maxStudents} студентов
                  </span>
                </div>
                {cls.level && (
                  <div className="flex items-center text-sm text-neutral-600">
                    <span className="font-medium mr-2">Уровень:</span>
                    <span>{cls.level}</span>
                  </div>
                )}
                {cls.language && (
                  <div className="flex items-center text-sm text-neutral-600">
                    <span className="font-medium mr-2">Язык:</span>
                    <span>{cls.language}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-neutral-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/classes/${cls.id}`);
                  }}
                  className="btn-secondary flex-1 text-sm"
                >
                  Открыть
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/classes/${cls.id}/settings`);
                  }}
                  className="p-2 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                  title="Настройки"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <ClassFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries('classes');
          }}
        />
      )}
    </div>
  );
}




