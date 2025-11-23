import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fileService, FileMetadata } from '../../services/fileService';
import AccessControlStatus from './AccessControlStatus';
import AccessControlConfig from './AccessControlConfig';
import { accessControlService } from '../../services/accessControlService';
import { toast } from 'sonner';
import './FileList.css';
import { Transaction } from '@mysten/sui/transactions';
import { useSignPersonalMessage, useSuiClient, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { getNetworkVariables, network } from '@/contract/index';


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
  const { mutateAsync: signPersonalMessageAsync } = useSignPersonalMessage();
  const suiClient = useSuiClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const TESTNET_PACKAGE_ID = (import.meta as any).env?.VITE_SUI_PACKAGE_ID || getNetworkVariables(network).packageId;
  const [decryptedUrls, setDecryptedUrls] = useState<Record<string, string>>({});

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

  const downloadFile = async (file: FileMetadata) => {
    try {
      let proof: { sessionKey: any; txBytesBase64: string } | undefined;
      if (user?.address) {
        try {
          console.log('downloadFile: preparing proof...');
          const allowlistId = await resolveOrCreateAllowlistId();
          if (allowlistId) {
            const encryptionId = file.encryptionKeys?.encryptionId || await fileService.peekEncryptionId(file, user.address, useTestMode);
            if (!encryptionId) {
              console.warn('downloadFile: missing encryptionId');
            } else {
              file.encryptionKeys = { encryptionId };
              const signer = async (message: Uint8Array) => {
                console.log('downloadFile: requesting personal message signature...');
                const result: any = await signPersonalMessageAsync({ message });
                console.log('downloadFile: personal message signed');
                return typeof result === 'string' ? result : result.signature;
              };
              const attach = await fileService.attachDecryptionProof(
                file,
                user.address,
                allowlistId,
                signer,
              );
              if (attach.success && attach.proof) {
                proof = attach.proof;
                console.log('downloadFile: proof ready', { txBytesLen: proof.txBytesBase64.length });
              } else {
                console.warn('downloadFile: attachDecryptionProof failed', attach.message);
              }
            }
          } else {
            console.warn('downloadFile: allowlist not ready');
          }
        } catch (e) {
          console.warn('downloadFile: proof preparation error', e);
        }
      }
      const result = await fileService.downloadAndMaybeDecrypt(file, user?.address || null, useTestMode, proof);
      if (!result.success) {
        throw new Error(result.error || 'Failed to download file');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to download file');
    }
  };

  const resolveOrCreateAllowlistId = async (): Promise<string | null> => {
    try {
      if (!user?.address) return null;
      const cached = localStorage.getItem('allowlistId');
      if (cached) return cached;
      const owned = await suiClient.getOwnedObjects({
        owner: user.address,
        options: { showContent: true, showType: true },
        filter: { StructType: `${TESTNET_PACKAGE_ID}::allowlist::Cap` },
      });
      const existing = owned.data
        .map((it: any) => ((it?.data?.content as { fields: any })?.fields))
        .filter((f: any) => f && f.allowlist_id)
        .map((f: any) => f.allowlist_id)[0] as string | undefined;
      if (existing) { localStorage.setItem('allowlistId', existing); return existing; }

      const tx = new Transaction();
      tx.moveCall({
        target: `${TESTNET_PACKAGE_ID}::allowlist::create_allowlist_entry`,
        arguments: [tx.pure.string('Personal Allowlist')],
      });
      tx.setGasBudget(10000000);
      let res: any;
      try {
        res = await new Promise((resolve, reject) => {
          signAndExecute(
            { transaction: tx as any },
            { onSuccess: (r: any) => resolve(r), onError: reject },
          );
        });
      } catch {
        await new Promise((r) => setTimeout(r, 2000));
        res = await new Promise((resolve, reject) => {
          signAndExecute(
            { transaction: tx as any },
            { onSuccess: (r: any) => resolve(r), onError: reject },
          );
        });
      }

      const created = res?.effects?.created || [];
      const shared = created.find((it: any) => it.owner && typeof it.owner === 'object' && 'Shared' in it.owner);
      const allowlistId: string | null = shared?.reference?.objectId || null;
      if (!allowlistId) return null;
      localStorage.setItem('allowlistId', allowlistId);

      const caps = await suiClient.getOwnedObjects({
        owner: user.address,
        options: { showContent: true, showType: true },
        filter: { StructType: `${TESTNET_PACKAGE_ID}::allowlist::Cap` },
      });
      const capId = caps.data
        .map((cap) => {
          const capFields = (cap?.data?.content as { fields: any })?.fields;
          return { id: capFields?.id?.id, allowlist_id: capFields?.allowlist_id };
        })
        .filter((x) => x.allowlist_id === allowlistId)
        .map((x) => x.id)[0] as string | undefined;

      if (capId) {
        const addTx = new Transaction();
        addTx.moveCall({
          target: `${TESTNET_PACKAGE_ID}::allowlist::add`,
          arguments: [addTx.object(allowlistId), addTx.object(capId), addTx.pure.address(user.address)],
        });
        addTx.setGasBudget(10000000);
        try {
          await new Promise((resolve, reject) => {
            signAndExecute({ transaction: addTx as any }, { onSuccess: () => resolve(true), onError: reject });
          });
        } catch {}
      }

      return allowlistId;
    } catch (e) {
      console.warn('Allowlist resolution failed:', e);
      return null;
    }
  };

  const decryptFile = async (file: FileMetadata) => {
    try {
      if (!file.isEncrypted) return downloadFile(file);
      if (!user?.address) {
        toast.error('Wallet address required to decrypt file');
        return;
      }
      if (!file.encryptionKeys?.encryptionId) {
        toast.error('Missing encryptionId for this file');
        return;
      }
      const allowlistId = await resolveOrCreateAllowlistId();
      if (!allowlistId) {
        toast.error('Failed to prepare allowlist');
        return;
      }
      const signer = async (message: Uint8Array) => {
        const result: any = await signPersonalMessageAsync({ message });
        return typeof result === 'string' ? result : result.signature;
      };
      const attach = await fileService.attachDecryptionProof(
        file,
        user.address,
        allowlistId,
        signer,
      );
      if (!attach.success) {
        toast.error(attach.message || 'Failed to create decryption proof');
        return;
      }
      console.log('Proof from attach', { hasProof: !!attach.proof, txBytesLen: attach.proof?.txBytesBase64?.length || 0 });
      const result = await fileService.downloadAndMaybeDecrypt(file, user.address, useTestMode, attach.proof);
      if (!result.success) {
        throw new Error(result.error || 'Failed to decrypt and download file');
      }
      toast.success('File decrypted and downloaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to decrypt file');
    }
  };

  const handleActionClick = async (file: FileMetadata) => {
    try {
      if (file.isEncrypted && !decryptedUrls[file.cid]) {
        if (!user?.address) { toast.error('Wallet address required'); return; }
        if (!file.encryptionKeys?.encryptionId && user?.address) {
          const id = await fileService.peekEncryptionId(file, user.address, useTestMode);
          if (id) file.encryptionKeys = { encryptionId: id };
        }
        if (!file.encryptionKeys?.encryptionId) { toast.error('Missing encryptionId for this file'); return; }
        const allowlistId = await resolveOrCreateAllowlistId();
        if (!allowlistId) { toast.error('Failed to prepare allowlist'); return; }
        const signer = async (message: Uint8Array) => {
          const result: any = await signPersonalMessageAsync({ message });
          return typeof result === 'string' ? result : result.signature;
        };
        const attach = await fileService.attachDecryptionProof(
          file,
          user!.address,
          allowlistId,
          signer,
        );
        if (!attach.success || !attach.proof) { toast.error(attach.message || 'Failed to create decryption proof'); return; }
        const res = await fileService.downloadAndMaybeDecrypt(file, user!.address, useTestMode, attach.proof, { autoSave: false });
        if (!res.success || !res.blobUrl) throw new Error(res.error || 'Decryption failed');
        setDecryptedUrls(prev => ({ ...prev, [file.cid]: res.blobUrl! }));
        toast.success('Decryption complete — ready to download');
        return;
      }
      const url = decryptedUrls[file.cid];
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setDecryptedUrls(prev => { const next = { ...prev }; delete next[file.cid]; return next; });
      } else {
        // For encrypted files, trigger the decryption process
        if (file.isEncrypted) {
          await decryptFile(file);
        } else {
          await fileService.downloadFile(file.cid, file.filename, user?.address || null, useTestMode);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action failed');
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
                <div className="file-actions">
                  <button
                    onClick={() => handleActionClick(file)}
                    className="action-button download"
                  >
                    {file.isEncrypted ? (decryptedUrls[file.cid] ? 'Download' : 'Decrypt') : 'Download'}
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
