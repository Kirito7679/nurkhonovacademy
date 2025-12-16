import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import { ApiResponse, Message, ApiError } from '../types';
import { Send, ArrowLeft, Loader2, Paperclip, X, Download, File, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { API_BASE_URL } from '../utils/constants';
import ErrorModal from '../components/ErrorModal';

export default function Chat() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ file: File; url: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileUploadProgress, setFileUploadProgress] = useState<{ fileName: string; progress: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  const { data: teacherResponse } = useQuery(
    ['studentTeacher'],
    async () => {
      const response = await api.get<ApiResponse<{
        id: string;
        firstName: string;
        lastName: string;
        avatarUrl?: string | null;
      } | null>>('/messages/student/teacher');
      return response.data.data;
    }
  );

  const teacher = teacherResponse;

  const { data: chatResponse, isLoading } = useQuery(
    ['chat', teacher?.id],
    async () => {
      if (!teacher?.id) return null;
      const response = await api.get<ApiResponse<{
        user: {
          id: string;
          firstName: string;
          lastName: string;
          avatarUrl?: string | null;
        };
        messages: Message[];
      }>>(`/messages/chat/${teacher.id}`);
      return response.data.data;
    },
    { 
      enabled: !!teacher?.id, 
      refetchInterval: 10000, // Увеличено до 10 секунд чтобы не превышать rate limit
      refetchOnWindowFocus: false,
    }
  );

  const uploadFileMutation = useMutation(
    async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post<ApiResponse<{
        fileUrl: string;
        fileName: string;
        fileSize: number;
      }>>('/messages/upload-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setFileUploadProgress({ fileName: file.name, progress });
          }
        },
      });
      return response.data.data;
    }
  );

  const sendMessageMutation = useMutation(
    async (data: { content: string; fileUrl?: string; fileName?: string; fileSize?: number }) => {
      if (!teacher?.id) throw new Error('Учитель не найден');
      const response = await api.post<ApiResponse<Message>>('/messages/send', {
        receiverId: teacher.id,
        ...data,
      });
      return response.data.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['chat', teacher?.id]);
        setMessage('');
        setSelectedFile(null);
        setFileUploadProgress(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // Сброс высоты textarea после отправки
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      },
    }
  );

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Сбрасываем высоту для правильного расчета scrollHeight
      textarea.style.height = 'auto';
      // Устанавливаем новую высоту на основе содержимого, но не больше максимума
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Небольшая задержка для правильного расчета высоты
    setTimeout(() => adjustTextareaHeight(), 0);
  };

  // Начальная настройка высоты при монтировании
  useEffect(() => {
    if (textareaRef.current) {
      adjustTextareaHeight();
    }
  }, [teacher?.id, adjustTextareaHeight]);

  // Автоматическое изменение высоты при изменении сообщения
  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatResponse?.messages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      setErrorModal({
        isOpen: true,
        message: 'Размер файла не должен превышать 50MB',
      });
      return;
    }

    setUploadingFile(true);
    setFileUploadProgress({ fileName: file.name, progress: 0 });
    try {
      const fileData = await uploadFileMutation.mutateAsync(file);
      setSelectedFile({
        file,
        url: fileData.fileUrl,
      });
      setFileUploadProgress(null);
    } catch (error: ApiError) {
      setErrorModal({
        isOpen: true,
        message: error.response?.data?.message || 'Ошибка при загрузке файла',
      });
      setFileUploadProgress(null);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !selectedFile) || sendMessageMutation.isLoading) return;

    const payload: { content: string; fileUrl?: string; fileName?: string; fileSize?: number } = {
      content: message.trim() || (selectedFile ? '📎 Файл' : ''),
    };

    if (selectedFile) {
      payload.fileUrl = selectedFile.url;
      payload.fileName = selectedFile.file.name;
      payload.fileSize = selectedFile.file.size;
    }

    sendMessageMutation.mutate(payload);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return <File className="h-4 w-4" />;
  };

  if (!teacher) {
    return (
      <div className="text-center py-12 animate-fade-scale">
        <p className="text-neutral-600 mb-4">У вас пока нет преподавателя</p>
        <p className="text-sm text-neutral-500">
          После одобрения доступа к курсу вы сможете общаться с преподавателем
        </p>
      </div>
    );
  }

  const messages = chatResponse?.messages || [];
  const chatUser = chatResponse?.user || teacher;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-scale">
      {/* Chat Header */}
      <div className="card p-4 mb-4 flex items-center gap-3 border-b-2 border-primary-200 bg-gradient-to-r from-white to-blue-50/30 shadow-sm">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2.5 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 active:scale-95"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          {chatUser.avatarUrl ? (
            <img
              src={chatUser.avatarUrl}
              alt={`${chatUser.firstName} ${chatUser.lastName}`}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-primary-200 shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-md ring-2 ring-primary-200">
              {chatUser.firstName[0]}
            </div>
          )}
          <div>
            <h2 className="font-semibold text-neutral-900 text-lg">
              {chatUser.firstName} {chatUser.lastName}
            </h2>
            <p className="text-xs text-neutral-600 font-medium">Преподаватель</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 px-4 bg-gradient-to-b from-neutral-50/50 to-white">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-neutral-300 animate-pulse" />
            <p className="text-lg font-medium">Начните общение с преподавателем</p>
            <p className="text-sm mt-2">Отправьте первое сообщение</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwnMessage = msg.senderId === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-slide-in`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div
                  className={`max-w-[75%] md:max-w-[65%] chat-message-bubble ${
                    isOwnMessage ? 'chat-message-bubble-own' : 'chat-message-bubble-other'
                  }`}
                >
                  {msg.fileUrl && (
                    <a
                      href={msg.fileUrl.startsWith('http') ? msg.fileUrl : `${API_BASE_URL.replace('/api', '')}${msg.fileUrl}`}
                      download={msg.fileName}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 mb-2 p-2.5 rounded-xl transition-all duration-200 hover:scale-[1.02] ${
                        isOwnMessage
                          ? 'bg-white/20 hover:bg-white/30'
                          : 'bg-primary-50 hover:bg-primary-100'
                      }`}
                    >
                      {getFileIcon(msg.fileName || '')}
                      <span className="text-sm font-medium flex-1 truncate">{msg.fileName}</span>
                      {msg.fileSize && (
                        <span className={`text-xs ${isOwnMessage ? 'text-white/80' : 'text-neutral-600'}`}>
                          {formatFileSize(msg.fileSize)}
                        </span>
                      )}
                      <Download className={`h-4 w-4 ${isOwnMessage ? 'text-white' : 'text-primary-600'}`} />
                    </a>
                  )}
                  {msg.content && (
                    <p className="text-[0.9375rem] leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                  )}
                  <p className={`text-xs mt-2 ${isOwnMessage ? 'text-white/80' : 'text-neutral-500'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSubmit} className="chat-input-container">
        {fileUploadProgress && !selectedFile && (
          <FileUploadProgress
            fileName={fileUploadProgress.fileName}
            progress={fileUploadProgress.progress}
            onCancel={() => {
              setUploadingFile(false);
              setFileUploadProgress(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
        )}
        {selectedFile && !fileUploadProgress && (
          <div className="mb-3 flex items-center gap-3 p-3 bg-gradient-to-r from-primary-50 to-primary-50 rounded-xl border-2 border-primary-200 animate-slide-in">
            <File className="h-5 w-5 text-primary-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-neutral-900 truncate">{selectedFile.file.name}</p>
              <p className="text-xs text-neutral-600 mt-0.5">{formatFileSize(selectedFile.file.size)}</p>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="p-1.5 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 md:gap-3">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            id="file-input"
            disabled={uploadingFile}
          />
          <label
            htmlFor="file-input"
            className="chat-attach-btn"
          >
            {uploadingFile ? (
              <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5 md:h-6 md:w-6" />
            )}
          </label>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            placeholder=""
            className="chat-textarea flex-1"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            onInput={adjustTextareaHeight}
          />
          <button
            type="submit"
            disabled={(!message.trim() && !selectedFile) || sendMessageMutation.isLoading || uploadingFile}
            className="chat-send-btn"
          >
            {sendMessageMutation.isLoading ? (
              <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin" />
            ) : (
              <Send className="h-5 w-5 md:h-6 md:w-6" />
            )}
          </button>
        </div>
      </form>

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        message={errorModal.message}
      />
    </div>
  );
}

