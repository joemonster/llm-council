import { createContext, useContext, useState, useEffect } from 'react';
import { functionsUrl, supabaseAnonKey } from '../supabase';

const AuthContext = createContext(null);

const TOKEN_KEY = 'llm_council_token';
const USER_KEY = 'llm_council_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token and user from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);

    console.log('[AUTH] Loading from localStorage:', {
      hasToken: !!savedToken,
      hasUser: !!savedUser,
      token: savedToken?.substring(0, 20) + '...',
    });

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      // Verify token is still valid
      verifyToken(savedToken);
    } else {
      console.log('[AUTH] No token found, user needs to log in');
      setIsLoading(false);
    }
  }, []);

  const verifyToken = async (tokenToVerify) => {
    console.log('[AUTH] Verifying token...');
    try {
      const response = await fetch(`${functionsUrl}/auth-login/me`, {
        method: 'GET',
        headers: {
          'X-User-Token': tokenToVerify,
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[AUTH] Token valid, user:', data.user.username);
        setUser(data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      } else {
        console.warn('[AUTH] Token invalid or expired, logging out');
        // Token invalid, clear everything
        logout();
      }
    } catch (error) {
      console.error('[AUTH] Token verification failed:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username, password) => {
    console.log('[AUTH] Attempting login for user:', username);
    const response = await fetch(`${functionsUrl}/auth-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ username, password }),
    });

    console.log('[AUTH] Login response status:', response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Login failed' }));
      console.error('[AUTH] Login failed:', error);
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    console.log('[AUTH] Login successful, user:', data.user.username);

    setToken(data.token);
    setUser(data.user);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));

    return data.user;
  };

  const logout = () => {
    console.log('[AUTH] Logging out, clearing localStorage');
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper to get auth headers for API calls
export function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  console.log('[AUTH] getAuthHeaders called, hasToken:', !!token);

  if (!token) {
    console.warn('[AUTH] No token in localStorage, request will fail with 401');
    return {};
  }

  // Check if token is expired before sending
  try {
    const payload = JSON.parse(atob(token));
    const now = Date.now();
    const expiresIn = Math.round((payload.exp - now) / 1000 / 60); // minutes
    console.log('[AUTH] Token payload:', {
      userId: payload.userId,
      username: payload.username,
      exp: new Date(payload.exp).toISOString(),
      expiresInMinutes: expiresIn,
      isExpired: payload.exp < now,
    });

    if (payload.exp < now) {
      console.error('[AUTH] Token expired, clearing localStorage');
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      // Force page reload to show login screen
      window.location.reload();
      return {};
    }
  } catch (e) {
    console.error('[AUTH] Invalid token format:', e);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.reload();
    return {};
  }

  return {
    'X-User-Token': token,
  };
}
