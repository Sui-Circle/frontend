import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fileService, FileMetadata } from '../services/fileService';
import AccessControlStatus from './AccessControlStatus';
import AccessControlConfig from './AccessControlConfig';
import { accessControlService } from '../services/accessControlService';
import { toast } from 'sonner';



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
  const { useTestMode, token, isAuthenticated } = useAuth();

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
      const result = await fileService.getUserFiles(token, useTestMode);

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
        token,
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

  // const clearFiles = async () => {
  //   try {
  //     // Check authentication for non-test mode
  //     if (!useTestMode && !isAuthenticated) {
  //       setError('Please log in to delete files.');
  //       return;
  //     }

  //     setLoading(true);
  //     const result = await fileService.clearUserFiles(token, useTestMode);

  //     if (result.success) {
  //       setFiles([]);
  //       setError('All files deleted successfully.');
  //     } else {
  //       setError(result.message || 'Failed to delete files.');
  //     }
  //   } catch (error) {
  //     setError(error instanceof Error ? error.message : 'Failed to delete files.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

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

      <style>{`
        .file-list-container {
          max-width: 600px;
          margin: 0 auto;
        }

        .loading, .error, .no-files {
          text-align: center;
          padding: 40px;
        }

        .error {
          color: #dc3545;
        }

        .retry-button {
          background: #dc3545;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 10px;
        }

        .retry-button:hover {
          background: #c82333;
        }

        .files-section {
          background: white;
        }

        .section-header {
          margin-bottom: 24px;
        }

        .section-label {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          letter-spacing: 0.05em;
        }

        .files-list {
          space-y: 16px;
        }

        .file-item {
          border: 1px solid #f3f4f6;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 12px;
          background: #fafafa;
          transition: all 0.2s ease;
        }

        .file-item:hover {
          border-color: #e5e7eb;
          background: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .file-main {
          margin-bottom: 16px;
        }

        .file-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .file-name {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .file-actions-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .file-status {
          display: flex;
          align-items: center;
        }

        .settings-icon {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background-color 0.2s ease;
        }

        .settings-icon:hover {
          background-color: #f3f4f6;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.completed {
          background-color: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .file-details {
          space-y: 8px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
        }

        .detail-label {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .detail-value {
          font-size: 14px;
          color: #374151;
          font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
        }

        .file-actions {
          margin-top: 16px;
          display: flex;
          gap: 8px;
          padding-top: 16px;
          border-top: 1px solid #f3f4f6;
        }

        .file-actions.hidden {
          display: none;
        }

        .file-item:hover .file-actions.hidden {
          display: flex;
        }

        .action-button {
          padding: 6px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: #374151;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-button:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .action-button.download {
          border-color: #3b82f6;
          color: #3b82f6;
        }

        .action-button.download:hover {
          background: #eff6ff;
        }

        .action-button.copy {
          border-color: #6b7280;
          color: #6b7280;
        }

        .action-button.copy:hover {
          background: #f9fafb;
        }

        .action-button.share {
          border-color: #10b981;
          color: #10b981;
        }

        .action-button.share:hover {
          background: #ecfdf5;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        .modal-content.access-control-modal {
          max-width: 800px;
          width: 95%;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-button:hover {
          color: #374151;
        }

        .modal-body {
          padding: 24px;
        }

        .field-group {
          margin-bottom: 20px;
        }

        .field-group label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          margin-bottom: 8px;
        }

        .text-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s ease;
          box-sizing: border-box;
        }

        .text-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .select-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          background: white;
          cursor: pointer;
          transition: border-color 0.2s ease;
          box-sizing: border-box;
        }

        .select-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .info-section {
          margin-top: 24px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .info-text {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #374151;
        }

        .info-text:last-child {
          margin-bottom: 0;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid #e5e7eb;
        }

        .cancel-btn {
          padding: 8px 16px;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cancel-btn:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .action-btn {
          padding: 8px 16px;
          background: #3b82f6;
          border: 1px solid #3b82f6;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn:hover {
          background: #2563eb;
          border-color: #2563eb;
        }
      `}</style>
    </div>
  );
};

export default FileList;
