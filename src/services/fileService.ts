/**
 * File service for backend API integration
 * Handles all file-related operations with proper authentication
 */

// const API_BASE_URL = 'https://backend-96n2.onrender.com';
const API_BASE_URL ="http://localhost:3000";

import { sealEncryptionService } from './sealEncryptionService';

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
    publicKey: string;
    secretKey: string;
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
      publicKey: string;
      secretKey: string;
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
  private getAuthHeaders(token: string | null): Record<string, string> {
    const headers: Record<string, string> = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Fetch user's files from backend
   */
  async getUserFiles(token: string | null, useTestMode: boolean = false): Promise<FilesResponse> {
    try {
      const endpoint = useTestMode ? `${API_BASE_URL}/files-test` : `${API_BASE_URL}/files`;
      const headers = this.getAuthHeaders(token);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          data: { files: [] },
          message: data.message || 'Failed to fetch files',
        };
      }

      return {
        success: true,
        data: data.data || { files: [] },
        message: data.message,
      };
    } catch (error) {
      console.error('Failed to fetch files:', error);
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
    token: string | null,
    useTestMode: boolean = false,
    encryptionData?: {
      encryptedFile: File;
      encryptionKeys: {
        publicKey: string;
        secretKey: string;
      };
    }
  ): Promise<UploadResponse> {
    try {
      const endpoint = useTestMode ? `${API_BASE_URL}/file/upload-test` : `${API_BASE_URL}/file/upload`;

      const formData = new FormData();

      // If encryption data provided, upload the encrypted file instead of original
      if (encryptionData) {
        formData.append('file', encryptionData.encryptedFile);
      } else {
        formData.append('file', file);
      }

      // Do NOT set Content-Type when sending FormData; the browser will set the correct multipart boundary
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: result.message || 'File upload failed',
        };
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
    token: string | null,
    useTestMode: boolean = false,
    options?: { secretKey?: string; contentType?: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const endpoint = useTestMode 
        ? `${API_BASE_URL}/file/${cid}/download-test` 
        : `${API_BASE_URL}/file/${cid}/download`;

      // Include Authorization header when token is provided
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      // Check encryption headers
      const encryptedHeader = response.headers.get('X-File-Encrypted') === 'true';
      const encryptionIdHeader = response.headers.get('X-Seal-Encryption-Id') || undefined;

      if (encryptedHeader) {
        // In test mode, just download the encrypted file as-is
        if (useTestMode) {
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
        }

        // Try client-side decryption if we have a secret key
        if (options?.secretKey) {
          try {
            console.log('File is encrypted, attempting client-side decryption...', { encryptionIdHeader });
            const encryptedBlob = await response.blob();
            const encryptedArrayBuffer = await encryptedBlob.arrayBuffer();
            const encryptedBytes = new Uint8Array(encryptedArrayBuffer);

            await sealEncryptionService.initialize();
            const dec = await sealEncryptionService.decryptFile(encryptedBytes, options.secretKey);

            if (dec.success && dec.decryptedData) {
              const contentType = options?.contentType || response.headers.get('Content-Type') || 'application/octet-stream';
              const decryptedBlob = new Blob([dec.decryptedData], { type: contentType });
              const url = window.URL.createObjectURL(decryptedBlob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              return { success: true };
            } else {
              console.warn('Client-side decryption failed, falling back to backend decryption.', dec.error);
              return this.downloadAndDecryptFile(cid, filename, token);
            }
          } catch (e) {
            console.warn('Client-side decryption error, falling back to backend decryption.', e);
            return this.downloadAndDecryptFile(cid, filename, token);
          }
        }

        console.log('Encrypted file but no secret key provided; using backend decryption...');
        return this.downloadAndDecryptFile(cid, filename, token);
      }

      // File is not encrypted, download normally
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
   * Download and decrypt an encrypted file using backend decryption
   */
  async downloadAndDecryptFile(
    cid: string,
    filename: string,
    token: string | null
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const endpoint = `${API_BASE_URL}/file/${cid}/download-encrypted`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({}), // Empty body - backend handles decryption
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to download and decrypt file');
      }

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
      console.error('Failed to download and decrypt file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download and decrypt file',
      };
    }
  }

  /**
   * Clear all user's files
   */
  async clearUserFiles(token: string | null, useTestMode: boolean = false): Promise<DeleteResponse> {
    try {
      const endpoint = useTestMode ? `${API_BASE_URL}/files-test` : `${API_BASE_URL}/files`;
      const headers = this.getAuthHeaders(token);

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to clear files');
      }

      return {
        success: true,
        message: data.message || 'All files cleared successfully',
      };
    } catch (error) {
      console.error('Failed to clear files:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to clear files',
      };
    }
  }

  /**
   * Delete a specific file
   */
  async deleteFile(
    cid: string,
    token: string | null,
    useTestMode: boolean = false
  ): Promise<DeleteResponse> {
    try {
      const endpoint = useTestMode ? `${API_BASE_URL}/file/${cid}/delete-test` : `${API_BASE_URL}/file/${cid}`;
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
    encryptionId?: string;
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
      const encryptionId = downloadResponse.headers.get('X-Seal-Encryption-Id') || undefined;

      return {
        success: true,
        fileData,
        filename,
        contentType,
        isEncrypted,
        encryptionId,
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
