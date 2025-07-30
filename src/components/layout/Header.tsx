import React from 'react';
import { Play } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import WalletDisplay from '@/components/WalletDisplay';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  className?: string;
  isAuthenticated?: boolean;
  user?: any;
  onLogout?: () => void;
  onNavigateToAuth?: () => void;
  onNavigateToDashboard?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  className = '',
  isAuthenticated: propIsAuthenticated,
  user: propUser,
  onLogout: propOnLogout,
  onNavigateToAuth,
  onNavigateToDashboard
}) => {
  const { isAuthenticated: contextIsAuthenticated, user: contextUser, logout: contextLogout } = useAuth();

  // Use props if provided, otherwise fall back to context
  const isAuthenticated = propIsAuthenticated !== undefined ? propIsAuthenticated : contextIsAuthenticated;
  const user = propUser || contextUser;
  const onLogout = propOnLogout || contextLogout;

  // Debug logging
  console.log('Header render:', {
    isAuthenticated,
    hasOnNavigateToDashboard: !!onNavigateToDashboard,
    user: user ? 'present' : 'missing'
  });

  return (
    <header className={`flex justify-between items-center py-8 px-4 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 bg-black flex items-center justify-center">
          <Play className="w-3 h-3 text-white fill-white" />
        </div>
        <span className="text-xl font-medium text-black">Sui Send</span>
      </div>

      <div className="flex items-center gap-4">
        {/* Show dashboard link when authenticated */}
        {isAuthenticated && onNavigateToDashboard && (
          <Button
            onClick={onNavigateToDashboard}
            variant="outline"
            className="border-gray-300 text-gray-700 hover:text-black hover:bg-gray-50"
          >
            Dashboard
          </Button>
        )}

        {/* Show wallet display when authenticated, login button when not */}
        {isAuthenticated ? (
          <WalletDisplay user={user} onLogout={onLogout} />
        ) : (
          <Button
            onClick={onNavigateToAuth}
            className="bg-black hover:bg-gray-800 text-white"
          >
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
};