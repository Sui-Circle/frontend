import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { GitHubIcon, CopyIcon, LogoutIcon } from './icons/SocialIcons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface WalletDisplayProps {
  className?: string;
  user?: any;
  onLogout?: () => void;
}

const WalletDisplay: React.FC<WalletDisplayProps> = ({
  className = '',
  user: propUser,
  onLogout: propOnLogout
}) => {
  const { user: contextUser, logout: contextLogout, isAuthenticated } = useAuth();
  const [showFullAddress, setShowFullAddress] = useState(false);

  // Use props if provided, otherwise fall back to context
  const user = propUser || contextUser;
  const onLogout = propOnLogout || contextLogout;

  console.log('WalletDisplay: Render state', {
    isAuthenticated,
    user,
    hasZkAddress: user?.zkLoginAddress ? true : false
  });

  if (!isAuthenticated || !user) {
    return null;
  }

  // Handle case where zkLoginAddress might not be available yet
  const zkAddress = user.zkLoginAddress;
  if (!zkAddress) {
    // Show loading state while zkLogin address is being generated
    return (
      <div className={`flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm ${className}`}>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-slate-50 rounded-lg text-gray-800">
            <GitHubIcon size={20} />
          </div>
          <div className="flex flex-col gap-0.5">
            {user.email && (
              <div className="text-xs text-slate-500 font-medium leading-none hidden sm:block">
                {user.email}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                Generating address...
              </span>
              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-slate-500 hover:text-red-600 hover:bg-red-50 p-2 h-auto"
          title="Disconnect wallet"
        >
          <LogoutIcon size={16} />
        </Button>
      </div>
    );
  }

  const formatAddress = (address: string) => {
    if (showFullAddress || address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Address copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy address');
    }
  };

  const handleLogout = () => {
    onLogout();
    toast.success('Logged out successfully');
  };

  return (
    <div className={`flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm hover:shadow-md transition-all duration-200 ${className}`}>
      <div className="flex items-center gap-2">
        {/* Provider Icon */}
        <div className="flex items-center justify-center w-8 h-8 bg-slate-50 rounded-lg text-gray-800">
          <GitHubIcon size={20} />
        </div>

        {/* User Info */}
        <div className="flex flex-col gap-0.5">
          {user.email && (
            <div className="text-xs text-slate-500 font-medium leading-none hidden sm:block">
              {user.email}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span
              className="font-mono text-sm font-semibold text-slate-800 bg-slate-100 px-2 py-1 rounded-md cursor-pointer hover:bg-slate-200 hover:text-slate-900 transition-colors select-none"
              onClick={() => setShowFullAddress(!showFullAddress)}
              title={zkAddress}
            >
              {formatAddress(zkAddress)}
            </span>
            <button
              className="flex items-center justify-center p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              onClick={() => copyToClipboard(zkAddress)}
              title="Copy wallet address"
            >
              <CopyIcon size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="text-slate-500 hover:text-red-600 hover:bg-red-50 p-2 h-auto"
        title="Disconnect wallet"
      >
        <LogoutIcon size={16} />
      </Button>
    </div>
  );
};

export default WalletDisplay;
