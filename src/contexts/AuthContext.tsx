import React, { createContext, useContext, useState, useEffect } from 'react';
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';

export interface AuthUser {
  address: string;
  publicKey?: string;
  label?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  useTestMode: boolean;
  setUseTestMode: (useTest: boolean) => void;
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [useTestMode, setUseTestMode] = useState(false);
  
  // Get wallet connection state from dapp-kit
  const currentAccount = useCurrentAccount();
  const disconnectWallet = useDisconnectWallet();

  console.log('AuthProvider: Initializing with dapp-kit hooks', {
    hasCurrentAccount: !!currentAccount,
    hasDisconnectWallet: !!disconnectWallet
  });

  useEffect(() => {
    // Load test mode preference from localStorage
    const savedTestMode = localStorage.getItem('useTestMode');
    if (savedTestMode !== null) {
      setUseTestMode(savedTestMode === 'true');
    }

    // Load saved user data if in test mode
    if (savedTestMode === 'true') {
      const savedUser = localStorage.getItem('testUser');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (error) {
          console.error('Failed to parse test user data:', error);
        }
      }
    }
  }, []);

  // Monitor wallet connection changes
  useEffect(() => {
    try {
      console.log('AuthProvider: Wallet connection effect triggered', {
        hasCurrentAccount: !!currentAccount,
        useTestMode,
        currentAccount: currentAccount ? {
          address: currentAccount.address,
          hasPublicKey: !!currentAccount.publicKey,
          label: currentAccount.label
        } : null
      });

      if (currentAccount && !useTestMode) {
        const walletUser: AuthUser = {
          address: currentAccount.address,
          publicKey: currentAccount.publicKey ? Array.from(currentAccount.publicKey).map(b => b.toString(16).padStart(2, '0')).join('') : undefined,
          label: currentAccount.label
        };
        console.log('AuthProvider: Setting wallet user', walletUser);
        setUser(walletUser);
      } else if (!currentAccount && !useTestMode) {
        console.log('AuthProvider: Clearing wallet user');
        setUser(null);
      }
    } catch (error) {
      console.error('AuthProvider: Error in wallet connection effect', error);
    }
  }, [currentAccount, useTestMode]);

  const login = (newUser: AuthUser) => {
    try {
      console.log('AuthContext: Setting user', newUser);
      setUser(newUser);
      
      if (useTestMode) {
        localStorage.setItem('testUser', JSON.stringify(newUser));
      }
    } catch (error) {
      console.error('AuthContext: Error in login', error);
    }
  };

  const logout = () => {
    try {
      if (useTestMode) {
        setUser(null);
        localStorage.removeItem('testUser');
      } else {
        // Disconnect wallet
        disconnectWallet.mutate();
        setUser(null);
      }
    } catch (error) {
      console.error('AuthContext: Error in logout', error);
    }
  };

  const handleSetUseTestMode = (useTest: boolean) => {
    setUseTestMode(useTest);
    localStorage.setItem('useTestMode', useTest.toString());
    
    if (useTest) {
      // Clear wallet user when switching to test mode
      setUser(null);
    } else {
      // Clear test user when switching to wallet mode
      setUser(null);
      localStorage.removeItem('testUser');
    }
  };

  const value: AuthContextType = {
    isAuthenticated: !!user,
    user,
    login,
    logout,
    useTestMode,
    setUseTestMode: handleSetUseTestMode,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
