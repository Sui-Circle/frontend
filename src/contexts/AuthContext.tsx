import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import type { AuthUser } from '../services/authService';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  useTestMode: boolean;
  setUseTestMode: (useTest: boolean) => void;
  verifyToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [useTestMode, setUseTestMode] = useState(false); // Default to auth mode

  useEffect(() => {
    // One-time migration: force switch to auth mode
    localStorage.setItem('useTestMode', 'false');

    // Load token and user from localStorage on mount
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('authUser');
    const savedTestMode = localStorage.getItem('useTestMode');

    console.log('AuthContext: Loading from localStorage', {
      hasToken: !!savedToken,
      hasUser: !!savedUser,
      savedTestMode
    });

    if (savedToken) {
      setToken(savedToken);
    }

    if (savedUser) {
      // Use authService to load user data (which handles both localStorage and sessionStorage)
      const loadedUser = authService.getUser();
      if (loadedUser) {
        console.log('AuthContext: Loaded user from storage', loadedUser);
        setUser(loadedUser);
      } else {
        console.error('Failed to load user data');
        localStorage.removeItem('authUser');
      }
    }

    // Default to auth mode unless explicitly set to test mode
    if (savedTestMode !== null) {
      setUseTestMode(savedTestMode === 'true');
    } else {
      // If no saved preference, default to auth mode and save it
      setUseTestMode(false);
      localStorage.setItem('useTestMode', 'false');
    }

    // Verify token on app load if we have one
    if (savedToken && !useTestMode) {
      verifyTokenInternal();
    }
  }, []);

  // Monitor user state changes
  useEffect(() => {
    console.log('AuthContext: User state changed', {
      user,
      isAuthenticated: !!token && !!user && !useTestMode,
      hasToken: !!token,
      useTestMode
    });
  }, [user, token, useTestMode]);

  const verifyTokenInternal = async () => {
    try {
      console.log('AuthContext: Verifying token...');
      const result = await authService.verifyToken();
      if (result) {
        console.log('AuthContext: Token verification successful', result.data.user);
        setUser(result.data.user);
        return true;
      } else {
        console.log('AuthContext: Token verification failed - no result');
        // Token is invalid, clear state
        setToken(null);
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('AuthContext: Token verification failed:', error);
      setToken(null);
      setUser(null);
      return false;
    }
  };

  const login = (newToken: string, newUser: AuthUser) => {
    console.log('AuthContext: Setting user and token', { newUser, newToken: newToken ? 'present' : 'missing' });
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('authUser', JSON.stringify(newUser));
    setUseTestMode(false);
    localStorage.setItem('useTestMode', 'false');
  };

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
    setUseTestMode(true);
    localStorage.setItem('useTestMode', 'true');
  };

  const verifyToken = async (): Promise<boolean> => {
    return await verifyTokenInternal();
  };

  const handleSetUseTestMode = (useTest: boolean) => {
    setUseTestMode(useTest);
    localStorage.setItem('useTestMode', useTest.toString());
    
    if (useTest) {
      // Clear token when switching to test mode
      setToken(null);
      localStorage.removeItem('authToken');
    }
  };

  const value: AuthContextType = {
    isAuthenticated: !!token && !!user && !useTestMode,
    token,
    user,
    login,
    logout,
    useTestMode,
    setUseTestMode: handleSetUseTestMode,
    verifyToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
