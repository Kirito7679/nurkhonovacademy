import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useQueryClient } from 'react-query';

const SOCKET_URL = 'http://localhost:5001';

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
      if (process.env.NODE_ENV === 'development') {
        console.error('Socket error:', error);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token, queryClient]);

  return socketRef.current;
};






