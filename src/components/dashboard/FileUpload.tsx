import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSealEncryption } from '../../hooks/useSealEncryption';
import { fileService } from '../../services/fileService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, X, FileIcon, Upload } from 'lucide-react';
// import { VoiceCommandButton } from '@/components/voice/VoiceCommandButton';
import { toast } from 'sonner';
import { useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { createWalrusClientFromSuiClient, uploadEncryptedBytes } from '../../services/walrusUploadService';

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
      encryptionId: string;
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
  const { isAuthenticated, useTestMode, user } = useAuth();
  const { state: encryptionState, encryptFile } = useSealEncryption();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();

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
      const WALRUS_EPOCHS = 53; // default retention epochs; adjust as needed

      let encryptionKeys: { encryptionId: string } | undefined;
      let isEncrypted = false;

      // Helper: read File to Uint8Array
      const fileToUint8Array = (file: File) =>
        new Promise<Uint8Array>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });

      // Encrypt client-side if ready
      let bytesToUpload: Uint8Array;
      let encryptionId: string | undefined;
      if (encryptionState.isReady) {
        console.log('🔐 Encrypting file client-side before Walrus upload...');
        try {
          const encryptionResult = await encryptFile(attachedFile.file);
          if (encryptionResult.success && encryptionResult.encryptedData) {
            bytesToUpload = encryptionResult.encryptedData as Uint8Array;
            encryptionId = encryptionResult.encryptionId;
            encryptionKeys = {
              encryptionId: encryptionResult.encryptionId!,
            };
            isEncrypted = true;
            console.log('✅ Encryption succeeded. Encryption ID:', encryptionId);
          } else {
            console.warn('⚠️ Encryption failed; uploading plaintext bytes to Walrus');
            bytesToUpload = await fileToUint8Array(attachedFile.file);
          }
        } catch (encryptError) {
          console.warn('⚠️ Encryption error; uploading plaintext bytes to Walrus:', encryptError);
          bytesToUpload = await fileToUint8Array(attachedFile.file);
        }
      } else {
        console.warn('⚠️ Encryption service not ready; uploading plaintext bytes to Walrus');
        bytesToUpload = await fileToUint8Array(attachedFile.file);
      }

      // In test mode, fall back to backend test upload endpoint
      if (useTestMode) {
        let encryptionPayload: {
          encryptedFile: File;
          encryptionKeys: { encryptionId: string };
        } | undefined;

        if (isEncrypted && encryptionKeys) {
          const encryptedBlob = new Blob([bytesToUpload], { type: 'application/octet-stream' });
          const encryptedFileObj = new File(
            [encryptedBlob],
            `${attachedFile.file.name}.encrypted`,
            { type: 'application/octet-stream' }
          );
          encryptionPayload = {
            encryptedFile: encryptedFileObj,
            encryptionKeys,
          };
        }

        const result = await fileService.uploadFile(
          attachedFile.file,
          user?.address || null,
          true,
          encryptionPayload,
        );
        if (!result.success) throw new Error(result.message || 'Upload failed');
        return result;
      }

      if (!user?.address) {
        throw new Error('Wallet address required for Walrus upload');
      }

      // Check if user has WAL tokens before attempting upload
      console.log('💰 Checking wallet balance...');
      console.log('👤 Connected wallet:', user.address);
      const walTokenType = '0x8270feb7375eee355e64fdb69c50abb6b5f9393a722883c1cf45f8e26048810a::wal::WAL';
      
      try {
        const walBalance = await suiClient.getBalance({
          owner: user.address,
          coinType: walTokenType,
        });
        
        console.log('📥 Balance response:', walBalance);
        const walBalanceInMIST = parseInt(walBalance.totalBalance);
        const walBalanceInWAL = walBalanceInMIST / 1_000_000_000; // Convert from MIST to WAL
        console.log(`💎 WAL Balance (raw): ${walBalanceInMIST} MIST`);
        console.log(`💎 WAL Balance: ${walBalanceInWAL} WAL`);
        console.log(`📦 File size: ${bytesToUpload.length} bytes`);
        console.log(`⏱️  Epochs: ${WALRUS_EPOCHS}`);
        
        // Estimate required WAL (very rough estimate: ~0.001 WAL per KB per epoch)
        const fileSizeKB = bytesToUpload.length / 1024;
        const estimatedWALNeeded = (fileSizeKB * WALRUS_EPOCHS * 0.001);
        console.log(`📊 Estimated WAL needed: ~${estimatedWALNeeded.toFixed(6)} WAL`);
        
        if (walBalanceInMIST === 0) {
          throw new Error(
            `You need WAL tokens to upload to Walrus.\n\n` +
            `Your wallet: ${user.address}\n\n` +
            `You have: 0 WAL\n` +
            `Estimated needed: ${estimatedWALNeeded.toFixed(2)} WAL\n\n` +
            `Please get WAL tokens from:\n` +
            `1. Walrus Discord faucet: https://discord.gg/walrus\n` +
            `2. Or swap SUI for WAL on a testnet DEX`
          );
        }
        
        if (walBalanceInWAL < estimatedWALNeeded) {
          console.warn(`⚠️  Warning: Your WAL balance (${walBalanceInWAL} WAL) is likely insufficient`);
          console.warn(`   You have: ${walBalanceInWAL.toFixed(6)} WAL`);
          console.warn(`   Estimated needed: ${estimatedWALNeeded.toFixed(6)} WAL`);
          console.warn(`   Attempting upload anyway - wallet transaction will show exact amount needed`);
        } else {
          console.log(`✅ WAL balance is sufficient for upload`);
        }
      } catch (balanceError: any) {
        if (balanceError.message?.includes('need WAL tokens')) {
          throw balanceError;
        }
        console.warn('Could not check WAL balance:', balanceError);
        // Continue anyway - let the upload attempt and show error if insufficient
      }

      // Upload to Walrus with user's wallet signing (user must approve in wallet)
      console.log('📤 Starting Walrus upload with user wallet:', user.address);
      const walrusClient = createWalrusClientFromSuiClient();
      
      const writeRes = await uploadEncryptedBytes(
        walrusClient,
        bytesToUpload,
        WALRUS_EPOCHS,
        user.address,
        signAndExecute,
        false // deletable
      );
      const walrusCid = writeRes.blobId;
      console.log('✅ Walrus upload complete! Blob ID:', walrusCid);

      // Authenticate wallet to get backend token
      const auth = await fileService.authenticateWallet(user.address);
      if (!auth.success || !auth.token) {
        throw new Error(auth.message || 'Failed to authenticate wallet');
      }

      // Send metadata to backend to record the upload
      const metaResult = await fileService.uploadFileMetadata(auth.token, {
        walrusCid,
        filename: attachedFile.name,
        fileSize: attachedFile.size,
        contentType: attachedFile.type || 'application/octet-stream',
        enableEncryption: isEncrypted,
        encryptionKeys,
        walrusOptions: { epochs: WALRUS_EPOCHS, deletable: false },
      });

      if (!metaResult.success) {
        throw new Error(metaResult.message || 'Upload metadata failed');
      }

      return metaResult;

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

    // Debug: Check authentication status
    console.log('🔍 Upload authentication check:', {
      isAuthenticated,
      user,
      hasWalletAddress: !!user?.address,
      useTestMode
    });

    // Check if we have proper authentication
    if (!useTestMode && !user?.address) {
      toast.error('Please connect your wallet to upload files');
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

      </div>
    </div>
  );
};

export default FileUpload;
