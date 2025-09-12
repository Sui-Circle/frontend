import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fileService, FileMetadata } from '../../services/fileService';
import AccessControlStatus from './AccessControlStatus';
import AccessControlConfig from './AccessControlConfig';
import { accessControlService } from '../../services/accessControlService';
import { toast } from 'sonner';
import './FileList.css';



interface FileListProps {
  refreshTrigger?: number; // Used to trigger refresh from parent
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileMetadata;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, file }) => {
  const handleAccessControlCreated = (result: any) => {
    console.log('Access control created:', result);
    onClose();
  };

  const handleAccessControlUpdated = (result: any) => {
    console.log('Access control updated:', result);
    onClose();
  };

  const handleError = (error: string) => {
    console.error('Access control error:', error);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content access-control-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Access Control Settings for {file.filename}</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <AccessControlConfig
            fileCid={file.cid}
            onAccessControlCreated={handleAccessControlCreated}
            onAccessControlUpdated={handleAccessControlUpdated}
            onError={handleError}
          />
        </div>
      </div>
    </div>
  );
};

const FileList: React.FC<FileListProps> = ({ refreshTrigger }) => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const { useTestMode, user, isAuthenticated } = useAuth();

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check authentication for non-test mode
      if (!useTestMode && !isAuthenticated) {
        setError('Please log in to view your files.');
        setFiles([]);
        return;
      }

      // Fetch files from backend using the file service
      const result = await fileService.getUserFiles(user?.address || null, useTestMode);

      if (result.success) {
        setFiles(result.data.files);

        if (result.data.files.length === 0) {
          setError('No files uploaded yet. Upload a file to see it here.');
        }
      } else {
        setError(result.message || 'Failed to fetch files from server.');
        setFiles([]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch files';
      setError(errorMessage);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (cid: string, filename: string) => {
    try {
      const result = await fileService.downloadFile(cid, filename, useTestMode);

      if (!result.success) {
        throw new Error(result.error || 'Failed to download file');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to download file');
    }
  };

  const generateQuickShareLink = async (cid: string, filename: string) => {
    try {
      const result = await accessControlService.generateShareLink(
        user?.address || null,
        {
          fileCid: cid,
          expirationTime: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
          maxUses: 100, // Maximum 100 uses
        },
        useTestMode
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      if (result.data?.shareLink) {
        // Copy to clipboard
        await navigator.clipboard.writeText(result.data.shareLink);
        toast.success(`Share link copied to clipboard for ${filename}!`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate share link';
      toast.error(errorMessage);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  const openSettingsModal = (file: FileMetadata) => {
    setSelectedFile(file);
    setIsSettingsModalOpen(true);
  };

  const closeSettingsModal = () => {
    setIsSettingsModalOpen(false);
    setSelectedFile(null);
  };


  useEffect(() => {
    fetchFiles();
  }, [refreshTrigger, isAuthenticated, useTestMode]); // Re-fetch when auth state changes

  if (loading) {
    return (
      <div className="file-list-container">
        <div className="loading">
          <p className="text-gray-500 text-center">Loading files...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="file-list-container">
        <div className="error">
          <p className="text-red-600 text-center mb-4">Error: {error}</p>
          {(!useTestMode && !isAuthenticated) ? (
            <p className="text-gray-500 text-center">
              Please log in to access your files.
            </p>
          ) : (
            <div className="text-center">
              <button onClick={fetchFiles} className="retry-button">
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="file-list-container">
      {files.length === 0 ? (
        <div className="no-files">
          <p className="text-gray-500 text-center">No files uploaded yet.</p>
        </div>
      ) : (
        <div className="files-section">
          {/* Selected Label */}
          <div className="section-header">
            <span className="section-label">SELECTED</span>
          </div>

          {/* File List */}
          <div className="files-list">
            {files.map((file) => (
              <div key={file.cid} className="file-item">
                <div className="file-main">
                  <div className="file-info">
                    <div className="file-name">{file.filename}</div>
                    <div className="file-actions-header">
                      <div className="file-status">
                        <span className="status-badge completed">COMPLETED ✓</span>
                      </div>
                      <button
                        className="settings-icon"
                        onClick={() => openSettingsModal(file)}
                        title="Settings"
                      >
                        ⚙️
                      </button>
                    </div>
                  </div>
                </div>

                <div className="file-details">
                  <div className="detail-row">
                    <span className="detail-label">CID</span>
                    <span className="detail-value">{file.cid.substring(0, 20)}...</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Uploaded</span>
                    <span className="detail-value">{formatDate(file.uploadTimestamp)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Size</span>
                    <span className="detail-value">{formatFileSize(file.fileSize)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Access Control</span>
                    <AccessControlStatus fileCid={file.cid} fileName={file.filename} className="mt-1" />
                  </div>
                </div>

                {/* Hidden action buttons - can be shown on hover or click */}
                <div className="file-actions hidden">
                  <button
                    onClick={() => downloadFile(file.cid, file.filename)}
                    className="action-button download"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => generateQuickShareLink(file.cid, file.filename)}
                    className="action-button share"
                    title="Generate and copy share link"
                  >
                    Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {selectedFile && (
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={closeSettingsModal}
          file={selectedFile}
        />
      )}

    </div>
  );
};

export default FileList;
