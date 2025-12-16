import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { ApiResponse, User, ApiError } from '../types';
import { User as UserIcon, Lock, Upload, Camera, Globe } from 'lucide-react';
import SuccessModal from '../components/SuccessModal';
import FileUploadProgress from '../components/FileUploadProgress';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно'),
  lastName: z.string().min(1, 'Фамилия обязательна'),
  phone: z.string().min(10, 'Номер телефона должен содержать минимум 10 символов'),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
  language: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Текущий пароль обязателен'),
  newPassword: z.string().min(6, 'Новый пароль должен содержать минимум 6 символов'),
  confirmPassword: z.string().min(6, 'Подтверждение пароля обязательно'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState<{ fileName: string; progress: number } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalTitle, setSuccessModalTitle] = useState('');
  const [successModalMessage, setSuccessModalMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: userResponse } = useQuery(
    'me',
    async () => {
      const response = await api.get<ApiResponse<User>>('/auth/me');
      return response.data.data;
    },
    { initialData: user || undefined }
  );

  const updateProfileMutation = useMutation(
    async (data: ProfileFormData) => {
      const response = await api.put<ApiResponse<User>>('/auth/me', data);
      return response.data.data;
    },
    {
      onSuccess: (updatedUser) => {
        if (updatedUser) {
          updateUser(updatedUser);
          setSuccessModalTitle('Профиль обновлен');
          setSuccessModalMessage('Профиль успешно обновлен');
          setShowSuccessModal(true);
          setErrorMessage('');
        }
      },
      onError: (err: ApiError) => {
        setErrorMessage(err.response?.data?.message || 'Ошибка при обновлении профиля');
      },
    }
  );

  const changePasswordMutation = useMutation(
    async (data: { currentPassword: string; newPassword: string }) => {
      const response = await api.put<ApiResponse<{ success: boolean }>>('/auth/me/password', data);
      return response.data;
    },
    {
      onSuccess: () => {
        setSuccessModalTitle('Пароль изменен');
        setSuccessModalMessage('Пароль успешно изменен');
        setShowSuccessModal(true);
        setErrorMessage('');
      },
      onError: (err: ApiError) => {
        setErrorMessage(err.response?.data?.message || 'Ошибка при смене пароля');
      },
    }
  );

  const uploadAvatarMutation = useMutation(
    async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await api.post<ApiResponse<User>>('/auth/me/avatar', formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setAvatarUploadProgress({ fileName: file.name, progress });
          }
        },
      });
      return response.data.data;
    },
    {
      onSuccess: (updatedUser) => {
        if (updatedUser) {
          updateUser(updatedUser);
          // Force refetch to get latest data
          queryClient.setQueryData('me', updatedUser);
          queryClient.invalidateQueries('me');
          setSuccessModalTitle('Успешно!');
          setSuccessModalMessage('Фото профиля успешно загружено');
          setShowSuccessModal(true);
          setErrorMessage('');
        }
        setUploadingAvatar(false);
        setAvatarUploadProgress(null);
      },
      onError: (err: any) => {
        setErrorMessage(err.response?.data?.message || 'Ошибка при загрузке фото');
        setUploadingAvatar(false);
        setAvatarUploadProgress(null);
      },
    }
  );

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Разрешены только изображения (JPEG, PNG, GIF, WebP)');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setErrorMessage('Размер файла не должен превышать 5MB');
      return;
    }

    setUploadingAvatar(true);
    setErrorMessage('');
    uploadAvatarMutation.mutate(file);
  };

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: userResponse?.firstName || '',
      lastName: userResponse?.lastName || '',
      phone: userResponse?.phone || '',
      email: userResponse?.email || '',
      language: userResponse?.language || i18n.language || 'ru',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmitProfile = async (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
    // Change language if it was updated
    if (data.language && data.language !== i18n.language) {
      await i18n.changeLanguage(data.language);
      localStorage.setItem('i18nextLng', data.language);
    }
  };

  const onSubmitPassword = (data: PasswordFormData) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    resetPassword();
  };

  return (
    <div className="max-w-2xl">
      <div className="relative mb-8 animate-slide-in">
        <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gradient">
          Профиль
        </h1>
        {userResponse?.coins !== undefined && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-lg">
            <span className="text-2xl">🪙</span>
            <span className="text-lg font-bold text-yellow-700">
              {userResponse.coins} коинов
            </span>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg animate-fade-scale">
          {errorMessage}
        </div>
      )}

      <div className="card p-4 md:p-6 mb-4 md:mb-6 animate-fade-scale" style={{ animationDelay: '0.1s' }}>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4 md:mb-6">
          <div className="relative group">
            <label 
              htmlFor="avatar-upload-input"
              className="flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-primary text-white shadow-soft overflow-hidden cursor-pointer relative"
            >
              {userResponse?.avatarUrl ? (
                <img
                  key={userResponse.avatarUrl} // Force re-render when URL changes
                  src={userResponse.avatarUrl?.startsWith('http') 
                    ? userResponse.avatarUrl 
                    : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://api.academy.dilmurodnurkhonov.uz'}${userResponse.avatarUrl}`}
                  alt={`${userResponse.firstName} ${userResponse.lastName}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Error loading avatar:', userResponse.avatarUrl);
                    // Fallback to icon if image fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                  onLoad={() => {
                    console.log('Avatar loaded successfully:', userResponse.avatarUrl);
                  }}
                />
              ) : (
                <UserIcon className="h-12 w-12" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full pointer-events-none">
                {uploadingAvatar ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Camera className="h-8 w-8 text-white" />
                )}
              </div>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleAvatarChange}
              disabled={uploadingAvatar}
              style={{ 
                position: 'absolute',
                width: 0,
                height: 0,
                opacity: 0,
                overflow: 'hidden',
                zIndex: -1,
                pointerEvents: uploadingAvatar ? 'none' : 'auto'
              }}
              id="avatar-upload-input"
            />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-base md:text-xl font-semibold text-neutral-900 break-words">
              {userResponse?.firstName} {userResponse?.lastName}
            </h2>
            <p className="text-sm md:text-base text-neutral-600 break-words">
              {userResponse?.phone}
            </p>
            {avatarUploadProgress && (
              <div className="mt-2">
                <FileUploadProgress
                  fileName={avatarUploadProgress.fileName}
                  progress={avatarUploadProgress.progress}
                />
              </div>
            )}
            {!avatarUploadProgress && (
              <label
                htmlFor="avatar-upload-input"
                className={`mt-2 flex items-center gap-2 text-sm text-neutral-600 hover:text-primary-600 transition-colors cursor-pointer ${uploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Upload className="h-4 w-4" />
                <span>{uploadingAvatar ? 'Загрузка...' : 'Загрузить фото'}</span>
              </label>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-4">
          <div className="animate-slide-in" style={{ animationDelay: '0.2s' }}>
            <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700 mb-2">
              Имя
            </label>
            <input
              {...registerProfile('firstName')}
              type="text"
              className="input-field"
              placeholder="Введите имя"
            />
            {profileErrors.firstName && (
              <p className="mt-1 text-sm text-red-600">{profileErrors.firstName.message}</p>
            )}
          </div>

          <div className="animate-slide-in" style={{ animationDelay: '0.3s' }}>
            <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700 mb-2">
              Фамилия
            </label>
            <input
              {...registerProfile('lastName')}
              type="text"
              className="input-field"
              placeholder="Введите фамилию"
            />
            {profileErrors.lastName && (
              <p className="mt-1 text-sm text-red-600">{profileErrors.lastName.message}</p>
            )}
          </div>

          <div className="animate-slide-in" style={{ animationDelay: '0.4s' }}>
            <label htmlFor="phone" className="block text-sm font-medium text-neutral-700 mb-2">
              Телефон
            </label>
            <input
              {...registerProfile('phone')}
              type="text"
              className="input-field"
              placeholder="+998901234567"
            />
            {profileErrors.phone && (
              <p className="mt-1 text-sm text-red-600">{profileErrors.phone.message}</p>
            )}
          </div>

          <div className="animate-slide-in" style={{ animationDelay: '0.5s' }}>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
              Email <span className="text-neutral-500 text-xs">(необязательно)</span>
            </label>
            <input
              {...registerProfile('email')}
              type="email"
              className="input-field"
              placeholder="email@example.com"
            />
            {profileErrors.email && (
              <p className="mt-1 text-sm text-red-600">{profileErrors.email.message}</p>
            )}
          </div>

          <div className="animate-slide-in" style={{ animationDelay: '0.55s' }}>
            <label htmlFor="language" className="block text-sm font-medium text-neutral-700 mb-2">
              <Globe className="h-4 w-4 inline mr-2" />
              Язык интерфейса
            </label>
            <select
              {...registerProfile('language')}
              className="input-field"
            >
              <option value="ru">🇷🇺 Русский</option>
              <option value="en">🇺🇸 English</option>
              <option value="uz">🇺🇿 O'zbek</option>
              <option value="kk">🇰🇿 Қазақша</option>
            </select>
            {profileErrors.language && (
              <p className="mt-1 text-sm text-red-600">{profileErrors.language.message}</p>
            )}
          </div>

          <div className="animate-slide-in" style={{ animationDelay: '0.6s' }}>
            <button
              type="submit"
              disabled={updateProfileMutation.isLoading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateProfileMutation.isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⟳</span>
                  <span>Сохранение...</span>
                </span>
              ) : (
                'Сохранить'
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6 animate-fade-scale" style={{ animationDelay: '0.7s' }}>
        <div className="flex items-center mb-6">
          <Lock className="h-6 w-6 text-primary-500 mr-3" />
          <h2 className="text-xl font-semibold text-neutral-900">
            Изменить пароль
          </h2>
        </div>

        <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
          <div className="animate-slide-in" style={{ animationDelay: '0.8s' }}>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-neutral-700 mb-2">
              Текущий пароль
            </label>
            <input
              {...registerPassword('currentPassword')}
              type="password"
              className="input-field"
              placeholder="Введите текущий пароль"
            />
            {passwordErrors.currentPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword.message}</p>
            )}
          </div>

          <div className="animate-slide-in" style={{ animationDelay: '0.9s' }}>
            <label htmlFor="newPassword" className="block text-sm font-medium text-neutral-700 mb-2">
              Новый пароль
            </label>
            <input
              {...registerPassword('newPassword')}
              type="password"
              className="input-field"
              placeholder="Введите новый пароль"
            />
            {passwordErrors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword.message}</p>
            )}
          </div>

          <div className="animate-slide-in" style={{ animationDelay: '1s' }}>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-2">
              Подтвердите новый пароль
            </label>
            <input
              {...registerPassword('confirmPassword')}
              type="password"
              className="input-field"
              placeholder="Повторите новый пароль"
            />
            {passwordErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword.message}</p>
            )}
          </div>

          <div className="animate-slide-in" style={{ animationDelay: '1.1s' }}>
            <button
              type="submit"
              disabled={changePasswordMutation.isLoading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {changePasswordMutation.isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⟳</span>
                  <span>Обновление...</span>
                </span>
              ) : (
                'Изменить пароль'
              )}
            </button>
          </div>
        </form>
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title={successModalTitle}
        message={successModalMessage}
      />
    </div>
  );
}
