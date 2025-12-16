import { create } from 'zustand';
import { User } from '../types';
import i18n from '../i18n/config';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Initialize from localStorage
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  // Set language from user preference or localStorage
  const savedLanguage = localStorage.getItem('i18nextLng');
  if (user?.language && ['ru', 'en', 'uz', 'kk'].includes(user.language)) {
    i18n.changeLanguage(user.language);
    localStorage.setItem('i18nextLng', user.language);
  } else if (savedLanguage && ['ru', 'en', 'uz', 'kk'].includes(savedLanguage)) {
    i18n.changeLanguage(savedLanguage);
  }

  return {
    user,
    token,
    isAuthenticated: !!token && !!user,
    setAuth: (user: User, token: string) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update language if user has preference
      if (user.language && ['ru', 'en', 'uz', 'kk'].includes(user.language)) {
        i18n.changeLanguage(user.language);
        localStorage.setItem('i18nextLng', user.language);
      }
      
      set({ user, token, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, token: null, isAuthenticated: false });
    },
    updateUser: (user: User) => {
      localStorage.setItem('user', JSON.stringify(user));
      
      // Update language if changed
      if (user.language && ['ru', 'en', 'uz', 'kk'].includes(user.language)) {
        i18n.changeLanguage(user.language);
        localStorage.setItem('i18nextLng', user.language);
      }
      
      set({ user });
    },
  };
});

