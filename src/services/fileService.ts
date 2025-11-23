/**
 * File service for backend API integration
 * Handles all file-related operations with proper authentication
 */

import { sealEncryptionService } from './sealEncryptionService';
import { EncryptedObject } from '@mysten/seal';
import { createWalrusClientFromSuiClient, getWalrusBlob } from './walrusUploadService';
const extToMime=(name:string)=>{const e=name.split('.').pop()?.toLowerCase();switch(e){case 'png':return 'image/png';case 'jpg':case 'jpeg':return 'image/jpeg';case 'gif':return 'image/gif';case 'webp':return 'image/webp';case 'svg':return 'image/svg+xml';case 'pdf':return 'application/pdf';case 'mp4':return 'video/mp4';case 'mov':return 'video/quicktime';case 'zip':return 'application/zip';default:return undefined;}};
const magicToMime=(data:Uint8Array)=>{if(data.length>=8&&data[0]===0x89&&data[1]===0x50&&data[2]===0x4E&&data[3]===0x47&&data[4]===0x0D&&data[5]===0x0A&&data[6]===0x1A&&data[7]===0x0A)return 'image/png';if(data.length>=3&&data[0]===0xFF&&data[1]===0xD8&&data[2]===0xFF)return 'image/jpeg';if(data.length>=3&&data[0]===0x47&&data[1]===0x49&&data[2]===0x46)return 'image/gif';if(data.length>=4&&data[0]===0x25&&data[1]===0x50&&data[2]===0x44&&data[3]===0x46)return 'application/pdf';if(data.length>=12&&String.fromCharCode(...data.slice(8,12))==='WEBP')return 'image/webp';if(data.length>=8&&String.fromCharCode(...data.slice(4,8))==='ftyp')return 'video/mp4';return undefined;};
const API_BASE_URL = 'http://localhost:3000';

export interface FileMetadata {
  cid: string;
  filename: string;
  fileSize: number;
  uploadTimestamp: number;
  uploader: string;
  isOwner: boolean;
  contentType?: string;
  isEncrypted?: boolean;
  encryptionKeys?: {
    encryptionId: string;
  };
}

export interface FilesResponse {
  success: boolean;
  data: {
    files: FileMetadata[];
  };
  message?: string;
}

export interface UploadResponse {
  success: boolean;
  data?: {
    fileCid: string;
    transactionDigest: string;
    walrusCid: string;
    encryptionKeys?: {
      encryptionId: string;
    };
    isEncrypted?: boolean;
  };
  message: string;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}

