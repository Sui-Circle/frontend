/**
 * File service for backend API integration
 * Handles all file-related operations with proper authentication
 */

const API_BASE_URL = 'https://backend-96n2.onrender.com';

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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

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
        throw new Error(data.message || 'Failed to fetch files');
      }

      // Normalize the response format
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
      const formData = new FormData();
      const fileToUpload = encryptionData ? encryptionData.encryptedFile : file;
      formData.append('file', fileToUpload);

      const endpoint = useTestMode 
        ? `${API_BASE_URL}/file/upload-test` 
        : `${API_BASE_URL}/file/upload`;

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
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
    useTestMode: boolean = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const endpoint = useTestMode 
        ? `/api/file/${cid}/download-test` 
        : `/api/file/${cid}/download`;

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error('Failed to download file');
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
   * Delete all user files from backend
   */
  async clearUserFiles(token: string | null, useTestMode: boolean = false): Promise<DeleteResponse> {
    try {
      if (!token && !useTestMode) {
        throw new Error('Authentication required to delete files');
      }

      const endpoint = useTestMode 
        ? `${API_BASE_URL}/files-test` 
        : `${API_BASE_URL}/files`;

      const headers = this.getAuthHeaders(token);

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers,
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
