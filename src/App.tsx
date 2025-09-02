import { useState, useEffect } from 'react';
import { LandingPage } from '@/components/pages/LandingPage';
import { AuthPage } from '@/components/pages/AuthPage';
import { FileListPage } from '@/components/pages/FileListPage';
import { TransferPage } from '@/components/pages/TransferPage';
import { SharedFileViewer } from '@/components/pages/SharedFileViewer';
import { VoiceCommandDemo } from '@/components/voice/VoiceCommandDemo';
import { VoiceTestPage } from '@/components/voice/VoiceTestPage';
import { useAuth } from '@/contexts/AuthContext';
import type { TransferConfig } from '@/types';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type AppState = 'landing' | 'auth' | 'filelist' | 'transfer' | 'success' | 'voicedemo' | 'voicetest' | 'sharedfile';

function App() {
  console.log('App: Component rendering');
  
  const [currentPage, setCurrentPage] = useState<AppState>('landing');
  const [shareId, setShareId] = useState<string | null>(null);
  
  let authContext;
  try {
    authContext = useAuth();
    console.log('App: Auth context loaded successfully', authContext);
  } catch (error) {
    console.error('App: Failed to load auth context', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Authentication Error
          </h1>
          <p className="text-gray-600 mb-4">
            Failed to initialize authentication. Please check the console for details.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  const { isAuthenticated, user, logout } = authContext;

  // Check for share link in URL on component mount
  useEffect(() => {
    console.log('App: Checking for share link');
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
    console.log('App: Checking authentication status', { isAuthenticated, currentPage });
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
    // Authentication is now handled by wallet connection
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

  console.log('App: Rendering page', { currentPage, isAuthenticated, user });

  return (
    <div className="min-h-screen">
      {currentPage === 'landing' && (
        <LandingPage
          onFileUpload={handleFileUpload}
          onNavigateToAuth={() => setCurrentPage('auth')}
          onNavigateToFileList={() => setCurrentPage('filelist')}
          onNavigateToVoiceTest={() => setCurrentPage('voicetest')}
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

      {currentPage === 'voicedemo' && (
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-3xl font-bold">Voice Commands Demo</h1>
              <Button
                onClick={() => setCurrentPage('landing')}
                variant="outline"
              >
                ← Back to Landing
              </Button>
            </div>
            <VoiceCommandDemo />
          </div>
        </div>
      )}

      {currentPage === 'voicetest' && (
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-3xl font-bold">Voice Commands Test</h1>
              <Button
                onClick={() => setCurrentPage('landing')}
                variant="outline"
              >
                ← Back to Landing
              </Button>
            </div>
            <VoiceTestPage />
          </div>
        </div>
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