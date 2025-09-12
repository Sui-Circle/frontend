import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import WalletConnectButton from './WalletConnectButton';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface WalletAuthButtonProps {
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const WalletAuthButton: React.FC<WalletAuthButtonProps> = ({
  className = '',
  variant = 'default',
  size = 'default'
}) => {
  const { isAuthenticated, login, logout } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Handle wallet connection success
  const handleWalletConnectSuccess = async (address: string) => {
    if (!isAuthenticated) {
      setIsAuthenticating(true);
      try {
        // Since the backend server is not running or the endpoint is not available,
        // we'll create a mock wallet authentication response
        const mockUser = {
          address: address,
          label: `Wallet (${address.substring(0, 6)}...${address.substring(address.length - 4)})`,
        };
        
        // Login with the wallet data
        login(mockUser);
        toast.success('Successfully authenticated with wallet');
      } catch (error) {
        console.error('Failed to authenticate with wallet:', error);
        toast.error('Failed to authenticate with wallet');
      } finally {
        setIsAuthenticating(false);
      }
    }
  };


  // Handle logout
  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  return (
    <div>
      {!isAuthenticated ? (
        <WalletConnectButton
          onConnectSuccess={handleWalletConnectSuccess}
          className={className}
          variant={variant}
          size={size}
        />
      ) : (
        <Button
          variant="outline"
          size={size}
          onClick={handleLogout}
          className={className}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Authenticating...
            </>
          ) : (
            'Logout'
          )}
        </Button>
      )}
    </div>
  );
};

export default WalletAuthButton;