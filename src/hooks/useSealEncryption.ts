/**
 * React hook for Seal encryption functionality
 * Provides easy-to-use encryption/decryption methods for React components
 */

import { useState, useCallback, useEffect } from 'react';
import { sealEncryptionService, EncryptionResult, DecryptionResult } from '../services/sealEncryptionService';

export interface EncryptionState {
  isInitializing: boolean;
  isReady: boolean;
  isEncrypting: boolean;
  isDecrypting: boolean;
  error: string | null;
}

export interface UseEncryptionReturn {
  state: EncryptionState;
  encryptFile: (file: File) => Promise<EncryptionResult>;
  decryptFile: (encryptedData: Uint8Array, secretKey: string) => Promise<DecryptionResult>;
  clearError: () => void;
  initializeService: () => Promise<void>;
}

export const useSealEncryption = (): UseEncryptionReturn => {
  const [state, setState] = useState<EncryptionState>({
    isInitializing: false,
    isReady: false,
    isEncrypting: false,
    isDecrypting: false,
    error: null
  });

  // Initialize the encryption service
  const initializeService = useCallback(async () => {
    if (state.isReady || state.isInitializing) {
      return;
    }

    setState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      await sealEncryptionService.initialize();
      setState(prev => ({ 
        ...prev, 
        isInitializing: false, 
        isReady: sealEncryptionService.isReady() 
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isInitializing: false, 
        isReady: false,
        error: error instanceof Error ? error.message : 'Failed to initialize encryption service'
      }));
    }
  }, [state.isReady, state.isInitializing]);

  // Auto-initialize on mount
  useEffect(() => {
    initializeService();
  }, [initializeService]);

  // Encrypt a file
  const encryptFile = useCallback(async (file: File): Promise<EncryptionResult> => {
    if (!state.isReady) {
      const result: EncryptionResult = {
        success: false,
        error: 'Encryption service not ready. Please wait for initialization.'
      };
      return result;
    }

    setState(prev => ({ ...prev, isEncrypting: true, error: null }));

    try {
      const result = await sealEncryptionService.encryptFile(file);
      
      if (!result.success) {
        setState(prev => ({ ...prev, error: result.error || 'Encryption failed' }));
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Encryption failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setState(prev => ({ ...prev, isEncrypting: false }));
    }
  }, [state.isReady]);

  // Decrypt a file
  const decryptFile = useCallback(async (
    encryptedData: Uint8Array, 
    secretKey: string
  ): Promise<DecryptionResult> => {
    if (!state.isReady) {
      return {
        success: false,
        error: 'Encryption service not ready. Please wait for initialization.'
      };
    }

    setState(prev => ({ ...prev, isDecrypting: true, error: null }));

    try {
      const result = await sealEncryptionService.decryptFile(encryptedData, secretKey);
      
      if (!result.success) {
        setState(prev => ({ ...prev, error: result.error || 'Decryption failed' }));
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Decryption failed';
      setState(prev => ({ ...prev, error: errorMessage }));
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setState(prev => ({ ...prev, isDecrypting: false }));
    }
  }, [state.isReady]);

  // Clear any error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    state,
    encryptFile,
    decryptFile,
    clearError,
    initializeService
  };
};

// Additional utility hook for encryption status
export const useEncryptionStatus = () => {
  const [status, setStatus] = useState(sealEncryptionService.getStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(sealEncryptionService.getStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return status;
};
