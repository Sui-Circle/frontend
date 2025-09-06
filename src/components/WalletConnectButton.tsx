import React from 'react';
import { ConnectButton } from '@mysten/dapp-kit';
import { useCurrentWallet, useCurrentAccount } from '@mysten/dapp-kit';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatAddress } from '@/lib/utils';

interface WalletConnectButtonProps {
  onConnectSuccess?: (address: string) => void;
  onConnectError?: (error: string) => void;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  onConnectSuccess,
  onConnectError,
  className = '',
  variant = 'default',
  size = 'default'
}) => {
  const { currentWallet, connectionStatus } = useCurrentWallet();
  const account = useCurrentAccount();
  const isConnected = connectionStatus === 'connected';

  // Effect to call onConnectSuccess when wallet is connected
  React.useEffect(() => {
    if (isConnected && account && onConnectSuccess) {
      onConnectSuccess(account.address);
    }
  }, [isConnected, account, onConnectSuccess]);

  // Generate a friendly name for the wallet
  const getFriendlyWalletName = () => {
    if (!account) return 'Connect Wallet';
    
    // Use a shortened version of the address with the formatAddress utility
    const shortAddress = account.address.slice(0, 4);
    return `Wallet ${shortAddress}`;
  };

  // Custom button styling that matches your app's design
  return (
    <div className="wallet-connect-container">
      <ConnectButton 
        connectbuttonrender={({ onClick, disabled, loading, connected }) => {
          return (
            <Button
              variant={variant}
              size={size}
              onClick={onClick}
              disabled={disabled || loading}
              className={className}
            >
              {loading ? 'Connecting...' : connected ? getFriendlyWalletName() : 'Connect Wallet'}
              {loading && (
                <div className="ml-2 w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
              )}
            </Button>
          );
        }}
      />
    </div>
  );
};

export default WalletConnectButton;