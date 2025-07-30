import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import type { OAuthProvider } from '../services/authService';
import {
  GitHubIcon
} from './icons/SocialIcons';

interface ZkLoginAuthProps {
  onAuthSuccess: (user: any) => void;
  onAuthError: (error: string) => void;
}

const ZkLoginAuth: React.FC<ZkLoginAuthProps> = ({ onAuthSuccess, onAuthError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null);

  // Check for OAuth callback on component mount
  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const callbackResult = (authService as any).constructor.handleOAuthRedirect();
        if (callbackResult) {
          setIsLoading(true);
          const { code, state } = await callbackResult;

          // Get session ID from localStorage (stored during login initiation)
          const sessionId = localStorage.getItem('oauth_session_id');
          if (!sessionId) {
            throw new Error('No session ID found');
          }

          // Complete authentication
          const authResponse = await authService.completeAuthentication(sessionId, code, state);

          if (!authResponse.success) {
            throw new Error('Failed to complete authentication');
          }

          // Clean up
          localStorage.removeItem('oauth_session_id');
          localStorage.removeItem('oauth_state');

          // Success!
          onAuthSuccess(authResponse.data);
        }
      } catch (error) {
        console.error('OAuth callback failed:', error);
        onAuthError(error instanceof Error ? error.message : 'OAuth callback failed');
        // Clean up on error
        localStorage.removeItem('oauth_session_id');
        localStorage.removeItem('oauth_state');
      } finally {
        setIsLoading(false);
      }
    };

    handleOAuthCallback();
  }, [onAuthSuccess, onAuthError]);

  const handleLogin = async (provider: OAuthProvider) => {
    console.log(`Starting login flow for provider: ${provider}`);
    setIsLoading(true);
    setLoadingProvider(provider);

    try {
      // Step 1: Initiate login flow
      console.log('Initiating login with backend...');
      const loginResponse = await authService.initiateLogin(provider);
      console.log('Login response:', loginResponse);

      if (!loginResponse.success) {
        throw new Error('Failed to initiate login');
      }

      const { sessionId, authUrl } = loginResponse.data;
      console.log('Received session ID and auth URL:', { sessionId, authUrl });

      // Store session ID for when we return from OAuth
      localStorage.setItem('oauth_session_id', sessionId);

      // Step 2: Redirect to OAuth provider (this will leave the page)
      console.log('Redirecting to OAuth provider...');
      await authService.openOAuthPopup(authUrl);

      // Note: Code after this point won't execute because we're redirecting

    } catch (error) {
      console.error('Login failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      onAuthError(error instanceof Error ? error.message : 'Login failed');
      setIsLoading(false);
      setLoadingProvider(null);
    }
  };

  const providers: { id: OAuthProvider; name: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'github',
      name: 'GitHub',
      icon: <GitHubIcon size={20} />,
      color: '#24292e'
    }
  ];

  return (
    <div className="w-full">
      {/* GitHub Auth Button */}
      <div className="space-y-4">
        {providers.map((provider) => (
          <button
            key={provider.id}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors font-medium text-gray-900 ${
              loadingProvider === provider.id ? 'opacity-75 cursor-not-allowed' : ''
            }`}
            onClick={() => handleLogin(provider.id)}
            disabled={isLoading}
          >
            <div className="text-gray-900">{provider.icon}</div>
            <span>
              {loadingProvider === provider.id ? 'Connecting...' : `Continue with ${provider.name}`}
            </span>
            {loadingProvider === provider.id && (
              <div className="ml-2 w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
            )}
          </button>
        ))}
      </div>

      {/* Optional: Create account link */}
      <div className="text-center mt-6">
        <p className="text-sm text-gray-600">
          Create an account
        </p>
      </div>
    </div>
  );
};

export default ZkLoginAuth;
