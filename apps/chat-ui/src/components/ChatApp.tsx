import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppBar,
  Badge,
  Box,
  Container,
  Dialog,
  DialogContent,
  IconButton,
  Snackbar,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useTheme } from '@mui/material/styles';
import {
  addItemToCart,
  clearDeviceId,
  createSession,
  endSession,
  getCart,
  getMessages,
  getSessions,
  login,
  logout,
  removeCartItem,
  setAuthToken,
  streamChat,
  updateCartItem,
  type SessionInfo,
} from '@/api';

interface OtpLoginData {
  accessToken: string;
  userId: string;
  phoneCountry: string;
  phoneNumber: string;
}
import type { Cart, ChatEvent, Order, ProductSummary } from '@/types';
import AddressPanel from './AddressPanel';
import AuthPanel from './AuthPanel';
import CartDrawer from './CartDrawer';
import MessageInput from './MessageInput';
import MessageList from './MessageList';
import SessionSidebar from './SessionSidebar';

type ChatItem =
  | {
      id: string;
      kind: 'message';
      role: 'user' | 'assistant';
      content: string;
      createdAt?: string;
      streaming?: boolean;
    }
  | { id: string; kind: 'cards'; products: ProductSummary[] }
  | { id: string; kind: 'comparison'; products: ProductSummary[]; matrix?: Record<string, string[]> }
  | { id: string; kind: 'order'; order: Order }
  | { id: string; kind: 'followups'; suggestions: string[] };

const AUTH_KEY = 'chat-ui-auth';
const SESSION_KEY = 'chat-ui-session';
const SIDEBAR_WIDTH = 280;

