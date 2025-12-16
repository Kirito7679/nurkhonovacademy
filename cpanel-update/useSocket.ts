import { useEffect, useRef, useState } from 'react';
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
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsConnected(false);
      return;
    }

    // Connect to socket server
    const socket = io(SOCKET_URL, {
      auth: {
        token,
      },
    });

    socketRef.current = socket;

    // Listen for new notifications
    socket.on('new-notification', (notification) => {
      // Immediately invalidate and refetch notifications
      queryClient.invalidateQueries('notifications');
      // Also refetch to get updated unread count
      queryClient.refetchQueries('notifications');
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('error', (error) => {
      // Handle socket errors silently in production
      if (import.meta.env.DEV) {
        console.error('Socket error:', error);
      }
    });

    return () => {
      socket.disconnect();
      setIsConnected(false);
    };
  }, [token, queryClient]);

  return {
    socket: socketRef.current,
    isConnected,
  };
};
