import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import { ApiResponse, User } from '../types';
import { User as UserIcon, Lock, Upload, Camera } from 'lucide-react';
import SuccessModal from '../components/SuccessModal';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно'),
  lastName: z.string().min(1, 'Фамилия обязательна'),
  phone: z.string().min(10, 'Номер телефона должен содержать минимум 10 символов'),
  email: z.string().email('Неверный формат email').optional().or(z.literal('')),
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
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
      onError: (err: any) => {
        setErrorMessage(err.response?.data?.message || 'Ошибка при обновлении профиля');
      },
    }
  );

  const changePasswordMutation = useMutation(
    async (data: { currentPassword: string; newPassword: string }) => {
      const response = await api.put<ApiResponse<any>>('/auth/me/password', data);
      return response.data;
    },
    {
      onSuccess: () => {
        setSuccessModalTitle('Пароль изменен');
        setSuccessModalMessage('Пароль успешно изменен');
        setShowSuccessModal(true);
        setErrorMessage('');
      },
      onError: (err: any) => {
        setErrorMessage(err.response?.data?.message || 'Ошибка при смене пароля');
      },
    }
  );

  const uploadAvatarMutation = useMutation(
    async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      
      console.log('Uploading file:', file.name, file.type, file.size);
      
      const response = await api.post<ApiResponse<User>>('/auth/me/avatar', formData);
      return response.data.data;
    },
    {
      onSuccess: (updatedUser) => {
        if (updatedUser) {
          updateUser(updatedUser);
          queryClient.invalidateQueries('me');
          setSuccessModalTitle('Успешно!');
          setSuccessModalMessage('Фото профиля успешно загружено');
          setShowSuccessModal(true);
          setErrorMessage('');
        }
        setUploadingAvatar(false);
      },
      onError: (err: any) => {
        setErrorMessage(err.response?.data?.message || 'Ошибка при загрузке фото');
        setUploadingAvatar(false);
      },
    }
  );

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, file.type, file.size);

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Разрешены только изображения (JPEG, PNG, GIF, WebP)');
      console.error('Invalid file type:', file.type);
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setErrorMessage('Размер файла не должен превышать 5MB');
      console.error('File too large:', file.size);
      return;
    }

    console.log('Starting upload...');
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

  const onSubmitProfile = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const onSubmitPassword = (data: PasswordFormData) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    resetPassword();
  };

  return (
    <div className="max-w-2xl code-bg particle-bg">
      <div className="relative mb-8 animate-slide-in">
        <h1 className="text-2xl md:text-3xl lg:text-5xl font-bold text-gradient neon-glow font-mono">
          <span className="text-[#39ff14]">const</span>{' '}
          <span className="text-white">profile</span>{' '}
          <span className="text-[#39ff14]">=</span>{' '}
          <span className="text-[#00ff88]">user</span>;
        </h1>
        <div className="absolute top-0 right-0 text-xs font-mono text-gray-600 animate-pulse">
          // Profile Settings
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 bg-red-900/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg font-mono animate-fade-scale">
          <span className="text-red-500">error:</span> {errorMessage}
        </div>
      )}

      <div className="card p-4 md:p-6 mb-4 md:mb-6 animate-fade-scale" style={{ animationDelay: '0.1s' }}>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4 md:mb-6">
          <div className="relative group">
            <label 
              htmlFor="avatar-upload-input"
              className="flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-primary text-black shadow-lg shadow-[#39ff14]/50 animate-pulse-glow overflow-hidden cursor-pointer relative"
            >
              {userResponse?.avatarUrl ? (
                <img
                  src={`http://localhost:5001${userResponse.avatarUrl}`}
                  alt={`${userResponse.firstName} ${userResponse.lastName}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to icon if image fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <UserIcon className="h-12 w-12" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full pointer-events-none">
                {uploadingAvatar ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#39ff14] border-t-transparent"></div>
                ) : (
                  <Camera className="h-8 w-8 text-[#39ff14]" />
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
            <h2 className="text-base md:text-xl font-semibold text-white font-mono break-words">
              <span className="text-[#39ff14]">user</span>.<span className="text-white">name</span> = <span className="text-[#00ff88]">'{userResponse?.firstName} {userResponse?.lastName}'</span>
            </h2>
            <p className="text-sm md:text-base text-gray-400 font-mono break-words">
              <span className="text-[#39ff14]">user</span>.<span className="text-white">phone</span> = <span className="text-[#00ff88]">'{userResponse?.phone}'</span>
            </p>
            <label
              htmlFor="avatar-upload-input"
              className={`mt-2 flex items-center gap-2 text-sm text-gray-400 hover:text-[#39ff14] transition-colors font-mono cursor-pointer ${uploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Upload className="h-4 w-4" />
              <span>{uploadingAvatar ? 'Загрузка...' : 'Загрузить фото'}</span>
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmitProfile(onSubmitProfile)} className="space-y-4">
          <div className="animate-slide-in" style={{ animationDelay: '0.2s' }}>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-2 font-mono">
              <span className="text-[#39ff14]">const</span> firstName <span className="text-[#00ff88]">=</span> <span className="text-gray-500">''</span>;
            </label>
            <input
              {...registerProfile('firstName')}
              type="text"
              className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
              placeholder="'Имя'"
            />
            {profileErrors.firstName && (
              <p className="mt-1 text-sm text-red-400 font-mono">{profileErrors.firstName.message}</p>
            )}
          </div>

          <div className="animate-slide-in" style={{ animationDelay: '0.3s' }}>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2 font-mono">
              <span className="text-[#39ff14]">const</span> lastName <span className="text-[#00ff88]">=</span> <span className="text-gray-500">''</span>;
            </label>
            <input
              {...registerProfile('lastName')}
              type="text"
              className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
              placeholder="'Фамилия'"
            />
            {profileErrors.lastName && (
              <p className="mt-1 text-sm text-red-400 font-mono">{profileErrors.lastName.message}</p>
            )}
          </div>

          <div className="animate-slide-in" style={{ animationDelay: '0.4s' }}>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2 font-mono">
              <span className="text-[#39ff14]">const</span> phone <span className="text-[#00ff88]">=</span> <span className="text-gray-500">''</span>;
            </label>
            <input
              {...registerProfile('phone')}
              type="text"
              className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
              placeholder="'+998901234567'"
            />
            {profileErrors.phone && (
              <p className="mt-1 text-sm text-red-400 font-mono">{profileErrors.phone.message}</p>
            )}
          </div>

          <div className="animate-slide-in" style={{ animationDelay: '0.5s' }}>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2 font-mono">
              <span className="text-[#39ff14]">const</span> email <span className="text-[#00ff88]">=</span> <span className="text-gray-500">null</span>; <span className="text-gray-600">// optional</span>
            </label>
            <input
              {...registerProfile('email')}
              type="email"
              className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
              placeholder="'email@example.com'"
            />
            {profileErrors.email && (
              <p className="mt-1 text-sm text-red-400 font-mono">{profileErrors.email.message}</p>
            )}
          </div>

          <div className="animate-slide-in" style={{ animationDelay: '0.6s' }}>
            <button
              type="submit"
              disabled={updateProfileMutation.isLoading}
              className="glow-button w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-gradient-primary hover:shadow-lg hover:shadow-[#39ff14]/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#39ff14] disabled:opacity-50 transition-all duration-200 font-mono font-bold relative z-10"
            >
              {updateProfileMutation.isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⟳</span>
                  <span>saving...</span>
                </span>
              ) : (
                <span>save()</span>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="card p-6 animate-fade-scale" style={{ animationDelay: '0.7s' }}>
        <div className="flex items-center mb-6">
          <div className="relative">
            <Lock className="h-6 w-6 text-[#39ff14] mr-3 animate-pulse-glow" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-[#39ff14] rounded-full animate-ping"></span>
          </div>
          <h2 className="text-xl font-semibold text-white font-mono">
            <span className="text-[#39ff14]">function</span> <span className="text-white">changePassword()</span>
          </h2>
        </div>

        <form onSubmit={handleSubmitPassword(onSubmitPassword)} className="space-y-4">
          <div className="animate-slide-in" style={{ animationDelay: '0.8s' }}>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300 mb-2 font-mono">
              <span className="text-[#39ff14]">const</span> currentPassword <span className="text-[#00ff88]">=</span> <span className="text-gray-500">''</span>;
            </label>
            <input
              {...registerPassword('currentPassword')}
              type="password"
              className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
              placeholder="••••••••"
            />
            {passwordErrors.currentPassword && (
              <p className="mt-1 text-sm text-red-400 font-mono">{passwordErrors.currentPassword.message}</p>
            )}
          </div>

          <div className="animate-slide-in" style={{ animationDelay: '0.9s' }}>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2 font-mono">
              <span className="text-[#39ff14]">const</span> newPassword <span className="text-[#00ff88]">=</span> <span className="text-gray-500">''</span>;
            </label>
            <input
              {...registerPassword('newPassword')}
              type="password"
              className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
              placeholder="••••••••"
            />
            {passwordErrors.newPassword && (
              <p className="mt-1 text-sm text-red-400 font-mono">{passwordErrors.newPassword.message}</p>
            )}
          </div>

          <div className="animate-slide-in" style={{ animationDelay: '1s' }}>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2 font-mono">
              <span className="text-[#39ff14]">const</span> confirmPassword <span className="text-[#00ff88]">=</span> <span className="text-gray-500">''</span>;
            </label>
            <input
              {...registerPassword('confirmPassword')}
              type="password"
              className="w-full px-4 py-3 bg-[#1f2937] border border-[#374151] text-gray-100 placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39ff14] focus:border-transparent transition-all font-mono hover:border-[#39ff14]/50"
              placeholder="••••••••"
            />
            {passwordErrors.confirmPassword && (
              <p className="mt-1 text-sm text-red-400 font-mono">{passwordErrors.confirmPassword.message}</p>
            )}
          </div>

          <div className="animate-slide-in" style={{ animationDelay: '1.1s' }}>
            <button
              type="submit"
              disabled={changePasswordMutation.isLoading}
              className="glow-button w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-black bg-gradient-primary hover:shadow-lg hover:shadow-[#39ff14]/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#39ff14] disabled:opacity-50 transition-all duration-200 font-mono font-bold relative z-10"
            >
              {changePasswordMutation.isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⟳</span>
                  <span>updating...</span>
                </span>
              ) : (
                <span>updatePassword()</span>
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

