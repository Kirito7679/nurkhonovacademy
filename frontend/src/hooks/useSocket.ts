import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useQueryClient } from 'react-query';

// Get Socket.IO URL from environment or use API_BASE_URL
// Socket.IO doesn't use /api prefix, so we need to remove it if present
const getSocketUrl = (): string => {
  const envApiUrl = import.meta.env.VITE_API_URL;
  const apiBaseUrl = envApiUrl || 'http://localhost:5001/api';
  
  // Remove /api suffix if present, Socket.IO doesn't need it
  const baseUrl = apiBaseUrl.replace(/\/api$/, '');
  
  // If it's still localhost in production, use production API URL
  if (baseUrl.includes('localhost') && window.location.hostname !== 'localhost') {
    return 'https://api.academy.dilmurodnurkhonov.uz';
  }
  
  return baseUrl;
};

const SOCKET_URL = getSocketUrl();

export const useSocket = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    // Connect to socket server
    const socket = io(SOCKET_URL, {
      auth: {
        token,
      },
    });

    socketRef.current = socket;

    // Listen for new notifications
    socket.on('new-notification', () => {
      // Invalidate notifications query to refetch
      queryClient.invalidateQueries('notifications');
    });

    socket.on('connect', () => {
      // Socket connected successfully
    });

    socket.on('disconnect', () => {
      // Socket disconnected
    });

    socket.on('error', (error) => {
      // Handle socket errors silently in production
      if (import.meta.env.DEV) {
        console.error('Socket error:', error);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token, queryClient]);

  return socketRef.current;
};






