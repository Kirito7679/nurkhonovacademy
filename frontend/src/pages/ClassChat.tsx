import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { ApiResponse, ApiError } from '../types';
import { Send, ArrowLeft, Loader2, Paperclip, X, Download, File, MessageSquare, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../utils/constants';
import ErrorModal from '../components/ErrorModal';
import { useSocket } from '../hooks/useSocket';

interface ClassMessage {
  id: string;
  classId: string;
  senderId: string;
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    role: string;
  };
}

interface ClassChatData {
  class: {
    id: string;
    name: string;
    teacher: {
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl?: string | null;
    };
  };
  messages: ClassMessage[];
}

export default function ClassChat() {
  const { id: classId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ file: File; url: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
  const { socket, isConnected } = useSocket();

  const { data: chatData, isLoading } = useQuery(
    ['classChat', classId],
    async () => {
      if (!classId) return null;
      const response = await api.get<ApiResponse<ClassChatData>>(`/classes/${classId}/messages`);
      return response.data.data;
    },
    { enabled: !!classId }
  );

  // Подключиться к Socket.IO комнате класса
  useEffect(() => {
    if (socket && isConnected && classId) {
      socket.emit('join-class-chat', classId);

      const handleNewMessage = (newMessage: ClassMessage) => {
        queryClient.setQueryData(['classChat', classId], (oldData: ClassChatData | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            messages: [...oldData.messages, newMessage],
          };
        });
      };

      const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
        queryClient.setQueryData(['classChat', classId], (oldData: ClassChatData | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            messages: oldData.messages.filter((msg) => msg.id !== messageId),
          };
        });
      };

      socket.on('new-class-message', handleNewMessage);
      socket.on('class-message-deleted', handleMessageDeleted);

      return () => {
        socket.emit('leave-class-chat', classId);
        socket.off('new-class-message', handleNewMessage);
        socket.off('class-message-deleted', handleMessageDeleted);
      };
    }
  }, [socket, isConnected, classId, queryClient]);

  // Автопрокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatData?.messages]);

  const sendMessageMutation = useMutation(
    async (data: { content: string; fileUrl?: string; fileName?: string; fileSize?: number }) => {
      const response = await api.post<ApiResponse<ClassMessage>>(`/classes/${classId}/messages`, data);
      return response.data.data;
    },
    {
      onSuccess: () => {
        setMessage('');
        setSelectedFile(null);
        queryClient.invalidateQueries(['classChat', classId]);
      },
      onError: (err: ApiError) => {
        setErrorModal({
          isOpen: true,
          message: err.response?.data?.message || 'Ошибка при отправке сообщения',
        });
      },
    }
  );

  const deleteMessageMutation = useMutation(
    async (messageId: string) => {
      await api.delete(`/classes/messages/${messageId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['classChat', classId]);
      },
      onError: (err: ApiError) => {
        setErrorModal({
          isOpen: true,
          message: err.response?.data?.message || 'Ошибка при удалении сообщения',
        });
      },
    }
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка размера файла (макс 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorModal({
        isOpen: true,
        message: 'Размер файла не должен превышать 10MB',
      });
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post<ApiResponse<{ fileUrl: string; fileName: string; fileSize: number }>>(
        '/messages/upload-file',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.data) {
        setSelectedFile({
          file,
          url: response.data.data.fileUrl,
        });
      }
    } catch (err: any) {
      setErrorModal({
        isOpen: true,
        message: err.response?.data?.message || 'Ошибка при загрузке файла',
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSend = () => {
    if (!message.trim() && !selectedFile) return;

    const messageData: any = {
      content: message.trim() || 'Файл',
    };

    if (selectedFile) {
      messageData.fileUrl = selectedFile.url;
      messageData.fileName = selectedFile.file.name;
      messageData.fileSize = selectedFile.file.size;
    }

    sendMessageMutation.mutate(messageData);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canDeleteMessage = (message: ClassMessage) => {
    return (
      message.senderId === user?.id ||
      user?.role === 'ADMIN' ||
      (user?.role === 'TEACHER' && chatData?.class.teacher.id === user?.id)
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} ч назад`;

    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-neutral-600">Загрузка чата...</p>
        </div>
      </div>
    );
  }

  if (!chatData) {
    return (
      <div className="card p-12 text-center">
        <h3 className="text-xl font-semibold text-neutral-700 mb-2">Чат не найден</h3>
        <button onClick={() => navigate('/teacher/classes')} className="btn-primary mt-4">
          Вернуться к классам
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-neutral-200">
        <button
          onClick={() => navigate(`/classes/${classId}`)}
          className="p-2 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-neutral-900">{chatData.class.name}</h1>
          <p className="text-sm text-neutral-600">
            Групповой чат • {chatData.messages.length} сообщений
          </p>
        </div>
        {!isConnected && (
          <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
            Подключение...
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {chatData.messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600">Нет сообщений. Начните общение!</p>
          </div>
        ) : (
          chatData.messages.map((msg) => {
            const isOwnMessage = msg.senderId === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    {msg.sender.avatarUrl ? (
                      <img
                        src={msg.sender.avatarUrl}
                        alt={`${msg.sender.firstName} ${msg.sender.lastName}`}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-primary-600 font-semibold text-sm">
                        {msg.sender.firstName[0]}
                        {msg.sender.lastName[0]}
                      </span>
                    )}
                  </div>
                </div>
                <div className={`flex-1 ${isOwnMessage ? 'items-end' : ''} flex flex-col`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-neutral-900">
                      {msg.sender.firstName} {msg.sender.lastName}
                    </span>
                    {msg.sender.role === 'TEACHER' || msg.sender.role === 'ADMIN' ? (
                      <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded">
                        Преподаватель
                      </span>
                    ) : null}
                    <span className="text-xs text-neutral-500">{formatTime(msg.createdAt)}</span>
                  </div>
                  <div
                    className={`rounded-lg p-3 ${
                      isOwnMessage
                        ? 'bg-primary-600 text-white'
                        : 'bg-neutral-100 text-neutral-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    {msg.fileUrl && (
                      <div className="mt-2">
                        <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm hover:underline"
                        >
                          <File className="h-4 w-4" />
                          <span>{msg.fileName || 'Файл'}</span>
                          {msg.fileSize && (
                            <span className="text-xs opacity-75">
                              ({(msg.fileSize / 1024).toFixed(1)} KB)
                            </span>
                          )}
                        </a>
                      </div>
                    )}
                  </div>
                  {canDeleteMessage(msg) && (
                    <button
                      onClick={() => deleteMessageMutation.mutate(msg.id)}
                      className="mt-1 text-xs text-red-600 hover:text-red-700 self-start"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="mb-2 p-3 bg-neutral-50 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <File className="h-5 w-5 text-primary-600" />
            <span className="text-sm text-neutral-700">{selectedFile.file.name}</span>
            <span className="text-xs text-neutral-500">
              ({(selectedFile.file.size / 1024).toFixed(1)} KB)
            </span>
          </div>
          <button
            onClick={() => setSelectedFile(null)}
            className="text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingFile}
          className="p-2 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors disabled:opacity-50"
        >
          {uploadingFile ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
        />
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Напишите сообщение..."
          rows={1}
          className="flex-1 input-field resize-none"
        />
        <button
          onClick={handleSend}
          disabled={(!message.trim() && !selectedFile) || sendMessageMutation.isLoading}
          className="btn-primary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sendMessageMutation.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </button>
      </div>

      <ErrorModal
        isOpen={errorModal.isOpen}
        message={errorModal.message}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
      />
    </div>
  );
}
