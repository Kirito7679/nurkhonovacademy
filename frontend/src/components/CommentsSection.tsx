import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../services/api';
import { ApiResponse, Comment, CommentsResponse } from '../types';
import { useAuthStore } from '../store/authStore';
import { MessageSquare, Send, Trash2, Reply, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { Role } from '../types';
import ConfirmModal from './ConfirmModal';

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
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; commentId: string | null }>({
    isOpen: false,
    commentId: null,
  });

  const { data: commentsResponse, isLoading } = useQuery<ApiResponse<CommentsResponse>>(
    ['comments', lessonId, page],
    async () => {
      const response = await api.get<ApiResponse<CommentsResponse>>(`/comments/lesson/${lessonId}?page=${page}&limit=10`);
      return response.data;
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
    return user.role === Role.TEACHER || user.role === Role.ADMIN;
  };

  return (
    <div className="card p-6 animate-fade-scale" style={{ animationDelay: '0.4s' }}>
      <h2 className="text-2xl font-semibold text-white mb-6 font-mono">
        <span className="text-[#39ff14]">const</span> comments <span className="text-[#39ff14]">=</span>{' '}
        <span className="text-white">[]</span>;
      </h2>

      {/* Comment Form (only for students) */}
      {user?.role === Role.STUDENT && (
        <form onSubmit={handleSubmit(onSubmit)} className="mb-6">
          <div className="flex gap-3">
            <div className="flex-1">
              <textarea
                {...register('content')}
                placeholder="Оставьте комментарий или вопрос..."
                className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent font-mono resize-none"
                rows={3}
              />
              {errors.content && (
                <p className="mt-1 text-sm text-red-400 font-mono">{errors.content.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={createCommentMutation.isLoading}
              className="glow-button px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-black bg-gradient-primary hover:shadow-lg hover:shadow-[#39ff14]/50 transition-all font-mono font-bold h-fit disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </form>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#39ff14]/30 border-t-[#39ff14]"></div>
          <p className="mt-4 text-gray-400 font-mono">loading comments...</p>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-600 mb-4" />
          <p className="text-gray-400 font-mono">
            <span className="text-[#39ff14]">if</span>{' '}
            <span className="text-white">(comments.length === 0)</span>{' '}
            <span className="text-[#39ff14]">return</span>{' '}
            <span className="text-gray-500">'Нет комментариев'</span>;
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="border border-[#374151] rounded-lg p-4 bg-[#1f2937]/30 animate-slide-in"
            >
              {/* Main Comment */}
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-primary text-black flex items-center justify-center font-bold font-mono">
                  {comment.user?.firstName?.[0] || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white font-mono">
                      {comment.user?.firstName} {comment.user?.lastName}
                    </span>
                    {(comment.user?.role === Role.TEACHER || comment.user?.role === Role.ADMIN) && (
                      <span className="text-xs px-2 py-0.5 rounded bg-[#39ff14]/20 text-[#39ff14] border border-[#39ff14]/50 font-mono">
                        teacher
                      </span>
                    )}
                  </div>
                  {editingComment === comment.id ? (
                    <form onSubmit={handleSubmitEdit((data) => onSubmitEdit(data, comment.id))} className="mb-2">
                      <textarea
                        {...registerEdit('content')}
                        className="w-full px-3 py-2 bg-[#1f2937] border border-[#374151] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent font-mono text-sm resize-none"
                        rows={3}
                      />
                      {editErrors.content && (
                        <p className="mt-1 text-xs text-red-400 font-mono">{editErrors.content.message}</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          type="submit"
                          disabled={updateCommentMutation.isLoading}
                          className="px-3 py-1 bg-gradient-primary text-black rounded-lg hover:shadow-lg hover:shadow-[#39ff14]/50 transition-all font-mono text-xs font-bold disabled:opacity-50"
                        >
                          Сохранить
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingComment(null);
                            resetEdit();
                          }}
                          className="px-3 py-1 border border-[#374151] rounded-lg text-gray-400 hover:text-white hover:bg-[#1f2937] transition-all font-mono text-xs"
                        >
                          Отмена
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="text-gray-300 text-sm mb-2 whitespace-pre-wrap">{comment.content}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
                    <span>
                      <span className="text-[#39ff14]">time:</span>{' '}
                      {new Date(comment.createdAt).toLocaleString('ru-RU')}
                    </span>
                    {canEdit(comment) && editingComment !== comment.id && (
                      <button
                        onClick={() => handleStartEdit(comment)}
                        className="text-[#39ff14] hover:text-[#00ff88] transition-colors flex items-center gap-1"
                      >
                        <Edit size={14} />
                        <span>edit()</span>
                      </button>
                    )}
                    {canReply(comment) && (
                      <button
                        onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                        className="text-[#39ff14] hover:text-[#00ff88] transition-colors flex items-center gap-1"
                      >
                        <Reply size={14} />
                        <span>reply()</span>
                      </button>
                    )}
                    {canDelete(comment) && (
                      <button
                        onClick={() => setDeleteConfirm({ isOpen: true, commentId: comment.id })}
                        className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={14} />
                        <span>delete()</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Reply Form */}
              {replyingTo === comment.id && canReply(comment) && (
                <form
                  onSubmit={handleSubmitReply((data) => onSubmitReply(data, comment.id))}
                  className="mt-3 ml-13 border-l-2 border-[#39ff14]/50 pl-4"
                >
                  <div className="flex gap-2">
                    <textarea
                      {...registerReply('content')}
                      placeholder="Ответить..."
                      className="flex-1 px-3 py-2 bg-[#1f2937] border border-[#374151] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent font-mono text-sm resize-none"
                      rows={2}
                    />
                    <button
                      type="submit"
                      disabled={createCommentMutation.isLoading}
                      className="px-4 py-2 bg-gradient-primary text-black rounded-lg hover:shadow-lg hover:shadow-[#39ff14]/50 transition-all font-mono font-bold disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                  {replyErrors.content && (
                    <p className="mt-1 text-xs text-red-400 font-mono">{replyErrors.content.message}</p>
                  )}
                </form>
              )}

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-3 ml-13 space-y-3 border-l-2 border-[#39ff14]/30 pl-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-primary text-black flex items-center justify-center font-bold font-mono text-sm">
                        {reply.user?.firstName?.[0] || 'T'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white font-mono text-sm">
                            {reply.user?.firstName} {reply.user?.lastName}
                          </span>
                          {(reply.user?.role === Role.TEACHER || reply.user?.role === Role.ADMIN) && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-[#39ff14]/20 text-[#39ff14] border border-[#39ff14]/50 font-mono">
                              teacher
                            </span>
                          )}
                        </div>
                        <p className="text-gray-300 text-sm mb-1 whitespace-pre-wrap">{reply.content}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
                          <span>
                            <span className="text-[#39ff14]">time:</span>{' '}
                            {new Date(reply.createdAt).toLocaleString('ru-RU')}
                          </span>
                          {canDelete(reply) && (
                            <button
                              onClick={() => setDeleteConfirm({ isOpen: true, commentId: reply.id })}
                              className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                            >
                              <Trash2 size={12} />
                              <span>delete()</span>
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
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#374151]">
              <div className="text-sm text-gray-400 font-mono">
                <span className="text-[#39ff14]">page</span> {pagination.page} <span className="text-[#39ff14]">of</span> {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 border border-[#374151] rounded-lg text-gray-400 hover:text-white hover:border-[#39ff14] transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ChevronLeft size={16} />
                  <span>prev</span>
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={!pagination.hasMore}
                  className="px-4 py-2 border border-[#374151] rounded-lg text-gray-400 hover:text-white hover:border-[#39ff14] transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <span>next</span>
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

