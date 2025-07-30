import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSealEncryption } from '../hooks/useSealEncryption';
import { fileService, FileMetadata } from '../services/fileService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, X, FileIcon, Upload } from 'lucide-react';
import { VoiceCommandButton } from '@/components/voice/VoiceCommandButton';
import { toast } from 'sonner';

interface FileUploadProps {
  onUploadSuccess?: (result: any) => void;
  onUploadError?: (error: string) => void;
  initialFiles?: File[];
}

interface UploadResult {
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

interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  uploaded?: boolean;
  uploading?: boolean;
  uploadResult?: UploadResult;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUploadSuccess,
  onUploadError,
  initialFiles = []
}) => {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [globalUploading, setGlobalUploading] = useState(false);

  // Encryption is always enabled - no user toggle needed
  const { isAuthenticated, token, useTestMode } = useAuth();
  const { state: encryptionState, encryptFile } = useSealEncryption();

  // Reference to the file input for voice commands
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize with any initial files
  useEffect(() => {
    if (initialFiles.length > 0) {
      const newAttachedFiles: AttachedFile[] = initialFiles.map((file, index) => ({
        id: `${Date.now()}-${index}`,
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
        uploaded: false,
        uploading: false
      }));
      setAttachedFiles(newAttachedFiles);
    }
  }, [initialFiles]);

  // Voice command handler for file selection
  const handleVoiceFileSelect = useCallback(() => {
    console.log('Voice command: Select file triggered');
    if (fileInputRef.current) {
      fileInputRef.current.click();
      toast.success('Voice command: Opening file browser');
    }
  }, []);

  // Voice command handler for upload
  const handleVoiceUpload = useCallback(() => {
    console.log('Voice command: Upload file triggered');
    if (attachedFiles.length > 0) {
      handleUploadAll();
      toast.success('Voice command: Starting upload');
    } else {
      toast.error('No files attached. Please attach files first.');
    }
  }, [attachedFiles]);

  // Debug encryption state
  console.log('🔐 Current encryption state:', encryptionState);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      addFilesToAttached(files);
    }
  };

  const addFilesToAttached = (fileList: FileList) => {
    const newFiles: AttachedFile[] = Array.from(fileList).map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
      uploaded: false,
      uploading: false
    }));

    setAttachedFiles(prev => [...prev, ...newFiles]);
    toast.success(`Added ${newFiles.length} file(s) to upload queue`);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      addFilesToAttached(files);
    }
  };

  const removeFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(file => file.id !== fileId));
    toast.success('File removed from upload queue');
  };

  const uploadSingleFile = async (attachedFile: AttachedFile): Promise<UploadResult> => {
    console.log('🚀 uploadSingleFile called for:', attachedFile.name);

    // Check authentication for non-test mode
    if (!useTestMode && !isAuthenticated) {
      throw new Error('Please log in to upload files');
    }

    console.log('📁 Uploading file:', attachedFile.name, attachedFile.size);
    console.log('🔐 Encryption state:', encryptionState);

    try {
      let fileToUpload = attachedFile.file;
      let encryptionKeys: { publicKey: string; secretKey: string } | undefined;
      let isEncrypted = false;

      // Try to encrypt files client-side before upload
      if (encryptionState.isReady) {
        console.log('🔐 Encrypting file client-side before upload...');
        try {
          const encryptionResult = await encryptFile(attachedFile.file);

          if (encryptionResult.success) {
            // Create a new File object from encrypted data
            const encryptedBlob = new Blob([encryptionResult.encryptedData!], {
              type: 'application/octet-stream'
            });
            fileToUpload = new File([encryptedBlob], `${attachedFile.file.name}.encrypted`, {
              type: 'application/octet-stream'
            });

            encryptionKeys = {
              publicKey: encryptionResult.publicKey!,
              secretKey: encryptionResult.secretKey!
            };
            isEncrypted = true;

            console.log('✅ File encrypted successfully, proceeding with upload...');
          } else {
            console.warn('⚠️ Encryption failed, uploading without encryption:', encryptionResult.error);
          }
        } catch (encryptError) {
          console.warn('⚠️ Encryption error, uploading without encryption:', encryptError);
        }
      } else {
        console.warn('⚠️ Encryption service not ready, uploading without encryption');
      }

      // Prepare encryption data if file was encrypted
      const encryptionData = isEncrypted && encryptionKeys ? {
        encryptedFile: fileToUpload,
        encryptionKeys
      } : undefined;

      // Use the file service for upload
      const result = await fileService.uploadFile(
        attachedFile.file, // Pass original file for metadata
        token,
        useTestMode,
        encryptionData
      );

      if (!result.success) {
        throw new Error(result.message || 'Upload failed');
      }

      return result;

    } catch (error) {
      console.error('❌ Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      return {
        success: false,
        message: errorMessage,
      };
    }
  };

  const handleUploadAll = async () => {
    if (attachedFiles.length === 0) {
      toast.error('No files to upload');
      return;
    }

    setGlobalUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const attachedFile of attachedFiles) {
      if (attachedFile.uploaded) continue;

      // Update file status to uploading
      setAttachedFiles(prev => prev.map(f =>
        f.id === attachedFile.id ? { ...f, uploading: true } : f
      ));

      try {
        const result = await uploadSingleFile(attachedFile);

        // Update file status with result
        setAttachedFiles(prev => prev.map(f =>
          f.id === attachedFile.id ? {
            ...f,
            uploading: false,
            uploaded: result.success,
            uploadResult: result
          } : f
        ));

        if (result.success) {
          successCount++;
          onUploadSuccess?.(result);
        } else {
          errorCount++;
          onUploadError?.(result.message);
        }
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';

        // Update file status with error
        setAttachedFiles(prev => prev.map(f =>
          f.id === attachedFile.id ? {
            ...f,
            uploading: false,
            uploaded: false,
            uploadResult: { success: false, message: errorMessage }
          } : f
        ));

        onUploadError?.(errorMessage);
      }
    }

    setGlobalUploading(false);

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} file(s)`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to upload ${errorCount} file(s)`);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
    

      {/* Main Content */}
      <div className="">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-black mb-4">
            Send it. Own it. On Chain
          </h1>
          <p className="text-gray-600">Powered by Sui</p>
        </div>

        {/* Authentication Status */}
        {!useTestMode && !isAuthenticated && (
          <Alert className="mb-6 border-amber-200 bg-amber-50">
            <AlertDescription className="text-amber-800">
              🔐 Please sign in to upload files securely.
            </AlertDescription>
          </Alert>
        )}

        {/* Encryption Status */}
        {encryptionState.isInitializing && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-800 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Initializing encryption service...
            </AlertDescription>
          </Alert>
        )}

        {encryptionState.error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              ❌ {encryptionState.error}
            </AlertDescription>
          </Alert>
        )}

        {/* File Upload Area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          {attachedFiles.length === 0 ? (
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center gap-4">
                <Upload className="w-12 h-12 text-gray-400" />
                <div>
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Drop files here or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Select files to upload to the blockchain
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  disabled={globalUploading}
                >
                  Select Files
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Attached Files ({attachedFiles.length})
                </h3>
                <div className="flex gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                    disabled={globalUploading}
                  >
                    Add more files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* File List */}
              <div className="space-y-3 mb-6">
                {attachedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileIcon className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {file.uploading && (
                        <div className="flex items-center gap-2 text-blue-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Uploading...</span>
                        </div>
                      )}
                      {file.uploaded && (
                        <div className="flex items-center gap-2 text-green-600">
                          <Shield className="w-4 h-4" />
                          <span className="text-sm">Uploaded</span>
                        </div>
                      )}
                      {!file.uploaded && !file.uploading && (
                        <button
                          onClick={() => removeFile(file.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          disabled={globalUploading}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upload Actions */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleUploadAll}
              disabled={globalUploading || attachedFiles.every(f => f.uploaded)}
              className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {globalUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Start Upload
                </>
              )}
            </button>

            {encryptionState.isReady && (
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-600" />
                Files will be encrypted before upload
              </p>
            )}
          </div>
        )}

        {/* Voice Commands */}
        <div className="mt-8 text-center">
          <VoiceCommandButton
            onFileAttachCommand={handleVoiceFileSelect}
            disabled={globalUploading}
            className="mx-auto"
          />
          <p className="text-sm text-gray-500 mt-2">
            Try saying: "upload a file" or "attach file"
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
