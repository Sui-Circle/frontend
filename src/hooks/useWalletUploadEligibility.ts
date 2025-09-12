import { useState, useEffect } from 'react';
import { useCurrentWallet } from '@mysten/dapp-kit';
import { useWalletBalance } from './useWalletBalance';
import { useAuth } from '../contexts/AuthContext';

interface WalletUploadEligibilityResult {
  isEligible: boolean;
  isLoading: boolean;
  error: string | null;
  reason: 'not_connected' | 'not_authenticated' | 'insufficient_balance' | 'eligible' | null;
}

/**
 * Hook to check if a wallet is eligible to upload files
 * Eligibility criteria:
 * 1. Wallet is connected
 * 2. User is authenticated
 * 3. Wallet has sufficient balance
 */
export function useWalletUploadEligibility(minimumBalance: number = 0.01): WalletUploadEligibilityResult {
  const { connectionStatus } = useCurrentWallet();
  const isConnected = connectionStatus === 'connected';
  const { isAuthenticated, useTestMode } = useAuth();
  const { loading: isBalanceLoading, hasMinimumBalance, error: balanceError } = useWalletBalance(BigInt(Math.floor(minimumBalance * 1000000000)));
  
  const [result, setResult] = useState<WalletUploadEligibilityResult>({
    isEligible: false,
    isLoading: true,
    error: null,
    reason: null
  });

  useEffect(() => {
    // If test mode is enabled, user is always eligible
    if (useTestMode) {
      setResult({
        isEligible: true,
        isLoading: false,
        error: null,
        reason: 'eligible'
      });
      return;
    }

    // Check if wallet is connected
    if (!isConnected) {
      setResult({
        isEligible: false,
        isLoading: false,
        error: 'Wallet not connected',
        reason: 'not_connected'
      });
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      setResult({
        isEligible: false,
        isLoading: false,
        error: 'Not authenticated',
        reason: 'not_authenticated'
      });
      return;
    }

    // Check if balance is still loading
    if (isBalanceLoading) {
      setResult({
        isEligible: false,
        isLoading: true,
        error: null,
        reason: null
      });
      return;
    }

    // Check if there was an error checking balance
    if (balanceError) {
      setResult({
        isEligible: false,
        isLoading: false,
        error: balanceError,
        reason: 'insufficient_balance'
      });
      return;
    }

    // Check if wallet has sufficient balance
    setResult({
      isEligible: hasMinimumBalance,
      isLoading: false,
      error: hasMinimumBalance ? null : 'Insufficient balance',
      reason: hasMinimumBalance ? 'eligible' : 'insufficient_balance'
    });
  }, [isConnected, isAuthenticated, isBalanceLoading, hasMinimumBalance, balanceError, useTestMode]);

  return result;
}