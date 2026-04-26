import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import io from 'socket.io-client';

let socket = null;

export function useVouchNotification() {
  const { user } = useAuth();
  const [vouchPrompt, setVouchPrompt] = useState(null);
  const [reputationUpdate, setReputationUpdate] = useState(null);

  useEffect(() => {
    if (!user) return;

    // Initialize Socket.io connection if not already connected
    if (!socket) {
      socket = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000', {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket'],
        auth: {
          token: localStorage.getItem('token'),
        },
      });

      // Register user with Socket.io
      socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        if (user?._id) {
          socket.emit('register', user._id);
        }
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });
    }

    // Listen for vouch prompt event
    socket.on('vouch_prompt', (data) => {
      console.log('Vouch prompt received:', data);
      setVouchPrompt(data);
      // Auto-dismiss after 30 seconds if not interacted
      setTimeout(() => {
        setVouchPrompt(null);
      }, 30000);
    });

    // Listen for reputation updates
    socket.on('reputation_updated', (data) => {
      console.log('Reputation updated:', data);
      setReputationUpdate(data);
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setReputationUpdate(null);
      }, 5000);
    });

    // Register user when component mounts or user changes
    if (user?._id) {
      socket.emit('register', user._id);
    }

    return () => {
      // Note: We don't disconnect here as other hooks might still need it
    };
  }, [user]);

  const dismissVouchPrompt = useCallback(() => {
    setVouchPrompt(null);
  }, []);

  const dismissReputationUpdate = useCallback(() => {
    setReputationUpdate(null);
  }, []);

  return {
    vouchPrompt,
    reputationUpdate,
    dismissVouchPrompt,
    dismissReputationUpdate,
    socket,
  };
}

export function getSocket() {
  return socket;
}