class FileService {
  private toPlainJSON(value: any, seen = new WeakSet<object>()): any {
    if (value === null || typeof value !== 'object') {
      if (typeof value === 'bigint') return String(value);
      return value;
    }
    if (seen.has(value as object)) return undefined;
    seen.add(value as object);
    if ((value as any).buffer && (value as any).BYTES_PER_ELEMENT) return Array.from(value as any);
    if (value instanceof ArrayBuffer) return Array.from(new Uint8Array(value));
    if (Array.isArray(value)) return value.map((v) => this.toPlainJSON(v, seen));
    if (value instanceof Map) return Array.from(value.entries()).map(([k, v]) => [k, this.toPlainJSON(v, seen)]);
    if (value instanceof Set) return Array.from(value.values()).map((v) => this.toPlainJSON(v, seen));
    if (value instanceof Date) return value.toISOString();
    const out: any = {};
    const descs = Object.getOwnPropertyDescriptors(value);
    for (const k of Object.keys(descs)) {
      if (k === 'toJSON') continue;
      const d = descs[k];
      if ('get' in d && typeof (d as any).get === 'function') continue;
      const v = d.value;
      if (typeof v === 'function') continue;
      out[k] = this.toPlainJSON(v, seen);
    }
    return out;
  }
  private safeStringify(value: any): string {
    return JSON.stringify(this.toPlainJSON(value));
  }
  private getAuthHeaders(token: string | null): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Authenticate a wallet address to obtain a backend token
   */
  async authenticateWallet(walletAddress: string): Promise<{ success: boolean; token?: string; message?: string }> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to authenticate wallet');
      }

      const token = data.token || data.data?.token;
      return { success: true, token };
    } catch (error) {
      console.error('Failed to authenticate wallet:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to authenticate wallet',
      };
    }
  }

  /**
   * Send upload metadata with a client-provided walrusCid
   * Requires Authorization header (wallet or zkLogin token)
   */
  async uploadFileMetadata(
    token: string,
    payload: {
      walrusCid: string;
      filename: string;
      fileSize: number;
      contentType?: string;
      enableEncryption?: boolean;
      encryptionKeys?: { encryptionId: string };
      walrusOptions?: { epochs?: number; deletable?: boolean };
    }
  ): Promise<UploadResponse> {
    try {
      const { enableEncryption, encryptionKeys } = payload as any;
      if (enableEncryption) {
        const valid = encryptionKeys && typeof encryptionKeys.encryptionId === 'string' && encryptionKeys.encryptionId.length > 0;
        if (!valid) {
          throw new Error('Invalid encryption keys: encryptionId missing');
        }
      }
      const response = await fetch(`${API_BASE_URL}/file/upload-metadata`, {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(payload),
      });

      const result: UploadResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload metadata failed');
      }

      return result;
    } catch (error) {
      console.error('Failed to upload metadata:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Upload metadata failed',
      };
    }
  }

  /**
   * Fetch user's files from backend
   */
  async getUserFiles(walletAddress: string | null, useTestMode: boolean = false): Promise<FilesResponse> {
    try {
      if (useTestMode) {
        const response = await fetch(`${API_BASE_URL}/files-test`, {
          method: 'GET',
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch files');
        }
        const backendFiles = data.files || data.data || data;
        if (!Array.isArray(backendFiles)) {
          throw new Error('Invalid response format from server');
        }
        const formattedFiles: FileMetadata[] = backendFiles.map((file: any) => ({
          cid: file.cid || file.fileCid,
          filename: file.filename || file.name,
          fileSize: file.fileSize || file.size,
          uploadTimestamp: file.uploadTimestamp || file.timestamp || Date.now(),
          uploader: file.uploader || 'user',
          isOwner: true,
          contentType: file.contentType,
          isEncrypted: file.isEncrypted,
          encryptionKeys: file.encryptionKeys,
        }));
        return {
          success: true,
          data: {
            files: formattedFiles,
          },
        };
      }

      if (!walletAddress) {
        throw new Error('Wallet address required to fetch files');
      }

      const auth = await this.authenticateWallet(walletAddress);
      if (!auth.success || !auth.token) {
        throw new Error(auth.message || 'Failed to authenticate wallet');
      }

      const response = await fetch(`${API_BASE_URL}/files`, {
        method: 'GET',
        headers: this.getAuthHeaders(auth.token),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch files');
      }

      // Normalize the response format
      const backendFiles = data.files || data.data?.files || data.data || data;
      
      if (!Array.isArray(backendFiles)) {
        throw new Error('Invalid response format from server');
      }

      const formattedFiles: FileMetadata[] = backendFiles.map((file: any) => ({
        cid: file.cid || file.fileCid,
        filename: file.filename || file.name,
        fileSize: file.fileSize || file.size,
        uploadTimestamp: file.uploadTimestamp || file.timestamp || Date.now(),
        uploader: file.uploader || 'user',
        isOwner: true,
        contentType: file.contentType,
        isEncrypted: file.isEncrypted,
        encryptionKeys: file.encryptionKeys,
      }));

      return {
        success: true,
        data: {
          files: formattedFiles,
        },
      };
    } catch (error) {
      console.error('Failed to fetch files from backend:', error);
      return {
        success: false,
        data: { files: [] },
        message: error instanceof Error ? error.message : 'Failed to fetch files',
      };
    }
  }

  /**
   * Upload file to backend
   */
  async uploadFile(
    file: File,
    walletAddress: string | null,
    useTestMode: boolean = false,
    encryptionData?: {
      encryptedFile: File;
      encryptionKeys: {
        encryptionId: string;
      };
    }
  ): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      const fileToUpload = encryptionData ? encryptionData.encryptedFile : file;
      formData.append('file', fileToUpload);

      // Debug: Log the endpoint selection
      console.log('🔍 FileService debug:', {
        useTestMode,
        walletAddress,
        hasWalletAddress: !!walletAddress,
        selectedEndpoint: useTestMode 
          ? 'upload-test' 
          : walletAddress 
            ? 'upload-wallet'
            : 'upload'
      });

      const endpoint = useTestMode 
        ? `${API_BASE_URL}/file/upload-test` 
        : walletAddress 
          ? `${API_BASE_URL}/file/upload-wallet`
          : `${API_BASE_URL}/file/upload`;

      const headers: Record<string, string> = {};
      if (walletAddress) {
        headers['X-Wallet-Address'] = walletAddress;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: formData,
      });

      const result: UploadResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Upload failed');
      }

      // Add encryption information to the result if file was encrypted
      if (encryptionData && result.data) {
        result.data = {
          ...result.data,
          encryptionKeys: encryptionData.encryptionKeys,
          isEncrypted: true,
        };
      }

      return result;
    } catch (error) {
      console.error('Failed to upload file:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Download file from backend
   */
  async downloadFile(
    cid: string,
    filename: string,
    walletAddress: string | null,
    useTestMode: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const endpoint = useTestMode 
        ? `${API_BASE_URL}/file/${cid}/download-test` 
        : `${API_BASE_URL}/file/${cid}/download`;

      let headers: Record<string, string> | undefined;
      if (!useTestMode) {
        if (!walletAddress) {
          throw new Error('Wallet address required to download file');
        }
        const auth = await this.authenticateWallet(walletAddress);
        if (!auth.success || !auth.token) {
          throw new Error(auth.message || 'Failed to authenticate wallet');
        }
        headers = this.getAuthHeaders(auth.token);
      }

      const response = await fetch(endpoint, { headers });

      if (!response.ok) {
        let errMsg = 'Failed to download file';
        try {
          const errJson = await response.json();
          errMsg = errJson.message || errMsg;
        } catch {
          try {
            errMsg = await response.text();
          } catch {}
        }
        throw new Error(errMsg);
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      return { success: true };
    } catch (error) {
      console.error('Failed to download file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download file',
      };
    }
  }

  /**
   * Download a file and decrypt if needed (when we have keys)
   */
  async downloadAndMaybeDecrypt(
    file: FileMetadata,
    walletAddress: string | null,
    useTestMode: boolean = false,
    proofParam?: { sessionKey: any; txBytesBase64: string },
    options?: { autoSave?: boolean }
  ): Promise<{ success: boolean; error?: string; blobUrl?: string; blob?: Blob; isDecrypted?: boolean }> {
    try {
      const endpoint = useTestMode 
        ? `${API_BASE_URL}/file/${file.cid}/download-test` 
        : `${API_BASE_URL}/file/${file.cid}/download`;

      let headers: Record<string, string> | undefined;
      let authToken: string | undefined;
      if (!useTestMode) {
        if (!walletAddress) throw new Error('Wallet address required to download file');
        const auth = await this.authenticateWallet(walletAddress);
        if (!auth.success || !auth.token) throw new Error(auth.message || 'Failed to authenticate wallet');
        authToken = auth.token;
        headers = this.getAuthHeaders(authToken);
      }

      const response = await fetch(endpoint, { headers });
      if (!response.ok) {
        let errMsg = 'Failed to download file';
        try {
          const errJson = await response.json();
          errMsg = errJson.message || errMsg;
        } catch {
          try {
            errMsg = await response.text();
          } catch {}
        }
        throw new Error(errMsg);
      }

      const isEncrypted = response.headers.get('X-File-Encrypted') === 'true';
      const sealId = response.headers.get('X-Seal-Encryption-Id');
      const blob = await response.blob();
      console.log('Download headers', { isEncrypted, sealId });

      if (isEncrypted) {
        if (!useTestMode) {
          if (!authToken) throw new Error('Authentication required');
          const proofPayload = proofParam || ((file as any).decryptionProof as { sessionKey: any; txBytesBase64: string } | undefined);
          console.log('Using proof', { hasProof: !!proofPayload, txBytesLen: proofPayload?.txBytesBase64?.length || 0 });
          if (!proofPayload) {
            throw new Error('Decryption proof required (session key + tx bytes)');
          }
          const encBuf = await blob.arrayBuffer();
          const encBytes = new Uint8Array(encBuf);
          let parsedId: string | null = null;
          try { parsedId = EncryptedObject.parse(encBytes).id; } catch {}
          if (!parsedId) {
            const raw = await blob.arrayBuffer();
            const bytes = new Uint8Array(raw);
            const mime = (file.contentType && file.contentType !== 'application/octet-stream' ? file.contentType : (extToMime(file.filename) || magicToMime(bytes) || 'application/octet-stream'));
            const outBlob = new Blob([bytes], { type: mime });
            const url = window.URL.createObjectURL(outBlob);
            if (options?.autoSave === false) {
              return { success: true, blobUrl: url, blob: outBlob, isDecrypted: false };
            }
            const a = document.createElement('a');
            a.href = url;
            a.download = file.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            return { success: true };
          }
          const encryptionId = sealId || file.encryptionKeys?.encryptionId || await this.peekEncryptionId(file, walletAddress, useTestMode);
          if (!encryptionId) throw new Error('Missing encryptionId for decryption');
          let decrypted = await (sealEncryptionService as any).decryptWithProof({
            encryptedData: encBytes,
            encryptionId,
            sessionKey: proofPayload.sessionKey,
            txBytesBase64: String(proofPayload.txBytesBase64),
          }).catch(() => null);
          if (!decrypted && authToken) {
            const resp = await fetch(`${API_BASE_URL}/file/${file.cid}/decrypt`, {
              method: 'POST',
              headers: { ...this.getAuthHeaders(authToken), 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionKey: this.toPlainJSON(proofPayload.sessionKey), txBytesBase64: String(proofPayload.txBytesBase64) }),
            });
            if (resp.ok) {
              const b2 = await resp.blob();
              const ab2 = await b2.arrayBuffer();
              decrypted = new Uint8Array(ab2);
            }
          }
          if (!decrypted) throw new Error('Decryption failed');
          const mime = (file.contentType && file.contentType !== 'application/octet-stream' ? file.contentType : (extToMime(file.filename) || magicToMime(decrypted) || 'application/octet-stream'));
          const outBlob = new Blob([decrypted], { type: mime });
          const url = window.URL.createObjectURL(outBlob);
          if (options?.autoSave === false) {
            return { success: true, blobUrl: url, blob: outBlob, isDecrypted: true };
          }
          const a = document.createElement('a');
          a.href = url;
          a.download = file.filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          return { success: true };
        } else {
          throw new Error('Encrypted content cannot be decrypted in test mode');
        }
      }

      const raw = await blob.arrayBuffer();
      const bytes = new Uint8Array(raw);
      const respCT = response.headers.get('Content-Type');
      const mime = (file.contentType && file.contentType !== 'application/octet-stream' ? file.contentType : (extToMime(file.filename) || magicToMime(bytes) || ((respCT && respCT !== 'application/octet-stream') ? respCT : undefined) || 'application/octet-stream'));
      const outBlob = new Blob([bytes], { type: mime });
      const url = window.URL.createObjectURL(outBlob);
      if (options?.autoSave === false) {
        return { success: true, blobUrl: url, blob: outBlob, isDecrypted: false };
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      return { success: true };
    } catch (error) {
      console.error('Failed to download/decrypt file:', error);
      try {
        const client = createWalrusClientFromSuiClient();
        const walrusBlob = await getWalrusBlob(client as any, file.cid);
        if (walrusBlob) {
          let bytes: Uint8Array | null = null;
          try {
            if (walrusBlob instanceof Uint8Array) {
              bytes = walrusBlob;
            } else if (typeof (walrusBlob as any).arrayBuffer === 'function') {
              const buf = await (walrusBlob as any).arrayBuffer();
              bytes = new Uint8Array(buf);
            } else if ((walrusBlob as any).contents) {
              const c = (walrusBlob as any).contents;
              if (c instanceof Uint8Array) bytes = c;
              else if (typeof c.arrayBuffer === 'function') bytes = new Uint8Array(await c.arrayBuffer());
            } else if ((walrusBlob as any).data) {
              const d = (walrusBlob as any).data;
              if (d instanceof Uint8Array) bytes = d;
              else if (typeof d.arrayBuffer === 'function') bytes = new Uint8Array(await d.arrayBuffer());
            } else if ((walrusBlob as any).bytes) {
              const b = (walrusBlob as any).bytes;
              if (b instanceof Uint8Array) bytes = b;
            }
          } catch {}
          if (!bytes) { throw new Error('Walrus blob content unavailable'); }
          let parsedId: string | null = null;
          try { parsedId = EncryptedObject.parse(bytes).id; } catch {}

          if (parsedId) {
            const proofPayload = proofParam || ((file as any).decryptionProof as { sessionKey: any; txBytesBase64: string } | undefined);
            if (!proofPayload) {
              return { success: false, error: 'Decryption proof required' };
            }
            let dec = await (sealEncryptionService as any).decryptWithProof({
              encryptedData: bytes,
              encryptionId: parsedId,
              sessionKey: proofPayload.sessionKey,
              txBytesBase64: String(proofPayload.txBytesBase64),
            }).catch(() => null);
            if (!dec && authToken) {
              try {
                const resp = await fetch(`${API_BASE_URL}/file/${file.cid}/decrypt`, {
                  method: 'POST',
                  headers: { ...this.getAuthHeaders(authToken), 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sessionKey: this.toPlainJSON(proofPayload.sessionKey), txBytesBase64: String(proofPayload.txBytesBase64) }),
                });
                if (resp.ok) {
                  const b2 = await resp.blob();
                  const ab2 = await b2.arrayBuffer();
                  dec = new Uint8Array(ab2);
                }
              } catch {}
            }
            if (!dec) {
              return { success: false, error: 'Decryption failed' };
            }
            const mime = (file.contentType && file.contentType !== 'application/octet-stream' ? file.contentType : (extToMime(file.filename) || magicToMime(dec) || 'application/octet-stream'));
            const outBlob = new Blob([dec], { type: mime });
            const url = window.URL.createObjectURL(outBlob);
            if (options?.autoSave === false) {
              return { success: true, blobUrl: url, blob: outBlob, isDecrypted: true };
            }
            const a = document.createElement('a');
            a.href = url;
            a.download = file.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            return { success: true };
          } else {
            const mime = (file.contentType && file.contentType !== 'application/octet-stream' ? file.contentType : (extToMime(file.filename) || magicToMime(bytes) || 'application/octet-stream'));
            const outBlob = new Blob([bytes], { type: mime });
            const url = window.URL.createObjectURL(outBlob);
            if (options?.autoSave === false) {
              return { success: true, blobUrl: url, blob: outBlob, isDecrypted: false };
            }
            const a = document.createElement('a');
            a.href = url;
            a.download = file.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            return { success: true };
          }
        }
      } catch (fallbackErr) {
        console.warn('Frontend Walrus fallback failed:', fallbackErr);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download/decrypt file',
      };
    }
  }

  async peekEncryptionId(
    file: FileMetadata,
    walletAddress: string | null,
    useTestMode: boolean = false,
  ): Promise<string | null> {
    try {
      const endpoint = useTestMode 
        ? `${API_BASE_URL}/file/${file.cid}/download-test` 
        : `${API_BASE_URL}/file/${file.cid}/download`;
      let headers: Record<string, string> | undefined;
      if (!useTestMode) {
        if (!walletAddress) throw new Error('Wallet address required');
        const auth = await this.authenticateWallet(walletAddress);
        if (!auth.success || !auth.token) throw new Error(auth.message || 'Failed to authenticate wallet');
        headers = this.getAuthHeaders(auth.token);
      }
      const response = await fetch(endpoint, { headers });
      if (!response.ok) throw new Error('Failed to download file');
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const id = EncryptedObject.parse(new Uint8Array(arrayBuffer)).id;
      return id;
    } catch {
      return null;
    }
  }

  async attachDecryptionProof(
    file: FileMetadata,
    walletAddress: string,
    allowlistId: string,
    signPersonalMessageAsync: (message: Uint8Array) => Promise<string>,
  ): Promise<{ success: boolean; message?: string; proof?: { sessionKey: any; txBytesBase64: string } }> {
    try {
      const encryptionId = file.encryptionKeys?.encryptionId;
      if (!encryptionId) {
        return { success: false, message: 'Missing encryptionId for this file' };
      }
      const proof = await sealEncryptionService.createDecryptionProof({
        walletAddress,
        allowlistId,
        encryptionId,
        signPersonalMessageAsync,
      });
      if (!proof) {
        return { success: false, message: 'Failed to create decryption proof' };
      }
      (file as any).decryptionProof = proof;
      console.log('Decryption proof attached', { txBytesLen: proof.txBytesBase64.length });
      return { success: true, proof };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to attach decryption proof',
      };
    }
  }

  /**
   * Delete all user files from backend
   */
  async clearUserFiles(walletAddress: string | null, useTestMode: boolean = false): Promise<DeleteResponse> {
    try {
      if (useTestMode) {
        const response = await fetch(`${API_BASE_URL}/files-test`, {
          method: 'DELETE',
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to delete files');
        }
        return {
          success: true,
          message: data.message || 'Files deleted successfully',
        };
      }

      if (!walletAddress) {
        throw new Error('Authentication required to delete files');
      }

      const auth = await this.authenticateWallet(walletAddress);
      if (!auth.success || !auth.token) {
        throw new Error(auth.message || 'Failed to authenticate wallet');
      }

      const response = await fetch(`${API_BASE_URL}/files`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(auth.token),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete files');
      }

      return {
        success: true,
        message: data.message || 'Files deleted successfully',
      };
    } catch (error) {
      console.error('Failed to delete files:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete files',
      };
    }
  }

  /**
   * Delete a specific file from backend
   */
  async deleteFile(
    cid: string,
    token: string | null,
    useTestMode: boolean = false
  ): Promise<DeleteResponse> {
    try {
      if (!token && !useTestMode) {
        throw new Error('Authentication required to delete file');
      }

      const endpoint = useTestMode 
        ? `${API_BASE_URL}/file/${cid}/delete-test` 
        : `${API_BASE_URL}/file/${cid}/delete`;

      const headers = this.getAuthHeaders(token);

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete file');
      }

      return {
        success: true,
        message: data.message || 'File deleted successfully',
      };
    } catch (error) {
      console.error('Failed to delete file:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete file',
      };
    }
  }

  /**
   * Download a shared file via share link
   */
  async downloadSharedFile(
    shareId: string,
    token?: string | null
  ): Promise<{
    success: boolean;
    error?: string;
    fileData?: Uint8Array;
    filename?: string;
    contentType?: string;
    isEncrypted?: boolean;
  }> {
    try {
      // Use the new shared file download endpoint
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const downloadResponse = await fetch(`${API_BASE_URL}/file/shared/${shareId}/download`, {
        headers,
      });

      if (!downloadResponse.ok) {
        const errorData = await downloadResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to download shared file');
      }

      // Get file data
      const blob = await downloadResponse.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      // Get filename from Content-Disposition header or use default
      const contentDisposition = downloadResponse.headers.get('Content-Disposition');
      let filename = 'shared-file';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      const contentType = downloadResponse.headers.get('Content-Type') || 'application/octet-stream';
      const isEncrypted = downloadResponse.headers.get('X-File-Encrypted') === 'true';

      return {
        success: true,
        fileData,
        filename,
        contentType,
        isEncrypted,
      };
    } catch (error) {
      console.error('Failed to download shared file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download shared file',
      };
    }
  }
}

export const fileService = new FileService();
