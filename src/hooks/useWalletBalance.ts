import { useEffect, useState } from 'react';
import { useCurrentWallet, useCurrentAccount } from '@mysten/dapp-kit';
import { suiClient } from '../contract/index.js';

interface BalanceInfo {
  loading: boolean;
  balance: bigint | null;
  hasMinimumBalance: boolean;
  error: string | null;
}

/**
 * Hook to check if a wallet has sufficient balance for transaction fees
 * @param minimumBalance Minimum balance required in MIST (10^-9 SUI)
 * @returns Balance information and status
 */
export function useWalletBalance(minimumBalance: bigint = BigInt(10000000)): BalanceInfo {
  const { connectionStatus } = useCurrentWallet();
  const account = useCurrentAccount();
  const isConnected = connectionStatus === 'connected';
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo>({
    loading: false,
    balance: null,
    hasMinimumBalance: false,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const checkBalance = async () => {
      if (!isConnected || !account) {
        setBalanceInfo({
          loading: false,
          balance: null,
          hasMinimumBalance: false,
          error: 'Wallet not connected',
        });
        return;
      }

      try {
        setBalanceInfo(prev => ({ ...prev, loading: true, error: null }));
        
        // Get all coin objects owned by the address
        const { totalBalance } = await suiClient.getBalance({
          owner: account.address,
          coinType: '0x2::sui::SUI', // SUI coin type
        });

        // Convert balance to BigInt for comparison
        const balanceBigInt = BigInt(totalBalance);
        
        if (isMounted) {
          setBalanceInfo({
            loading: false,
            balance: balanceBigInt,
            hasMinimumBalance: balanceBigInt >= minimumBalance,
            error: null,
          });
        }
      } catch (error) {
        console.error('Error checking wallet balance:', error);
        if (isMounted) {
          setBalanceInfo({
            loading: false,
            balance: null,
            hasMinimumBalance: false,
            error: error instanceof Error ? error.message : 'Failed to check balance',
          });
        }
      }
    };

    if (isConnected && account) {
      checkBalance();
    }

    return () => {
      isMounted = false;
    };
  }, [isConnected, account, minimumBalance]);

  return balanceInfo;
}