import axios from 'axios';
import type { Cart, ChatMessageRow, ToolResponse } from '@/types';

const api = axios.create({
  baseURL: '/v1',
  headers: { 'Content-Type': 'application/json' },
});

export const setAuthToken = (token?: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const login = async (username: string, password: string) => {
  const response = await api.post('/auth/login', { username, password });
  return response.data as { accessToken: string; user: { id: string; username: string; role: string } };
};

// OTP Authentication APIs
export const generateOtp = async (mobile: string) => {
  const response = await api.post('/mobile/generate-otp', { mobile });
  return response.data as { success: boolean; message: string };
};

export const validateOtp = async (mobile: string, otp: string, guestId?: string) => {
  const deviceId = getDeviceId();
  const response = await api.post('/mobile/validate-otp', { 
    mobile, 
    otp,
    guest_id: guestId || deviceId || undefined,
  });
  return response.data as { 
    accessToken: string; 
    sessionId: string; 
    userId: string; 
    mobile: string;
    upgradedChatSessionIds?: string[];
  };
};

const DEVICE_ID_KEY = 'commerce_ai_device_id';

/**
 * Get or create a device ID for guest session tracking
 */
const getDeviceId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DEVICE_ID_KEY);
};

/**
 * Store device ID in localStorage
 */
const setDeviceId = (deviceId: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
};

export const createSession = async () => {
  const deviceId = getDeviceId();
  const response = await api.post('/chat/sessions', { 
    locale: 'en',
    deviceId: deviceId || undefined, // Send existing deviceId if available
  });
  
  const data = response.data as { sessionId: string; deviceId?: string; isGuest?: boolean };
  
  // Store deviceId if returned (for guest sessions)
  if (data.deviceId && !deviceId) {
    setDeviceId(data.deviceId);
  }
  
  return data;
};

export interface SessionInfo {
  id: string;
  created_at: string;
  last_active_at: string;
  locale: string;
}

/**
 * Get all sessions for the current user or guest device
 */
export const getSessions = async (): Promise<SessionInfo[]> => {
  // Check if user is authenticated (has Authorization header set)
  const hasAuth = !!api.defaults.headers.common.Authorization;
  
  if (hasAuth) {
    // For authenticated users, fetch their sessions
    try {
      const response = await api.get('/mobile/sessions');
      const sessions = response.data as { sessionId: string; createdAt: string }[];
      return sessions.map(s => ({
        id: s.sessionId,
        created_at: s.createdAt,
        last_active_at: s.createdAt,
        locale: 'en',
      }));
    } catch {
      return [];
    }
  }
  
  // For guests, fetch sessions by deviceId
  const deviceId = getDeviceId();
  if (deviceId) {
    try {
      const response = await api.post('/chat/guest/sessions', { deviceId });
      return response.data.sessions || [];
    } catch {
      return [];
    }
  }
  
  return [];
};

/**
 * Get session details
 */
export const getSession = async (sessionId: string) => {
  const response = await api.get(`/chat/sessions/${sessionId}`);
  return response.data as { id: string; user_id?: string; guest_id?: string; session_type: string; locale: string } | null;
};

/**
 * Clear stored device ID (for testing/reset)
 */
export const clearDeviceId = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEVICE_ID_KEY);
  }
};

/**
 * End a chat session
 */
export const endSession = async (sessionId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.post(`/chat/sessions/${sessionId}/end`);
  return response.data;
};

export const getMessages = async (sessionId: string) => {
  const response = await api.get(`/chat/sessions/${sessionId}/messages`);
  return response.data as ChatMessageRow[];
};

export const getCart = async () => {
  const response = await api.get('/cart');
  return response.data as ToolResponse<Cart>;
};

export const addItemToCart = async (productId: string, provider: string, quantity: number) => {
  const response = await api.post('/cart/items', { productId, provider, quantity });
  return response.data as ToolResponse<Cart>;
};

export const updateCartItem = async (productId: string, quantity: number) => {
  const response = await api.patch(`/cart/items/${productId}`, { quantity });
  return response.data as ToolResponse<Cart>;
};

export const removeCartItem = async (productId: string) => {
  const response = await api.delete(`/cart/items/${productId}`);
  return response.data as ToolResponse<Cart>;
};

export type StreamHandler = (event: any) => void;

export const streamChat = async (
  token: string | null,
  sessionId: string,
  message: string,
  onEvent: StreamHandler,
  signal?: AbortSignal,
) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Only add Authorization header if token is provided (authenticated user)
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch('/v1/chat/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({ sessionId, message }),
    signal,
  });

  if (!response.ok || !response.body) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to start stream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lastDataTime = Date.now();
  const WATCHDOG_TIMEOUT = 30000; // 30 seconds

  // Watchdog timer to detect stalled streams
  const watchdog = setInterval(() => {
    const elapsed = Date.now() - lastDataTime;
    if (elapsed > WATCHDOG_TIMEOUT) {
      clearInterval(watchdog);
      reader.cancel();
      onEvent({ type: 'error', error: 'Stream timeout - no data received' });
      onEvent({ type: 'done' });
    }
  }, 5000);

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      lastDataTime = Date.now();
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const chunk of parts) {
        const lines = chunk.split('\n');
        const dataLines = lines.filter(line => line.startsWith('data:'));
        if (!dataLines.length) continue;
        const payload = dataLines.map(line => line.replace(/^data:\s?/, '')).join('');
        try {
          const event = JSON.parse(payload);
          // Ignore ping/ack events
          if (event.type === 'ping' || event.type === 'ack') {
            continue;
          }
          onEvent(event);
        } catch {
          onEvent({ type: 'error', error: 'Invalid stream payload' });
        }
      }
    }
  } finally {
    clearInterval(watchdog);
  }
};
