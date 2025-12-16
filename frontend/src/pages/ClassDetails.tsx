import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { ApiResponse, Class, ClassStudent, ApiError, EnrollmentStatus } from '../types';
import { ArrowLeft, Users, Calendar, Settings, Plus, Trash2, UserCheck, UserX, Edit, MessageSquare } from 'lucide-react';
import ClassFormModal from '../components/ClassFormModal';

export default function ClassDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: classData, isLoading } = useQuery(
    ['class', id],
    async () => {
      const response = await api.get<ApiResponse<Class>>(`/classes/${id}`);
      return response.data.data;
    },
    { enabled: !!id }
  );

  const { data: studentsResponse } = useQuery(
    ['students'],
    async () => {
      const response = await api.get<ApiResponse<any[]>>('/students');
      return response.data.data || [];
    }
  );

  const deleteClassMutation = useMutation(
    async () => {
      await api.delete(`/classes/${id}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('classes');
        navigate('/teacher/classes');
      },
    }
  );

  const addStudentMutation = useMutation(
    async (studentId: string) => {
      const response = await api.post<ApiResponse<ClassStudent>>(`/classes/${id}/students`, {
        studentId,
      });
      return response.data.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['class', id]);
        queryClient.invalidateQueries('classes');
        setShowAddStudentModal(false);
      },
    }
  );

  const removeStudentMutation = useMutation(
    async (studentId: string) => {
      await api.delete(`/classes/${id}/students/${studentId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['class', id]);
        queryClient.invalidateQueries('classes');
      },
    }
  );

  const updateStudentStatusMutation = useMutation(
    async ({ studentId, status }: { studentId: string; status: EnrollmentStatus }) => {
      await api.put(`/classes/${id}/students/${studentId}/status`, { status });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['class', id]);
        queryClient.invalidateQueries('classes');
      },
    }
  );

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-500"></div>
        </div>
        <p className="mt-4 text-neutral-600">Загрузка класса...</p>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="card p-12 text-center">
        <h3 className="text-xl font-semibold text-neutral-700 mb-2">Класс не найден</h3>
        <button onClick={() => navigate('/teacher/classes')} className="btn-primary mt-4">
          Вернуться к списку классов
        </button>
      </div>
    );
  }

  const getStatusColor = (status: EnrollmentStatus) => {
    switch (status) {
      case EnrollmentStatus.APPROVED:
        return 'bg-green-100 text-green-700 border-green-200';
      case EnrollmentStatus.PENDING:
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case EnrollmentStatus.REJECTED:
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: EnrollmentStatus) => {
    switch (status) {
      case EnrollmentStatus.APPROVED:
        return 'Одобрен';
      case EnrollmentStatus.PENDING:
        return 'Ожидает';
      case EnrollmentStatus.REJECTED:
        return 'Отклонен';
      default:
        return status;
    }
  };

  const availableStudents = studentsResponse?.filter(
    (student) => !classData.students?.some((cs) => cs.studentId === student.id)
  ) || [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/teacher/classes')}
          className="p-2 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gradient">{classData.name}</h1>
          <p className="text-neutral-600 mt-1">{classData.description || 'Нет описания'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/classes/${id}/chat`)}
            className="btn-primary flex items-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Групповой чат
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Edit className="h-4 w-4" />
            Редактировать
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn-danger flex items-center gap-2"
            disabled={deleteClassMutation.isLoading}
          >
            <Trash2 className="h-4 w-4" />
            Удалить
          </button>
        </div>
      </div>

      {/* Class Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-5 w-5 text-primary-600" />
            <h3 className="font-semibold text-neutral-900">Студенты</h3>
          </div>
          <p className="text-2xl font-bold text-primary-600">
            {classData.students?.length || 0} / {classData.maxStudents}
          </p>
        </div>

        {classData.level && (
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-5 w-5 text-primary-600" />
              <h3 className="font-semibold text-neutral-900">Уровень</h3>
            </div>
            <p className="text-lg font-semibold text-neutral-700">{classData.level}</p>
          </div>
        )}

        {classData.language && (
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-2">
              <Settings className="h-5 w-5 text-primary-600" />
              <h3 className="font-semibold text-neutral-900">Язык</h3>
            </div>
            <p className="text-lg font-semibold text-neutral-700">{classData.language}</p>
          </div>
        )}
      </div>

      {/* Students Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-neutral-900">Студенты класса</h2>
          <button
            onClick={() => setShowAddStudentModal(true)}
            className="btn-primary flex items-center gap-2"
            disabled={classData.students?.length >= classData.maxStudents}
          >
            <Plus className="h-4 w-4" />
            Добавить студента
          </button>
        </div>

        {classData.students && classData.students.length > 0 ? (
          <div className="space-y-4">
            {classData.students.map((classStudent) => (
              <div
                key={classStudent.id}
                className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-600 font-semibold">
                      {classStudent.student?.firstName?.[0] || '?'}
                      {classStudent.student?.lastName?.[0] || ''}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-neutral-900">
                      {classStudent.student?.firstName} {classStudent.student?.lastName}
                    </p>
                    <p className="text-sm text-neutral-600">{classStudent.student?.phone}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      classStudent.status
                    )}`}
                  >
                    {getStatusText(classStudent.status)}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {classStudent.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() =>
                          updateStudentStatusMutation.mutate({
                            studentId: classStudent.studentId,
                            status: EnrollmentStatus.APPROVED,
                          })
                        }
                        className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Одобрить"
                      >
                        <UserCheck className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          updateStudentStatusMutation.mutate({
                            studentId: classStudent.studentId,
                            status: EnrollmentStatus.REJECTED,
                          })
                        }
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Отклонить"
                      >
                        <UserX className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => removeStudentMutation.mutate(classStudent.studentId)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Удалить из класса"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-neutral-700 mb-2">Нет студентов</h3>
            <p className="text-neutral-500 mb-6">Добавьте студентов в этот класс</p>
            <button
              onClick={() => setShowAddStudentModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Добавить студента
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <ClassFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            queryClient.invalidateQueries(['class', id]);
            queryClient.invalidateQueries('classes');
          }}
          classData={classData}
        />
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-neutral-200">
              <h2 className="text-xl font-semibold text-neutral-900">Добавить студента</h2>
              <button
                onClick={() => setShowAddStudentModal(false)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {availableStudents.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {availableStudents.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => addStudentMutation.mutate(student.id)}
                      className="w-full text-left p-3 border border-neutral-200 rounded-lg hover:bg-primary-50 hover:border-primary-300 transition-colors"
                      disabled={addStudentMutation.isLoading}
                    >
                      <p className="font-semibold text-neutral-900">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-sm text-neutral-600">{student.phone}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-neutral-600">Нет доступных студентов для добавления</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">Удалить класс?</h2>
              <p className="text-neutral-600 mb-6">
                Вы уверены, что хотите удалить класс "{classData.name}"? Это действие нельзя отменить.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="btn-secondary"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    deleteClassMutation.mutate();
                    setShowDeleteConfirm(false);
                  }}
                  className="btn-danger"
                  disabled={deleteClassMutation.isLoading}
                >
                  {deleteClassMutation.isLoading ? 'Удаление...' : 'Удалить'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


