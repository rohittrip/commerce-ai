import axios from 'axios';
import type { Cart, ChatMessageRow, ToolResponse } from '@/types';

const api = axios.create({
  baseURL: '/v1',
  headers: { 
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  withCredentials: true, // Enable cookie handling
});

export const setAuthToken = (token?: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

// Logout API Response Type
export interface LogoutResponse {
  message: string;
  data: { success: boolean };
}

// Logout API - clears auth cookie
export const logout = async (): Promise<LogoutResponse> => {
  const response = await api.post('/mobile/logout');
  // Clear any stored auth token
  delete api.defaults.headers.common.Authorization;
  return response.data as LogoutResponse;
};

export const login = async (username: string, password: string) => {
  const response = await api.post('/auth/login', { username, password });
  return response.data as { accessToken: string; user: { id: string; username: string; role: string } };
};

// OTP Authentication APIs
export interface OtpRequestResponse {
  data: {
    otpRequestId: string;
    expiresInSec: number;
    resendAvailableInSec: number;
  };
  meta: { requestId: string };
  error: string | null;
}

export interface OtpVerifyResponse {
  data: {
    user: {
      userId: string;
      name: string;
      phone: { countryCode: string; number: string };
      isNewUser: boolean;
    };
    upgradedChatSessionIds?: string[];
  };
  meta: { requestId: string };
  error: string | null;
}

export const requestOtp = async (
  phoneCountry: string, 
  phoneNumber: string,
  channel: string = 'sms',
  purpose: string = 'LOGIN'
): Promise<OtpRequestResponse> => {
  const deviceId = getOrCreateDeviceId();
  const response = await api.post('/auth/otp/request', { 
    phone: {
      countryCode: phoneCountry,
      number: phoneNumber,
    },
    channel,
    purpose,
    device: {
      deviceId,
      platform: 'web',
    },
  });
  return response.data;
};

export const verifyOtp = async (
  otpRequestId: string, 
  otp: string
): Promise<OtpVerifyResponse> => {
  const deviceId = getOrCreateDeviceId();
  const response = await api.post('/auth/otp/verify', { 
    otpRequestId,
    otp,
    device: {
      deviceId,
    },
  });
  return response.data;
};

// Legacy OTP APIs (kept for backward compatibility)
export const generateOtp = async (phoneCountry: string, phoneNumber: string) => {
  const result = await requestOtp(phoneCountry, phoneNumber);
  return { 
    success: !result.error, 
    message: result.error || 'OTP sent successfully',
    otpRequestId: result.data?.otpRequestId,
  };
};

export const validateOtp = async (phoneCountry: string, phoneNumber: string, otp: string, otpRequestId?: string) => {
  if (!otpRequestId) {
    throw new Error('OTP request ID is required');
  }
  const result = await verifyOtp(otpRequestId, otp);
  // Token is set in HTTP-only cookie by the server, not returned in response
  return { 
    accessToken: '', // Token is in cookie, not needed here
    sessionId: '', 
    userId: result.data.user.userId, 
    phoneCountry: result.data.user.phone.countryCode,
    phoneNumber: result.data.user.phone.number,
    isNewUser: result.data.user.isNewUser,
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
 * Get or create device ID (creates one if not exists)
 */
const getOrCreateDeviceId = (): string => {
  if (typeof window === 'undefined') return 'server-' + Math.random().toString(36).slice(2);
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = 'web-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
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
 * @param isAuthenticated - Whether user is authenticated (uses cookie auth)
 */
export const getSessions = async (isAuthenticated: boolean = false): Promise<SessionInfo[]> => {
  if (isAuthenticated) {
    // For authenticated users, fetch their sessions (uses HTTP-only cookie)
    try {
      const response = await api.get('/mobile/sessions');
      const sessions = response.data as { sessionId: string; createdAt: string; lastActiveAt?: string }[];
      return sessions.map(s => ({
        id: s.sessionId,
        created_at: s.createdAt,
        last_active_at: s.lastActiveAt || s.createdAt,
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

export interface MessagesResponse {
  messages: ChatMessageRow[];
  hasMore: boolean;
  oldestTimestamp: string | null;
}

export const getMessages = async (sessionId: string, limit: number = 10, before?: string): Promise<MessagesResponse> => {
  const params = new URLSearchParams();
  params.append('limit', limit.toString());
  if (before) {
    params.append('before', before);
  }
  const response = await api.get(`/chat/sessions/${sessionId}/messages?${params.toString()}`);
  return response.data as MessagesResponse;
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
    'ngrok-skip-browser-warning': 'true',
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
    credentials: 'include', // Include cookies in the request
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

// Address Types
export interface AddressFields {
  fullName: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

// Address type enum
export type AddressType = 'home' | 'work' | 'other';

// Single address entry
export interface AddressEntry {
  addressId: string;
  type: AddressType;
  label?: string;
  isDefault: boolean;
  address: AddressFields;
  createdAt: string;
  updatedAt: string;
}

// Legacy address data (backward compatibility)
export interface AddressData {
  shipping: AddressFields;
  billing: AddressFields;
}

// Address API Response Types
export interface AddressResponse {
  message: string;
  data: AddressData | null;
}

export interface AddressListResponse {
  message: string;
  data: AddressEntry[];
}

export interface AddressEntryResponse {
  message: string;
  data: AddressEntry;
}

// ==================== Multiple Addresses APIs ====================

/**
 * Get all addresses for the current user
 */
export const getAllAddresses = async (): Promise<AddressEntry[]> => {
  try {
    const response = await api.get('/mobile/addresses');
    const result = response.data as AddressListResponse;
    return result.data || [];
  } catch {
    return [];
  }
};

/**
 * Get a specific address by ID
 */
export const getAddressById = async (addressId: string): Promise<AddressEntry | null> => {
  try {
    const response = await api.get(`/mobile/addresses/${addressId}`);
    const result = response.data as AddressEntryResponse;
    return result.data;
  } catch {
    return null;
  }
};

/**
 * Add a new address
 */
export const addAddress = async (
  type: AddressType,
  address: AddressFields,
  label?: string,
  isDefault?: boolean
): Promise<AddressEntry> => {
  const response = await api.post('/mobile/addresses', {
    type,
    label,
    isDefault,
    address,
  });
  const result = response.data as AddressEntryResponse;
  return result.data;
};

/**
 * Update an existing address
 */
export const updateAddress = async (
  addressId: string,
  updates: {
    type?: AddressType;
    label?: string;
    isDefault?: boolean;
    address?: Partial<AddressFields>;
  }
): Promise<AddressEntry> => {
  const response = await api.put(`/mobile/addresses/${addressId}`, updates);
  const result = response.data as AddressEntryResponse;
  return result.data;
};

/**
 * Delete an address
 */
export const deleteAddress = async (addressId: string): Promise<{ success: boolean }> => {
  const response = await api.delete(`/mobile/addresses/${addressId}`);
  return response.data.data;
};

/**
 * Set an address as default
 */
export const setDefaultAddress = async (addressId: string): Promise<AddressEntry> => {
  const response = await api.post(`/mobile/addresses/${addressId}/default`);
  const result = response.data as AddressEntryResponse;
  return result.data;
};

// ==================== Legacy APIs (backward compatibility) ====================

export const getAddress = async (): Promise<AddressData | null> => {
  try {
    const response = await api.get('/mobile/address');
    const result = response.data as AddressResponse;
    return result.data;
  } catch {
    return null;
  }
};

export const saveAddress = async (
  shipping: AddressFields,
  billing?: AddressFields,
  billingSameAsShipping: boolean = true
): Promise<AddressData> => {
  const response = await api.post('/mobile/address', {
    shipping,
    billing: billingSameAsShipping ? undefined : billing,
    billingSameAsShipping,
  });
  const result = response.data as AddressResponse;
  return result.data as AddressData;
};
