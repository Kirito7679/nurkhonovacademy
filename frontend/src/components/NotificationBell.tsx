import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, X, CheckCircle, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import api from '../services/api';
import { ApiResponse, NotificationsResponse, Notification } from '../types';
import { useSocket } from '../hooks/useSocket';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
    if (confirm('Вы уверены, что хотите удалить все уведомления? Это действие нельзя отменить.')) {
      deleteAllNotificationsMutation.mutate();
    }
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
        return 'text-[#39ff14]';
      case 'COURSE_REQUEST':
        return 'text-yellow-400';
      case 'COURSE_APPROVED':
        return 'text-[#00ff88]';
      case 'COURSE_REJECTED':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-300 hover:text-[#39ff14] transition-colors rounded-lg hover:bg-[#1f2937] border border-[#374151] hover:border-[#39ff14]/50"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-black bg-[#39ff14] rounded-full animate-pulse-glow">
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
          <div className="absolute right-0 mt-2 w-[calc(100vw-1rem)] sm:w-80 md:w-96 bg-[#111827] border border-[#374151] rounded-lg shadow-lg z-50 max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col animate-slide-in">
            <div className="flex items-center justify-between p-4 border-b border-[#374151]">
              <h3 className="text-lg font-semibold text-white font-mono">
                <span className="text-[#39ff14]">const</span> notifications <span className="text-[#39ff14]">=</span> <span className="text-white">[]</span>;
              </h3>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={handleDeleteAll}
                    disabled={deleteAllNotificationsMutation.isLoading}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-red-500/50 hover:border-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Удалить все уведомления"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-[#39ff14] hover:text-[#00ff88] transition-colors font-mono"
                  >
                    markAllRead()
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="mx-auto h-12 w-12 text-gray-600 mb-4" />
                  <p className="text-gray-400 font-mono">
                    <span className="text-[#39ff14]">if</span>{' '}
                    <span className="text-white">(notifications.length === 0)</span>{' '}
                    <span className="text-[#39ff14]">return</span>{' '}
                    <span className="text-gray-500">'Нет уведомлений'</span>;
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#374151]">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 cursor-pointer transition-all hover:bg-[#1f2937] ${
                        !notification.read ? 'bg-[#1f2937]/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`text-2xl ${getNotificationColor(notification.type)}`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className={`text-sm font-semibold font-mono ${
                              !notification.read ? 'text-white' : 'text-gray-400'
                            }`}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-[#39ff14] rounded-full flex-shrink-0 mt-1 animate-pulse-glow"></div>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 font-mono mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-600 font-mono">
                            <span className="text-[#39ff14]">time:</span>{' '}
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
                <div className="flex items-center justify-between p-4 border-t border-[#374151]">
                  <div className="text-xs text-gray-400 font-mono">
                    <span className="text-[#39ff14]">page</span> {pagination.page} <span className="text-[#39ff14]">of</span> {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="p-1 border border-[#374151] rounded text-gray-400 hover:text-white hover:border-[#39ff14] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={!pagination.hasMore}
                      className="p-1 border border-[#374151] rounded text-gray-400 hover:text-white hover:border-[#39ff14] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
}

