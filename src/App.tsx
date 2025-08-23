import { useState, useEffect } from 'react';
import { LandingPage } from '@/components/pages/LandingPage';
import { AuthPage } from '@/components/pages/AuthPage';
import { FileListPage } from '@/components/pages/FileListPage';
import { TransferPage } from '@/components/pages/TransferPage';
import { SharedFileViewer } from '@/components/pages/SharedFileViewer';
import { useAuth } from '@/contexts/AuthContext';
import type { TransferConfig } from '@/types';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type AppState = 'landing' | 'auth' | 'filelist' | 'transfer' | 'success' | 'sharedfile';

function App() {
  const [currentPage, setCurrentPage] = useState<AppState>('landing');
  const [shareId, setShareId] = useState<string | null>(null);
  const { isAuthenticated, user, logout } = useAuth();

  // Check for share link in URL on component mount
  useEffect(() => {
    const checkForShareLink = () => {
      const path = window.location.pathname;
      const shareMatch = path.match(/^\/share\/(.+)$/);

      if (shareMatch) {
        const extractedShareId = shareMatch[1];
        setShareId(extractedShareId);
        setCurrentPage('sharedfile');
        console.log('Share link detected:', extractedShareId);
      }
    };

    checkForShareLink();
  }, []);

  // Check authentication status and redirect accordingly
  useEffect(() => {
    if (isAuthenticated && currentPage === 'auth') {
      setCurrentPage('filelist');
      toast.success('Authentication successful!');
    }
  }, [isAuthenticated, currentPage]);

  const handleFileUpload = (files: FileList) => {
    // File upload is now handled by the FileUpload component directly
    // No need to manage files in App state since they're stored in backend
    console.log('Files selected for upload:', files.length);
  };

  const handleAuthentication = () => {
    // Authentication is now handled by AuthContext
    // This function just triggers the page transition
    setCurrentPage('filelist');
  };

  const handleTransfer = (config: TransferConfig) => {
    // Simulate transfer process
    toast.success(`Transfer initiated to ${config.recipient}`);

    // Reset state after successful transfer
    setTimeout(() => {
      setCurrentPage('landing');
      // Don't logout automatically - let user stay authenticated
    }, 2000);
  };

  const handleLogout = () => {
    logout();
    setCurrentPage('landing');
    toast.success('Logged out successfully');
  };

  const handleAddMoreFiles = () => {
    // Navigate to upload page instead of managing files in App state
    setCurrentPage('landing');
  };

  const handleUploadSuccess = () => {
    // Navigate to file list after successful upload
    setCurrentPage('filelist');
    toast.success('Files uploaded successfully!');
  };

  return (
    <div className="min-h-screen">
      {currentPage === 'landing' && (
        <LandingPage
          onFileUpload={handleFileUpload}
          onNavigateToAuth={() => setCurrentPage('auth')}
          onNavigateToFileList={() => setCurrentPage('filelist')}
          onUploadSuccess={handleUploadSuccess}
          isAuthenticated={isAuthenticated}
          user={user}
          onLogout={handleLogout}
        />
      )}
      
      {currentPage === 'auth' && (
        <AuthPage onAuthenticate={handleAuthentication} />
      )}

      {currentPage === 'filelist' && (
        <FileListPage
          onNavigateToTransfer={() => setCurrentPage('transfer')}
          onNavigateToUpload={() => setCurrentPage('landing')}
          isAuthenticated={isAuthenticated}
          user={user}
          onLogout={handleLogout}
        />
      )}

      {currentPage === 'transfer' && (
        <TransferPage
          onAddFiles={handleAddMoreFiles}
          onTransfer={handleTransfer}
          user={user}
          onLogout={handleLogout}
          onNavigateToDashboard={() => setCurrentPage('filelist')}
        />
      )}

      {currentPage === 'sharedfile' && shareId && (
        <SharedFileViewer
          shareId={shareId}
          onNavigateToAuth={() => setCurrentPage('auth')}
          onNavigateToLanding={() => setCurrentPage('landing')}
        />
      )}

      <Toaster position="top-right" />
    </div>
  );
}

export default App;