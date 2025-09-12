import { useState, useEffect } from 'react';
import { LandingPage } from '@/components/pages/LandingPage';
import { AuthPage } from '@/components/pages/AuthPage';
import { TransferPage } from '@/components/pages/TransferPage';
import { SharedFileViewer } from '@/components/pages/SharedFileViewer';
import { AllowlistViewer } from '@/components/pages/AllowlistViewer';
// import { VoiceCommandDemo } from '@/components/voice/VoiceCommandDemo';
// import { VoiceTestPage } from '@/components/voice/VoiceTestPage';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { useAuth } from '@/contexts/AuthContext';
import type { TransferConfig } from '@/types';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SimpleRouter, AppRoute } from '@/utils/router';

type AppState = AppRoute;

function App() {
  console.log('App: Component rendering');
  
  const router = SimpleRouter.getInstance();
  const [currentPage, setCurrentPage] = useState<AppState>(router.getCurrentRoute());
  const [shareId, setShareId] = useState<string | null>(null);
  const [allowlistId, setAllowlistId] = useState<string | null>(null);
  
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

  // Set up router and handle URL changes
  useEffect(() => {
    console.log('App: Setting up router');
    
    // Handle initial route
    const initialRoute = router.getCurrentRoute();
    setCurrentPage(initialRoute);
    
    // Check for share ID in URL
    const extractedShareId = router.getShareIdFromPath();
    if (extractedShareId) {
      setShareId(extractedShareId);
    }
    
    // Check for allowlist ID in URL
    const extractedAllowlistId = router.getAllowlistIdFromPath();
    if (extractedAllowlistId) {
      setAllowlistId(extractedAllowlistId);
    }
    
    // Listen for route changes
    const unsubscribe = router.onRouteChange((route, params) => {
      console.log('App: Route changed', { route, params });
      setCurrentPage(route);
      
      if (route === 'sharedfile' && params?.shareId) {
        setShareId(params.shareId);
      } else if (route !== 'sharedfile') {
        setShareId(null);
      }
      
      if (route === 'allowlist' && params?.allowlistId) {
        setAllowlistId(params.allowlistId);
      } else if (route !== 'allowlist') {
        setAllowlistId(null);
      }
    });

    return unsubscribe;
  }, [router]);

  // Check authentication status and redirect accordingly
  useEffect(() => {
    console.log('App: Checking authentication status', { isAuthenticated, currentPage });
    if (isAuthenticated && currentPage === 'auth') {
      router.navigate('dashboard');
      toast.success('Authentication successful!');
    }
  }, [isAuthenticated, currentPage, router]);


  const handleAuthentication = () => {
    // Authentication is now handled by wallet connection
    // This function just triggers the page transition
    router.navigate('dashboard');
  };

  const handleTransfer = (config: TransferConfig) => {
    // Simulate transfer process
    toast.success(`Transfer initiated to ${config.recipient}`);

    // Reset state after successful transfer
    setTimeout(() => {
      router.navigate('landing');
      // Don't logout automatically - let user stay authenticated
    }, 2000);
  };

  const handleLogout = () => {
    logout();
    router.navigate('landing');
    toast.success('Logged out successfully');
  };

  const handleAddMoreFiles = () => {
    // Navigate to upload page instead of managing files in App state
    router.navigate('landing');
  };


  console.log('App: Rendering page', { currentPage, isAuthenticated, user });

  return (
    <div className="min-h-screen">
      {currentPage === 'landing' && (
        <LandingPage
          onNavigateToAuth={() => router.navigate('auth')}
          onNavigateToFileList={() => router.navigate('dashboard')}
          isAuthenticated={isAuthenticated}
          user={user}
          onLogout={handleLogout}
        />
      )}

      {currentPage === 'auth' && (
        <AuthPage onAuthenticate={handleAuthentication} />
      )}

      {currentPage === 'dashboard' && (
        <DashboardPage
          user={user}
          onLogout={handleLogout}
          onNavigateToDashboard={() => router.navigate('dashboard')}
        />
      )}

      {currentPage === 'transfer' && (
        <TransferPage
          onAddFiles={handleAddMoreFiles}
          onTransfer={handleTransfer}
          user={user}
          onLogout={handleLogout}
          onNavigateToDashboard={() => router.navigate('dashboard')}
        />
      )}

      {currentPage === 'voicedemo' && (
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-3xl font-bold">Voice Commands Demo</h1>
              <Button
                onClick={() => router.navigate('landing')}
                variant="outline"
              >
                ← Back to Landing
              </Button>
            </div>
            {/* <VoiceCommandDemo /> */}
          </div>
        </div>
      )}

      {currentPage === 'voicetest' && (
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-3xl font-bold">Voice Commands Test</h1>
              <Button
                onClick={() => router.navigate('landing')}
                variant="outline"
              >
                ← Back to Landing
              </Button>
            </div>
            {/* <VoiceTestPage /> */}
          </div>
        </div>
      )}

      {currentPage === 'sharedfile' && shareId && (
        <SharedFileViewer
          shareId={shareId}
          onNavigateToAuth={() => router.navigate('auth')}
          onNavigateToLanding={() => router.navigate('landing')}
        />
      )}

      {currentPage === 'allowlist' && allowlistId && (
        <AllowlistViewer
          allowlistId={allowlistId}
          onNavigateToAuth={() => router.navigate('auth')}
          onNavigateToLanding={() => router.navigate('landing')}
        />
      )}

      <Toaster position="top-right" />
    </div>
  );
}

export default App;