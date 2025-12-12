import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, X, CheckCircle, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import api from '../services/api';
import { ApiResponse, NotificationsResponse, Notification } from '../types';
import { useSocket } from '../hooks/useSocket';
import ConfirmModal from './ConfirmModal';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });

  const { data: notificationsResponse, refetch } = useQuery<ApiResponse<NotificationsResponse>>(
    ['notifications', page],
    async () => {
      const response = await api.get<ApiResponse<NotificationsResponse>>(`/notifications?page=${page}&limit=20`);
      return response.data;
    },
    {
      refetchInterval: 60000, // Refetch every 60 seconds (увеличено чтобы не превышать rate limit)
      refetchOnWindowFocus: false, // Не обновлять при фокусе окна
    }
  );

  const markAsReadMutation = useMutation(
    async (notificationId: string) => {
      const response = await api.put<ApiResponse<any>>(`/notifications/${notificationId}/read`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['notifications', page]);
      },
    }
  );

  const markAllAsReadMutation = useMutation(
    async () => {
      const response = await api.put<ApiResponse<any>>('/notifications/read-all');
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['notifications', page]);
      },
    }
  );

  const deleteAllNotificationsMutation = useMutation(
    async () => {
      const response = await api.delete<ApiResponse<any>>('/notifications/all');
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['notifications', page]);
        setPage(1); // Reset to first page after deletion
      },
    }
  );

  const notifications = notificationsResponse?.data?.notifications || [];
  const unreadCount = notificationsResponse?.data?.unreadCount || 0;
  const pagination = notificationsResponse?.data?.pagination;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDeleteAll = () => {
    setConfirmModal({ isOpen: true });
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'COMMENT':
        return '💬';
      case 'COURSE_REQUEST':
        return '📚';
      case 'COURSE_APPROVED':
        return '✅';
      case 'COURSE_REJECTED':
        return '❌';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'COMMENT':
        return 'text-primary-500';
      case 'COURSE_REQUEST':
        return 'text-yellow-500';
      case 'COURSE_APPROVED':
        return 'text-green-500';
      case 'COURSE_REJECTED':
        return 'text-red-500';
      default:
        return 'text-neutral-400';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-primary-700 hover:text-primary-800 transition-colors rounded-lg hover:bg-primary-50 border-2 border-primary-200 hover:border-primary-400 shadow-sm"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-gradient-accent rounded-full shadow-glow">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-[calc(100vw-1rem)] sm:w-80 md:w-96 bg-white/95 backdrop-blur-sm border-2 border-primary-200/50 rounded-xl shadow-education z-50 max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col animate-slide-in">
            <div className="flex items-center justify-between p-4 border-b-2 border-primary-200/50 bg-gradient-to-r from-primary-50 to-transparent">
              <h3 className="text-lg font-bold text-primary-900">
                Уведомления
              </h3>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={handleDeleteAll}
                    disabled={deleteAllNotificationsMutation.isLoading}
                    className="p-1.5 text-red-600 hover:text-white hover:bg-red-500 rounded-lg border-2 border-red-300 hover:border-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    title="Удалить все уведомления"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-primary-700 hover:text-primary-800 transition-colors font-semibold px-2 py-1 rounded border border-primary-300 hover:bg-primary-100"
                  >
                    Отметить все
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-primary-500 hover:text-primary-700 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="mx-auto h-12 w-12 text-primary-300 mb-4" />
                  <p className="text-primary-700 font-medium">
                    Нет уведомлений
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-primary-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 cursor-pointer transition-all hover:bg-primary-50/70 ${
                        !notification.read ? 'bg-primary-50 border-l-4 border-primary-500' : 'border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`text-2xl ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className={`text-sm font-semibold ${
                              !notification.read ? 'text-primary-900' : 'text-primary-700'
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2.5 h-2.5 bg-gradient-accent rounded-full flex-shrink-0 mt-1 shadow-sm"></div>
                            )}
                          </div>
                          <p className="text-xs text-primary-600 mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-primary-500">
                            {new Date(notification.createdAt).toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t-2 border-primary-200/50 bg-primary-50/30">
                  <div className="text-xs text-primary-700 font-medium">
                    Страница {pagination.page} из {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="p-1.5 border-2 border-primary-300 rounded-lg text-primary-700 hover:text-white hover:bg-gradient-primary hover:border-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={!pagination.hasMore}
                      className="p-1.5 border-2 border-primary-300 rounded-lg text-primary-700 hover:text-white hover:bg-gradient-primary hover:border-primary-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Confirm Delete All Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false })}
        onConfirm={() => {
          deleteAllNotificationsMutation.mutate();
          setConfirmModal({ isOpen: false });
        }}
        title="Удалить все уведомления"
        message="Вы уверены, что хотите удалить все уведомления? Это действие нельзя отменить."
        variant="danger"
      />
    </div>
  );
}