const ChatApp = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  
  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; username: string; role: string } | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [isGuest, setIsGuest] = useState(true);
  
  // Pagination state for chat history
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [oldestTimestamp, setOldestTimestamp] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Chat state
  const [items, setItems] = useState<ChatItem[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  
  // Cart state
  const [cart, setCart] = useState<Cart | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Address state
  const [addressDrawerOpen, setAddressDrawerOpen] = useState(false);

  const cartCount = cart?.itemCount ?? 0;

  // Auth handlers
  const persistAuth = useCallback((payload: { accessToken: string; user: { id: string; username: string; role: string } }) => {
    // Store user info (token is in HTTP-only cookie, managed by browser)
    localStorage.setItem(AUTH_KEY, JSON.stringify({ user: payload.user, loggedIn: true }));
    setToken('cookie-auth'); // Marker that user is authenticated via cookie
    setUser(payload.user);
    // Don't set Authorization header - cookie is used instead
    setIsGuest(false);
    setShowLoginDialog(false);
  }, []);

  const clearAuth = useCallback(async () => {
    // Call logout API to clear cookie on server
    try {
      await logout();
    } catch {
      // Continue with client-side cleanup even if logout API fails
    }
    
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(SESSION_KEY);
    setToken(null);
    setUser(null);
    setIsGuest(true);
    setAuthToken(null);
    // Clear session state so a new session is created on next login
    setSessionId(null);
    setItems([]);
    setSessions([]);
    // Clear deviceId so a different user gets a fresh guest identity
    clearDeviceId();
  }, []);

  const hydrateAuth = useCallback(async () => {
    const cached = localStorage.getItem(AUTH_KEY);
    if (!cached) {
      setIsGuest(true);
      return;
    }
    try {
      const parsed = JSON.parse(cached);
      // Check for user info (token is in HTTP-only cookie)
      if (parsed?.user && parsed?.loggedIn) {
        setToken('cookie-auth'); // Marker that user is authenticated via cookie
        setUser(parsed.user);
        setIsGuest(false);
      } else {
        setIsGuest(true);
      }
    } catch {
      localStorage.removeItem(AUTH_KEY);
      setIsGuest(true);
    }
  }, []);

  // Session handlers
  const loadSessions = useCallback(async (authenticated: boolean = false) => {
    try {
      const sessionList = await getSessions(authenticated);
      setSessions(sessionList);
    } catch {
      // Ignore errors loading sessions
    }
  }, []);

  const loadSessionMessages = useCallback(async (sid: string) => {
    try {
      const response = await getMessages(sid, 10);
      setItems(response.messages.map(message => ({
        id: message.id,
        kind: 'message',
        role: message.role,
        content: message.content_text,
        createdAt: message.created_at,
      })));
      setHasMoreMessages(response.hasMore);
      setOldestTimestamp(response.oldestTimestamp);
    } catch {
      setItems([]);
      setHasMoreMessages(false);
      setOldestTimestamp(null);
    }
  }, []);

  // Load more messages on scroll up
  const loadMoreMessages = useCallback(async () => {
    if (!sessionId || !hasMoreMessages || loadingMore || !oldestTimestamp) return;
    
    setLoadingMore(true);
    try {
      const response = await getMessages(sessionId, 10, oldestTimestamp);
      const olderMessages = response.messages.map(message => ({
        id: message.id,
        kind: 'message' as const,
        role: message.role as 'user' | 'assistant',
        content: message.content_text,
        createdAt: message.created_at,
      }));
      
      // Prepend older messages to the beginning
      setItems(prev => [...olderMessages, ...prev]);
      setHasMoreMessages(response.hasMore);
      setOldestTimestamp(response.oldestTimestamp);
    } catch {
      // Ignore errors when loading more
    } finally {
      setLoadingMore(false);
    }
  }, [sessionId, hasMoreMessages, loadingMore, oldestTimestamp]);

  const hydrateSession = useCallback(async (authenticated: boolean = false) => {
    const cachedSession = localStorage.getItem(SESSION_KEY);
    if (cachedSession) {
      setSessionId(cachedSession);
      await loadSessionMessages(cachedSession);
    }
    await loadSessions(authenticated);
  }, [loadSessionMessages, loadSessions]);

  const handleNewSession = useCallback(async () => {
    try {
      const session = await createSession();
      setSessionId(session.sessionId);
      localStorage.setItem(SESSION_KEY, session.sessionId);
      setItems([]); // Clear chat
      setHasMoreMessages(false);
      setOldestTimestamp(null);
      await loadSessions(!isGuest); // Refresh session list
    } catch (err: any) {
      setError(err?.message || 'Failed to create session');
    }
  }, [loadSessions, isGuest]);

  const handleSelectSession = useCallback(async (sid: string) => {
    setSessionId(sid);
    localStorage.setItem(SESSION_KEY, sid);
    await loadSessionMessages(sid);
  }, [loadSessionMessages]);

  const handleEndSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const result = await endSession(sessionId);
      if (result.success) {
        // Clear current session and create a new one
        setSessionId(null);
        setItems([]);
        localStorage.removeItem(SESSION_KEY);
        await loadSessions();
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to end session');
    }
  }, [sessionId, loadSessions]);

  // Cart handlers
  const hydrateCart = useCallback(async () => {
    if (!token) return;
    try {
      const response = await getCart();
      if (response.ok && response.data) {
        setCart(response.data);
      }
    } catch {
      // Ignore cart errors
    }
  }, [token]);

  // Initialize
  useEffect(() => {
    hydrateAuth();
  }, [hydrateAuth]);

  useEffect(() => {
    // Check if user is authenticated based on cached auth
    const cached = localStorage.getItem(AUTH_KEY);
    const isAuth = cached ? JSON.parse(cached)?.loggedIn === true : false;
    hydrateSession(isAuth);
  }, [hydrateSession]);

  useEffect(() => {
    if (token) {
      hydrateCart();
    }
  }, [hydrateCart, token]);

  // Reload sessions when user logs in
  useEffect(() => {
    if (token && !isGuest) {
      // User just logged in, reload sessions (authenticated)
      loadSessions(true);
      // If there's a current session, reload its messages
      if (sessionId) {
        loadSessionMessages(sessionId);
      }
    }
  }, [token, isGuest]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chat message handlers
  const appendAssistantToken = useCallback((tokenChunk: string) => {
    setItems(prev => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.kind === 'message' && last.role === 'assistant' && last.streaming) {
        next[next.length - 1] = { ...last, content: `${last.content}${tokenChunk}` };
        return next;
      }
      next.push({
        id: crypto.randomUUID(),
        kind: 'message',
        role: 'assistant',
        content: tokenChunk,
        streaming: true,
      });
      return next;
    });
  }, []);

  const finalizeStreamingMessage = useCallback(() => {
    setItems(prev => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.kind === 'message' && last.role === 'assistant' && last.streaming) {
        next[next.length - 1] = { ...last, streaming: false };
      }
      return next;
    });
  }, []);

  const addChatItem = useCallback((item: ChatItem) => {
    setItems(prev => [...prev, item]);
  }, []);

  const handleStreamEvent = useCallback(
    (event: ChatEvent) => {
      switch (event.type) {
        case 'token':
          appendAssistantToken(event.content);
          break;
        case 'clarification':
          finalizeStreamingMessage();
          addChatItem({
            id: crypto.randomUUID(),
            kind: 'message',
            role: 'assistant',
            content: event.question,
            createdAt: new Date().toISOString(),
          });
          break;
        case 'cards':
          finalizeStreamingMessage();
          addChatItem({ id: crypto.randomUUID(), kind: 'cards', products: event.products });
          break;
        case 'comparison':
          finalizeStreamingMessage();
          addChatItem({ id: crypto.randomUUID(), kind: 'comparison', products: event.products, matrix: event.matrix });
          break;
        case 'cart_updated':
          setCart(event.cart);
          break;
        case 'order_created':
          addChatItem({ id: crypto.randomUUID(), kind: 'order', order: event.order });
          break;
        case 'followups':
          addChatItem({ id: crypto.randomUUID(), kind: 'followups', suggestions: event.suggestions });
          break;
        case 'error':
          setError(event.error);
          finalizeStreamingMessage();
          setStreaming(false);
          break;
        case 'done':
          finalizeStreamingMessage();
          setStreaming(false);
          break;
        default:
          break;
      }
    },
    [addChatItem, appendAssistantToken, finalizeStreamingMessage],
  );

  const handleSend = useCallback(
    async (message: string) => {
      if (!message.trim() || streaming) return;
      
      // Create session if needed
      let activeSession = sessionId;
      if (!activeSession) {
        try {
          const session = await createSession();
          activeSession = session.sessionId;
          setSessionId(activeSession);
          localStorage.setItem(SESSION_KEY, activeSession);
          await loadSessions(!isGuest);
        } catch (err: any) {
          setError(err?.message || 'Failed to create session');
          return;
        }
      }

      addChatItem({
        id: crypto.randomUUID(),
        kind: 'message',
        role: 'user',
        content: message,
        createdAt: new Date().toISOString(),
      });

      streamAbortRef.current?.abort();
      const controller = new AbortController();
      streamAbortRef.current = controller;
      setStreaming(true);

      try {
        await streamChat(token, activeSession, message, handleStreamEvent, controller.signal);
      } catch (err: any) {
        console.error('Stream error:', err);
        if (err.name !== 'AbortError') {
          setError(err?.message || 'Streaming failed');
        }
        finalizeStreamingMessage();
      } finally {
        setStreaming(false);
      }
    },
    [addChatItem, handleStreamEvent, finalizeStreamingMessage, isGuest, loadSessions, sessionId, streaming, token],
  );

  const handleLogin = useCallback(async (username: string, password: string) => {
    const payload = await login(username, password);
    persistAuth(payload);
  }, [persistAuth]);

  const handleOtpLogin = useCallback((data: OtpLoginData) => {
    // Convert OTP login response to match password login format
    const payload = {
      accessToken: data.accessToken,
      user: {
        id: data.userId,
        username: `${data.phoneCountry}${data.phoneNumber}`,
        role: 'customer',
      },
    };
    persistAuth(payload);
    
    // Refresh session list after login (user is now authenticated)
    loadSessions(true);
  }, [persistAuth, loadSessions]);

  const handleAddToCart = useCallback(async (productId: string, provider: string) => {
    if (!token) {
      setShowLoginDialog(true);
      return;
    }
    const response = await addItemToCart(productId, provider, 1);
    if (response.ok && response.data) {
      setCart(response.data);
      setDrawerOpen(true);
    } else {
      setError(response.error?.message || 'Failed to add item');
    }
  }, [token]);

  const handleUpdateItem = useCallback(async (productId: string, quantity: number) => {
    const response = await updateCartItem(productId, quantity);
    if (response.ok && response.data) {
      setCart(response.data);
    } else {
      setError(response.error?.message || 'Failed to update cart');
    }
  }, []);

  const handleRemoveItem = useCallback(async (productId: string) => {
    const response = await removeCartItem(productId);
    if (response.ok && response.data) {
      setCart(response.data);
    } else {
      setError(response.error?.message || 'Failed to remove item');
    }
  }, []);

  const followups = useMemo(
    () => items.filter(item => item.kind === 'followups') as Extract<ChatItem, { kind: 'followups' }>[],
    [items],
  );
  const latestFollowups = followups.length ? followups[followups.length - 1].suggestions : [];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Sidebar */}
      <SessionSidebar
        sessions={sessions}
        currentSessionId={sessionId}
        isAuthenticated={!isGuest}
        username={user?.username}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onLogin={() => setShowLoginDialog(true)}
        onLogout={clearAuth}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          ml: { md: 0 },
          width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
        }}
      >
        <AppBar position="sticky" elevation={0} color="transparent">
          <Toolbar
            sx={{
              gap: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              pl: { xs: 7, md: 2 }, // Extra padding for mobile menu button
            }}
          >
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Commerce AI Assistant
            </Typography>
            {!isGuest && (
              <Typography variant="body2" color="text.secondary">
                {user?.username}
              </Typography>
            )}
            {isGuest && (
              <Typography variant="body2" color="text.secondary">
                Guest Mode
              </Typography>
            )}
            {sessionId && items.length > 0 && (
              <Tooltip title="End Conversation">
                <IconButton 
                  color="error" 
                  onClick={handleEndSession}
                >
                  <ExitToAppIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="My Address">
              <IconButton 
                color="primary" 
                onClick={() => {
                  if (isGuest) {
                    setShowLoginDialog(true);
                  } else {
                    setAddressDrawerOpen(true);
                  }
                }}
              >
                <LocationOnIcon />
              </IconButton>
            </Tooltip>
            <IconButton color="primary" onClick={() => setDrawerOpen(true)}>
              <Badge badgeContent={cartCount} color="secondary">
                <ShoppingCartIcon />
              </Badge>
            </IconButton>
          </Toolbar>
        </AppBar>

        <Container
          maxWidth="lg"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            py: 3,
          }}
        >
          {items.length === 0 ? (
            <Box
              sx={{
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: 2,
              }}
            >
              <Typography variant="h4" color="text.secondary" fontWeight={300}>
                Welcome to Commerce AI
              </Typography>
              <Typography variant="body1" color="text.secondary" maxWidth={400}>
                Start a conversation by typing a message below. Ask about products, compare items, or get personalized recommendations.
              </Typography>
              {isGuest && (
                <Typography variant="body2" color="primary" sx={{ mt: 2 }}>
                  Sign in to save your cart and access more features
                </Typography>
              )}
            </Box>
          ) : (
            <MessageList 
              items={items} 
              onAddToCart={handleAddToCart}
              hasMore={hasMoreMessages}
              loadingMore={loadingMore}
              onLoadMore={loadMoreMessages}
            />
          )}
          <MessageInput onSend={handleSend} disabled={streaming} followups={latestFollowups} />
        </Container>

        <CartDrawer
          cart={cart}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onUpdateItem={handleUpdateItem}
          onRemoveItem={handleRemoveItem}
          anchor={isDesktop ? 'right' : 'bottom'}
        />

        {/* Address Panel */}
        <AddressPanel
          open={addressDrawerOpen}
          onClose={() => setAddressDrawerOpen(false)}
          anchor={isDesktop ? 'right' : 'bottom'}
        />

        {/* Login Dialog */}
        <Dialog
          open={showLoginDialog}
          onClose={() => setShowLoginDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogContent sx={{ p: 0 }}>
            <AuthPanel 
              onLogin={handleLogin} 
              onOtpLogin={handleOtpLogin}
              onCancel={() => setShowLoginDialog(false)} 
            />
          </DialogContent>
        </Dialog>

        <Snackbar
          open={Boolean(error)}
          message={error}
          autoHideDuration={4000}
          onClose={() => setError(null)}
        />
      </Box>
    </Box>
  );
};

export default ChatApp;
