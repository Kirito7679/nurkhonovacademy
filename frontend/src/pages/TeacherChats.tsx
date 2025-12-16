import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ApiResponse, ChatUser, Message, ApiError } from '../types';
import { Send, MessageSquare, Loader2, Search, Paperclip, X, Download, File, User, ArrowLeft, Users } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useEffect, useRef } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { API_BASE_URL } from '../utils/constants';
import ErrorModal from '../components/ErrorModal';

export default function TeacherChats() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedChatType, setSelectedChatType] = useState<'PRIVATE' | 'GROUP' | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ file: File; url: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showChatView, setShowChatView] = useState(false); // Для мобильной версии
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  const { data: chatsResponse, isLoading: chatsLoading } = useQuery(
    ['teacherChats', debouncedSearch],
    async () => {
      const params = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : '';
      const response = await api.get<ApiResponse<ChatUser[]>>(`/messages/teacher/chats${params}`);
      return response.data.data || [];
    }
  );

  const chats = chatsResponse || [];

  const { data: chatResponse, isLoading: messagesLoading } = useQuery(
    ['chat', selectedStudentId],
    async () => {
      if (!selectedStudentId) return null;
      const response = await api.get<ApiResponse<{
        user: ChatUser;
        messages: Message[];
      }>>(`/messages/chat/${selectedStudentId}`);
      return response.data.data;
    },
    { 
      enabled: !!selectedStudentId, 
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
      });
      return response.data.data;
    }
  );

  const sendMessageMutation = useMutation(
    async (data: { content: string; fileUrl?: string; fileName?: string; fileSize?: number }) => {
      if (!selectedStudentId) throw new Error('Студент не выбран');
      const response = await api.post<ApiResponse<Message>>('/messages/send', {
        receiverId: selectedStudentId,
        ...data,
      });
      return response.data.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['chat', selectedStudentId]);
        queryClient.invalidateQueries(['teacherChats']);
        setMessage('');
        setSelectedFile(null);
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
    try {
      const fileData = await uploadFileMutation.mutateAsync(file);
      setSelectedFile({
        file,
        url: fileData.fileUrl,
      });
    } catch (error: ApiError) {
      setErrorModal({
        isOpen: true,
        message: error.response?.data?.message || 'Ошибка при загрузке файла',
      });
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

  // Начальная настройка высоты при монтировании и изменении выбранного студента
  useEffect(() => {
    if (textareaRef.current) {
      adjustTextareaHeight();
    }
  }, [selectedStudentId, adjustTextareaHeight]);

  // Автоматическое изменение высоты при изменении сообщения
  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !selectedFile) || sendMessageMutation.isLoading || !selectedStudentId) return;

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

  // Select first chat if available (only if no chat is selected)
  useEffect(() => {
    if (chats.length > 0 && !selectedStudentId && !selectedClassId) {
      const firstChat = chats[0];
      if (firstChat.chatType === 'GROUP' && firstChat.classId) {
        setSelectedChatType('GROUP');
        setSelectedClassId(firstChat.classId);
      } else {
        setSelectedChatType('PRIVATE');
        setSelectedStudentId(firstChat.id);
      }
    }
    // If selected chat is not in filtered list, clear selection
    if ((selectedStudentId || selectedClassId) && chats.length > 0) {
      const found = chats.find(c => 
        (c.chatType === 'PRIVATE' && c.id === selectedStudentId) ||
        (c.chatType === 'GROUP' && c.classId === selectedClassId)
      );
      if (!found) {
        const firstChat = chats[0];
        if (firstChat.chatType === 'GROUP' && firstChat.classId) {
          setSelectedChatType('GROUP');
          setSelectedClassId(firstChat.classId);
          setSelectedStudentId(null);
        } else {
          setSelectedChatType('PRIVATE');
          setSelectedStudentId(firstChat.id);
          setSelectedClassId(null);
        }
      }
    }
  }, [chats, selectedStudentId, selectedClassId]);

  // Handle chat selection - show chat view on mobile
  const handleChatSelect = (chat: ChatUser) => {
    if (chat.chatType === 'GROUP' && chat.classId) {
      setSelectedChatType('GROUP');
      setSelectedClassId(chat.classId);
      setSelectedStudentId(null);
      // Navigate to group chat
      navigate(`/classes/${chat.classId}/chat`);
    } else {
      setSelectedChatType('PRIVATE');
      setSelectedStudentId(chat.id);
      setSelectedClassId(null);
      // На мобильных устройствах показываем чат вместо списка
      if (window.innerWidth < 768) {
        setShowChatView(true);
      }
    }
  };

  // Handle back button - show list view on mobile
  const handleBackToList = () => {
    setShowChatView(false);
  };

  // Reset chat view when window is resized to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setShowChatView(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const selectedChat = chats.find((chat) => 
    (chat.chatType === 'PRIVATE' && chat.id === selectedStudentId) ||
    (chat.chatType === 'GROUP' && chat.classId === selectedClassId)
  );
  const messages = chatResponse?.messages || [];

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] gap-4 animate-fade-scale">
      {/* Students List - скрывается на мобильных при открытом чате */}
      <div className={`w-full md:w-80 card p-0 overflow-hidden flex flex-col ${
        showChatView ? 'hidden md:flex' : 'flex'
      }`}>
        <div className="p-4 border-b border-neutral-200">
          <h2 className="text-lg font-semibold text-neutral-900 mb-3">Чаты</h2>
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск студентов..."
              className="input-field pl-10 w-full"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chatsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
            </div>
          ) : chats.length === 0 ? (
            <div className="text-center py-8 text-neutral-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-neutral-400" />
              <p>{debouncedSearch ? 'Чаты не найдены' : 'Нет чатов'}</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {chats.map((chat, index) => {
                const isSelected = 
                  (chat.chatType === 'PRIVATE' && selectedStudentId === chat.id) ||
                  (chat.chatType === 'GROUP' && selectedClassId === chat.classId);
                
                return (
                  <div
                    key={chat.chatType === 'GROUP' ? `group-${chat.classId}` : chat.id}
                    className={`w-full p-4 hover:bg-gradient-to-r hover:from-primary-50 hover:to-blue-50/50 transition-all duration-200 cursor-pointer group ${
                      isSelected
                        ? 'bg-gradient-to-r from-primary-100 to-blue-100/50 border-l-4 border-primary-500 shadow-sm' 
                        : ''
                    } animate-slide-in`}
                    style={{ animationDelay: `${index * 0.03}s` }}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleChatSelect(chat)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        {chat.chatType === 'GROUP' ? (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-md ring-2 ring-primary-200 group-hover:ring-primary-400 transition-all">
                            <Users className="h-6 w-6" />
                          </div>
                        ) : chat.avatarUrl ? (
                          <img
                            src={chat.avatarUrl}
                            alt={`${chat.firstName} ${chat.lastName}`}
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-primary-200 shadow-sm group-hover:ring-primary-400 transition-all"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-md ring-2 ring-primary-200 group-hover:ring-primary-400 transition-all">
                            {chat.firstName[0]}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-neutral-900 truncate group-hover:text-primary-700 transition-colors">
                              {chat.chatType === 'GROUP' ? chat.className : `${chat.firstName} ${chat.lastName}`}
                            </h3>
                            {chat.unreadCount && chat.unreadCount > 0 && (
                              <span className="bg-gradient-to-br from-primary-500 to-blue-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 shadow-md animate-pulse">
                                {chat.unreadCount}
                              </span>
                            )}
                          </div>
                          {chat.chatType === 'GROUP' && chat.studentCount !== undefined && (
                            <p className="text-xs text-primary-600 mb-1 font-medium">
                              {chat.studentCount} {chat.studentCount === 1 ? 'студент' : 'студентов'}
                            </p>
                          )}
                          {chat.lastMessage ? (
                            <>
                              <p className="text-sm text-neutral-600 truncate group-hover:text-neutral-800 transition-colors">
                                {chat.chatType === 'GROUP' && chat.lastMessage.senderName ? (
                                  <span className="font-medium">{chat.lastMessage.senderName}: </span>
                                ) : null}
                                {chat.lastMessage.content}
                              </p>
                              <p className="text-xs text-neutral-500 mt-1 font-medium">
                                {new Date(chat.lastMessage.createdAt).toLocaleDateString('ru-RU', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-neutral-500 group-hover:text-neutral-700 transition-colors">
                              {chat.chatType === 'GROUP' ? 'Групповой чат' : `Телефон: ${chat.phone}`}
                            </p>
                          )}
                        </div>
                      </button>
                      {chat.chatType === 'PRIVATE' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/teacher/students/${chat.id}`);
                          }}
                          className="p-2.5 text-neutral-600 hover:text-primary-600 hover:bg-primary-100 rounded-xl transition-all duration-200 flex-shrink-0 active:scale-95"
                          title="Открыть профиль студента"
                        >
                          <User className="h-5 w-5" />
                        </button>
                      )}
                      {chat.chatType === 'GROUP' && chat.classId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/classes/${chat.classId}`);
                          }}
                          className="p-2.5 text-neutral-600 hover:text-primary-600 hover:bg-primary-100 rounded-xl transition-all duration-200 flex-shrink-0 active:scale-95"
                          title="Открыть класс"
                        >
                          <Users className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area - показывается на мобильных только при выборе чата */}
      <div className={`flex-1 flex flex-col card p-0 overflow-hidden ${
        showChatView ? 'flex' : 'hidden md:flex'
      }`}>
        {selectedChatType === 'GROUP' && selectedClassId ? (
          <div className="flex-1 flex items-center justify-center text-neutral-500">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-neutral-400" />
              <p className="mb-4">Групповой чат класса</p>
              <button
                onClick={() => navigate(`/classes/${selectedClassId}/chat`)}
                className="btn-primary"
              >
                Открыть групповой чат
              </button>
            </div>
          </div>
        ) : selectedStudentId && selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b-2 border-primary-100 bg-gradient-to-r from-white to-blue-50/30 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3 flex-1">
                {/* Кнопка "Назад" для мобильной версии */}
                <button
                  onClick={handleBackToList}
                  className="md:hidden p-2.5 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 active:scale-95"
                  title="Вернуться к списку"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                {selectedChat.avatarUrl ? (
                  <img
                    src={selectedChat.avatarUrl}
                    alt={`${selectedChat.firstName} ${selectedChat.lastName}`}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-primary-200 shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-lg shadow-md ring-2 ring-primary-200">
                    {selectedChat.firstName[0]}
                  </div>
                )}
                <div>
                  <h2 className="font-semibold text-neutral-900 text-lg">
                    {selectedChat.firstName} {selectedChat.lastName}
                  </h2>
                  <p className="text-xs text-neutral-600 font-medium">Студент</p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/teacher/students/${selectedChat.id}`)}
                className="p-2.5 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all duration-200 active:scale-95"
                title="Открыть профиль студента"
              >
                <User className="h-5 w-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-gradient-to-b from-neutral-50/50 to-white">
              {messagesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-neutral-300 animate-pulse" />
                  <p className="text-lg font-medium">Начните общение со студентом</p>
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
              {selectedFile && (
                <div className="mb-3 flex items-center gap-3 p-3 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border-2 border-primary-200 animate-slide-in">
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
                  id="file-input-teacher"
                  disabled={uploadingFile}
                />
                <label
                  htmlFor="file-input-teacher"
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-neutral-500">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-neutral-400" />
              <p>Выберите студента для начала общения</p>
            </div>
          </div>
        )}
      </div>

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        message={errorModal.message}
      />
    </div>
  );
}

