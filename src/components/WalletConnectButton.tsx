import React from 'react';
import { ConnectButton } from '@mysten/dapp-kit';
import { useCurrentWallet, useCurrentAccount } from '@mysten/dapp-kit';

interface WalletConnectButtonProps {
  onConnectSuccess?: (address: string) => void;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  onConnectSuccess
}) => {
  const { connectionStatus } = useCurrentWallet();
  const account = useCurrentAccount();
  const isConnected = connectionStatus === 'connected';

  // Effect to call onConnectSuccess when wallet is connected
  React.useEffect(() => {
    if (isConnected && account && onConnectSuccess) {
      onConnectSuccess(account.address);
    }
  }, [isConnected, account, onConnectSuccess]);


  // Custom button styling that matches your app's design
  return (
    <div className="wallet-connect-container">
      <ConnectButton 
        connectText="Connect Wallet"
      />
    </div>
  );
};

export default WalletConnectButton;