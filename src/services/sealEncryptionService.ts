/**
 * Frontend Seal Encryption Service
 * Handles client-side file encryption using @mysten/seal library
 * Ensures files are encrypted before upload to Walrus storage
 */

import { SealClient, EncryptedObject, type KeyServerConfig, SessionKey } from '@mysten/seal';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { fromHex } from '@mysten/sui/utils';
import { getNetworkVariables, network } from '@/contract/index';

let sealClient: SealClient | null = null;
let suiClient: SuiClient | null = null;

export interface EncryptionResult {
  success: boolean;
  encryptedData?: Uint8Array;
  encryptionId?: string;
  error?: string;
  metadata?: {
    originalSize: number;
    encryptionAlgorithm: string;
    timestamp: number;
  };
}

export interface DecryptionResult {
  success: boolean;
  decryptedData?: Uint8Array;
  error?: string;
}

export interface EncryptionKeys {
  publicKey: string;
  secretKey: string;
}

class SealEncryptionService {
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Initialize the Seal library for browser use
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._initializeSeal();
    return this.initializationPromise;
  }

  private async _initializeSeal(): Promise<void> {
    try {
      console.log('🔐 Initializing Mysten SEAL (real) ...');

      const rpcUrl = (import.meta as any).env?.VITE_SUI_RPC_URL || getFullnodeUrl('testnet');
      suiClient = new SuiClient({ url: rpcUrl });

      const SERVER_OBJECT_IDS = [
        '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75',
        '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8',
      ];

      const envIds = (import.meta as any).env?.VITE_SEAL_KEY_SERVER_IDS as string | undefined;
      const ids = envIds ? envIds.split(',').map((s) => s.trim()).filter(Boolean) : SERVER_OBJECT_IDS;
      const serverConfigs: KeyServerConfig[] = ids.map((objectId) => ({ objectId, weight: 1 }));

      sealClient = new SealClient({
        suiClient: suiClient as any,
        serverConfigs,
        verifyKeyServers: false,
      } as any);

      this.isInitialized = true;
      console.log('✅ Mysten SEAL initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Seal library:', error);
      throw new Error(`Seal initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if the service is ready for use
   */
  isReady(): boolean {
    return this.isInitialized && !!sealClient && !!suiClient;
  }

  /**
   * Encrypt a file using Seal encryption
   * This method encrypts the file client-side before upload
   */
  async encryptFile(file: File, allowlistId?: string): Promise<EncryptionResult> {
    try {
      // Ensure Seal is initialized
      await this.initialize();

      if (!this.isReady()) {
        return {
          success: false,
          error: 'Seal encryption service not ready'
        };
      }

      console.log(`🔐 Starting client-side encryption for file: ${file.name} (${file.size} bytes)`);

      // Convert file to ArrayBuffer then to Uint8Array
      const arrayBuffer = await file.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      if (!sealClient) {
        return { success: false, error: 'SEAL client not initialized' };
      }

      const TESTNET_PACKAGE_ID = (import.meta as any).env?.VITE_SUI_PACKAGE_ID || getNetworkVariables(network).packageId;

      const result = await sealClient.encrypt({
        packageId: TESTNET_PACKAGE_ID,
        id: allowlistId || `file_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        data: fileData,
        threshold: 2,
      });

      console.log(`✅ File encrypted with Mysten SEAL: ${file.name}`);

      return {
        success: true,
        encryptedData: result.encryptedObject,
        encryptionId: EncryptedObject.parse(result.encryptedObject).id,
        metadata: {
          originalSize: file.size,
          encryptionAlgorithm: 'Mysten-SEAL',
          timestamp: Date.now(),
        },
      };

    } catch (error) {
      console.error('❌ Failed to encrypt file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown encryption error'
      };
    }
  }

  /**
   * Decrypt encrypted file data
   */
  async decryptFile(_encryptedData: Uint8Array, _secretKey: string): Promise<DecryptionResult> {
    try {
      await this.initialize();
      if (!this.isReady() || !sealClient || !suiClient) {
        return { success: false, error: 'SEAL encryption service not ready' };
      }

      // Real decryption requires session key + txBytes proving access.
      // This service no longer supports mock decryption.
    return { success: false, error: 'Client-side decryption requires session key and access proof' };

    } catch (error) {
      console.error('❌ Failed to decrypt file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown decryption error'
      };
    }
  }

  async createDecryptionProof(opts: { walletAddress: string; allowlistId: string; encryptionId: string; signPersonalMessageAsync: (message: Uint8Array) => Promise<string> }): Promise<{ sessionKey: any; txBytesBase64: string } | null> {
    await this.initialize();
    if (!this.isReady() || !sealClient || !suiClient) return null;
    const TESTNET_PACKAGE_ID = (import.meta as any).env?.VITE_SUI_PACKAGE_ID || getNetworkVariables(network).packageId;
    const sessionKey = await SessionKey.create({
      address: opts.walletAddress,
      packageId: TESTNET_PACKAGE_ID,
      ttlMin: 10,
      suiClient: suiClient as any,
    });
    const personalMessage = sessionKey.getPersonalMessage();
    const signature = await opts.signPersonalMessageAsync(personalMessage);
    await sessionKey.setPersonalMessageSignature(signature);
    const tx = new Transaction();
    tx.moveCall({
      target: `${TESTNET_PACKAGE_ID}::allowlist::seal_approve`,
      arguments: [tx.pure.vector('u8', fromHex(opts.encryptionId)), tx.object(opts.allowlistId)],
    });
    const txBytes = await tx.build({ client: suiClient as any, onlyTransactionKind: true });
    const txBytesBase64 = btoa(String.fromCharCode(...txBytes));
    console.log('Proof generated', { address: opts.walletAddress, txBytesLen: txBytesBase64.length });
    return { sessionKey: sessionKey.export(), txBytesBase64 };
  }

  /**
   * Generate a new key pair for encryption
   */
  // Mock helpers removed: using real Mysten SEAL only

  /**
   * Get service status information
   */
  getStatus(): {
    isInitialized: boolean;
    isReady: boolean;
    libraryLoaded: boolean;
  } {
    return {
      isInitialized: this.isInitialized,
      isReady: this.isReady(),
      libraryLoaded: !!SealClient
    };
  }
}

// Export a singleton instance
async function base64ToU8(b64: string): Promise<Uint8Array> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

(SealEncryptionService.prototype as any).decryptWithProof = async function(opts: { encryptedData: Uint8Array; encryptionId: string; sessionKey: any; txBytesBase64: string }): Promise<Uint8Array | null> {
  await this.initialize();
  if (!this.isReady() || !sealClient || !suiClient) return null;
  const sk = await SessionKey.import(opts.sessionKey, suiClient as any);
  const txBytes = await base64ToU8(opts.txBytesBase64);
  await (sealClient as any).fetchKeys({ ids: [opts.encryptionId], sessionKey: sk, txBytes });
  const out = await (sealClient as any).decrypt({ data: opts.encryptedData, sessionKey: sk, txBytes });
  return out;
};

export const sealEncryptionService = new SealEncryptionService();

// Export the class for testing
export { SealEncryptionService };
