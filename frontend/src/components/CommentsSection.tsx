import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DOMPurify from 'dompurify';
import api from '../services/api';
import { ApiResponse, Comment, CommentsResponse } from '../types';
import { useAuthStore } from '../store/authStore';
import { MessageSquare, Send, Trash2, Reply, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { Role } from '../types';
import ConfirmModal from './ConfirmModal';
import { useSocket } from '../hooks/useSocket';

const commentSchema = z.object({
  content: z.string().min(1, 'Комментарий не может быть пустым').max(1000, 'Комментарий слишком длинный'),
});

type CommentFormData = z.infer<typeof commentSchema>;

interface CommentsSectionProps {
  lessonId: string;
}

export default function CommentsSection({ lessonId }: CommentsSectionProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; commentId: string | null }>({
    isOpen: false,
    commentId: null,
  });

  // Listen for new comments via WebSocket
  useEffect(() => {
    if (!socket) return;

    socket.emit('join-lesson', lessonId);

    socket.on('new-comment', () => {
      // Invalidate comments query to refetch
      queryClient.invalidateQueries(['comments', lessonId]);
    });

    return () => {
      if (socket) {
        socket.emit('leave-lesson', lessonId);
        socket.off('new-comment');
      }
    };
  }, [socket, lessonId, queryClient]);

  const { data: commentsResponse, isLoading } = useQuery<ApiResponse<CommentsResponse>>(
    ['comments', lessonId, page],
    async () => {
      const response = await api.get<ApiResponse<CommentsResponse>>(`/comments/lesson/${lessonId}?page=${page}&limit=10`);
      return response.data;
    },
    {
      // Убрали refetchInterval - используем WebSocket для обновления комментариев
      // refetchInterval: 5000, // Убрано - используем WebSocket вместо polling
      refetchOnWindowFocus: false, // Убрано чтобы не превышать rate limit
      // Комментарии обновляются через WebSocket (socket.on('new-comment'))
    }
  );

  const comments = commentsResponse?.data?.comments || [];
  const pagination = commentsResponse?.data?.pagination;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
  });

  const {
    register: registerReply,
    handleSubmit: handleSubmitReply,
    reset: resetReply,
    formState: { errors: replyErrors },
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    formState: { errors: editErrors },
    setValue: setEditValue,
  } = useForm<CommentFormData>({
    resolver: zodResolver(commentSchema),
  });

  const createCommentMutation = useMutation(
    async (data: CommentFormData & { parentId?: string }) => {
      const response = await api.post<ApiResponse<Comment>>(`/comments/lesson/${lessonId}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['comments', lessonId]);
        reset();
        setReplyingTo(null);
        resetReply();
        // Reset to first page to show new comment
        if (page !== 1) {
          setPage(1);
        }
      },
    }
  );

  const deleteCommentMutation = useMutation(
    async (commentId: string) => {
      await api.delete(`/comments/${commentId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['comments', lessonId]);
      },
    }
  );

  const updateCommentMutation = useMutation(
    async (data: { commentId: string; content: string }) => {
      const response = await api.put<ApiResponse<Comment>>(`/comments/${data.commentId}`, {
        content: data.content,
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['comments', lessonId]);
        setEditingComment(null);
        resetEdit();
      },
    }
  );

  const onSubmit = (data: CommentFormData) => {
    createCommentMutation.mutate(data);
  };

  const onSubmitReply = (data: CommentFormData, parentId: string) => {
    createCommentMutation.mutate({ ...data, parentId });
  };

  const onSubmitEdit = (data: CommentFormData, commentId: string) => {
    updateCommentMutation.mutate({ commentId, content: data.content });
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditValue('content', comment.content);
  };

  const canEdit = (comment: Comment) => {
    if (!user) return false;
    if (comment.userId !== user.id) return false;
    
    // Check if comment is less than 15 minutes old
    const commentAge = Date.now() - new Date(comment.createdAt).getTime();
    const fifteenMinutes = 15 * 60 * 1000;
    return commentAge <= fifteenMinutes;
  };

  const canDelete = (comment: Comment) => {
    if (!user) return false;
    return (
      comment.userId === user.id ||
      user.role === Role.TEACHER ||
      user.role === Role.ADMIN
    );
  };

  const canReply = (comment: Comment) => {
    if (!user) return false;
    return user.role === Role.TEACHER || user.role === Role.ADMIN || user.role === Role.CURATOR;
  };

  return (
    <div className="card p-6 md:p-8 animate-fade-scale" style={{ animationDelay: '0.4s' }}>
      <h2 className="text-xl md:text-2xl font-semibold text-neutral-900 mb-6">
        Комментарии и вопросы
      </h2>

      {/* Comment Form (only for students) */}
      {user?.role === Role.STUDENT && (
        <form onSubmit={handleSubmit(onSubmit)} className="mb-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <textarea
                {...register('content')}
                placeholder="Оставьте комментарий или вопрос..."
                className="input-field resize-none"
                rows={3}
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={createCommentMutation.isLoading}
              className="btn-primary px-6 py-3 h-fit disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {createCommentMutation.isLoading ? (
                <span className="animate-spin">⟳</span>
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </form>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-200 border-t-primary-500"></div>
          <p className="mt-4 text-neutral-600">Загрузка комментариев...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="mx-auto h-12 w-12 text-neutral-400 mb-4" />
          <p className="text-neutral-600">Нет комментариев</p>
          <p className="text-sm text-neutral-500 mt-2">Будьте первым, кто оставит комментарий!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="border border-neutral-200 rounded-lg p-4 bg-white animate-slide-in hover:shadow-sm transition-shadow"
            >
              {/* Main Comment */}
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-primary text-white flex items-center justify-center font-bold">
                  {comment.user?.firstName?.[0] || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-neutral-900">
                      {comment.user?.firstName} {comment.user?.lastName}
                    </span>
                    {(comment.user?.role === Role.TEACHER || comment.user?.role === Role.ADMIN || comment.user?.role === Role.CURATOR) && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 border border-primary-200 font-medium">
                        Преподаватель
                      </span>
                    )}
                  </div>
                  {editingComment === comment.id ? (
                    <form onSubmit={handleSubmitEdit((data) => onSubmitEdit(data, comment.id))} className="mb-2">
                      <textarea
                        {...registerEdit('content')}
                        className="input-field text-sm resize-none"
                        rows={3}
                      />
                      {editErrors.content && (
                        <p className="mt-1 text-xs text-red-600">{editErrors.content.message}</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          type="submit"
                          disabled={updateCommentMutation.isLoading}
                          className="btn-primary px-3 py-1 text-sm disabled:opacity-50"
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingComment(null);
                            resetEdit();
                          }}
                          className="btn-secondary px-3 py-1 text-sm"
                        >
                          Отмена
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p 
                      className="text-neutral-700 text-sm mb-2 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.content, { ALLOWED_TAGS: [] }) }}
                    />
                  )}
                  <div className="flex items-center gap-4 text-xs text-neutral-500">
                    <span>
                      {new Date(comment.createdAt).toLocaleString('ru-RU')}
                    </span>
                    {canEdit(comment) && editingComment !== comment.id && (
                      <button
                        onClick={() => handleStartEdit(comment)}
                        className="text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1"
                      >
                        <Edit size={14} />
                        <span>Редактировать</span>
                      </button>
                    )}
                    {canReply(comment) && (
                      <button
                        onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                        className="text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1"
                      >
                        <Reply size={14} />
                        <span>Ответить</span>
                      </button>
                    )}
                    {canDelete(comment) && (
                      <button
                        onClick={() => setDeleteConfirm({ isOpen: true, commentId: comment.id })}
                        className="text-red-600 hover:text-red-700 transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                        <span>Удалить</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Reply Form */}
              {replyingTo === comment.id && canReply(comment) && (
                <form
                  onSubmit={handleSubmitReply((data) => onSubmitReply(data, comment.id))}
                  className="mt-3 ml-12 md:ml-14 border-l-2 border-primary-300 pl-4"
                >
                  <div className="flex gap-2">
                    <textarea
                      {...registerReply('content')}
                      placeholder="Ответить..."
                      className="input-field flex-1 text-sm resize-none"
                      rows={2}
                    />
                    <button
                      type="submit"
                      disabled={createCommentMutation.isLoading}
                      className="btn-primary px-4 py-2 h-fit disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {createCommentMutation.isLoading ? (
                        <span className="animate-spin">⟳</span>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {replyErrors.content && (
                    <p className="mt-1 text-xs text-red-600">{replyErrors.content.message}</p>
                  )}
                </form>
              )}

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-3 ml-12 md:ml-14 space-y-3 border-l-2 border-primary-200 pl-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-primary text-white flex items-center justify-center font-bold text-sm">
                        {reply.user?.firstName?.[0] || 'T'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-neutral-900 text-sm">
                            {reply.user?.firstName} {reply.user?.lastName}
                          </span>
                          {(reply.user?.role === Role.TEACHER || reply.user?.role === Role.ADMIN || reply.user?.role === Role.CURATOR) && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 border border-primary-200 font-medium">
                              Преподаватель
                            </span>
                          )}
                        </div>
                        <p 
                          className="text-neutral-700 text-sm mb-1 whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reply.content, { ALLOWED_TAGS: [] }) }}
                        />
                        <div className="flex items-center gap-4 text-xs text-neutral-500">
                          <span>
                            {new Date(reply.createdAt).toLocaleString('ru-RU')}
                          </span>
                          {canDelete(reply) && (
                            <button
                              onClick={() => setDeleteConfirm({ isOpen: true, commentId: reply.id })}
                              className="text-red-600 hover:text-red-700 transition-colors flex items-center gap-1"
                            >
                              <Trash2 size={12} />
                              <span>Удалить</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-6 border-t border-neutral-200 gap-4">
              <div className="text-sm text-neutral-600">
                Показано {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} из {pagination.total} комментариев
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                  title="Предыдущая страница"
                >
                  <ChevronLeft size={16} />
                  <span className="hidden sm:inline">Назад</span>
                </button>
                <div className="flex items-center gap-1 px-3 py-2 bg-primary-50 rounded-lg border border-primary-200">
                  <span className="text-sm font-semibold text-primary-700">
                    {pagination.page}
                  </span>
                  <span className="text-sm text-primary-500">/</span>
                  <span className="text-sm text-primary-600">
                    {pagination.totalPages}
                  </span>
                </div>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!pagination.hasMore}
                  className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                  title="Следующая страница"
                >
                  <span className="hidden sm:inline">Вперед</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, commentId: null })}
        onConfirm={() => {
          if (deleteConfirm.commentId) {
            deleteCommentMutation.mutate(deleteConfirm.commentId);
          }
        }}
        title="Удалить комментарий"
        message="Вы уверены, что хотите удалить этот комментарий? Это действие нельзя отменить."
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
      />
    </div>
  );
}

