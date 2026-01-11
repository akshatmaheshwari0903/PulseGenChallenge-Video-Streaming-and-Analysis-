import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const pendingVideoSubscriptionsRef = useRef(new Set());

  useEffect(() => {
    if (isAuthenticated && token) {
      const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const newSocket = io(socketUrl, {
        auth: { token },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);

        // IMPORTANT: if subscribeToVideo was called before the socket connected (very common on Render,
        // and especially for <10s videos), we would miss progress/complete events.
        // Re-subscribe to all pending video rooms on every (re)connect.
        try {
          pendingVideoSubscriptionsRef.current.forEach((videoId) => {
            newSocket.emit('subscribe:video', videoId);
          });
        } catch (e) {
          // ignore
        }
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      // Clean up socket when not authenticated
      setSocket((prevSocket) => {
        if (prevSocket) {
          prevSocket.close();
        }
        return null;
      });
      setConnected(false);
    }
  }, [isAuthenticated, token]);

  const subscribeToVideo = (videoId) => {
    if (!videoId) return;

    // Always record intent to subscribe, even if socket isn't connected yet.
    pendingVideoSubscriptionsRef.current.add(videoId);

    if (socket && connected) {
      socket.emit('subscribe:video', videoId);
    }
  };

  const onVideoProgress = (callback) => {
    if (socket) {
      socket.on('video:progress', callback);
      return () => socket.off('video:progress', callback);
    }
  };

  const onVideoComplete = (callback) => {
    if (socket) {
      socket.on('video:complete', callback);
      return () => socket.off('video:complete', callback);
    }
  };

  const value = {
    socket,
    connected,
    subscribeToVideo,
    onVideoProgress,
    onVideoComplete
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};
