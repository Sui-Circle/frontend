import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { accessControlService } from '@/services/accessControlService';
import { fileService } from '@/services/fileService';

interface SharedFileViewerProps {
  shareId: string;
  onNavigateToAuth: () => void;
  onNavigateToLanding: () => void;
}

interface ShareLinkData {
  fileCid: string;
  filename?: string;
  fileSize?: number;
  contentType?: string;
  isEncrypted?: boolean;
}

interface FileContent {
  data: Uint8Array;
  contentType: string;
  filename: string;
  isEncrypted?: boolean;
}

export const SharedFileViewer: React.FC<SharedFileViewerProps> = ({
  shareId,
  onNavigateToAuth,
  onNavigateToLanding,
}) => {
  const { isAuthenticated, user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<ShareLinkData | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    validateShareLink();
  }, [shareId, isAuthenticated]);

  const validateShareLink = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate the share link using the service
      const result = await accessControlService.validateShareLink(shareId);

      if (!result.success) {
        throw new Error(result.message || 'Invalid share link');
      }

      if (result.data) {
        setShareData({
          fileCid: result.data.fileCid,
          filename: result.data.filename,
          fileSize: result.data.fileSize,
          contentType: result.data.contentType,
          isEncrypted: result.data.isEncrypted,
        });

        // If user is authenticated, try to load the file
        if (isAuthenticated && token) {
          await loadFileContent();
        }
      }
    } catch (error) {
      console.error('Failed to validate share link:', error);
      setError(error instanceof Error ? error.message : 'Failed to validate share link');
    } finally {
      setLoading(false);
    }
  };

  const loadFileContent = async () => {
    if (!shareData?.fileCid) return;
    try {
      // Use the shared file download service
      const result = await fileService.downloadSharedFile(shareId, token);

      if (!result.success) {
        throw new Error(result.error || 'Failed to download file');
      }

      if (result.fileData && result.filename && result.contentType) {
        console.log('📁 Setting file content with filename:', result.filename);
        console.log('📁 File content type:', result.contentType);
        console.log('📁 File encrypted:', result.isEncrypted);

        setFileContent({
          data: result.fileData,
          contentType: result.contentType,
          filename: result.filename,
          isEncrypted: result.isEncrypted,
        });

        // Update the share data with the correct filename from the download
        if (shareData && result.filename !== shareData.filename) {
          console.log('📁 Updating share data filename from', shareData.filename, 'to', result.filename);
          setShareData({
            ...shareData,
            filename: result.filename,
            isEncrypted: result.isEncrypted || shareData.isEncrypted,
          });
        }

        // Show warning if file is encrypted
        if (result.isEncrypted) {
          toast.warning('This file is encrypted and will download in encrypted format. Contact the file owner for decryption access if needed.');
        }
      } else {
        console.log('❌ File download result missing data:', {
          hasFileData: !!result.fileData,
          filename: result.filename,
          contentType: result.contentType
        });
      }
    } catch (error) {
      console.error('Failed to load file content:', error);
      setError('Failed to load file content. You may not have permission to access this file.');
    }
  };

  const handleDownload = () => {
    if (!fileContent) return;

    const blob = new Blob([fileContent.data], { type: fileContent.contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileContent.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('File downloaded successfully!');
  };

  const renderFileContent = () => {
    if (!fileContent) return null;

    const { data, contentType, filename } = fileContent;
    console.log('🎨 Rendering file content with filename:', filename, 'contentType:', contentType);

    // Handle text files and code files
    if (contentType.startsWith('text/') ||
        contentType === 'application/json' ||
        contentType === 'application/javascript' ||
        contentType === 'application/xml' ||
        filename.endsWith('.md') ||
        filename.endsWith('.txt') ||
        filename.endsWith('.js') ||
        filename.endsWith('.ts') ||
        filename.endsWith('.jsx') ||
        filename.endsWith('.tsx') ||
        filename.endsWith('.css') ||
        filename.endsWith('.html') ||
        filename.endsWith('.xml') ||
        filename.endsWith('.json') ||
        filename.endsWith('.yml') ||
        filename.endsWith('.yaml')) {
      try {
        const text = new TextDecoder().decode(data);
        return (
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="font-semibold mb-2">File Content:</h3>
            <div className="bg-white rounded border">
              <div className="bg-gray-100 px-3 py-2 border-b text-sm text-gray-600">
                {filename} ({(data.length / 1024).toFixed(2)} KB)
              </div>
              <pre className="whitespace-pre-wrap text-sm p-3 max-h-96 overflow-auto font-mono">
                {text}
              </pre>
            </div>
          </div>
        );
      } catch (error) {
        return (
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <p className="text-yellow-800">Unable to display text content. File may be corrupted or in an unsupported encoding.</p>
          </div>
        );
      }
    }

    // Handle images
    if (contentType.startsWith('image/')) {
      const blob = new Blob([data], { type: contentType });
      const imageUrl = URL.createObjectURL(blob);
      return (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h3 className="font-semibold mb-2">Image Preview:</h3>
          <div className="bg-white rounded border p-2">
            <div className="bg-gray-100 px-3 py-2 border-b text-sm text-gray-600 mb-2">
              {filename} ({(data.length / 1024).toFixed(2)} KB)
            </div>
            <div className="flex justify-center">
              <img
                src={imageUrl}
                alt={filename}
                className="max-w-full max-h-96 object-contain rounded"
                onLoad={() => URL.revokeObjectURL(imageUrl)}
              />
            </div>
          </div>
        </div>
      );
    }

    // Handle PDF files
    if (contentType === 'application/pdf') {
      const blob = new Blob([data], { type: contentType });
      const pdfUrl = URL.createObjectURL(blob);
      return (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h3 className="font-semibold mb-2">PDF Preview:</h3>
          <div className="bg-white rounded border">
            <div className="bg-gray-100 px-3 py-2 border-b text-sm text-gray-600">
              {filename} ({(data.length / 1024).toFixed(2)} KB)
            </div>
            <iframe
              src={pdfUrl}
              className="w-full h-96 border-0"
              title={filename}
              onLoad={() => URL.revokeObjectURL(pdfUrl)}
            />
          </div>
        </div>
      );
    }

    // Handle audio files
    if (contentType.startsWith('audio/')) {
      const blob = new Blob([data], { type: contentType });
      const audioUrl = URL.createObjectURL(blob);
      return (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h3 className="font-semibold mb-2">Audio Player:</h3>
          <div className="bg-white rounded border p-4">
            <div className="bg-gray-100 px-3 py-2 border-b text-sm text-gray-600 mb-4">
              {filename} ({(data.length / 1024).toFixed(2)} KB)
            </div>
            <audio
              controls
              className="w-full"
              onLoadStart={() => URL.revokeObjectURL(audioUrl)}
            >
              <source src={audioUrl} type={contentType} />
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      );
    }

    // Handle video files
    if (contentType.startsWith('video/')) {
      const blob = new Blob([data], { type: contentType });
      const videoUrl = URL.createObjectURL(blob);
      return (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h3 className="font-semibold mb-2">Video Player:</h3>
          <div className="bg-white rounded border p-4">
            <div className="bg-gray-100 px-3 py-2 border-b text-sm text-gray-600 mb-4">
              {filename} ({(data.length / 1024).toFixed(2)} KB)
            </div>
            <video
              controls
              className="w-full max-h-96"
              onLoadStart={() => URL.revokeObjectURL(videoUrl)}
            >
              <source src={videoUrl} type={contentType} />
              Your browser does not support the video element.
            </video>
          </div>
        </div>
      );
    }

    // For other file types, show file info
    return (
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold mb-2">File Information:</h3>
        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            <strong>Name:</strong> {filename}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Type:</strong> {contentType}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Size:</strong> {(data.length / 1024).toFixed(2)} KB
          </p>
        </div>
        <div className="mt-4 p-3 bg-blue-100 rounded">
          <p className="text-blue-800 text-sm">
            This file type cannot be previewed in the browser. Use the download button to save it to your device.
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating share link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow-lg">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <Button onClick={onNavigateToAuth} className="w-full">
              Sign In to Access
            </Button>
            <Button onClick={onNavigateToLanding} variant="outline" className="w-full">
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow-lg">
          <div className="text-blue-500 text-6xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h1>
          <p className="text-gray-600 mb-6">
            You need to sign in to access this shared file.
          </p>
          <div className="space-y-3">
            <Button onClick={onNavigateToAuth} className="w-full">
              Sign In
            </Button>
            <Button onClick={onNavigateToLanding} variant="outline" className="w-full">
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Shared File</h1>
            <Button onClick={onNavigateToLanding} variant="outline">
              ← Back to Home
            </Button>
          </div>
          
          {shareData && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="font-semibold text-lg">
                  {fileContent?.filename || shareData.filename || 'Shared File'}
                </h2>
                {(fileContent?.isEncrypted || shareData.isEncrypted) && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    🔒 Encrypted
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">
                File ID: {shareData.fileCid}
              </p>
              {user && (
                <p className="text-sm text-gray-600">
                  Accessed by: {user.email || user.zkLoginAddress}
                </p>
              )}
              {(fileContent?.isEncrypted || shareData.isEncrypted) && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-600">🔒</span>
                    <div>
                      <p className="font-medium">This file is encrypted</p>
                      <p className="mt-1">
                        This file was encrypted during upload. The downloaded content will be in encrypted format
                        and may require the file owner to provide decryption access or use specialized decryption tools.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* File Content */}
        {fileContent && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">File Content</h2>
              <div className="space-x-3">
                <Button onClick={() => setShowContent(!showContent)} variant="outline">
                  {showContent ? 'Hide Content' : 'Show Content'}
                </Button>
                <Button onClick={handleDownload}>
                  Download File
                </Button>
              </div>
            </div>

            {showContent && renderFileContent()}
          </div>
        )}

        {/* Actions */}
        {!fileContent && shareData && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">File Access</h2>
            <p className="text-gray-600 mb-4">
              The file is available for download, but content preview is not available.
            </p>
            <Button onClick={() => loadFileContent()}>
              Load File
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
